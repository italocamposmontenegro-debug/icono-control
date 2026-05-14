-- Seed idempotente para Proyecto Iconico Envejecimiento Saludable Activo 2026.
-- Ejecutar desde Supabase SQL Editor con un usuario con permisos sobre el esquema public.
-- No elimina ni reemplaza registros existentes; las actividades se insertan solo si no existen.

begin;

with seed_careers(id, name, code, description) as (
  values
    ('20260000-0000-4000-8100-000000000001'::uuid, 'Interdisciplinaria', 'INTER', 'Actividades transdisciplinarias del Proyecto Iconico 2026.'),
    ('20260000-0000-4000-8100-000000000002'::uuid, 'Entrenador Deportivo', 'ED', 'Carrera asociada al Proyecto Iconico 2026.'),
    ('20260000-0000-4000-8100-000000000003'::uuid, 'Enfermeria', 'ENF', 'Carrera asociada al Proyecto Iconico 2026.'),
    ('20260000-0000-4000-8100-000000000004'::uuid, 'Fonoaudiologia', 'FONO', 'Carrera asociada al Proyecto Iconico 2026.'),
    ('20260000-0000-4000-8100-000000000005'::uuid, 'Kinesiologia', 'KIN', 'Carrera asociada al Proyecto Iconico 2026.'),
    ('20260000-0000-4000-8100-000000000006'::uuid, 'Nutricion y Dietetica', 'NUT', 'Carrera asociada al Proyecto Iconico 2026.'),
    ('20260000-0000-4000-8100-000000000007'::uuid, 'Terapia Ocupacional', 'TO', 'Carrera asociada al Proyecto Iconico 2026.')
)
insert into public.careers (id, name, code, description, active)
select id, name, code, description, true
from seed_careers sc
where not exists (
  select 1
  from public.careers c
  where lower(c.code) = lower(sc.code) or lower(c.name) = lower(sc.name)
);

insert into public.objectives (id, title, description, order_index, active)
select
  '20260000-0000-4000-9000-000000000001'::uuid,
  'Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario',
  'Promover el envejecimiento saludable y activo en poblacion objetivo, a traves de intervenciones de las diferentes disciplinas de la Facultad de Ciencias de la Vida.',
  2026,
  true
where not exists (
  select 1
  from public.objectives
  where id = '20260000-0000-4000-9000-000000000001'::uuid
     or title = 'Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario'
);

