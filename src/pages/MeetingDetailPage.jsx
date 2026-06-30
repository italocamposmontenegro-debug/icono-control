import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Clock3,
  FileText, Mail, MapPin, ShieldCheck, Users, Video
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateOnly } from '../utils/date';

const PARTICIPATION_LABELS = {
  organizador: 'Organizador/a',
  convocado: 'Convocado/a',
  asistencia_confirmada: 'Asistencia confirmada',
  mencionado_en_fuente: 'Mencionado en fuente',
  representacion_institucional: 'Representación institucional',
  pendiente_de_confirmar: 'Pendiente de confirmar',
};

const AGREEMENT_LABELS = {
  pendiente_confirmacion: 'Pendiente de confirmar',
  planificado: 'Planificado',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
  vigente: 'Vigente',
  documentado: 'Documentado',
  observado: 'Observado',
};

const SOURCE_LABELS = {
  calendario: 'Calendario',
  correo: 'Correo',
  presentacion: 'Presentación',
  propuesta: 'Propuesta',
  ficha_tecnica: 'Ficha técnica',
  acta: 'Acta',
  otro: 'Otro',
};

function formatTime(value) {
  return value ? String(value).slice(0, 5) : null;
}

export default function MeetingDetailPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [meetingResult, participantsResult, agreementsResult, sourcesResult] = await Promise.all([
        supabase.from('meetings').select('*').eq('id', id).single(),
        supabase.from('meeting_participants').select('*').eq('meeting_id', id).order('sort_order'),
        supabase.from('meeting_agreements').select('*, activities(title)').eq('meeting_id', id).order('sort_order'),
        supabase.from('meeting_sources').select('*').eq('meeting_id', id).order('source_date'),
      ]);

      if (!cancelled) {
        setMeeting(meetingResult.data || null);
        setParticipants(participantsResult.data || []);
        setAgreements(agreementsResult.data || []);
        setSources(sourcesResult.data || []);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="page-content"><div className="skeleton skeleton-card" style={{ height: 480 }} /></div>;
  }

  if (!meeting) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <CalendarDays size={48} />
          <p>No fue posible encontrar esta reunión.</p>
          <Link className="btn btn-primary" to="/reuniones">Volver a reuniones</Link>
        </div>
      </div>
    );
  }

  const startTime = formatTime(meeting.start_time);
  const endTime = formatTime(meeting.end_time);
  const confirmedAttendance = participants.filter(
    participant => participant.participation_status === 'asistencia_confirmada'
  ).length;
  const pendingAgreements = agreements.filter(
    agreement => agreement.status === 'pendiente_confirmacion'
  ).length;

  return (
    <div className="page-content meeting-detail-page">
      <Link to="/reuniones" className="meeting-back"><ArrowLeft size={15} /> Volver a reuniones</Link>

      <section className="meeting-detail-hero">
        <div>
          <span className="meeting-detail-kicker">
            {meeting.record_type === 'reunion' ? 'Reunión interinstitucional' : 'Antecedente documentado'}
          </span>
          <h1>{meeting.title}</h1>
          <div className="meeting-detail-meta">
            <span><CalendarDays size={15} />{formatDateOnly(meeting.meeting_date, { dateStyle: 'long' })}</span>
            <span><Clock3 size={15} />{startTime ? `${startTime}${endTime ? ` a ${endTime}` : ''}` : 'Horario por confirmar'}</span>
            <span>{meeting.modality === 'online' ? <Video size={15} /> : <MapPin size={15} />}{meeting.modality === 'por_confirmar' ? 'Modalidad por confirmar' : meeting.modality}</span>
          </div>
        </div>
        <div className="meeting-trace-card">
          <ShieldCheck size={22} />
          <strong>{meeting.documentation_level.replaceAll('_', ' ')}</strong>
          <span>nivel de respaldo</span>
        </div>
      </section>

      <section className="meeting-detail-metrics">
        <div><Users size={17} /><strong>{participants.length}</strong><span>registros de participación</span></div>
        <div><CheckCircle2 size={17} /><strong>{confirmedAttendance}</strong><span>asistencias confirmadas</span></div>
        <div><ClipboardCheck size={17} /><strong>{agreements.length}</strong><span>acuerdos y seguimientos</span></div>
        <div><Clock3 size={17} /><strong>{pendingAgreements}</strong><span>pendientes de confirmar</span></div>
      </section>

      <section className="meeting-detail-grid">
        <article className="card meeting-context-card">
          <div className="card-header"><span className="card-title">Contexto de la reunión</span></div>
          <dl className="meeting-definition-list">
            <div><dt>Organiza</dt><dd>{meeting.organizer_name || 'Pendiente de confirmar'}</dd></div>
            <div><dt>Modalidad</dt><dd>{meeting.modality === 'por_confirmar' ? 'Pendiente de confirmar' : meeting.modality}</dd></div>
            <div><dt>Plataforma o lugar</dt><dd>{meeting.platform_location || 'Pendiente de confirmar'}</dd></div>
            <div><dt>Transcripción</dt><dd>{meeting.transcript_status === 'no_disponible' ? 'No disponible' : meeting.transcript_status.replaceAll('_', ' ')}</dd></div>
          </dl>
          {meeting.source_summary && (
            <div className="meeting-source-summary">
              <FileText size={16} />
              <span><strong>Fuente principal</strong>{meeting.source_summary}</span>
            </div>
          )}
          {meeting.repository_notes && <p className="meeting-repository-note">{meeting.repository_notes}</p>}
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Participantes y personas identificadas</span>
            <span className="badge">{participants.length}</span>
          </div>
          <div className="participant-list">
            {participants.map(participant => (
              <div className="participant-row" key={participant.id}>
                <div className="participant-avatar">{participant.display_name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{participant.display_name}</strong>
                  <span>{participant.organization || 'Institución pendiente de confirmar'}</span>
                  {participant.email && <small><Mail size={11} />{participant.email}</small>}
                </div>
                <span className={`participation-status ${participant.participation_status}`}>
                  {PARTICIPATION_LABELS[participant.participation_status] || participant.participation_status}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card meeting-agreements-card">
        <div className="card-header">
          <span className="card-title">Acuerdos, compromisos y seguimientos</span>
          <span className="badge">{agreements.length}</span>
        </div>
        {agreements.length === 0 ? (
          <div className="meeting-empty-note">
            No existen acuerdos específicos documentados en la evidencia disponible.
          </div>
        ) : (
          <div className="agreement-list">
            {agreements.map((agreement, index) => (
              <div className="agreement-row" key={agreement.id}>
                <span className="agreement-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="agreement-content">
                  <div className="agreement-title-row">
                    <h3>{agreement.title}</h3>
                    <span className={`agreement-status ${agreement.status}`}>
                      {AGREEMENT_LABELS[agreement.status] || agreement.status}
                    </span>
                  </div>
                  {agreement.description && <p>{agreement.description}</p>}
                  <div className="agreement-meta">
                    <span>Tipo: {agreement.agreement_type.replaceAll('_', ' ')}</span>
                    <span>Responsable: {agreement.responsible_name || agreement.responsible_organization || 'Pendiente de confirmar'}</span>
                    <span>Plazo: {agreement.due_date ? formatDateOnly(agreement.due_date) : 'Pendiente de confirmar'}</span>
                    {agreement.activities?.title && <span>Actividad: {agreement.activities.title}</span>}
                  </div>
                  {agreement.source_basis && <small>Respaldo: {agreement.source_basis}</small>}
                  {agreement.notes && <small>Observación: {agreement.notes}</small>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card meeting-sources-card">
        <div className="card-header">
          <span className="card-title">Fuentes y respaldo documental</span>
          <span className="badge">{sources.length}</span>
        </div>
        <div className="source-list">
          {sources.map(source => (
            <div className="source-row" key={source.id}>
              <FileText size={17} />
              <div>
                <strong>{source.title}</strong>
                <span>
                  {SOURCE_LABELS[source.source_type] || source.source_type}
                  {source.source_date ? ` · ${formatDateOnly(source.source_date)}` : ''}
                </span>
                {source.notes && <small>{source.notes}</small>}
              </div>
              <span className={`source-availability ${source.availability_status}`}>
                {source.availability_status === 'referenciado_no_cargado' ? 'Referenciado, no cargado' : source.availability_status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .meeting-detail-page {
          background:
            radial-gradient(circle at 90% 0%, rgba(214,173,66,0.12), transparent 22rem),
            linear-gradient(180deg, #f8fafc, #f3f6f8);
        }
        .meeting-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: var(--space-md);
          color: var(--color-text-secondary);
          font-size: 0.82rem;
          font-weight: 750;
        }
        .meeting-detail-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: var(--space-xl);
          padding: clamp(1.5rem, 4vw, 2.5rem);
          border-radius: 18px;
          background: linear-gradient(135deg, #111827, #1d2939);
          color: #fff;
          box-shadow: 0 24px 56px rgba(15,23,42,0.20);
        }
        .meeting-detail-kicker {
          color: #d6ad42;
          font-size: 0.73rem;
          font-weight: 900;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }
        .meeting-detail-hero h1 {
          max-width: 850px;
          margin: 10px 0 14px;
          color: #fff;
          font-size: clamp(1.8rem, 4vw, 3.2rem);
          line-height: 1.05;
        }
        .meeting-detail-meta { display: flex; flex-wrap: wrap; gap: 14px; }
        .meeting-detail-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.68);
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .meeting-trace-card {
          align-self: center;
          min-width: 180px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 14px;
          background: rgba(255,255,255,0.08);
        }
        .meeting-trace-card svg { color: #d6ad42; }
        .meeting-trace-card strong,
        .meeting-trace-card span { display: block; }
        .meeting-trace-card strong { margin: 14px 0 3px; text-transform: capitalize; }
        .meeting-trace-card span { color: rgba(255,255,255,0.55); font-size: 0.72rem; font-weight: 750; }
        .meeting-detail-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin: var(--space-lg) 0;
        }
        .meeting-detail-metrics > div {
          padding: var(--space-md);
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 14px;
          background: #fff;
        }
        .meeting-detail-metrics svg { color: var(--color-accent); margin-bottom: 10px; }
        .meeting-detail-metrics strong,
        .meeting-detail-metrics span { display: block; }
        .meeting-detail-metrics strong { font-size: 1.65rem; line-height: 1; }
        .meeting-detail-metrics span { margin-top: 5px; color: var(--color-text-muted); font-size: 0.72rem; font-weight: 750; }
        .meeting-detail-grid {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }
        .meeting-context-card,
        .meeting-agreements-card,
        .meeting-sources-card { padding: var(--space-lg); }
        .meeting-definition-list { margin: 0; }
        .meeting-definition-list > div {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .meeting-definition-list dt { color: var(--color-text-muted); font-size: 0.75rem; font-weight: 800; }
        .meeting-definition-list dd { margin: 0; color: var(--color-text); font-size: 0.84rem; font-weight: 650; text-transform: capitalize; }
        .meeting-source-summary {
          display: flex;
          gap: 9px;
          margin-top: 16px;
          padding: 12px;
          border-radius: 10px;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          line-height: 1.5;
        }
        .meeting-source-summary svg { flex-shrink: 0; color: var(--color-accent); }
        .meeting-source-summary strong { display: block; color: var(--color-text); }
        .meeting-repository-note {
          margin-top: 12px;
          color: var(--color-text-muted);
          font-size: 0.8rem;
          line-height: 1.55;
        }
        .participant-list,
        .agreement-list,
        .source-list { display: flex; flex-direction: column; }
        .participant-row {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .participant-row:last-child,
        .source-row:last-child { border-bottom: none; }
        .participant-avatar {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #111827;
          color: #d6ad42;
          font-weight: 900;
        }
        .participant-row strong,
        .participant-row span,
        .participant-row small { display: block; }
        .participant-row strong { font-size: 0.84rem; }
        .participant-row > div > span { margin-top: 2px; color: var(--color-text-muted); font-size: 0.72rem; }
        .participant-row small { display: flex; align-items: center; gap: 4px; margin-top: 3px; color: var(--color-text-secondary); }
        .participation-status {
          max-width: 155px;
          padding: 5px 8px;
          border-radius: 999px;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          font-size: 0.65rem;
          font-weight: 850;
          text-align: center;
        }
        .participation-status.asistencia_confirmada { background: rgba(24,160,88,0.12); color: #08783d; }
        .participation-status.organizador { background: rgba(214,173,66,0.17); color: #8a6110; }
        .meeting-agreements-card,
        .meeting-sources-card { margin-bottom: var(--space-md); }
        .agreement-row {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: var(--space-md);
          padding: 15px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .agreement-row:last-child { border-bottom: none; }
        .agreement-index {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #111827;
          color: #d6ad42;
          font-size: 0.8rem;
          font-weight: 900;
        }
        .agreement-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .agreement-title-row h3 { margin: 0; font-size: 0.92rem; }
        .agreement-status,
        .source-availability {
          flex-shrink: 0;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(214,173,66,0.15);
          color: #8a6110;
          font-size: 0.65rem;
          font-weight: 850;
        }
        .agreement-status.completado,
        .agreement-status.documentado,
        .agreement-status.vigente { background: rgba(24,160,88,0.12); color: #08783d; }
        .agreement-content p { margin: 6px 0; color: var(--color-text-secondary); font-size: 0.82rem; line-height: 1.55; }
        .agreement-meta { display: flex; gap: 10px; flex-wrap: wrap; }
        .agreement-meta span {
          padding: 4px 7px;
          border-radius: 7px;
          background: var(--color-surface-alt);
          color: var(--color-text-muted);
          font-size: 0.68rem;
          font-weight: 750;
        }
        .agreement-content small { display: block; margin-top: 5px; color: var(--color-text-muted); line-height: 1.4; }
        .meeting-empty-note {
          padding: 16px;
          border-radius: 10px;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          font-size: 0.84rem;
        }
        .source-row {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .source-row > svg { color: var(--color-accent); }
        .source-row strong,
        .source-row span,
        .source-row small { display: block; }
        .source-row strong { font-size: 0.84rem; }
        .source-row > div > span,
        .source-row small { margin-top: 3px; color: var(--color-text-muted); font-size: 0.72rem; }
        .source-availability { background: var(--color-surface-alt); color: var(--color-text-muted); }
        @media (max-width: 900px) {
          .meeting-detail-hero,
          .meeting-detail-grid { grid-template-columns: 1fr; }
          .meeting-detail-metrics { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .meeting-detail-metrics { grid-template-columns: 1fr; }
          .participant-row,
          .source-row { grid-template-columns: 36px minmax(0, 1fr); }
          .participation-status,
          .source-availability { grid-column: 2; justify-self: start; }
          .agreement-title-row { flex-direction: column; }
          .meeting-definition-list > div { grid-template-columns: 1fr; gap: 3px; }
        }
      `}</style>
    </div>
  );
}
