import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowRight, CalendarClock, CheckCircle2,
  ClipboardList, Clock, Download, Eye, FileImage, FileText,
  GraduationCap, Layers, Radio, SlidersHorizontal, Sparkles, Target,
  TrendingUp, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDateOnly, parseDateOnly } from '../utils/date';
import { ICONIC_PROJECT_2026, withoutLegacyActivities } from '../data/iconicProject2026';
import { ensureIconicProject2026Seed } from '../services/iconicProjectSeed';
import { getActivityMetadata } from '../utils/activityMetadata';
import { downloadExecutivePdf } from '../utils/executivePdf';

const STATUS_COLORS = {
  pendiente: '#d8a21e',
  en_curso: '#177ddc',
  finalizado: '#18a058',
  retrasado: '#d92d20',
  suspendido: '#667085',
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  finalizado: 'Finalizada',
  retrasado: 'Retrasada',
  suspendido: 'Suspendida',
};

const VIEW_MODES = [
  { id: 'actual', label: 'Actual', icon: Eye },
  { id: 'historico', label: 'Histórico', icon: Clock },
  { id: 'proyeccion', label: 'Proyección', icon: TrendingUp },
];

const MONTHS = [
  { value: 4, label: 'Abr', long: 'Abril' },
  { value: 5, label: 'May', long: 'Mayo' },
  { value: 6, label: 'Jun', long: 'Junio' },
  { value: 7, label: 'Jul', long: 'Julio' },
  { value: 8, label: 'Ago', long: 'Agosto' },
  { value: 9, label: 'Sep', long: 'Septiembre' },
  { value: 10, label: 'Oct', long: 'Octubre' },
  { value: 11, label: 'Nov', long: 'Noviembre' },
  { value: 12, label: 'Dic', long: 'Diciembre' },
];

const STAGE_ORDER = ['Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getMonthLabel(month) {
  return MONTHS.find(item => item.value === Number(month))?.long || 'Mayo';
}

function inferWindowFromText(text = '') {
  const lower = text.toLowerCase();

  if (lower.includes('abril-mayo')) return { startMonth: 4, endMonth: 5 };
  if (lower.includes('mayo-octubre')) return { startMonth: 5, endMonth: 10 };
  if (lower.includes('noviembre')) return { startMonth: 11, endMonth: 11 };
  if (lower.includes('diciembre')) return { startMonth: 12, endMonth: 12 };
  if (lower.includes('primer y segundo')) return { startMonth: 4, endMonth: 10 };
  if (lower.includes('primer semestre')) return { startMonth: 4, endMonth: 6 };
  if (lower.includes('segundo semestre')) return { startMonth: 8, endMonth: 10 };

  return { startMonth: 5, endMonth: 10 };
}

function getActivityWindow(activity) {
  const metadata = getActivityMetadata(activity);
  const start = parseDateOnly(activity.start_date);
  const end = parseDateOnly(activity.end_date);

  if (start || end) {
    const fallback = start || end;
    return {
      startMonth: (start || fallback).getMonth() + 1,
      endMonth: (end || fallback).getMonth() + 1,
    };
  }

  return inferWindowFromText(`${metadata.period || ''} ${metadata.semester || ''}`);
}

function getActivityStage(activity) {
  return getActivityMetadata(activity).stage || 'Sin etapa';
}

function getProjectedProgress(activity, month) {
  const { startMonth, endMonth } = getActivityWindow(activity);
  const span = Math.max(1, endMonth - startMonth + 1);
  const planned = clamp(Math.round(((month - startMonth + 1) / span) * 100), 0, 100);

  if (activity.status === 'finalizado') return 100;
  if (month < startMonth) return Math.min(activity.progress_percent || 0, 8);
  if (month > endMonth) return Math.max(activity.progress_percent || 0, planned);

  return Math.max(activity.progress_percent || 0, planned);
}

function matchesMode(activity, mode, month) {
  const { startMonth, endMonth } = getActivityWindow(activity);

  if (mode === 'historico') return endMonth < month || activity.status === 'finalizado';
  if (mode === 'proyeccion') return endMonth >= month || activity.status !== 'finalizado';

  return (startMonth <= month && endMonth >= month) || activity.status === 'en_curso';
}

