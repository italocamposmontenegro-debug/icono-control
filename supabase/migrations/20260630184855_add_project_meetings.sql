begin;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  record_type text not null default 'reunion'
    check (record_type in ('reunion', 'antecedente_reunion')),
  title text not null,
  meeting_date date not null,
  start_time time,
  end_time time,
  modality text not null default 'por_confirmar'
    check (modality in ('online', 'presencial', 'hibrida', 'por_confirmar')),
  platform_location text,
  organizer_name text,
  organizer_email text,
  documentation_level text not null default 'antecedente'
    check (documentation_level in ('convocatoria', 'correo_posterior', 'calendario_y_correo', 'antecedente')),
  transcript_status text not null default 'no_consta'
    check (transcript_status in ('disponible', 'no_disponible', 'no_consta')),
  source_summary text,
  repository_notes text,
  raw_participants_text text,
  raw_agreements_text text,
  source_file_name text,
  source_sheet text,
  source_row integer,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  source_key text not null unique,
  participant_kind text not null default 'persona'
    check (participant_kind in ('persona', 'organizacion', 'contacto_por_confirmar')),
  display_name text not null,
  email text,
  organization text,
  participation_status text not null default 'pendiente_de_confirmar'
    check (participation_status in (
      'organizador',
      'convocado',
      'asistencia_confirmada',
      'mencionado_en_fuente',
      'representacion_institucional',
      'pendiente_de_confirmar'
    )),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_agreements (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  source_key text not null unique,
  title text not null,
  description text,
  agreement_type text not null default 'seguimiento'
    check (agreement_type in ('acuerdo', 'compromiso', 'seguimiento', 'lineamiento', 'resultado_documentado')),
  responsible_name text,
  responsible_organization text,
  due_date date,
  status text not null default 'pendiente_confirmacion'
    check (status in ('pendiente_confirmacion', 'planificado', 'en_ejecucion', 'completado', 'vigente', 'documentado', 'observado')),
  related_activity_id uuid references public.activities(id) on delete set null,
  source_basis text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_sources (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  source_key text not null unique,
  source_type text not null
    check (source_type in ('calendario', 'correo', 'presentacion', 'propuesta', 'ficha_tecnica', 'acta', 'otro')),
  title text not null,
  source_date date,
  availability_status text not null default 'referenciado_no_cargado'
    check (availability_status in ('cargado', 'referenciado_no_cargado', 'no_disponible')),
  file_path text,
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.timeline_events
  add column if not exists related_meeting_id uuid references public.meetings(id) on delete set null;

create index if not exists meetings_date_idx on public.meetings(meeting_date desc);
create index if not exists meeting_participants_meeting_idx on public.meeting_participants(meeting_id);
create index if not exists meeting_participants_name_idx on public.meeting_participants(lower(display_name));
create index if not exists meeting_agreements_meeting_idx on public.meeting_agreements(meeting_id);
create index if not exists meeting_agreements_status_idx on public.meeting_agreements(status);
create index if not exists meeting_sources_meeting_idx on public.meeting_sources(meeting_id);
create index if not exists timeline_events_related_meeting_idx on public.timeline_events(related_meeting_id);

create or replace function public.touch_project_meeting_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meetings_touch_updated_at on public.meetings;
create trigger meetings_touch_updated_at
before update on public.meetings
for each row execute function public.touch_project_meeting_updated_at();

drop trigger if exists meeting_agreements_touch_updated_at on public.meeting_agreements;
create trigger meeting_agreements_touch_updated_at
before update on public.meeting_agreements
for each row execute function public.touch_project_meeting_updated_at();

alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_agreements enable row level security;
alter table public.meeting_sources enable row level security;

drop policy if exists meetings_select on public.meetings;
create policy meetings_select on public.meetings
for select to authenticated using (true);
drop policy if exists meetings_admin_all on public.meetings;
create policy meetings_admin_all on public.meetings
for all to authenticated
using (public.get_my_role() = 'admin_comite')
with check (public.get_my_role() = 'admin_comite');

drop policy if exists meeting_participants_select on public.meeting_participants;
create policy meeting_participants_select on public.meeting_participants
for select to authenticated using (true);
drop policy if exists meeting_participants_admin_all on public.meeting_participants;
create policy meeting_participants_admin_all on public.meeting_participants
for all to authenticated
using (public.get_my_role() = 'admin_comite')
with check (public.get_my_role() = 'admin_comite');

drop policy if exists meeting_agreements_select on public.meeting_agreements;
create policy meeting_agreements_select on public.meeting_agreements
for select to authenticated using (true);
drop policy if exists meeting_agreements_admin_all on public.meeting_agreements;
create policy meeting_agreements_admin_all on public.meeting_agreements
for all to authenticated
using (public.get_my_role() = 'admin_comite')
with check (public.get_my_role() = 'admin_comite');

drop policy if exists meeting_sources_select on public.meeting_sources;
create policy meeting_sources_select on public.meeting_sources
for select to authenticated using (true);
drop policy if exists meeting_sources_admin_all on public.meeting_sources;
create policy meeting_sources_admin_all on public.meeting_sources
for all to authenticated
using (public.get_my_role() = 'admin_comite')
with check (public.get_my_role() = 'admin_comite');

revoke all on public.meetings from anon;
revoke all on public.meeting_participants from anon;
revoke all on public.meeting_agreements from anon;
revoke all on public.meeting_sources from anon;
grant select, insert, update, delete on public.meetings to authenticated;
grant select, insert, update, delete on public.meeting_participants to authenticated;
grant select, insert, update, delete on public.meeting_agreements to authenticated;
grant select, insert, update, delete on public.meeting_sources to authenticated;

with seed_actor as (
  select id
  from public.profiles
  where role = 'admin_comite'
  order by created_at
  limit 1
),
seed_meetings (
  id, source_key, record_type, title, meeting_date, start_time, end_time,
  modality, platform_location, organizer_name, documentation_level,
  transcript_status, source_summary, repository_notes,
  raw_participants_text, raw_agreements_text, source_file_name, source_sheet, source_row
) as (
  values
  (
    '20260000-0000-4000-8400-000000000001'::uuid,
    'xlsx_reuniones_2026_row_2',
    'reunion',
    'Reunión Proyecto Icónico',
    '2026-03-23'::date,
    '10:00'::time,
    '11:30'::time,
    'online',
    'Microsoft Teams',
    'Carlos Eduardo Liebig Sanguineti',
    'convocatoria',
    'no_disponible',
    'Evento de calendario: REUNIÓN PROYECTO ICÓNICO.',
    'Registrar como reunión de calendario asociada al proyecto, sin acuerdos documentados en la evidencia disponible.',
    'Natalia Valentina Fuentes Donaire; vserrano@corporacioncasablanca.cl; valeria.serrano@gmail.com; Ítalo Andres Campos Montenegro.',
    'No se encontró transcripción ni contenido asociado con acuerdos específicos; consta la convocatoria y la plataforma.',
    'Informe_reuniones_Proyecto_Iconico_2026.xlsx',
    'Reuniones 2026',
    2
  ),
  (
    '20260000-0000-4000-8400-000000000002'::uuid,
    'xlsx_reuniones_2026_row_3',
    'antecedente_reunion',
    'Reunión ante equipo municipal y Corporación Pro Casablanca',
    '2026-04-01'::date,
    null,
    null,
    'por_confirmar',
    null,
    null,
    'correo_posterior',
    'no_consta',
    'Correo: Información Proyecto Icónico. Facultad de Ciencias de la Vida. (20-05-2026).',
    'Reunión mencionada en correo posterior; no se encontró invitación de calendario asociada en los resultados revisados.',
    'Equipo municipal; Corporación Pro-Casablanca. No se identifican nombres individuales en la fuente disponible.',
    'Se dejó como respaldo la presentación expuesta en esa reunión, junto con la versión más actualizada de la propuesta de trabajo del Proyecto Icónico.',
    'Informe_reuniones_Proyecto_Iconico_2026.xlsx',
    'Reuniones 2026',
    3
  ),
  (
    '20260000-0000-4000-8400-000000000003'::uuid,
    'xlsx_reuniones_2026_row_4',
    'antecedente_reunion',
    'Reunión sobre información del Proyecto Icónico',
    '2026-05-20'::date,
    null,
    null,
    'por_confirmar',
    null,
    null,
    'correo_posterior',
    'no_consta',
    'Correo: Información Proyecto Icónico. Facultad de Ciencias de la Vida. (20-05-2026).',
    'Evidencia proveniente de correo posterior; no se encontró invitación de calendario asociada.',
    'Natalia Valentina Fuentes Donaire; Eduardo Escalona Seitz; Valeria Serrano; Rommy Escobar; Carmen Rios; Javiera Cifuentes Figueroa; Ítalo Andres Campos Montenegro; Carlos Eduardo Liebig Sanguineti.',
    'Adjuntar presentaciones y ficha técnica; respetar canales de difusión institucionales; mantener en copia a integrantes de la reunión.',
    'Informe_reuniones_Proyecto_Iconico_2026.xlsx',
    'Reuniones 2026',
    4
  ),
  (
    '20260000-0000-4000-8400-000000000004'::uuid,
    'xlsx_reuniones_2026_row_5',
    'reunion',
    'Reunión online Alcaldía - Corporación Pro Casablanca - UVM',
    '2026-05-26'::date,
    '15:30'::time,
    '17:00'::time,
    'online',
    'Microsoft Teams',
    'Natalia Valentina Fuentes Donaire',
    'calendario_y_correo',
    'no_disponible',
    'Evento de calendario y correo relacionado: Reunión online Alcaldía - Corporación Pro Casablanca - UVM.',
    'Los acuerdos se documentaron en correo de seguimiento y no en una transcripción.',
    'Eduardo Escalona Seitz; Carlos Eduardo Liebig Sanguineti; Ítalo Andres Campos Montenegro; Javiera Cifuentes Figueroa; Carmen Rios; Rommy Escobar; Valeria Serrano; Corporación Casablanca. El registro indica asistencia de Ítalo Andres Campos Montenegro.',
    'Actualización de avances; requisitos del concurso Vinculación con la Comunidad Línea 2; líneas temáticas y coordinación con organizaciones de emprendedores.',
    'Informe_reuniones_Proyecto_Iconico_2026.xlsx',
    'Reuniones 2026',
    5
  ),
  (
    '20260000-0000-4000-8400-000000000005'::uuid,
    'xlsx_reuniones_2026_row_6',
    'reunion',
    'Reunión de avance Proyecto Icónico',
    '2026-06-17'::date,
    '12:00'::time,
    '13:00'::time,
    'online',
    'Microsoft Teams',
    'Natalia Valentina Fuentes Donaire',
    'calendario_y_correo',
    'no_disponible',
    'Evento de calendario y correo Consulta Proyecto Icónico Facultad de Ciencias de la Vida. (19-06-2026).',
    'Los acuerdos se documentaron en correo de seguimiento y no en una transcripción.',
    'Ítalo Andres Campos Montenegro; Carlos Eduardo Liebig Sanguineti; Veronica Andrea Valdés Ortiz-Arrieta; Eduardo Escalona Seitz; Valeria Serrano; Alejandra Carvallo; Carmen Rios; Javiera Cifuentes Figueroa; Rommy Escobar; Corporación Casablanca.',
    'Alternativas de transporte y financiación para el operativo de salud del 27-08-2026 y traslado de beneficiarios hacia El Batro.',
    'Informe_reuniones_Proyecto_Iconico_2026.xlsx',
    'Reuniones 2026',
    6
  )
)
insert into public.meetings (
  id, source_key, record_type, title, meeting_date, start_time, end_time,
  modality, platform_location, organizer_name, documentation_level,
  transcript_status, source_summary, repository_notes,
  raw_participants_text, raw_agreements_text, source_file_name, source_sheet,
  source_row, created_by, updated_by
)
select
  sm.*, (select id from seed_actor), (select id from seed_actor)
from seed_meetings sm
on conflict (source_key) do update set
  record_type = excluded.record_type,
  title = excluded.title,
  meeting_date = excluded.meeting_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  modality = excluded.modality,
  platform_location = excluded.platform_location,
  organizer_name = excluded.organizer_name,
  documentation_level = excluded.documentation_level,
  transcript_status = excluded.transcript_status,
  source_summary = excluded.source_summary,
  repository_notes = excluded.repository_notes,
  raw_participants_text = excluded.raw_participants_text,
  raw_agreements_text = excluded.raw_agreements_text,
  source_file_name = excluded.source_file_name,
  source_sheet = excluded.source_sheet,
  source_row = excluded.source_row,
  updated_by = excluded.updated_by;

insert into public.meeting_participants (
  id, meeting_id, source_key, participant_kind, display_name, email,
  organization, participation_status, notes, sort_order
)
values
  ('20260000-0000-4000-8410-000000000001', '20260000-0000-4000-8400-000000000001', 'm1_carlos_liebig', 'persona', 'Carlos Eduardo Liebig Sanguineti', null, 'Universidad Viña del Mar', 'organizador', null, 1),
  ('20260000-0000-4000-8410-000000000002', '20260000-0000-4000-8400-000000000001', 'm1_natalia_fuentes', 'persona', 'Natalia Valentina Fuentes Donaire', null, 'Universidad Viña del Mar', 'convocado', null, 2),
  ('20260000-0000-4000-8410-000000000003', '20260000-0000-4000-8400-000000000001', 'm1_contacto_vserrano_corporacion', 'contacto_por_confirmar', 'Contacto por confirmar', 'vserrano@corporacioncasablanca.cl', 'Corporación Pro Casablanca', 'convocado', 'Validar si corresponde a Valeria Serrano.', 3),
  ('20260000-0000-4000-8410-000000000004', '20260000-0000-4000-8400-000000000001', 'm1_contacto_valeria_gmail', 'contacto_por_confirmar', 'Contacto por confirmar', 'valeria.serrano@gmail.com', null, 'convocado', 'Validar si corresponde a Valeria Serrano.', 4),
  ('20260000-0000-4000-8410-000000000005', '20260000-0000-4000-8400-000000000001', 'm1_italo_campos', 'persona', 'Ítalo Andres Campos Montenegro', null, 'Universidad Viña del Mar', 'convocado', null, 5),

  ('20260000-0000-4000-8410-000000000006', '20260000-0000-4000-8400-000000000002', 'm2_equipo_municipal', 'organizacion', 'Equipo municipal', null, 'Ilustre Municipalidad de Casablanca', 'representacion_institucional', 'No se identifican nombres individuales.', 1),
  ('20260000-0000-4000-8410-000000000007', '20260000-0000-4000-8400-000000000002', 'm2_pro_casablanca', 'organizacion', 'Corporación Pro Casablanca', null, 'Corporación Pro Casablanca', 'representacion_institucional', 'No se identifican nombres individuales.', 2),

  ('20260000-0000-4000-8410-000000000008', '20260000-0000-4000-8400-000000000003', 'm3_natalia_fuentes', 'persona', 'Natalia Valentina Fuentes Donaire', null, 'Universidad Viña del Mar', 'mencionado_en_fuente', null, 1),
  ('20260000-0000-4000-8410-000000000009', '20260000-0000-4000-8400-000000000003', 'm3_eduardo_escalona', 'persona', 'Eduardo Escalona Seitz', null, null, 'mencionado_en_fuente', 'Institución pendiente de confirmar.', 2),
  ('20260000-0000-4000-8410-000000000010', '20260000-0000-4000-8400-000000000003', 'm3_valeria_serrano', 'persona', 'Valeria Serrano', null, null, 'mencionado_en_fuente', 'Institución pendiente de confirmar.', 3),
  ('20260000-0000-4000-8410-000000000011', '20260000-0000-4000-8400-000000000003', 'm3_rommy_escobar', 'persona', 'Rommy Escobar', null, null, 'mencionado_en_fuente', 'Institución pendiente de confirmar.', 4),
  ('20260000-0000-4000-8410-000000000012', '20260000-0000-4000-8400-000000000003', 'm3_carmen_rios', 'persona', 'Carmen Rios', null, null, 'mencionado_en_fuente', 'Institución pendiente de confirmar.', 5),
  ('20260000-0000-4000-8410-000000000013', '20260000-0000-4000-8400-000000000003', 'm3_javiera_cifuentes', 'persona', 'Javiera Cifuentes Figueroa', null, null, 'mencionado_en_fuente', 'Institución pendiente de confirmar.', 6),
  ('20260000-0000-4000-8410-000000000014', '20260000-0000-4000-8400-000000000003', 'm3_italo_campos', 'persona', 'Ítalo Andres Campos Montenegro', null, 'Universidad Viña del Mar', 'mencionado_en_fuente', null, 7),
  ('20260000-0000-4000-8410-000000000015', '20260000-0000-4000-8400-000000000003', 'm3_carlos_liebig', 'persona', 'Carlos Eduardo Liebig Sanguineti', null, 'Universidad Viña del Mar', 'mencionado_en_fuente', null, 8),

  ('20260000-0000-4000-8410-000000000016', '20260000-0000-4000-8400-000000000004', 'm4_natalia_fuentes', 'persona', 'Natalia Valentina Fuentes Donaire', null, 'Universidad Viña del Mar', 'organizador', null, 1),
  ('20260000-0000-4000-8410-000000000017', '20260000-0000-4000-8400-000000000004', 'm4_eduardo_escalona', 'persona', 'Eduardo Escalona Seitz', null, null, 'convocado', 'Institución pendiente de confirmar.', 2),
  ('20260000-0000-4000-8410-000000000018', '20260000-0000-4000-8400-000000000004', 'm4_carlos_liebig', 'persona', 'Carlos Eduardo Liebig Sanguineti', null, 'Universidad Viña del Mar', 'convocado', null, 3),
  ('20260000-0000-4000-8410-000000000019', '20260000-0000-4000-8400-000000000004', 'm4_italo_campos', 'persona', 'Ítalo Andres Campos Montenegro', null, 'Universidad Viña del Mar', 'asistencia_confirmada', 'La fuente indica asistencia.', 4),
  ('20260000-0000-4000-8410-000000000020', '20260000-0000-4000-8400-000000000004', 'm4_javiera_cifuentes', 'persona', 'Javiera Cifuentes Figueroa', null, null, 'convocado', 'Institución pendiente de confirmar.', 5),
  ('20260000-0000-4000-8410-000000000021', '20260000-0000-4000-8400-000000000004', 'm4_carmen_rios', 'persona', 'Carmen Rios', null, null, 'convocado', 'Institución pendiente de confirmar.', 6),
  ('20260000-0000-4000-8410-000000000022', '20260000-0000-4000-8400-000000000004', 'm4_rommy_escobar', 'persona', 'Rommy Escobar', null, null, 'convocado', 'Institución pendiente de confirmar.', 7),
  ('20260000-0000-4000-8410-000000000023', '20260000-0000-4000-8400-000000000004', 'm4_valeria_serrano', 'persona', 'Valeria Serrano', null, null, 'convocado', 'Institución pendiente de confirmar.', 8),
  ('20260000-0000-4000-8410-000000000024', '20260000-0000-4000-8400-000000000004', 'm4_corporacion_casablanca', 'organizacion', 'Corporación Casablanca', null, 'Corporación Pro Casablanca', 'convocado', 'Validar denominación institucional exacta.', 9),

  ('20260000-0000-4000-8410-000000000025', '20260000-0000-4000-8400-000000000005', 'm5_natalia_fuentes', 'persona', 'Natalia Valentina Fuentes Donaire', null, 'Universidad Viña del Mar', 'organizador', null, 1),
  ('20260000-0000-4000-8410-000000000026', '20260000-0000-4000-8400-000000000005', 'm5_italo_campos', 'persona', 'Ítalo Andres Campos Montenegro', null, 'Universidad Viña del Mar', 'convocado', null, 2),
  ('20260000-0000-4000-8410-000000000027', '20260000-0000-4000-8400-000000000005', 'm5_carlos_liebig', 'persona', 'Carlos Eduardo Liebig Sanguineti', null, 'Universidad Viña del Mar', 'convocado', null, 3),
  ('20260000-0000-4000-8410-000000000028', '20260000-0000-4000-8400-000000000005', 'm5_veronica_valdes', 'persona', 'Veronica Andrea Valdés Ortiz-Arrieta', null, null, 'convocado', 'Institución pendiente de confirmar.', 4),
  ('20260000-0000-4000-8410-000000000029', '20260000-0000-4000-8400-000000000005', 'm5_eduardo_escalona', 'persona', 'Eduardo Escalona Seitz', null, null, 'convocado', 'Institución pendiente de confirmar.', 5),
  ('20260000-0000-4000-8410-000000000030', '20260000-0000-4000-8400-000000000005', 'm5_valeria_serrano', 'persona', 'Valeria Serrano', null, null, 'convocado', 'Institución pendiente de confirmar.', 6),
  ('20260000-0000-4000-8410-000000000031', '20260000-0000-4000-8400-000000000005', 'm5_alejandra_carvallo', 'persona', 'Alejandra Carvallo', null, null, 'convocado', 'Institución pendiente de confirmar.', 7),
  ('20260000-0000-4000-8410-000000000032', '20260000-0000-4000-8400-000000000005', 'm5_carmen_rios', 'persona', 'Carmen Rios', null, null, 'convocado', 'Institución pendiente de confirmar.', 8),
  ('20260000-0000-4000-8410-000000000033', '20260000-0000-4000-8400-000000000005', 'm5_javiera_cifuentes', 'persona', 'Javiera Cifuentes Figueroa', null, null, 'convocado', 'Institución pendiente de confirmar.', 9),
  ('20260000-0000-4000-8410-000000000034', '20260000-0000-4000-8400-000000000005', 'm5_rommy_escobar', 'persona', 'Rommy Escobar', null, null, 'convocado', 'Institución pendiente de confirmar.', 10),
  ('20260000-0000-4000-8410-000000000035', '20260000-0000-4000-8400-000000000005', 'm5_corporacion_casablanca', 'organizacion', 'Corporación Casablanca', null, 'Corporación Pro Casablanca', 'convocado', 'Validar denominación institucional exacta.', 11)
on conflict (source_key) do update set
  participant_kind = excluded.participant_kind,
  display_name = excluded.display_name,
  email = excluded.email,
  organization = excluded.organization,
  participation_status = excluded.participation_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order;

insert into public.meeting_agreements (
  id, meeting_id, source_key, title, description, agreement_type,
  responsible_name, responsible_organization, due_date, status,
  source_basis, notes, sort_order
)
values
  ('20260000-0000-4000-8420-000000000001', '20260000-0000-4000-8400-000000000002', 'm2_entrega_antecedentes', 'Entrega de antecedentes del Proyecto Icónico', 'Se dejó como respaldo la presentación expuesta y la versión actualizada de la propuesta de trabajo.', 'resultado_documentado', null, null, null, 'documentado', 'Correo de 20-05-2026', null, 1),

  ('20260000-0000-4000-8420-000000000002', '20260000-0000-4000-8400-000000000003', 'm3_adjuntar_propuesta', 'Adjuntar propuesta de trabajo actualizada', 'Incorporar la versión actualizada de la propuesta de trabajo del Proyecto Icónico.', 'compromiso', null, null, null, 'pendiente_confirmacion', 'Correo de 20-05-2026', null, 1),
  ('20260000-0000-4000-8420-000000000003', '20260000-0000-4000-8400-000000000003', 'm3_adjuntar_presentacion', 'Adjuntar presentación del 1 de abril', 'Incorporar la presentación expuesta ante el equipo municipal y Corporación Pro Casablanca.', 'compromiso', null, null, null, 'pendiente_confirmacion', 'Correo de 20-05-2026', null, 2),
  ('20260000-0000-4000-8420-000000000004', '20260000-0000-4000-8400-000000000003', 'm3_adjuntar_ficha_batro', 'Adjuntar ficha técnica de El Batro', 'Incorporar la ficha técnica de la propuesta a ejecutar en El Batro.', 'compromiso', null, null, null, 'pendiente_confirmacion', 'Correo de 20-05-2026', null, 3),
  ('20260000-0000-4000-8420-000000000005', '20260000-0000-4000-8400-000000000003', 'm3_canales_difusion', 'Respetar canales institucionales de difusión', 'Las comunicaciones del proyecto deben utilizar los canales institucionales correspondientes.', 'lineamiento', null, null, null, 'vigente', 'Correo de 20-05-2026', null, 4),
  ('20260000-0000-4000-8420-000000000006', '20260000-0000-4000-8400-000000000003', 'm3_mantener_copia', 'Mantener en copia a integrantes de la reunión', 'Incluir a las personas participantes en las comunicaciones asociadas al proyecto.', 'lineamiento', null, null, null, 'vigente', 'Correo de 20-05-2026', null, 5),

  ('20260000-0000-4000-8420-000000000007', '20260000-0000-4000-8400-000000000004', 'm4_enviar_requisitos_concurso', 'Enviar requisitos del concurso Vinculación con la Comunidad Línea 2', 'Compartir requisitos y antecedentes necesarios para la postulación al concurso.', 'seguimiento', null, null, null, 'pendiente_confirmacion', 'Correo de seguimiento asociado a la reunión', null, 1),
  ('20260000-0000-4000-8420-000000000008', '20260000-0000-4000-8400-000000000004', 'm4_lineas_tematicas', 'Considerar líneas temáticas para emprendimiento', 'Considerar contabilidad y formalización de negocio, además de difusión del emprendimiento.', 'lineamiento', null, null, null, 'vigente', 'Correo de seguimiento asociado a la reunión', null, 2),
  ('20260000-0000-4000-8420-000000000009', '20260000-0000-4000-8400-000000000004', 'm4_incluir_g_martinez', 'Incluir a G. Martínez en la coordinación', 'Incorporar a G. Martínez para apoyar la búsqueda de organizaciones de emprendedores.', 'seguimiento', 'G. Martínez', null, null, 'pendiente_confirmacion', 'Correo de seguimiento asociado a la reunión', 'Confirmar nombre completo y rol.', 3),

  ('20260000-0000-4000-8420-000000000010', '20260000-0000-4000-8400-000000000005', 'm5_alternativas_transporte', 'Evaluar alternativas de transporte y financiación', 'Definir alternativas de transporte y financiación para el operativo de salud del 27-08-2026.', 'seguimiento', null, null, '2026-08-27', 'pendiente_confirmacion', 'Correo de 19-06-2026', 'La fecha corresponde al operativo, no necesariamente al vencimiento del acuerdo.', 1),
  ('20260000-0000-4000-8420-000000000011', '20260000-0000-4000-8400-000000000005', 'm5_traslado_beneficiarios', 'Coordinar traslado de beneficiarios hacia El Batro', 'La contraparte evaluará o gestionará el traslado de beneficiarios hacia El Batro.', 'compromiso', null, 'Contraparte municipal', null, 'pendiente_confirmacion', 'Correo de 19-06-2026', null, 2),
  ('20260000-0000-4000-8420-000000000012', '20260000-0000-4000-8400-000000000005', 'm5_vehiculo_institucional', 'Evaluar uso de vehículo institucional', 'Revisar disponibilidad de vehículo institucional para apoyar el operativo.', 'seguimiento', null, 'Universidad Viña del Mar', null, 'pendiente_confirmacion', 'Correo de 19-06-2026', null, 3),
  ('20260000-0000-4000-8420-000000000013', '20260000-0000-4000-8400-000000000005', 'm5_solicitud_conductor_van', 'Solicitar conductor para VAN', 'Gestionar la solicitud mediante formulario con al menos 30 días de anticipación.', 'compromiso', null, 'Universidad Viña del Mar', null, 'pendiente_confirmacion', 'Correo de 19-06-2026', 'Fecha límite pendiente de confirmar administrativamente.', 4),
  ('20260000-0000-4000-8420-000000000014', '20260000-0000-4000-8400-000000000005', 'm5_transporte_mayor', 'Evaluar contratación de transporte de mayor capacidad', 'Analizar la contratación de un medio de transporte mayor si la demanda lo requiere.', 'seguimiento', null, null, null, 'pendiente_confirmacion', 'Correo de 19-06-2026', null, 5),
  ('20260000-0000-4000-8420-000000000015', '20260000-0000-4000-8400-000000000005', 'm5_financiacion_adicional', 'Solicitar financiación adicional', 'Gestionar una solicitud de financiación adicional mediante el formulario institucional correspondiente.', 'compromiso', null, 'Universidad Viña del Mar', null, 'pendiente_confirmacion', 'Correo de 19-06-2026', null, 6)
on conflict (source_key) do update set
  title = excluded.title,
  description = excluded.description,
  agreement_type = excluded.agreement_type,
  responsible_name = excluded.responsible_name,
  responsible_organization = excluded.responsible_organization,
  due_date = excluded.due_date,
  status = excluded.status,
  source_basis = excluded.source_basis,
  notes = excluded.notes,
  sort_order = excluded.sort_order;

insert into public.meeting_sources (
  id, meeting_id, source_key, source_type, title, source_date,
  availability_status, notes
)
values
  ('20260000-0000-4000-8430-000000000001', '20260000-0000-4000-8400-000000000001', 'm1_calendario', 'calendario', 'Evento de calendario: REUNIÓN PROYECTO ICÓNICO', '2026-03-23', 'referenciado_no_cargado', 'Convocatoria disponible; sin transcripción asociada.'),
  ('20260000-0000-4000-8430-000000000002', '20260000-0000-4000-8400-000000000002', 'm2_correo_20_mayo', 'correo', 'Correo: Información Proyecto Icónico. Facultad de Ciencias de la Vida', '2026-05-20', 'referenciado_no_cargado', 'Fuente retrospectiva de la reunión del 1 de abril.'),
  ('20260000-0000-4000-8430-000000000003', '20260000-0000-4000-8400-000000000002', 'm2_presentacion_1_abril', 'presentacion', 'Presentación expuesta el 1 de abril', '2026-04-01', 'referenciado_no_cargado', null),
  ('20260000-0000-4000-8430-000000000004', '20260000-0000-4000-8400-000000000002', 'm2_propuesta_actualizada', 'propuesta', 'Propuesta de trabajo actualizada del Proyecto Icónico', null, 'referenciado_no_cargado', null),
  ('20260000-0000-4000-8430-000000000005', '20260000-0000-4000-8400-000000000003', 'm3_correo_20_mayo', 'correo', 'Correo: Información Proyecto Icónico. Facultad de Ciencias de la Vida', '2026-05-20', 'referenciado_no_cargado', 'Contiene acuerdos y referencias documentales.'),
  ('20260000-0000-4000-8430-000000000006', '20260000-0000-4000-8400-000000000004', 'm4_calendario_26_mayo', 'calendario', 'Evento: Reunión online Alcaldía - Corporación Pro Casablanca - UVM', '2026-05-26', 'referenciado_no_cargado', null),
  ('20260000-0000-4000-8430-000000000007', '20260000-0000-4000-8400-000000000004', 'm4_correo_seguimiento', 'correo', 'Correo de seguimiento asociado a reunión del 26 de mayo', '2026-05-26', 'referenciado_no_cargado', 'Acuerdos documentados en correo, no en transcripción.'),
  ('20260000-0000-4000-8430-000000000008', '20260000-0000-4000-8400-000000000005', 'm5_calendario_17_junio', 'calendario', 'Evento de calendario: Reunión proyecto icónico', '2026-06-17', 'referenciado_no_cargado', null),
  ('20260000-0000-4000-8430-000000000009', '20260000-0000-4000-8400-000000000005', 'm5_correo_19_junio', 'correo', 'Correo: Consulta Proyecto Icónico Facultad de Ciencias de la Vida', '2026-06-19', 'referenciado_no_cargado', 'Contiene seguimientos de transporte y financiación.')
on conflict (source_key) do update set
  source_type = excluded.source_type,
  title = excluded.title,
  source_date = excluded.source_date,
  availability_status = excluded.availability_status,
  notes = excluded.notes;

insert into public.timeline_events (
  id, title, description, event_date, related_meeting_id, created_by
)
select *
from (
  values
    ('20260000-0000-4000-8500-000000000001'::uuid, 'Reunión Proyecto Icónico', 'Convocatoria online del equipo UVM y contrapartes; sin acuerdos documentados.', '2026-03-23'::date, '20260000-0000-4000-8400-000000000001'::uuid),
    ('20260000-0000-4000-8500-000000000002'::uuid, 'Reunión con equipo municipal y Corporación Pro Casablanca', 'Presentación del proyecto y entrega de antecedentes de trabajo.', '2026-04-01'::date, '20260000-0000-4000-8400-000000000002'::uuid),
    ('20260000-0000-4000-8500-000000000003'::uuid, 'Coordinación documental del Proyecto Icónico', 'Acuerdos sobre documentos, canales institucionales y comunicaciones.', '2026-05-20'::date, '20260000-0000-4000-8400-000000000003'::uuid),
    ('20260000-0000-4000-8500-000000000004'::uuid, 'Reunión Alcaldía - Corporación Pro Casablanca - UVM', 'Actualización de avances y coordinación de iniciativas comunitarias.', '2026-05-26'::date, '20260000-0000-4000-8400-000000000004'::uuid),
    ('20260000-0000-4000-8500-000000000005'::uuid, 'Reunión de avance Proyecto Icónico', 'Coordinación de transporte y financiación para operativo del 27 de agosto.', '2026-06-17'::date, '20260000-0000-4000-8400-000000000005'::uuid)
) as events(id, title, description, event_date, related_meeting_id)
left join lateral (
  select id as actor_id
  from public.profiles
  where role = 'admin_comite'
  order by created_at
  limit 1
) actor on true
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  event_date = excluded.event_date,
  related_meeting_id = excluded.related_meeting_id;

commit;
