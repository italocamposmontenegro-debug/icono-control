import { createElement, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, ClipboardCheck, FileText,
  Loader, Plus, Save, Trash2, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_MEETING = {
  title: '',
  meeting_date: '',
  start_time: '',
  end_time: '',
  record_type: 'reunion',
  modality: 'por_confirmar',
  platform_location: '',
  organizer_name: '',
  organizer_email: '',
  documentation_level: 'antecedente',
  transcript_status: 'no_consta',
  source_summary: '',
  repository_notes: '',
  raw_participants_text: '',
  raw_agreements_text: '',
};

const newKey = prefix => `manual_${prefix}_${crypto.randomUUID()}`;
const nullable = value => value === '' ? null : value;
const timeValue = value => value ? String(value).slice(0, 5) : '';

function Field({ label, children, wide = false }) {
  return <label className={wide ? 'meeting-form-field wide' : 'meeting-form-field'}><span>{label}</span>{children}</label>;
}

export default function MeetingFormPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(EMPTY_MEETING);
  const [participants, setParticipants] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [sources, setSources] = useState([]);
  const [activities, setActivities] = useState([]);
  const [originalIds, setOriginalIds] = useState({ participants: [], agreements: [], sources: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [meetingResult, participantsResult, agreementsResult, sourcesResult, activitiesResult] = await Promise.all([
        supabase.from('meetings').select('*').eq('id', id).single(),
        supabase.from('meeting_participants').select('*').eq('meeting_id', id).order('sort_order'),
        supabase.from('meeting_agreements').select('*').eq('meeting_id', id).order('sort_order'),
        supabase.from('meeting_sources').select('*').eq('meeting_id', id).order('source_date'),
        supabase.from('activities').select('id, title').order('title'),
      ]);

      if (cancelled) return;
      if (meetingResult.error) {
        setError(meetingResult.error.message);
        setLoading(false);
        return;
      }

      setMeeting({
        ...EMPTY_MEETING,
        ...meetingResult.data,
        start_time: timeValue(meetingResult.data.start_time),
        end_time: timeValue(meetingResult.data.end_time),
        platform_location: meetingResult.data.platform_location || '',
        organizer_name: meetingResult.data.organizer_name || '',
        organizer_email: meetingResult.data.organizer_email || '',
        source_summary: meetingResult.data.source_summary || '',
        repository_notes: meetingResult.data.repository_notes || '',
        raw_participants_text: meetingResult.data.raw_participants_text || '',
        raw_agreements_text: meetingResult.data.raw_agreements_text || '',
      });
      setParticipants(participantsResult.data || []);
      setAgreements(agreementsResult.data || []);
      setSources(sourcesResult.data || []);
      setActivities(activitiesResult.data || []);
      setOriginalIds({
        participants: (participantsResult.data || []).map(item => item.id),
        agreements: (agreementsResult.data || []).map(item => item.id),
        sources: (sourcesResult.data || []).map(item => item.id),
      });
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const updateMeeting = (field, value) => setMeeting(current => ({ ...current, [field]: value }));
  const updateRow = (setter, index, field, value) => setter(current =>
    current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)
  );
  const removeRow = (setter, index) => setter(current => current.filter((_, rowIndex) => rowIndex !== index));

  const addParticipant = () => setParticipants(current => [...current, {
    source_key: newKey('participant'),
    participant_kind: 'persona',
    display_name: '',
    email: '',
    organization: '',
    participation_status: 'pendiente_de_confirmar',
    notes: '',
  }]);

  const addAgreement = () => setAgreements(current => [...current, {
    source_key: newKey('agreement'),
    title: '',
    description: '',
    agreement_type: 'seguimiento',
    responsible_name: '',
    responsible_organization: '',
    due_date: '',
    status: 'pendiente_confirmacion',
    related_activity_id: '',
    source_basis: '',
    notes: '',
  }]);

  const addSource = () => setSources(current => [...current, {
    source_key: newKey('source'),
    source_type: 'otro',
    title: '',
    source_date: '',
    availability_status: 'referenciado_no_cargado',
    file_url: '',
    notes: '',
  }]);

  async function saveCollection(table, rows, initialIds, mapper) {
    const payload = rows.map((row, index) => mapper(row, index));
    if (payload.length) {
      const { error: upsertError } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (upsertError) throw upsertError;
    }

    const retainedIds = new Set(rows.map(row => row.id).filter(Boolean));
    const deletedIds = initialIds.filter(rowId => !retainedIds.has(rowId));
    if (deletedIds.length) {
      const { error: deleteError } = await supabase.from(table).delete().in('id', deletedIds);
      if (deleteError) throw deleteError;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const meetingPayload = {
        title: meeting.title.trim(),
        meeting_date: meeting.meeting_date,
        start_time: nullable(meeting.start_time),
        end_time: nullable(meeting.end_time),
        record_type: meeting.record_type,
        modality: meeting.modality,
        platform_location: nullable(meeting.platform_location.trim()),
        organizer_name: nullable(meeting.organizer_name.trim()),
        organizer_email: nullable(meeting.organizer_email.trim()),
        documentation_level: meeting.documentation_level,
        transcript_status: meeting.transcript_status,
        source_summary: nullable(meeting.source_summary.trim()),
        repository_notes: nullable(meeting.repository_notes.trim()),
        raw_participants_text: nullable(meeting.raw_participants_text.trim()),
        raw_agreements_text: nullable(meeting.raw_agreements_text.trim()),
        updated_by: profile?.id || null,
      };

      const { error: meetingError } = await supabase.from('meetings').update(meetingPayload).eq('id', id);
      if (meetingError) throw meetingError;

      await saveCollection('meeting_participants', participants, originalIds.participants, (row, index) => ({
        ...(row.id ? { id: row.id } : {}),
        meeting_id: id,
        source_key: row.source_key || newKey('participant'),
        participant_kind: row.participant_kind,
        display_name: row.display_name.trim(),
        email: nullable((row.email || '').trim()),
        organization: nullable((row.organization || '').trim()),
        participation_status: row.participation_status,
        notes: nullable((row.notes || '').trim()),
        sort_order: index + 1,
      }));

      await saveCollection('meeting_agreements', agreements, originalIds.agreements, (row, index) => ({
        ...(row.id ? { id: row.id } : {}),
        meeting_id: id,
        source_key: row.source_key || newKey('agreement'),
        title: row.title.trim(),
        description: nullable((row.description || '').trim()),
        agreement_type: row.agreement_type,
        responsible_name: nullable((row.responsible_name || '').trim()),
        responsible_organization: nullable((row.responsible_organization || '').trim()),
        due_date: nullable(row.due_date),
        status: row.status,
        related_activity_id: nullable(row.related_activity_id),
        source_basis: nullable((row.source_basis || '').trim()),
        notes: nullable((row.notes || '').trim()),
        sort_order: index + 1,
      }));

      await saveCollection('meeting_sources', sources, originalIds.sources, row => ({
        ...(row.id ? { id: row.id } : {}),
        meeting_id: id,
        source_key: row.source_key || newKey('source'),
        source_type: row.source_type,
        title: row.title.trim(),
        source_date: nullable(row.source_date),
        availability_status: row.availability_status,
        file_path: nullable(row.file_path),
        file_url: nullable((row.file_url || '').trim()),
        notes: nullable((row.notes || '').trim()),
      }));

      await supabase
        .from('timeline_events')
        .update({ title: meetingPayload.title, event_date: meetingPayload.meeting_date })
        .eq('related_meeting_id', id);

      navigate(`/reuniones/${id}`);
    } catch (saveError) {
      setError(saveError.message || 'No fue posible guardar los cambios.');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page-content"><div className="skeleton skeleton-card" style={{ height: 540 }} /></div>;
  }

  return (
    <form className="page-content meeting-form-page" onSubmit={handleSubmit}>
      <div className="meeting-form-header">
        <div>
          <Link to={`/reuniones/${id}`} className="meeting-form-back"><ArrowLeft size={15} /> Volver al detalle</Link>
          <h1>Editar reunión</h1>
          <p>Actualiza la coordinación, participantes, acuerdos y fuentes documentales.</p>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? <Loader size={15} className="spin" /> : <Save size={15} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card meeting-form-section">
        <div className="meeting-form-section-title"><CalendarDays size={18} /><div><h2>Información general</h2><p>Datos formales y nivel de respaldo de la reunión.</p></div></div>
        <div className="meeting-form-grid">
          <Field label="Título" wide><input className="form-input" required value={meeting.title} onChange={event => updateMeeting('title', event.target.value)} /></Field>
          <Field label="Fecha"><input className="form-input" type="date" required value={meeting.meeting_date} onChange={event => updateMeeting('meeting_date', event.target.value)} /></Field>
          <Field label="Tipo de registro"><select className="form-select" value={meeting.record_type} onChange={event => updateMeeting('record_type', event.target.value)}><option value="reunion">Reunión</option><option value="antecedente_reunion">Antecedente de reunión</option></select></Field>
          <Field label="Hora de inicio"><input className="form-input" type="time" value={meeting.start_time} onChange={event => updateMeeting('start_time', event.target.value)} /></Field>
          <Field label="Hora de término"><input className="form-input" type="time" value={meeting.end_time} onChange={event => updateMeeting('end_time', event.target.value)} /></Field>
          <Field label="Modalidad"><select className="form-select" value={meeting.modality} onChange={event => updateMeeting('modality', event.target.value)}><option value="online">Online</option><option value="presencial">Presencial</option><option value="hibrida">Híbrida</option><option value="por_confirmar">Por confirmar</option></select></Field>
          <Field label="Plataforma o lugar"><input className="form-input" value={meeting.platform_location} onChange={event => updateMeeting('platform_location', event.target.value)} /></Field>
          <Field label="Organizador/a"><input className="form-input" value={meeting.organizer_name} onChange={event => updateMeeting('organizer_name', event.target.value)} /></Field>
          <Field label="Correo del organizador"><input className="form-input" type="email" value={meeting.organizer_email} onChange={event => updateMeeting('organizer_email', event.target.value)} /></Field>
          <Field label="Respaldo documental"><select className="form-select" value={meeting.documentation_level} onChange={event => updateMeeting('documentation_level', event.target.value)}><option value="convocatoria">Convocatoria</option><option value="correo_posterior">Correo posterior</option><option value="calendario_y_correo">Calendario y correo</option><option value="antecedente">Antecedente</option></select></Field>
          <Field label="Transcripción"><select className="form-select" value={meeting.transcript_status} onChange={event => updateMeeting('transcript_status', event.target.value)}><option value="disponible">Disponible</option><option value="no_disponible">No disponible</option><option value="no_consta">No consta</option></select></Field>
          <Field label="Fuente principal" wide><textarea className="form-textarea" value={meeting.source_summary} onChange={event => updateMeeting('source_summary', event.target.value)} /></Field>
          <Field label="Observaciones del repositorio" wide><textarea className="form-textarea" value={meeting.repository_notes} onChange={event => updateMeeting('repository_notes', event.target.value)} /></Field>
          <Field label="Texto original de participantes" wide><textarea className="form-textarea" value={meeting.raw_participants_text} onChange={event => updateMeeting('raw_participants_text', event.target.value)} /></Field>
          <Field label="Texto original de acuerdos" wide><textarea className="form-textarea" value={meeting.raw_agreements_text} onChange={event => updateMeeting('raw_agreements_text', event.target.value)} /></Field>
        </div>
      </section>

      <EditableSection icon={Users} title="Participantes" subtitle="Personas, organizaciones y condición de participación" onAdd={addParticipant}>
        {participants.map((row, index) => (
          <div className="meeting-edit-card" key={row.id || row.source_key}>
            <button type="button" className="meeting-remove" onClick={() => removeRow(setParticipants, index)} title="Eliminar participante"><Trash2 size={15} /></button>
            <div className="meeting-form-grid compact">
              <Field label="Nombre" wide><input className="form-input" required value={row.display_name} onChange={event => updateRow(setParticipants, index, 'display_name', event.target.value)} /></Field>
              <Field label="Tipo"><select className="form-select" value={row.participant_kind} onChange={event => updateRow(setParticipants, index, 'participant_kind', event.target.value)}><option value="persona">Persona</option><option value="organizacion">Organización</option><option value="contacto_por_confirmar">Contacto por confirmar</option></select></Field>
              <Field label="Condición"><select className="form-select" value={row.participation_status} onChange={event => updateRow(setParticipants, index, 'participation_status', event.target.value)}><option value="organizador">Organizador/a</option><option value="convocado">Convocado/a</option><option value="asistencia_confirmada">Asistencia confirmada</option><option value="mencionado_en_fuente">Mencionado en fuente</option><option value="representacion_institucional">Representación institucional</option><option value="pendiente_de_confirmar">Pendiente de confirmar</option></select></Field>
              <Field label="Institución"><input className="form-input" value={row.organization || ''} onChange={event => updateRow(setParticipants, index, 'organization', event.target.value)} /></Field>
              <Field label="Correo"><input className="form-input" type="email" value={row.email || ''} onChange={event => updateRow(setParticipants, index, 'email', event.target.value)} /></Field>
              <Field label="Observaciones" wide><textarea className="form-textarea" value={row.notes || ''} onChange={event => updateRow(setParticipants, index, 'notes', event.target.value)} /></Field>
            </div>
          </div>
        ))}
      </EditableSection>

      <EditableSection icon={ClipboardCheck} title="Acuerdos y seguimientos" subtitle="Compromisos, responsables, plazos y estado" onAdd={addAgreement}>
        {agreements.map((row, index) => (
          <div className="meeting-edit-card" key={row.id || row.source_key}>
            <button type="button" className="meeting-remove" onClick={() => removeRow(setAgreements, index)} title="Eliminar acuerdo"><Trash2 size={15} /></button>
            <div className="meeting-form-grid compact">
              <Field label="Acuerdo" wide><input className="form-input" required value={row.title} onChange={event => updateRow(setAgreements, index, 'title', event.target.value)} /></Field>
              <Field label="Tipo"><select className="form-select" value={row.agreement_type} onChange={event => updateRow(setAgreements, index, 'agreement_type', event.target.value)}><option value="acuerdo">Acuerdo</option><option value="compromiso">Compromiso</option><option value="seguimiento">Seguimiento</option><option value="lineamiento">Lineamiento</option><option value="resultado_documentado">Resultado documentado</option></select></Field>
              <Field label="Estado"><select className="form-select" value={row.status} onChange={event => updateRow(setAgreements, index, 'status', event.target.value)}><option value="pendiente_confirmacion">Pendiente de confirmar</option><option value="planificado">Planificado</option><option value="en_ejecucion">En ejecución</option><option value="completado">Completado</option><option value="vigente">Vigente</option><option value="documentado">Documentado</option><option value="observado">Observado</option></select></Field>
              <Field label="Responsable"><input className="form-input" value={row.responsible_name || ''} onChange={event => updateRow(setAgreements, index, 'responsible_name', event.target.value)} /></Field>
              <Field label="Institución responsable"><input className="form-input" value={row.responsible_organization || ''} onChange={event => updateRow(setAgreements, index, 'responsible_organization', event.target.value)} /></Field>
              <Field label="Fecha límite"><input className="form-input" type="date" value={row.due_date || ''} onChange={event => updateRow(setAgreements, index, 'due_date', event.target.value)} /></Field>
              <Field label="Actividad vinculada"><select className="form-select" value={row.related_activity_id || ''} onChange={event => updateRow(setAgreements, index, 'related_activity_id', event.target.value)}><option value="">Sin vincular</option>{activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></Field>
              <Field label="Descripción" wide><textarea className="form-textarea" value={row.description || ''} onChange={event => updateRow(setAgreements, index, 'description', event.target.value)} /></Field>
              <Field label="Fuente del acuerdo"><input className="form-input" value={row.source_basis || ''} onChange={event => updateRow(setAgreements, index, 'source_basis', event.target.value)} /></Field>
              <Field label="Observaciones"><input className="form-input" value={row.notes || ''} onChange={event => updateRow(setAgreements, index, 'notes', event.target.value)} /></Field>
            </div>
          </div>
        ))}
      </EditableSection>

      <EditableSection icon={FileText} title="Fuentes documentales" subtitle="Calendarios, correos, presentaciones y otros respaldos" onAdd={addSource}>
        {sources.map((row, index) => (
          <div className="meeting-edit-card" key={row.id || row.source_key}>
            <button type="button" className="meeting-remove" onClick={() => removeRow(setSources, index)} title="Eliminar fuente"><Trash2 size={15} /></button>
            <div className="meeting-form-grid compact">
              <Field label="Título" wide><input className="form-input" required value={row.title} onChange={event => updateRow(setSources, index, 'title', event.target.value)} /></Field>
              <Field label="Tipo"><select className="form-select" value={row.source_type} onChange={event => updateRow(setSources, index, 'source_type', event.target.value)}><option value="calendario">Calendario</option><option value="correo">Correo</option><option value="presentacion">Presentación</option><option value="propuesta">Propuesta</option><option value="ficha_tecnica">Ficha técnica</option><option value="acta">Acta</option><option value="otro">Otro</option></select></Field>
              <Field label="Fecha"><input className="form-input" type="date" value={row.source_date || ''} onChange={event => updateRow(setSources, index, 'source_date', event.target.value)} /></Field>
              <Field label="Disponibilidad"><select className="form-select" value={row.availability_status} onChange={event => updateRow(setSources, index, 'availability_status', event.target.value)}><option value="cargado">Cargado</option><option value="referenciado_no_cargado">Referenciado, no cargado</option><option value="no_disponible">No disponible</option></select></Field>
              <Field label="Enlace"><input className="form-input" type="url" value={row.file_url || ''} onChange={event => updateRow(setSources, index, 'file_url', event.target.value)} /></Field>
              <Field label="Observaciones" wide><textarea className="form-textarea" value={row.notes || ''} onChange={event => updateRow(setSources, index, 'notes', event.target.value)} /></Field>
            </div>
          </div>
        ))}
      </EditableSection>

      <div className="meeting-form-footer">
        <Link className="btn btn-outline" to={`/reuniones/${id}`}>Cancelar</Link>
        <button className="btn btn-primary" type="submit" disabled={saving}><Save size={15} /> Guardar cambios</button>
      </div>

      <style>{`
        .meeting-form-page { background: linear-gradient(180deg, #f8fafc, #f3f6f8); }
        .meeting-form-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; margin-bottom: var(--space-lg); }
        .meeting-form-header h1 { margin: 8px 0 4px; font-size: clamp(1.8rem, 4vw, 2.8rem); }
        .meeting-form-header p { color: var(--color-text-muted); }
        .meeting-form-back { display: inline-flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: 0.8rem; font-weight: 750; }
        .meeting-form-section { padding: var(--space-lg); margin-bottom: var(--space-md); }
        .meeting-form-section-title { display: flex; gap: 10px; align-items: flex-start; margin-bottom: var(--space-lg); }
        .meeting-form-section-title svg { color: var(--color-accent); }
        .meeting-form-section-title h2 { margin: 0; font-size: 1.05rem; }
        .meeting-form-section-title p { margin-top: 3px; color: var(--color-text-muted); font-size: 0.76rem; }
        .meeting-form-section-title .btn { margin-left: auto; }
        .meeting-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
        .meeting-form-grid.compact { padding-right: 30px; }
        .meeting-form-field { display: flex; flex-direction: column; gap: 6px; }
        .meeting-form-field.wide { grid-column: 1 / -1; }
        .meeting-form-field > span { color: var(--color-text-secondary); font-size: 0.73rem; font-weight: 800; }
        .meeting-form-field .form-textarea { min-height: 82px; }
        .meeting-edit-card { position: relative; padding: 15px; margin-top: 10px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-alt); }
        .meeting-remove { position: absolute; top: 12px; right: 12px; z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; border: none; border-radius: 8px; background: rgba(217,45,32,0.09); color: #b42318; }
        .meeting-form-footer { position: sticky; bottom: 12px; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 12px; border: 1px solid var(--color-border); border-radius: 14px; background: rgba(255,255,255,0.92); box-shadow: 0 16px 38px rgba(15,23,42,0.12); backdrop-filter: blur(12px); }
        @media (max-width: 760px) {
          .meeting-form-header { align-items: flex-start; flex-direction: column; }
          .meeting-form-grid { grid-template-columns: 1fr; }
          .meeting-form-field.wide { grid-column: auto; }
          .meeting-form-grid.compact { padding-right: 0; padding-top: 30px; }
        }
      `}</style>
    </form>
  );
}

function EditableSection({ icon, title, subtitle, onAdd, children }) {
  return (
    <section className="card meeting-form-section">
      <div className="meeting-form-section-title">
        {createElement(icon, { size: 18 })}
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onAdd}><Plus size={14} /> Agregar</button>
      </div>
      {children}
    </section>
  );
}
