import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronRight, ClipboardCheck, FileWarning,
  Handshake, MapPin, Search, Users, Video
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateOnly } from '../utils/date';
import { normalizeText } from '../utils/activityMetadata';

const MODALITY_LABELS = {
  online: 'Online',
  presencial: 'Presencial',
  hibrida: 'Híbrida',
  por_confirmar: 'Por confirmar',
};

const DOCUMENTATION_LABELS = {
  convocatoria: 'Convocatoria',
  correo_posterior: 'Correo posterior',
  calendario_y_correo: 'Calendario y correo',
  antecedente: 'Antecedente',
};

function formatTime(value) {
  return value ? String(value).slice(0, 5) : null;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_participants(id, display_name, organization, participation_status),
          meeting_agreements(id, status)
        `)
        .order('meeting_date', { ascending: false });

      if (!cancelled) {
        setMeetings(data || []);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = meetings.filter(meeting => {
    if (modality && meeting.modality !== modality) return false;
    if (documentation && meeting.documentation_level !== documentation) return false;
    if (dateFrom && meeting.meeting_date < dateFrom) return false;
    if (dateTo && meeting.meeting_date > dateTo) return false;

    const participantText = (meeting.meeting_participants || [])
      .flatMap(participant => [participant.display_name, participant.organization])
      .join(' ');
    const haystack = normalizeText([
      meeting.title,
      meeting.organizer_name,
      meeting.platform_location,
      meeting.source_summary,
      participantText,
    ].filter(Boolean).join(' '));

    return !deferredSearch || haystack.includes(normalizeText(deferredSearch));
  });

  const agreementCount = filtered.reduce(
    (total, meeting) => total + (meeting.meeting_agreements?.length || 0),
    0
  );
  const pendingAgreementCount = filtered.reduce(
    (total, meeting) => total + (meeting.meeting_agreements || [])
      .filter(agreement => agreement.status === 'pendiente_confirmacion').length,
    0
  );
  const participantCount = new Set(
    filtered.flatMap(meeting => (meeting.meeting_participants || [])
      .map(participant => normalizeText(participant.display_name))
      .filter(Boolean))
  ).size;

  if (loading) {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-card" style={{ height: 220 }} />
        <div className="skeleton skeleton-card" style={{ height: 360, marginTop: 16 }} />
      </div>
    );
  }

  return (
    <div className="page-content meetings-page">
      <section className="meetings-hero">
        <div className="meetings-hero-grid" />
        <div>
          <span className="meetings-kicker"><Handshake size={14} /> Gobernanza interinstitucional</span>
          <h1>Reuniones del Proyecto Icónico</h1>
          <p>
            Registro trazable de coordinaciones entre la Universidad Viña del Mar,
            la Municipalidad de Casablanca y Corporación Pro Casablanca.
          </p>
        </div>
        <div className="meetings-hero-date">
          <CalendarDays size={22} />
          <strong>2026</strong>
          <span>ciclo de coordinación</span>
        </div>
      </section>

      <section className="meeting-metrics">
        <div><CalendarDays size={17} /><strong>{filtered.length}</strong><span>reuniones y antecedentes</span></div>
        <div><Users size={17} /><strong>{participantCount}</strong><span>personas identificadas</span></div>
        <div><ClipboardCheck size={17} /><strong>{agreementCount}</strong><span>acuerdos y seguimientos</span></div>
        <div><FileWarning size={17} /><strong>{pendingAgreementCount}</strong><span>pendientes de confirmar</span></div>
      </section>

      <section className="meeting-filter-panel">
        <label className="meeting-search">
          <Search size={15} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar reunión, participante o institución"
          />
        </label>
        <select className="form-select" value={modality} onChange={event => setModality(event.target.value)}>
          <option value="">Todas las modalidades</option>
          {Object.entries(MODALITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className="form-select" value={documentation} onChange={event => setDocumentation(event.target.value)}>
          <option value="">Todo respaldo documental</option>
          {Object.entries(DOCUMENTATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input className="form-input" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} />
        <input className="form-input" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} />
      </section>

      <section className="meeting-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Handshake size={48} />
            <p>No hay reuniones para los filtros seleccionados.</p>
          </div>
        ) : filtered.map(meeting => {
          const participantTotal = meeting.meeting_participants?.length || 0;
          const agreementsTotal = meeting.meeting_agreements?.length || 0;
          const timeStart = formatTime(meeting.start_time);
          const timeEnd = formatTime(meeting.end_time);

          return (
            <Link to={`/reuniones/${meeting.id}`} className="meeting-row" key={meeting.id}>
              <div className="meeting-date-card">
                <span>{formatDateOnly(meeting.meeting_date, { month: 'short' }).replace('.', '')}</span>
                <strong>{formatDateOnly(meeting.meeting_date, { day: '2-digit' })}</strong>
                <small>{formatDateOnly(meeting.meeting_date, { year: 'numeric' })}</small>
              </div>
              <div className="meeting-row-main">
                <div className="meeting-row-top">
                  <span className={`meeting-type ${meeting.record_type}`}>
                    {meeting.record_type === 'reunion' ? 'Reunión' : 'Antecedente documentado'}
                  </span>
                  <span className="meeting-documentation">
                    {DOCUMENTATION_LABELS[meeting.documentation_level] || meeting.documentation_level}
                  </span>
                </div>
                <h2>{meeting.title}</h2>
                <div className="meeting-row-meta">
                  <span>{meeting.modality === 'online' ? <Video size={13} /> : <MapPin size={13} />}{MODALITY_LABELS[meeting.modality]}</span>
                  <span><MapPin size={13} />{meeting.platform_location || 'Lugar por confirmar'}</span>
                  <span><Users size={13} />{participantTotal} registros de participación</span>
                  <span><ClipboardCheck size={13} />{agreementsTotal} acuerdos</span>
                </div>
                <p>
                  {timeStart ? `${timeStart}${timeEnd ? ` a ${timeEnd}` : ''} · ` : ''}
                  {meeting.organizer_name ? `Organiza: ${meeting.organizer_name}` : 'Organización pendiente de confirmar'}
                </p>
              </div>
              <ChevronRight size={20} className="meeting-row-arrow" />
            </Link>
          );
        })}
      </section>

      <style>{`
        .meetings-page {
          background:
            radial-gradient(circle at 5% 0%, rgba(14,165,233,0.10), transparent 24rem),
            linear-gradient(180deg, #f8fafc, #f3f6f8);
        }
        .meetings-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: var(--space-xl);
          overflow: hidden;
          padding: clamp(1.5rem, 4vw, 2.6rem);
          border-radius: 18px;
          background: linear-gradient(135deg, #111827, #1d2939);
          color: #fff;
          box-shadow: 0 26px 65px rgba(15,23,42,0.20);
        }
        .meetings-hero-grid {
          position: absolute;
          inset: 0;
          opacity: 0.2;
          background-image:
            linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px);
          background-size: 42px 42px;
        }
        .meetings-hero > div:not(.meetings-hero-grid) { position: relative; z-index: 1; }
        .meetings-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #d6ad42;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .meetings-hero h1 {
          max-width: 760px;
          margin: 12px 0 8px;
          color: #fff;
          font-size: clamp(2rem, 4vw, 3.7rem);
          line-height: 1;
        }
        .meetings-hero p {
          max-width: 720px;
          color: rgba(255,255,255,0.70);
          line-height: 1.65;
        }
        .meetings-hero-date {
          align-self: center;
          min-width: 170px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .meetings-hero-date svg { color: #d6ad42; }
        .meetings-hero-date strong,
        .meetings-hero-date span { display: block; }
        .meetings-hero-date strong { margin-top: 16px; font-size: 2rem; }
        .meetings-hero-date span { color: rgba(255,255,255,0.58); font-size: 0.75rem; font-weight: 800; }
        .meeting-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
          margin: var(--space-lg) 0;
        }
        .meeting-metrics > div {
          padding: var(--space-md);
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 12px 28px rgba(15,23,42,0.05);
        }
        .meeting-metrics svg { color: var(--color-accent); margin-bottom: 12px; }
        .meeting-metrics strong,
        .meeting-metrics span { display: block; }
        .meeting-metrics strong { font-size: 1.8rem; line-height: 1; }
        .meeting-metrics span { margin-top: 5px; color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; }
        .meeting-filter-panel {
          display: grid;
          grid-template-columns: minmax(260px, 1.4fr) repeat(4, minmax(150px, 0.6fr));
          gap: 10px;
          padding: 12px;
          margin-bottom: var(--space-md);
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: rgba(255,255,255,0.88);
        }
        .meeting-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: #fff;
        }
        .meeting-search svg { color: var(--color-text-muted); }
        .meeting-search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: var(--color-text);
          font: inherit;
        }
        .meeting-list { display: flex; flex-direction: column; gap: 10px; }
        .meeting-row {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr) auto;
          gap: var(--space-md);
          align-items: center;
          padding: 16px;
          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 10px 26px rgba(15,23,42,0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .meeting-row:hover {
          transform: translateY(-2px);
          border-color: rgba(214,173,66,0.50);
          box-shadow: 0 18px 36px rgba(15,23,42,0.08);
        }
        .meeting-date-card {
          display: grid;
          place-items: center;
          min-height: 78px;
          border-radius: 12px;
          background: #111827;
          color: #fff;
        }
        .meeting-date-card span { color: #d6ad42; font-size: 0.72rem; font-weight: 900; text-transform: uppercase; }
        .meeting-date-card strong { font-size: 1.65rem; line-height: 1; }
        .meeting-date-card small { color: rgba(255,255,255,0.55); font-weight: 700; }
        .meeting-row-top { display: flex; gap: 8px; flex-wrap: wrap; }
        .meeting-type,
        .meeting-documentation {
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 850;
        }
        .meeting-type { background: rgba(14,165,233,0.10); color: #0369a1; }
        .meeting-type.antecedente_reunion { background: rgba(214,173,66,0.15); color: #8a6110; }
        .meeting-documentation { background: var(--color-surface-alt); color: var(--color-text-muted); }
        .meeting-row h2 { margin: 7px 0; font-size: 1rem; line-height: 1.35; }
        .meeting-row-meta { display: flex; gap: 12px; flex-wrap: wrap; }
        .meeting-row-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 650;
        }
        .meeting-row-main p { margin-top: 7px; color: var(--color-text-muted); font-size: 0.75rem; }
        .meeting-row-arrow { color: var(--color-text-light); }
        @media (max-width: 1120px) {
          .meeting-filter-panel { grid-template-columns: repeat(2, 1fr); }
          .meeting-search { grid-column: 1 / -1; min-height: 42px; }
        }
        @media (max-width: 820px) {
          .meetings-hero { grid-template-columns: 1fr; }
          .meetings-hero-date { min-width: 0; }
          .meeting-metrics { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .meeting-filter-panel,
          .meeting-metrics { grid-template-columns: 1fr; }
          .meeting-search { grid-column: auto; }
          .meeting-row { grid-template-columns: 58px minmax(0, 1fr); }
          .meeting-row-arrow { display: none; }
          .meeting-row-meta { flex-direction: column; gap: 5px; }
        }
      `}</style>
    </div>
  );
}