function getStageOptions(activities) {
  const stages = [...new Set(activities.map(getActivityStage))].filter(stage => stage !== 'Sin etapa');
  return stages.sort((a, b) => {
    const aIndex = STAGE_ORDER.indexOf(a);
    const bIndex = STAGE_ORDER.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function averageProgress(activities) {
  return activities.length
    ? Math.round(activities.reduce((sum, activity) => sum + (activity.progress_percent || 0), 0) / activities.length)
    : 0;
}

function buildAxisData(activities) {
  const axes = new Map();

  activities.forEach(activity => {
    const metadata = getActivityMetadata(activity);
    (metadata.territorialAxis || []).forEach(axis => {
      if (!axis || axis === 'Por definir') return;
      axes.set(axis, (axes.get(axis) || 0) + 1);
    });
  });

  return [...axes.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const currentMonth = clamp(new Date().getMonth() + 1, 4, 12);
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('actual');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedStage, setSelectedStage] = useState('all');
  const [spotlightId, setSpotlightId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await ensureIconicProject2026Seed(profile);
      const [aRes, cRes, eRes, tRes] = await Promise.all([
        supabase.from('activities').select('*, careers(name, code), objectives(title)'),
        supabase.from('careers').select('*').eq('active', true),
        supabase.from('evidence').select('id, activity_id'),
        supabase.from('timeline_events').select('*').order('event_date', { ascending: false }).limit(8),
      ]);

      if (cancelled) return;
      setActivities(withoutLegacyActivities(aRes.data || []));
      setCareers(cRes.data || []);
      setEvidence(eRes.data || []);
      setTimeline(tRes.data || []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) {
    return (
      <div className="page-content dashboard-loading">
        <div className="pulse-loader" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  const stageOptions = getStageOptions(activities);
  const stageFiltered = selectedStage === 'all'
    ? activities
    : activities.filter(activity => getActivityStage(activity) === selectedStage);
  const scopeActivities = stageFiltered.filter(activity => matchesMode(activity, viewMode, selectedMonth));
  const activityIds = new Set(scopeActivities.map(activity => activity.id));
  const scopedEvidence = evidence.filter(item => activityIds.has(item.activity_id));
  const avgProgress = averageProgress(stageFiltered);
  const scopedProgress = averageProgress(scopeActivities);
  const noEvidence = stageFiltered.filter(activity =>
    activity.status !== 'pendiente' && !evidence.some(item => item.activity_id === activity.id)
  );
  const withIndicators = stageFiltered.filter(activity => getActivityMetadata(activity).indicators?.length > 0).length;
  const upcomingClose = stageFiltered.filter(activity => {
    const { endMonth } = getActivityWindow(activity);
    return endMonth >= selectedMonth && endMonth <= selectedMonth + 1 && activity.status !== 'finalizado';
  });
  const careerData = careers
    .map(career => {
      const careerActivities = stageFiltered.filter(activity => activity.career_id === career.id);
      return {
        name: career.code,
        avance: averageProgress(careerActivities),
        total: careerActivities.length,
      };
    })
    .filter(career => career.total > 0);
  const statusData = Object.entries(STATUS_LABELS)
    .map(([code, label]) => ({
      name: label,
      value: stageFiltered.filter(activity => activity.status === code).length,
      color: STATUS_COLORS[code],
    }))
    .filter(item => item.value > 0);
  const stageData = stageOptions.map(stage => {
    const rows = activities.filter(activity => getActivityStage(activity) === stage);
    return {
      name: stage,
      total: rows.length,
      avance: averageProgress(rows),
      active: rows.filter(activity => matchesMode(activity, 'actual', selectedMonth)).length,
    };
  });
  const projectionData = MONTHS.map(month => ({
    month: month.label,
    avance: averageProgress(stageFiltered.map(activity => ({
      ...activity,
      progress_percent: getProjectedProgress(activity, month.value),
    }))),
    activas: stageFiltered.filter(activity => {
      const window = getActivityWindow(activity);
      return window.startMonth <= month.value && window.endMonth >= month.value;
    }).length,
  }));
  const axisData = buildAxisData(stageFiltered);
  const recent = [...stageFiltered]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);
  const spotlight = stageFiltered.find(activity => activity.id === spotlightId) || scopeActivities[0] || stageFiltered[0];
  const spotlightMetadata = spotlight ? getActivityMetadata(spotlight) : {};
  const modeLabel = VIEW_MODES.find(mode => mode.id === viewMode)?.label || 'Actual';

  function handleDownloadPdf() {
    downloadExecutivePdf({
      activities: stageFiltered,
      evidence: scopedEvidence,
      project: ICONIC_PROJECT_2026,
      modeLabel,
      monthLabel: getMonthLabel(selectedMonth),
      avgProgress,
      noEvidence,
      withIndicators,
      upcomingClose,
    });
  }

  return (
    <div className="page-content dashboard-page">
      <section className="command-hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="signal-pill">
            <Radio size={14} />
            Centro de mando vivo
            <span className="signal-dot" />
          </div>
          <h1>Proyecto Iconico 2026</h1>
          <p>
            Envejecimiento Saludable Activo operado como una plataforma de trazabilidad,
            lectura territorial y reportabilidad institucional.
          </p>
          <div className="hero-actions">
            <button className="btn btn-accent" onClick={handleDownloadPdf}>
              <Download size={15} /> Descargar PDF
            </button>
            <Link to="/actividades" className="btn btn-glass">
              <ClipboardList size={15} /> Actividades
            </Link>
            <Link to="/reportes" className="btn btn-glass">
              <FileText size={15} /> Reportes
            </Link>
          </div>
        </div>

        <div className="identity-core" aria-label="Avance global del proyecto">
          <div className="core-ring core-ring-one" />
          <div className="core-ring core-ring-two" />
          <div className="core-scan" />
          <div className="core-value">
            <span>{avgProgress}%</span>
            <small>avance global</small>
          </div>
          <div className="core-chip core-chip-a">
            <Zap size={13} /> {scopeActivities.length} en vista
          </div>
          <div className="core-chip core-chip-b">
            <Target size={13} /> {withIndicators} con indicadores
          </div>
        </div>
      </section>

      <section className="control-surface">
        <div className="control-title">
          <SlidersHorizontal size={17} />
          <span>Control temporal</span>
        </div>
        <div className="segmented-control">
          {VIEW_MODES.map(mode => (
            <button
              key={mode.id}
              className={viewMode === mode.id ? 'active' : ''}
              onClick={() => setViewMode(mode.id)}
            >
              <mode.icon size={14} />
              {mode.label}
            </button>
          ))}
        </div>
        <div className="range-control">
          <span>{getMonthLabel(selectedMonth)}</span>
          <input
            type="range"
            min="4"
            max="12"
            value={selectedMonth}
            onChange={event => setSelectedMonth(Number(event.target.value))}
          />
        </div>
        <select className="form-select stage-select" value={selectedStage} onChange={event => setSelectedStage(event.target.value)}>
          <option value="all">Todas las etapas</option>
          {stageOptions.map(stage => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      </section>

      <section className="kpi-strip">
        <div className="metric-tile tile-ignite">
          <ClipboardList size={18} />
          <strong>{stageFiltered.length}</strong>
          <span>actividades base</span>
        </div>
        <div className="metric-tile">
          <Activity size={18} />
          <strong>{scopeActivities.length}</strong>
          <span>{modeLabel.toLowerCase()}</span>
        </div>
        <div className="metric-tile">
          <TrendingUp size={18} />
          <strong>{scopedProgress}%</strong>
          <span>avance en vista</span>
        </div>
        <div className="metric-tile">
          <FileImage size={18} />
          <strong>{noEvidence.length}</strong>
          <span>evidencia pendiente</span>
        </div>
        <div className="metric-tile">
          <CalendarClock size={18} />
          <strong>{upcomingClose.length}</strong>
          <span>cierre cercano</span>
        </div>
        <div className="metric-tile">
          <GraduationCap size={18} />
          <strong>{careerData.length}</strong>
          <span>carreras activas</span>
        </div>
      </section>

      <section className="process-board">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Proceso interactivo</span>
            <h2>Trayectoria temporal de actividades</h2>
          </div>
          <div className="month-track">
            {MONTHS.map(month => (
              <button
                key={month.value}
                className={selectedMonth === month.value ? 'active' : ''}
                onClick={() => setSelectedMonth(month.value)}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>

        <div className="activity-lanes">
          {stageFiltered.map(activity => {
            const window = getActivityWindow(activity);
            const left = ((window.startMonth - 4) / 8) * 100;
            const width = Math.max(6, ((window.endMonth - window.startMonth + 1) / 9) * 100);
            const active = spotlight?.id === activity.id;
            const projected = getProjectedProgress(activity, selectedMonth);
            const metadata = getActivityMetadata(activity);

            return (
              <button
                key={activity.id}
                className={`activity-lane ${active ? 'active' : ''}`}
                onClick={() => setSpotlightId(activity.id)}
              >
                <span className="lane-title">{activity.title}</span>
                <span className="lane-stage">{metadata.stage || 'Sin etapa'}</span>
                <span className="lane-rail">
                  <span
                    className="lane-bar"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: STATUS_COLORS[activity.status] || '#177ddc',
                    }}
                  >
                    <span className="lane-pulse" />
                  </span>
                  <span className="lane-cursor" style={{ left: `${((selectedMonth - 4) / 8) * 100}%` }} />
                </span>
                <span className="lane-progress">{projected}%</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="insight-grid">
        <div className="panel panel-wide">
          <div className="card-header">
            <span className="card-title">Proyección de avance</span>
            <span className="micro-badge">{getMonthLabel(selectedMonth)}</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={projectionData} margin={{ top: 12, right: 14, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="avance" stroke="#0ea5e9" strokeWidth={3} fill="url(#progressGlow)" />
              <Bar dataKey="activas" fill="#d6ad42" radius={[3, 3, 0, 0]} barSize={14} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="card-header">
            <span className="card-title">Estados</span>
            <span className="micro-badge">{stageFiltered.length} registros</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={54} outerRadius={78} dataKey="value" paddingAngle={3}>
                {statusData.map(item => <Cell key={item.name} fill={item.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.8rem' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="status-legend">
            {statusData.map(item => (
              <span key={item.name}><i style={{ background: item.color }} />{item.name} ({item.value})</span>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="card-header">
            <span className="card-title">Avance por carrera</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={careerData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.8rem' }} />
              <Bar dataKey="avance" fill="#1a1a2e" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="operator-grid">
        <div className="spotlight-panel">
          <div className="card-header">
            <span className="card-title">Foco operativo</span>
            <span className={`badge badge-${spotlight?.status}`}>{STATUS_LABELS[spotlight?.status] || 'Sin estado'}</span>
          </div>
          {spotlight && (
            <>
              <h3>{spotlight.title}</h3>
              <p>{spotlight.description || 'Sin descripción registrada.'}</p>
              <div className="spotlight-meta">
                <span><Layers size={13} /> {spotlightMetadata.stage || 'Sin etapa'}</span>
                <span><Target size={13} /> {spotlightMetadata.targetPopulation || 'Población por definir'}</span>
                <span><CalendarClock size={13} /> {spotlightMetadata.period || 'Periodo pendiente'}</span>
              </div>
              <div className="spotlight-progress">
                <div>
                  <strong>{spotlight.progress_percent}%</strong>
                  <span>avance registrado</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${spotlight.progress_percent}%` }} />
                </div>
              </div>
              <Link to={`/actividades/${spotlight.id}`} className="btn btn-primary btn-sm">
                Abrir actividad <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>

        <div className="panel">
          <div className="card-header">
            <span className="card-title">Ejes territoriales</span>
          </div>
          <div className="axis-stack">
            {axisData.map(axis => (
              <div key={axis.name} className="axis-row">
                <span>{axis.name}</span>
                <strong>{axis.total}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="card-header">
            <span className="card-title">Etapas</span>
          </div>
          <div className="stage-stack">
            {stageData.map(stage => (
              <button key={stage.name} className={selectedStage === stage.name ? 'active' : ''} onClick={() => setSelectedStage(stage.name)}>
                <span>{stage.name}</span>
                <small>{stage.total} act. / {stage.avance}%</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-bottom">
        <div className="panel panel-wide">
          <div className="card-header">
            <span className="card-title">Actividades recientes</span>
            <Link to="/actividades" className="btn btn-ghost btn-sm">Ver todas <ArrowRight size={14} /></Link>
          </div>
          <div className="dense-list">
            {recent.map(activity => {
              const metadata = getActivityMetadata(activity);
              return (
                <Link to={`/actividades/${activity.id}`} key={activity.id} className="dense-item">
                  <span>
                    <strong>{activity.title}</strong>
                    <small>{metadata.stage || 'Sin etapa'} · {metadata.territory || 'Territorio por definir'}</small>
                  </span>
                  <span className={`badge badge-${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="card-header">
            <span className="card-title">Señales</span>
            <Sparkles size={16} />
          </div>
          <div className="signal-list">
            {noEvidence.length > 0 && <span><AlertTriangle size={14} /> {noEvidence.length} actividad(es) sin evidencia</span>}
            {upcomingClose.length > 0 && <span><CalendarClock size={14} /> {upcomingClose.length} cierre(s) cercanos</span>}
            {timeline.slice(0, 4).map(item => (
              <span key={item.id}><CheckCircle2 size={14} /> {formatDateOnly(item.event_date, { day: 'numeric', month: 'short' })}: {item.title}</span>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .dashboard-page {
          background:
            radial-gradient(circle at 12% 4%, rgba(14, 165, 233, 0.14), transparent 28rem),
            radial-gradient(circle at 92% 14%, rgba(214, 173, 66, 0.14), transparent 24rem),
            linear-gradient(180deg, #f8fafc 0%, #f3f6f8 100%);
        }
        .dashboard-loading {
          display: grid;
          gap: var(--space-md);
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          align-content: center;
        }
        .pulse-loader {
          grid-column: 1 / -1;
          width: 44px;
          height: 44px;
          margin: 0 auto;
          border: 2px solid rgba(26, 26, 46, 0.15);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .command-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
          gap: var(--space-xl);
          overflow: hidden;
          padding: clamp(1.4rem, 3vw, 2.4rem);
          margin-bottom: var(--space-lg);
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(21, 31, 48, 0.95)),
            linear-gradient(90deg, rgba(56, 189, 248, 0.18), rgba(214, 173, 66, 0.14));
          color: #fff;
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          opacity: 0.28;
          background-image:
            linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px);
          background-size: 44px 44px;
          animation: grid-drift 18s linear infinite;
        }
        .command-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.13), transparent);
          transform: translateX(-100%);
          animation: scan 6s ease-in-out infinite;
        }
        .hero-copy,
        .identity-core {
          position: relative;
          z-index: 1;
        }
        .signal-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: #dbeafe;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .signal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34,197,94,0.7);
          animation: pulse-dot 1.7s infinite;
        }
        .hero-copy h1 {
          max-width: 780px;
          margin: 18px 0 10px;
          font-size: clamp(2.2rem, 5vw, 4.6rem);
          line-height: 0.96;
          letter-spacing: 0;
        }
        .hero-copy p {
          max-width: 680px;
          color: rgba(255,255,255,0.75);
          font-size: 1rem;
          line-height: 1.65;
        }
        .hero-actions {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
          margin-top: var(--space-lg);
        }
        .btn-glass {
          color: #fff;
          border-color: rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .btn-glass:hover { background: rgba(255,255,255,0.14); }
        .identity-core {
          min-height: 300px;
          display: grid;
          place-items: center;
          isolation: isolate;
        }
        .core-ring,
        .core-scan {
          position: absolute;
          width: 230px;
          height: 230px;
          border-radius: 50%;
        }
        .core-ring-one {
          border: 1px solid rgba(56,189,248,0.34);
          animation: orbit 12s linear infinite;
        }
        .core-ring-two {
          width: 176px;
          height: 176px;
          border: 1px dashed rgba(214,173,66,0.48);
          animation: orbit 9s linear reverse infinite;
        }
        .core-scan {
          width: 138px;
          height: 138px;
          background: conic-gradient(from 120deg, rgba(56,189,248,0.05), rgba(56,189,248,0.36), rgba(214,173,66,0.22), rgba(56,189,248,0.05));
          filter: blur(0.2px);
          animation: orbit 5s linear infinite;
        }
        .core-value {
          width: 150px;
          height: 150px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: inset 0 0 34px rgba(56,189,248,0.18);
        }
        .core-value span {
          font-size: 2.45rem;
          font-weight: 900;
          line-height: 1;
        }
        .core-value small {
          color: rgba(255,255,255,0.64);
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 800;
        }
        .core-chip {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.16);
          color: #fff;
          font-size: 0.76rem;
          font-weight: 700;
        }
        .core-chip-a { top: 40px; right: 4px; }
        .core-chip-b { bottom: 52px; left: 0; }
        .control-surface {
          display: grid;
          grid-template-columns: auto auto minmax(220px, 1fr) minmax(190px, 0.35fr);
          gap: var(--space-sm);
          align-items: center;
          padding: var(--space-md);
          margin-bottom: var(--space-lg);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 14px;
          background: rgba(255,255,255,0.82);
          box-shadow: 0 16px 34px rgba(15,23,42,0.06);
          backdrop-filter: blur(12px);
        }
        .control-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          color: var(--color-text);
        }
        .segmented-control {
          display: inline-flex;
          padding: 4px;
          border-radius: 999px;
          background: var(--color-surface-alt);
        }
        .segmented-control button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          border-radius: 999px;
          background: transparent;
          padding: 7px 10px;
          color: var(--color-text-secondary);
          font-weight: 700;
          font-size: 0.78rem;
        }
        .segmented-control button.active {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 8px 18px rgba(15,23,42,0.18);
        }
        .range-control {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .range-control span {
          min-width: 82px;
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--color-accent);
        }
        .range-control input { width: 100%; accent-color: var(--color-accent); }
        .stage-select { width: 100%; }
        .kpi-strip,
        .insight-grid,
        .operator-grid,
        .dashboard-bottom {
          display: grid;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .kpi-strip {
          grid-template-columns: repeat(6, minmax(140px, 1fr));
        }
        .metric-tile {
          position: relative;
          overflow: hidden;
          padding: var(--space-md);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 12px 28px rgba(15,23,42,0.05);
          animation: reveal-up 0.5s ease both;
        }
        .metric-tile svg { color: var(--color-accent); margin-bottom: 12px; }
        .metric-tile strong {
          display: block;
          font-size: 1.8rem;
          line-height: 1;
        }
        .metric-tile span {
          display: block;
          margin-top: 4px;
          color: var(--color-text-muted);
          font-weight: 700;
          font-size: 0.76rem;
        }
        .tile-ignite::after {
          content: '';
          position: absolute;
          inset: auto -20% -44% 30%;
          height: 90px;
          background: radial-gradient(circle, rgba(56,189,248,0.20), transparent 70%);
        }
        .process-board,
        .panel,
        .spotlight-panel {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          background: rgba(255,255,255,0.88);
          box-shadow: 0 16px 36px rgba(15,23,42,0.06);
        }
        .process-board {
          padding: var(--space-lg);
          margin-bottom: var(--space-lg);
        }
        .section-heading {
          display: flex;
          justify-content: space-between;
          gap: var(--space-md);
          align-items: flex-start;
          margin-bottom: var(--space-lg);
        }
        .eyebrow {
          color: var(--color-accent);
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
        }
        .section-heading h2 {
          font-size: 1.2rem;
          margin-top: 2px;
        }
        .month-track {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .month-track button {
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: #fff;
          padding: 6px 9px;
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--color-text-secondary);
        }
        .month-track button.active {
          background: var(--color-accent);
          color: #fff;
          border-color: var(--color-accent);
        }
        .activity-lanes {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .activity-lane {
          display: grid;
          grid-template-columns: minmax(190px, 1.1fr) 78px minmax(220px, 1.8fr) 48px;
          gap: var(--space-sm);
          align-items: center;
          width: 100%;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          padding: 8px;
          text-align: left;
        }
        .activity-lane:hover,
        .activity-lane.active {
          background: rgba(15, 23, 42, 0.035);
          border-color: rgba(15, 23, 42, 0.08);
        }
        .lane-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 700;
          font-size: 0.83rem;
          color: var(--color-text);
        }
        .lane-stage,
        .lane-progress {
          color: var(--color-text-muted);
          font-size: 0.72rem;
          font-weight: 800;
        }
        .lane-rail {
          position: relative;
          height: 12px;
          border-radius: 999px;
          background: var(--color-surface-alt);
          overflow: hidden;
        }
        .lane-bar {
          position: absolute;
          top: 2px;
          height: 8px;
          border-radius: 999px;
          min-width: 8px;
          opacity: 0.85;
        }
        .lane-pulse {
          position: absolute;
          right: 0;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          transform: translate(50%, -50%);
          box-shadow: 0 0 0 0 rgba(255,255,255,0.7);
          animation: pulse-dot 1.8s infinite;
        }
        .lane-cursor {
          position: absolute;
          top: -2px;
          width: 2px;
          height: 16px;
          background: #101828;
          box-shadow: 0 0 0 3px rgba(16,24,40,0.08);
        }
        .insight-grid {
          grid-template-columns: 1.4fr 0.8fr 0.9fr;
        }
        .panel,
        .spotlight-panel {
          padding: var(--space-lg);
        }
        .panel-wide { min-width: 0; }
        .micro-badge {
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--color-surface-alt);
          color: var(--color-text-muted);
          font-size: 0.72rem;
          font-weight: 800;
        }
        .status-legend,
        .signal-list,
        .axis-stack,
        .stage-stack,
        .dense-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .status-legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-weight: 700;
        }
        .status-legend i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .operator-grid {
          grid-template-columns: 1.3fr 0.8fr 0.8fr;
        }
        .spotlight-panel {
          background:
            linear-gradient(145deg, rgba(26,26,46,0.96), rgba(24,34,48,0.94)),
            linear-gradient(90deg, rgba(56,189,248,0.18), rgba(214,173,66,0.12));
          color: #fff;
        }
        .spotlight-panel .card-title,
        .spotlight-panel p { color: rgba(255,255,255,0.68); }
        .spotlight-panel h3 {
          font-size: 1.15rem;
          line-height: 1.35;
          margin: 10px 0;
        }
        .spotlight-panel p {
          line-height: 1.65;
          font-size: 0.9rem;
        }
        .spotlight-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: var(--space-md) 0;
        }
        .spotlight-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          font-size: 0.73rem;
          font-weight: 700;
        }
        .spotlight-progress {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: var(--space-md);
          align-items: center;
          margin-bottom: var(--space-md);
        }
        .spotlight-progress strong {
          display: block;
          font-size: 1.8rem;
        }
        .spotlight-progress span {
          color: rgba(255,255,255,0.58);
          font-size: 0.73rem;
          font-weight: 800;
        }
        .axis-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          padding: 10px;
          border-radius: 10px;
          background: var(--color-surface-alt);
        }
        .axis-row span {
          font-weight: 700;
          font-size: 0.8rem;
        }
        .axis-row strong {
          color: var(--color-accent);
        }
        .stage-stack button {
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: #fff;
          padding: 10px;
          text-align: left;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .stage-stack button.active {
          border-color: var(--color-accent);
          background: var(--color-accent-bg);
        }
        .stage-stack span,
        .stage-stack small {
          font-weight: 800;
        }
        .stage-stack small {
          color: var(--color-text-muted);
          white-space: nowrap;
        }
        .dashboard-bottom {
          grid-template-columns: 1.4fr 0.8fr;
        }
        .dense-item {
          display: flex;
          justify-content: space-between;
          gap: var(--space-md);
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .dense-item:last-child { border-bottom: none; }
        .dense-item strong,
        .dense-item small {
          display: block;
        }
        .dense-item strong {
          font-size: 0.86rem;
          line-height: 1.35;
        }
        .dense-item small {
          margin-top: 3px;
          color: var(--color-text-muted);
          font-size: 0.73rem;
        }
        .signal-list span {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 10px;
          border-radius: 10px;
          background: var(--color-surface-alt);
          color: var(--color-text-secondary);
          font-weight: 700;
          font-size: 0.8rem;
          line-height: 1.35;
        }
        .signal-list svg {
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 1px;
        }
        @keyframes grid-drift {
          from { background-position: 0 0; }
          to { background-position: 88px 44px; }
        }
        @keyframes scan {
          0%, 55% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes orbit {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.55); }
          70% { box-shadow: 0 0 0 10px rgba(56,189,248,0); }
          100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
        }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1180px) {
          .kpi-strip { grid-template-columns: repeat(3, 1fr); }
          .insight-grid,
          .operator-grid,
          .dashboard-bottom { grid-template-columns: 1fr; }
        }
        @media (max-width: 840px) {
          .command-hero,
          .control-surface {
            grid-template-columns: 1fr;
          }
          .identity-core { min-height: 240px; }
          .activity-lane {
            grid-template-columns: 1fr 52px;
          }
          .lane-stage,
          .lane-rail {
            grid-column: 1 / -1;
          }
          .kpi-strip { grid-template-columns: repeat(2, 1fr); }
          .section-heading { flex-direction: column; }
          .month-track { justify-content: flex-start; }
        }
        @media (max-width: 520px) {
          .kpi-strip { grid-template-columns: 1fr; }
          .hero-copy h1 { font-size: 2.15rem; }
          .spotlight-progress { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