with seed_actor as (
  select id
  from public.profiles
  where role = 'admin_comite'
  order by created_at
  limit 1
),
seed_rows(
  id, title, description, career_code, responsible_email, start_date, end_date,
  status, priority, progress_percent, external_assistants_text, observations
) as (
  values
  (
    '20260000-0000-4000-8200-000000000001'::uuid,
    'Etapa 1: Aplicacion piloto encuesta SF-36 V2',
    'Aplicacion de piloto encuesta SF-36 V2, con validacion y autorizacion, en una muestra de beneficiarios directos seleccionada mediante muestreo intencionado.',
    'INTER', 'natalia.fuentes@uvm.cl', '2026-04-01'::date, '2026-05-31'::date,
    'en_curso', 'alta', 40,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 1
Periodo: abril-mayo 2026
Tipo: evaluacion / diagnostico / linea base
Ano: 2026
Territorio: Casablanca
Institucion vinculada: Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca
Poblacion objetivo: beneficiarios directos seleccionados mediante muestreo intencionado
Carrera(s): Interdisciplinaria
Responsable: Natalia Fuentes Donaire
Instrumento asociado: SF-36 V2
Objetivo asociado: Promover el envejecimiento saludable y activo en poblacion objetivo, a traves de intervenciones de las diferentes disciplinas de la Facultad de Ciencias de la Vida.
Ejes criticos: Salud cronica y preventiva
Evidencias esperadas: consentimiento asociado a Vinculacion con el Medio
Indicadores: Mejora de calidad de vida medida con SF-36
Proxima accion: Confirmar validacion, autorizacion y consentimiento asociado.
Datos pendientes: Pendiente de confirmar cierre de aplicacion piloto.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000002'::uuid,
    'Etapa 2: Ejecucion de actividades del Proyecto Iconico',
    'Ejecucion de iniciativas disciplinares e interdisciplinarias asociadas al envejecimiento saludable activo en Casablanca.',
    'INTER', 'natalia.fuentes@uvm.cl', '2026-05-01'::date, '2026-10-31'::date,
    'en_curso', 'alta', 15,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: mayo-octubre 2026
Tipo: intervencion / educacion / promocion de salud
Ano: 2026
Territorio: Casablanca
Institucion vinculada: Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca
Poblacion objetivo: personas mayores y comunidades vinculadas al proyecto
Carrera(s): Interdisciplinaria
Responsable: Natalia Fuentes Donaire
Ejes criticos: Salud cronica y preventiva; Dimension social y redes de apoyo; Gestion legal y acceso a la informacion; Bienestar emocional y salud mental; Movilidad y seguridad en el hogar
Evidencias esperadas: planificacion; registro de ejecucion; informe de resultados
Indicadores: Adherencia a programas; Indice de Vinculacion con el Medio
Proxima accion: Mantener seguimiento de iniciativas disciplinares e interdisciplinarias.
Datos pendientes: Pendiente de confirmar calendario consolidado por carrera.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000003'::uuid,
    'Taller de estimulacion cognitiva y autocuidado',
    'Taller orientado a estimulacion cognitiva y autocuidado para personas mayores, asociado al Proyecto Iconico 2026.',
    'INTER', null, '2026-05-01'::date, '2026-10-31'::date,
    'en_curso', 'media', 20,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: mayo-octubre 2026
Tipo: intervencion / educacion / promocion de salud
Ano: 2026
Territorio: Casablanca
Poblacion objetivo: personas mayores
Carrera(s): Fonoaudiologia / Terapia Ocupacional
Responsable: Pendiente de confirmar
Ejes criticos: Bienestar emocional y salud mental; Salud cronica y preventiva; Dimension social y redes de apoyo
Evidencias esperadas: planificacion del taller; lista de asistencia; registro fotografico; encuesta de satisfaccion; informe de actividad
Indicadores: Adherencia a programas; Satisfaccion usuaria
Proxima accion: Confirmar responsable operativo, fechas y sesiones.
Datos pendientes: Pendiente de confirmar responsable y cronograma especifico.
Observacion base: Proyecto adjudicado a fondo interno.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000004'::uuid,
    'Cuidar a quienes cuidan: Programa interdisciplinario de educacion en salud para mujeres cuidadoras del territorio de Casablanca',
    'Programa interdisciplinario de educacion en salud para mujeres cuidadoras del territorio de Casablanca.',
    'INTER', null, '2026-05-01'::date, '2026-10-31'::date,
    'en_curso', 'alta', 10,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: mayo-octubre 2026
Tipo: intervencion / educacion / promocion de salud
Ano: 2026
Territorio: Casablanca / sector El Batro
Poblacion objetivo: mujeres cuidadoras
Carrera(s): Interdisciplinaria
Responsable: Pendiente de confirmar
Ejes criticos: Salud cronica y preventiva; Dimension social y redes de apoyo; Bienestar emocional y salud mental
Evidencias esperadas: programa de sesiones; lista de asistencia; material educativo; encuesta de satisfaccion; informe de actividad
Indicadores: Adherencia a programas; Satisfaccion usuaria
Proxima accion: Confirmar calendario de sesiones y responsables por disciplina.
Datos pendientes: Pendiente de confirmar detalle de sesiones.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000005'::uuid,
    'Iniciativas de la Corporacion Pro Casablanca',
    'Actividad paraguas para mantener trazabilidad de iniciativas de la Corporacion Pro Casablanca hasta que se registren actividades especificas.',
    'INTER', null, null, null,
    'pendiente', 'media', 0,
    'Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: Pendiente de confirmar
Tipo: coordinacion / actividad paraguas
Ano: 2026
Territorio: Casablanca
Institucion vinculada: Corporacion Pro Casablanca
Poblacion objetivo: Por definir
Carrera(s): Interdisciplinaria
Responsable: Pendiente de confirmar
Ejes criticos: Por definir
Evidencias esperadas: acta o acuerdo de coordinacion; planificacion; registro de ejecucion; informe de resultados
Indicadores: Por definir
Proxima accion: Precisar iniciativas concretas de la Corporacion Pro Casablanca.
Datos pendientes: Poblacion objetivo, ejes criticos, fechas y responsables por definir.
Observacion base: Mantener como actividad paraguas hasta que se registren iniciativas especificas.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000006'::uuid,
    'Prevalencia de Sarcopenia y el valor predictivo del Angulo de Fase',
    'Proyecto de investigacion aplicada: Prevalencia de Sarcopenia y el valor predictivo del Angulo de Fase en adultos mayores de Casablanca, Valparaiso, Chile.',
    'INTER', null, null, null,
    'pendiente', 'alta', 0,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: segundo semestre 2026
Tipo: investigacion aplicada / evaluacion
Ano: 2026
Territorio: Casablanca
Poblacion objetivo: adultos mayores
Carrera(s): Interdisciplinaria
Responsable: Pendiente de confirmar
Ejes criticos: Salud cronica y preventiva; Movilidad y seguridad en el hogar
Evidencias esperadas: protocolo; consentimiento; base de datos; informe de resultados; producto cientifico
Indicadores: prevalencia de sarcopenia; angulo de fase; riesgo asociado a sarcopenia
Proxima accion: Confirmar protocolo, equipo responsable y calendario del segundo semestre.
Datos pendientes: Fechas especificas y responsable operativo pendientes de confirmar.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000007'::uuid,
    'Taller a mujeres cuidadoras del sector El Batro',
    'Actividad de Entrenador Deportivo enfocada en resistencia cardiovascular, fuerza muscular, flexibilidad, entrenamiento de fuerza, circuitos aerobicos, zumba y actividades ritmicas.',
    'ED', 'carlos.Liebig@uvm.cl', null, null,
    'pendiente', 'media', 0,
    'Sector El Batro, Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: segundo semestre 2026
Tipo: intervencion / promocion de salud
Ano: 2026
Territorio: sector El Batro, Casablanca
Poblacion objetivo: mujeres cuidadoras
Carrera(s): Entrenador Deportivo
Asignatura(s): Practica IV
Semestre: segundo semestre
Responsable: Carlos Liebig
Ejes criticos: Salud cronica y preventiva; Bienestar emocional y salud mental; Dimension social y redes de apoyo
Evidencias esperadas: planificacion de sesion; lista de asistencia; registro fotografico; rubrica o evaluacion estudiantil; encuesta de satisfaccion
Indicadores: Adherencia a programas; Desarrollo de competencias estudiantiles; Evaluacion del aprendizaje mediante rubrica
Proxima accion: Programar sesiones del segundo semestre y confirmar docentes/estudiantes.
Datos pendientes: Fechas especificas pendientes de confirmar.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000008'::uuid,
    'Capacitacion en primeros auxilios y habilitacion de sala',
    'Capacitacion en primeros auxilios a mujeres cuidadoras y personas mayores; habilitacion de sala de primeros auxilios en Centro Comunitario de Cuidados El Batro.',
    'ENF', null, null, null,
    'en_curso', 'alta', 10,
    'Centro Comunitario de Cuidados El Batro, Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: primer y segundo semestre 2026
Tipo: capacitacion / habilitacion
Ano: 2026
Territorio: Centro Comunitario de Cuidados El Batro, Casablanca
Poblacion objetivo: mujeres cuidadoras y personas mayores
Carrera(s): Enfermeria
Asignatura(s): Procedimientos I; Procedimientos II; Gerontologia
Semestre: primer y segundo semestre
Responsable: Pendiente de confirmar
Ejes criticos: Salud cronica y preventiva; Gestion legal y acceso a la informacion; Movilidad y seguridad en el hogar
Evidencias esperadas: material educativo; lista de asistencia; registro fotografico; informe de habilitacion; encuesta de satisfaccion
Indicadores: Adherencia a programas; Satisfaccion usuaria
Proxima accion: Confirmar fechas de capacitacion y alcance de habilitacion de sala.
Datos pendientes: Responsable operativo y fechas especificas pendientes de confirmar.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000009'::uuid,
    'Taller para personas mayores desde Fonoaudiologia',
    'Taller para personas mayores desde Fonoaudiologia, asociado a la asignatura Terapia del Lenguaje y Habla Adulto.',
    'FONO', null, null, null,
    'en_curso', 'media', 30,
    'Oficina de Personas Mayores de Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: primer semestre 2026
Tipo: taller / intervencion
Ano: 2026
Territorio: Oficina de Personas Mayores de Casablanca
Poblacion objetivo: personas mayores
Carrera(s): Fonoaudiologia
Asignatura(s): Terapia del Lenguaje y Habla Adulto
Semestre: primer semestre
Responsable: Pendiente de confirmar
Ejes criticos: Bienestar emocional y salud mental; Dimension social y redes de apoyo; Salud cronica y preventiva
Evidencias esperadas: planificacion; lista de asistencia; material educativo; registro fotografico; informe de actividad
Indicadores: Adherencia a programas; Satisfaccion usuaria
Proxima accion: Confirmar estado actual, fechas ejecutadas y evidencias disponibles.
Datos pendientes: Estado final sujeto a confirmacion de fechas del sistema.
Observacion base: Proyecto adjudicado a fondo interno.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000010'::uuid,
    'Programa de prevencion del riesgo de caida en adultos mayores institucionalizados',
    'Programa de prevencion del riesgo de caida en adultos mayores institucionalizados desde Kinesiologia.',
    'KIN', 'italo.campos@uvm.cl', null, null,
    'pendiente', 'alta', 0,
    'ELEAM HSM, Hospital Sanatorio Maritimo',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: segundo semestre 2026
Tipo: intervencion / evaluacion
Ano: 2026
Territorio: ELEAM HSM, Hospital Sanatorio Maritimo
Poblacion objetivo: adultos mayores institucionalizados
Carrera(s): Kinesiologia
Asignatura(s): Tecnicas Kinesicas / Gerontokinesiologia
Semestre: segundo semestre
Responsable: Italo Campos Montenegro
Ejes criticos: Movilidad y seguridad en el hogar; Salud cronica y preventiva
Evidencias esperadas: planificacion del programa; instrumentos de evaluacion; lista de asistencia; informe de resultados; rubrica estudiantil; registro fotografico
Indicadores: riesgo de caida; adherencia al programa; satisfaccion usuaria; desarrollo de competencias estudiantiles
Proxima accion: Confirmar campo clinico, calendario e instrumentos de evaluacion.
Datos pendientes: Confirmar ELEAM HSM / Hospital Sanatorio Maritimo como campo clinico si corresponde.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000011'::uuid,
    'Taller de alimentacion saludable para personas mayores',
    'Taller de alimentacion saludable para personas mayores, con orientaciones alimentarias y nutricionales en situaciones de patologia.',
    'NUT', 'natalia.fuentes@uvm.cl', null, null,
    'en_curso', 'media', 10,
    'El Batro / Centro Comunitario, Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: primer y segundo semestre 2026
Tipo: taller / educacion en salud
Ano: 2026
Territorio: El Batro / Centro Comunitario, Casablanca
Poblacion objetivo: mujeres cuidadoras de El Batro y personas mayores del Centro Comunitario
Carrera(s): Nutricion y Dietetica
Asignatura(s): Nutricion Adulto / Dietoterapia Adulto
Semestre: primer y segundo semestre
Responsable: Natalia Fuentes Donaire
Ejes criticos: Salud cronica y preventiva; Gestion legal y acceso a la informacion
Evidencias esperadas: material educativo; lista de asistencia; encuesta de satisfaccion; informe de actividad
Indicadores: Adherencia a programas; Satisfaccion usuaria
Proxima accion: Confirmar sesiones por asignatura y evidencias asociadas.
Datos pendientes: Fechas especificas pendientes de confirmar.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000012'::uuid,
    'Intervencion desde Terapia Ocupacional',
    'Intervencion desde Terapia Ocupacional para personas mayores en Oficina de Personas Mayores de Casablanca.',
    'TO', null, null, null,
    'en_curso', 'media', 30,
    'Oficina de Personas Mayores de Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 2
Periodo: primer semestre 2026
Tipo: intervencion
Ano: 2026
Territorio: Oficina de Personas Mayores de Casablanca
Poblacion objetivo: personas mayores
Carrera(s): Terapia Ocupacional
Asignatura(s): Intervencion
Semestre: primer semestre
Responsable: Pendiente de confirmar
Ejes criticos: Movilidad y seguridad en el hogar; Dimension social y redes de apoyo; Bienestar emocional y salud mental
Evidencias esperadas: planificacion; lista de asistencia; registro fotografico; informe de actividad; encuesta de satisfaccion
Indicadores: Adherencia a programas; Satisfaccion usuaria
Proxima accion: Confirmar estado actual, fechas ejecutadas y evidencias disponibles.
Datos pendientes: Estado final sujeto a confirmacion de fechas del sistema.
Observacion base: Proyecto adjudicado a fondo interno.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000013'::uuid,
    'Etapa 3: Cierre de iniciativas y medicion de impacto',
    'Aplicacion de encuesta SF-36 V2, encuestas de satisfaccion usuaria, encuestas a contraparte, docentes y estudiantes, y recopilacion de datos.',
    'INTER', 'natalia.fuentes@uvm.cl', '2026-11-01'::date, '2026-11-30'::date,
    'pendiente', 'alta', 0,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 3
Periodo: noviembre 2026
Tipo: evaluacion / medicion de impacto
Ano: 2026
Territorio: Casablanca
Poblacion objetivo: beneficiarios directos, contraparte, docentes y estudiantes
Carrera(s): Interdisciplinaria
Responsable: Natalia Fuentes Donaire
Ejes criticos: Salud cronica y preventiva; Dimension social y redes de apoyo; Gestion legal y acceso a la informacion; Bienestar emocional y salud mental; Movilidad y seguridad en el hogar
Evidencias esperadas: bases de datos; encuestas aplicadas; informe preliminar de impacto; sistematizacion de resultados
Indicadores: Mejora de calidad de vida medida con SF-36; Satisfaccion usuaria; Autoevaluacion; Reflexion critica
Proxima accion: Preparar instrumentos de cierre y matriz de recopilacion de datos.
Datos pendientes: Confirmar calendario de aplicacion de encuestas.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  ),
  (
    '20260000-0000-4000-8200-000000000014'::uuid,
    'Etapa 4: Evaluacion final y plan de mejora',
    'Elaboracion de informe final, plan de mejora continua como insumo 2027, registro de iniciativa en plataforma institucional y jornada de cierre institucional.',
    'INTER', 'natalia.fuentes@uvm.cl', '2026-12-01'::date, '2026-12-31'::date,
    'pendiente', 'alta', 0,
    'Ilustre Municipalidad de Casablanca; Corporacion Pro Casablanca',
    $obs$--- Seguimiento Proyecto Iconico 2026 ---
Proyecto: Proyecto Iconico Envejecimiento Saludable Activo. Un enfoque transdisciplinario
Etapa: Etapa 4
Periodo: diciembre 2026
Tipo: evaluacion final / plan de mejora
Ano: 2026
Territorio: Casablanca
Poblacion objetivo: equipo Proyecto Iconico 2026 y actores institucionales
Carrera(s): Interdisciplinaria
Responsable: Natalia Fuentes Donaire
Ejes criticos: Salud cronica y preventiva; Dimension social y redes de apoyo; Gestion legal y acceso a la informacion; Bienestar emocional y salud mental; Movilidad y seguridad en el hogar
Evidencias esperadas: informe final; plan de mejora 2027; acta de cierre; registro en plataforma institucional; presentacion de cierre
Indicadores: Informe academico; Plan de mejora de asignatura; Indice de Vinculacion con el Medio; Publicaciones; Tesis; Congresos
Proxima accion: Definir responsables de informe final, plan de mejora y jornada de cierre.
Datos pendientes: Confirmar fecha de jornada de cierre institucional.
--- Fin Seguimiento Proyecto Iconico 2026 ---$obs$
  )
)
insert into public.activities (
  id, title, description, objective_id, career_id, start_date, end_date,
  status, priority, progress_percent, responsible_profile_id,
  internal_assistants_text, external_assistants_text, observations, created_by
)
select
  sr.id,
  sr.title,
  sr.description,
  '20260000-0000-4000-9000-000000000001'::uuid,
  c.id,
  sr.start_date,
  sr.end_date,
  sr.status,
  sr.priority,
  sr.progress_percent,
  p.id,
  '',
  sr.external_assistants_text,
  sr.observations,
  (select id from seed_actor)
