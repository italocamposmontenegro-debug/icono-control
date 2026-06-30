import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Download, FileText } from 'lucide-react';
import { parseDateOnly } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import { ensureIconicProject2026Seed } from '../services/iconicProjectSeed';
import {
  getActivityMetadata,
  metadataIncludes,
  normalizeText,
  uniqueMetadataOptions,
} from '../utils/activityMetadata';
import { ICONIC_PROJECT_2026, withoutLegacyActivities } from '../data/iconicProject2026';
import { downloadExecutivePdf } from '../utils/executivePdf';

const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };

export default function ReportesPage() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCareer, setFilterCareer] = useState('');
  const [filterObjective, setFilterObjective] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterTerritory, setFilterTerritory] = useState('');
  const [filterAxis, setFilterAxis] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await ensureIconicProject2026Seed(profile);
      const [aRes, cRes, oRes, eRes, mRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*, careers(name, code), objectives(title), profiles!activities_responsible_profile_id_fkey(full_name,email)')
          .order('start_date'),
        supabase.from('careers').select('*').eq('active',true).order('name'),
        supabase.from('objectives').select('*').eq('active',true).order('order_index'),
        supabase.from('evidence').select('id, activity_id'),
        supabase
          .from('meetings')
          .select('id, title, meeting_date, documentation_level, meeting_participants(id), meeting_agreements(id, status)')
          .order('meeting_date', { ascending: false }),
      ]);

      if (cancelled) return;
      setActivities(withoutLegacyActivities(aRes.data || []));
      setCareers(cRes.data || []);
      setObjectives(oRes.data || []);
      setEvidence(eRes.data || []);
      setMeetings(mRes.data || []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [profile]);

  const filtered = activities.filter(a => {
    const metadata = getActivityMetadata(a);
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterCareer && a.career_id !== filterCareer) return false;
    if (filterObjective && a.objective_id !== filterObjective) return false;
    if (filterStage && !metadataIncludes(metadata, 'stage', filterStage)) return false;
    if (filterTerritory && !metadataIncludes(metadata, 'territory', filterTerritory)) return false;
    if (filterAxis && !metadataIncludes(metadata, 'territorialAxis', filterAxis)) return false;
    if (filterTarget && !metadataIncludes(metadata, 'targetPopulation', filterTarget)) return false;
    if (filterSemester && !metadataIncludes(metadata, 'semester', filterSemester)) return false;
    if (filterResponsible) {
      const responsible = metadata.responsiblePerson || a.profiles?.full_name || a.profiles?.email || '';
      if (!normalizeText(responsible).includes(normalizeText(filterResponsible))) return false;
    }
    if (dateFrom && a.start_date && a.start_date < dateFrom) return false;
    if (dateTo && a.end_date && a.end_date > dateTo) return false;
    return true;
  });

  const stages = uniqueMetadataOptions(activities, 'stage');
  const territories = uniqueMetadataOptions(activities, 'territory');
  const axes = uniqueMetadataOptions(activities, 'territorialAxis');
  const targets = uniqueMetadataOptions(activities, 'targetPopulation');
  const semesters = uniqueMetadataOptions(activities, 'semester');
  const responsibles = uniqueMetadataOptions(activities, 'responsiblePerson');

  const averageProgress = filtered.length
    ? Math.round(filtered.reduce((sum, activity) => sum + (activity.progress_percent || 0), 0) / filtered.length)
    : 0;
  const filteredIds = new Set(filtered.map(activity => activity.id));
  const filteredEvidence = evidence.filter(item => filteredIds.has(item.activity_id));
  const noEvidence = filtered.filter(activity =>
    activity.status !== 'pendiente' && !evidence.some(item => item.activity_id === activity.id)
  );
  const withIndicators = filtered.filter(activity => getActivityMetadata(activity).indicators?.length > 0).length;
  const upcomingClose = filtered.filter(activity => {
    const end = parseDateOnly(activity.end_date);
    if (!end || Number.isNaN(end.getTime()) || activity.status === 'finalizado') return false;

    const now = new Date();
    const days = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 45;
  });

  const downloadPdfReport = () => {
    downloadExecutivePdf({
      activities: filtered,
      evidence: filteredEvidence,
      project: ICONIC_PROJECT_2026,
      modeLabel: 'Reportes',
      monthLabel: 'Corte ejecutivo',
      avgProgress: averageProgress,
      noEvidence,
      withIndicators,
      upcomingClose,
      meetings,
    });
  };

  if (loading) return <div className="page-content"><div className="skeleton skeleton-card" style={{height:300}} /></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Informe Proyecto Icónico UVM para seguimiento institucional</p>
        </div>
        <div style={{display:'flex',gap:'var(--space-sm)'}}>
          <button className="btn btn-primary" onClick={downloadPdfReport}><Download size={14} /> Descargar informe PDF</button>
        </div>
      </div>

      <div className="card report-focus-card">
        <div>
          <span className="report-eyebrow">Salida oficial</span>
          <h2>Reporte académico ejecutivo</h2>
          <p>
            La descarga PDF consolida las actividades filtradas, evidencias, indicadores,
            ejes territoriales, pendientes críticos y lectura ejecutiva del Proyecto Icónico 2026.
          </p>
        </div>
        <div className="report-focus-metrics" aria-label="Resumen del informe PDF">
          <span><strong>{filtered.length}</strong> actividades</span>
          <span><strong>{averageProgress}%</strong> avance</span>
          <span><strong>{noEvidence.length}</strong> evidencias pendientes</span>
          <span><strong>{withIndicators}</strong> con indicadores</span>
          <span><strong>{meetings.length}</strong> reuniones registradas</span>
        </div>
        <FileText size={54} className="report-focus-icon" />
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="form-select" value={filterCareer} onChange={e => setFilterCareer(e.target.value)}>
          <option value="">Todas las carreras</option>
          {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" value={filterObjective} onChange={e => setFilterObjective(e.target.value)}>
          <option value="">Todos los objetivos</option>
          {objectives.map(o => <option key={o.id} value={o.id}>{o.title.substring(0,50)}</option>)}
        </select>
        <select className="form-select" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="">Todas las etapas</option>
          {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
        </select>
        <select className="form-select" value={filterTerritory} onChange={e => setFilterTerritory(e.target.value)}>
          <option value="">Todos los territorios</option>
          {territories.map(territory => <option key={territory} value={territory}>{territory}</option>)}
        </select>
        <select className="form-select" value={filterAxis} onChange={e => setFilterAxis(e.target.value)}>
          <option value="">Todos los ejes</option>
          {axes.map(axis => <option key={axis} value={axis}>{axis}</option>)}
        </select>
        <select className="form-select" value={filterTarget} onChange={e => setFilterTarget(e.target.value)}>
          <option value="">Todas las poblaciones</option>
          {targets.map(target => <option key={target} value={target}>{target}</option>)}
        </select>
        <select className="form-select" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
          <option value="">Todos los semestres</option>
          {semesters.map(semester => <option key={semester} value={semester}>{semester}</option>)}
        </select>
        <select className="form-select" value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
          <option value="">Todos los responsables</option>
          {responsibles.map(responsible => <option key={responsible} value={responsible}>{responsible}</option>)}
        </select>
        <input className="form-input" type="date" placeholder="Desde" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input className="form-input" type="date" placeholder="Hasta" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Vista previa ({filtered.length} actividades)</span></div>
        {filtered.length === 0 ? (
          <div className="empty-state"><BarChart3 size={48} /><p>Sin datos para los filtros seleccionados.</p></div>
        ) : (
          <div className="table-container" style={{border:'none'}}>
            <table className="data-table">
              <thead><tr><th>Actividad</th><th>Carrera</th><th>Etapa</th><th>Territorio</th><th>Estado</th><th>Avance</th><th>Inicio</th><th>Término</th></tr></thead>
              <tbody>
                {filtered.map(a => {
                  const metadata = getActivityMetadata(a);

                  return (
                    <tr key={a.id}>
                      <td style={{fontWeight:500}}>{a.title}</td>
                      <td>{a.careers?.code || '—'}</td>
                      <td><span className="badge" style={{background:'var(--color-accent-bg)',color:'var(--color-accent)'}}>{metadata.stage || '—'}</span></td>
                      <td style={{fontSize:'0.8rem',color:'var(--color-text-secondary)',maxWidth:200}}>{metadata.territory || '—'}</td>
                      <td><span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                      <td style={{fontWeight:600}}>{a.progress_percent}%</td>
                      <td style={{fontSize:'0.8rem'}}>{a.start_date || '—'}</td>
                      <td style={{fontSize:'0.8rem'}}>{a.end_date || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .report-focus-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: var(--space-lg);
          align-items: center;
          overflow: hidden;
          margin-bottom: var(--space-lg);
          padding: var(--space-lg);
          border-color: rgba(26, 26, 46, 0.10);
          background:
            radial-gradient(circle at 92% 18%, rgba(214, 173, 66, 0.18), transparent 18rem),
            linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(29, 42, 58, 0.96));
          color: #fff;
        }
        .report-focus-card h2 {
          margin: 4px 0 8px;
          color: #fff;
          font-size: clamp(1.35rem, 3vw, 2.2rem);
        }
        .report-focus-card p {
          max-width: 720px;
          color: rgba(255,255,255,0.72);
          line-height: 1.65;
        }
        .report-eyebrow {
          color: #d6ad42;
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .report-focus-metrics {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(2, minmax(118px, 1fr));
          gap: 10px;
          min-width: 270px;
        }
        .report-focus-metrics span {
          padding: 12px;
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 12px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.72);
          font-size: 0.76rem;
          font-weight: 800;
          backdrop-filter: blur(10px);
        }
        .report-focus-metrics strong {
          display: block;
          margin-bottom: 4px;
          color: #fff;
          font-size: 1.45rem;
          line-height: 1;
        }
        .report-focus-icon {
          position: absolute;
          right: 22px;
          bottom: 18px;
          color: rgba(255,255,255,0.08);
        }
        @media (max-width: 820px) {
          .report-focus-card {
            grid-template-columns: 1fr;
          }
          .report-focus-metrics {
            min-width: 0;
          }
        }
        @media (max-width: 520px) {
          .report-focus-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
