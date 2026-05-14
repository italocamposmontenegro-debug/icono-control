import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { formatDateOnly } from '../utils/date';
import { ensureIconicProject2026Seed } from '../services/iconicProjectSeed';
import { getActivityMetadata, metadataIncludes, normalizeText, uniqueMetadataOptions } from '../utils/activityMetadata';
import { withoutLegacyActivities } from '../data/iconicProject2026';

const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };
const PRIORITY_LABELS = { baja:'Baja', media:'Media', alta:'Alta', critica:'Crítica' };

export default function ActivitiesPage() {
  const { canEdit, profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCareer, setFilterCareer] = useState('');
  const [filterObjective, setFilterObjective] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterTerritory, setFilterTerritory] = useState('');
  const [filterAxis, setFilterAxis] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await ensureIconicProject2026Seed(profile);
      const [aRes, cRes, oRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*, careers(name, code), objectives(title), profiles!activities_responsible_profile_id_fkey(full_name,email)')
          .order('updated_at', { ascending: false }),
        supabase.from('careers').select('*').eq('active', true).order('name'),
        supabase.from('objectives').select('*').eq('active', true).order('order_index'),
      ]);

      if (cancelled) return;
      setActivities(withoutLegacyActivities(aRes.data || []));
      setCareers(cRes.data || []);
      setObjectives(oRes.data || []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [profile]);

  const filtered = activities.filter(a => {
    const metadata = getActivityMetadata(a);
    const searchable = [
      a.title,
      a.description,
      metadata.stage,
      metadata.territory,
      metadata.targetPopulation,
      metadata.responsiblePerson,
      ...(metadata.territorialAxis || []),
    ].filter(Boolean).join(' ');

    if (search && !normalizeText(searchable).includes(normalizeText(search))) return false;
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
    return true;
  });

  const stages = uniqueMetadataOptions(activities, 'stage');
  const territories = uniqueMetadataOptions(activities, 'territory');
  const axes = uniqueMetadataOptions(activities, 'territorialAxis');
  const targets = uniqueMetadataOptions(activities, 'targetPopulation');
  const semesters = uniqueMetadataOptions(activities, 'semester');
  const responsibles = uniqueMetadataOptions(activities, 'responsiblePerson');

  if (loading) {
    return (
      <div className="page-content">
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-md)'}}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{height:50,borderRadius:8}} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Actividades</h1>
          <p className="page-subtitle">{filtered.length} actividades encontradas</p>
        </div>
        {canEdit && (
          <Link to="/actividades/nueva" className="btn btn-primary">
            <Plus size={16} /> Nueva Actividad
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--color-text-muted)'}} />
          <input className="form-input" placeholder="Buscar actividades..."
            style={{paddingLeft:32,width:'100%'}}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
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
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>No se encontraron actividades con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Carrera</th>
                <th>Etapa</th>
                <th>Territorio</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Avance</th>
                <th>Fechas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const metadata = getActivityMetadata(a);

                return (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/actividades/${a.id}`} style={{fontWeight:500, color:'var(--color-text)'}}>
                        {a.title}
                      </Link>
                      {metadata.targetPopulation && (
                        <span className="truncate" style={{display:'block',fontSize:'0.72rem',color:'var(--color-text-muted)',marginTop:2,maxWidth:320}}>
                          {metadata.targetPopulation}
                        </span>
                      )}
                    </td>
                    <td><span className="badge" style={{background:'var(--color-surface-alt)'}}>{a.careers?.code || '—'}</span></td>
                    <td><span className="badge" style={{background:'var(--color-accent-bg)',color:'var(--color-accent)'}}>{metadata.stage || '—'}</span></td>
                    <td style={{maxWidth:180}}>
                      <span className="truncate" style={{display:'block',fontSize:'0.8rem',color:'var(--color-text-secondary)'}}>
                        {metadata.territory || '—'}
                      </span>
                    </td>
                    <td><span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status] || a.status}</span></td>
                    <td><span className={`badge badge-${a.priority}`}>{PRIORITY_LABELS[a.priority] || a.priority}</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6,minWidth:80}}>
                        <div className="progress-bar" style={{flex:1}}>
                          <div className="progress-fill" style={{width:`${a.progress_percent}%`}} />
                        </div>
                        <span style={{fontSize:'0.75rem',fontWeight:600,minWidth:30,textAlign:'right'}}>{a.progress_percent}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{fontSize:'0.75rem',color:'var(--color-text-muted)',whiteSpace:'nowrap'}}>
                        {formatDateOnly(a.start_date, { day:'2-digit', month:'short' })}
                        {' → '}
                        {formatDateOnly(a.end_date, { day:'2-digit', month:'short' })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