from seed_rows sr
left join public.careers c on lower(c.code) = lower(sr.career_code)
left join public.profiles p on lower(p.email) = lower(sr.responsible_email)
on conflict (id) do nothing;

with seed_actor as (
  select id
  from public.profiles
  where role = 'admin_comite'
  order by created_at
  limit 1
),
seed_events(id, title, description, event_date) as (
  values
    ('20260000-0000-4000-8300-000000000001'::uuid, 'Etapa 1: Aplicacion piloto SF-36 V2', 'Piloto de linea base y consentimiento asociado a Vinculacion con el Medio.', '2026-04-01'::date),
    ('20260000-0000-4000-8300-000000000002'::uuid, 'Etapa 2: Ejecucion de iniciativas', 'Inicio del periodo de actividades disciplinares e interdisciplinarias en Casablanca.', '2026-05-01'::date),
    ('20260000-0000-4000-8300-000000000003'::uuid, 'Etapa 3: Medicion de impacto', 'Aplicacion de encuestas y recopilacion de datos de cierre.', '2026-11-01'::date),
    ('20260000-0000-4000-8300-000000000004'::uuid, 'Etapa 4: Evaluacion final y plan de mejora', 'Informe final, plan de mejora 2027 y jornada de cierre institucional.', '2026-12-01'::date)
)
insert into public.timeline_events (id, title, description, event_date, created_by)
select id, title, description, event_date, (select id from seed_actor)
from seed_events
on conflict (id) do nothing;

commit;
