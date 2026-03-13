import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';

const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };
const PRIORITY_LABELS = { baja:'Baja', media:'Media', alta:'Alta', critica:'Crítica' };

export default function ActivitiesPage() {
  const { canEdit, isAdmin, profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCareer, setFilterCareer] = useState('');
  const [filterObjective, setFilterObjective] = useState('');

  useEffect(() => {
    async function load() {
      const [aRes, cRes, oRes] = await Promise.all([
        supabase.from('activities').select('*, careers(name, code), objectives(title)').order('updated_at', { ascending: false }),
        supabase.from('careers').select('*').eq('active', true).order('name'),
        supabase.from('objectives').select('*').eq('active', true).order('order_index'),
      ]);
      setActivities(aRes.data || []);
      setCareers(cRes.data || []);
      setObjectives(oRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activities.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterCareer && a.career_id !== filterCareer) return false;
    if (filterObjective && a.objective_id !== filterObjective) return false;
    return true;
  });

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
                <th>Objetivo</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Avance</th>
                <th>Fechas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/actividades/${a.id}`} style={{fontWeight:500, color:'var(--color-text)'}}>
                      {a.title}
                    </Link>
                  </td>
                  <td><span className="badge" style={{background:'var(--color-surface-alt)'}}>{a.careers?.code || '—'}</span></td>
                  <td style={{maxWidth:200}}>
                    <span className="truncate" style={{display:'block',fontSize:'0.8rem',color:'var(--color-text-secondary)'}}>
                      {a.objectives?.title?.substring(0,40) || '—'}
                    </span>
                  </td>
                  <td><span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                  <td><span className={`badge badge-${a.priority}`}>{PRIORITY_LABELS[a.priority]}</span></td>
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
                      {a.start_date ? new Date(a.start_date).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}) : '—'}
                      {' → '}
                      {a.end_date ? new Date(a.end_date).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
