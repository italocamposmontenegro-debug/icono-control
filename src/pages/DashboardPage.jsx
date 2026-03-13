import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  FileImage, GraduationCap, TrendingUp, ArrowRight
} from 'lucide-react';

const STATUS_COLORS = {
  pendiente: '#eab308', en_curso: '#3b82f6',
  finalizado: '#22c55e', retrasado: '#ef4444', suspendido: '#6b7280'
};
const STATUS_LABELS = {
  pendiente: 'Pendiente', en_curso: 'En Curso',
  finalizado: 'Finalizado', retrasado: 'Retrasado', suspendido: 'Suspendido'
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [aRes, cRes, eRes, oRes, tRes] = await Promise.all([
        supabase.from('activities').select('*, careers(name, code), objectives(title)'),
        supabase.from('careers').select('*').eq('active', true),
        supabase.from('evidence').select('id'),
        supabase.from('objectives').select('*').eq('active', true).order('order_index'),
        supabase.from('timeline_events').select('*').order('event_date', { ascending: false }).limit(5),
      ]);
      setActivities(aRes.data || []);
      setCareers(cRes.data || []);
      setEvidence(eRes.data || []);
      setObjectives(oRes.data || []);
      setTimeline(tRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'var(--space-md)' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      </div>
    );
  }

  const total = activities.length;
  const byStatus = (s) => activities.filter(a => a.status === s).length;
  const avgProgress = total ? Math.round(activities.reduce((s, a) => s + a.progress_percent, 0) / total) : 0;
  const noEvidence = activities.filter(a =>
    a.status !== 'pendiente' && !evidence.some(e => e.activity_id === a.id)
  );

  // Career progress
  const careerData = careers.map(c => {
    const ca = activities.filter(a => a.career_id === c.id);
    const avg = ca.length ? Math.round(ca.reduce((s, a) => s + a.progress_percent, 0) / ca.length) : 0;
    return { name: c.code, avance: avg, total: ca.length };
  }).filter(c => c.total > 0);

  // Status distribution
  const statusData = Object.entries(STATUS_LABELS).map(([code, label]) => ({
    name: label, value: byStatus(code), color: STATUS_COLORS[code]
  })).filter(d => d.value > 0);

  // Objective progress
  const objData = objectives.map(o => {
    const oa = activities.filter(a => a.objective_id === o.id);
    const avg = oa.length ? Math.round(oa.reduce((s, a) => s + a.progress_percent, 0) / oa.length) : 0;
    return { name: o.title.substring(0, 30), avance: avg, total: oa.length };
  });

  // Recent activities
  const recent = [...activities]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Resumen ejecutivo del Proyecto Ícono
          </p>
        </div>
        <div style={{fontSize:'0.8rem', color:'var(--color-text-muted)'}}>
          {new Date().toLocaleDateString('es-CL', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(59,130,246,0.1)', color:'#3b82f6'}}>
            <ClipboardList size={20} />
          </div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Actividades Totales</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(234,179,8,0.1)', color:'#eab308'}}>
            <Clock size={20} />
          </div>
          <div className="kpi-value">{byStatus('pendiente')}</div>
          <div className="kpi-label">Pendientes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(59,130,246,0.1)', color:'#3b82f6'}}>
            <Activity size={20} />
          </div>
          <div className="kpi-value">{byStatus('en_curso')}</div>
          <div className="kpi-label">En Curso</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(34,197,94,0.1)', color:'#22c55e'}}>
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-value">{byStatus('finalizado')}</div>
          <div className="kpi-label">Finalizadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(239,68,68,0.1)', color:'#ef4444'}}>
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-value">{byStatus('retrasado')}</div>
          <div className="kpi-label">Retrasadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(197,163,78,0.1)', color:'var(--color-accent)'}}>
            <TrendingUp size={20} />
          </div>
          <div className="kpi-value">{avgProgress}%</div>
          <div className="kpi-label">Avance Global</div>
          <div className="progress-bar" style={{marginTop:'8px'}}>
            <div className="progress-fill" style={{width:`${avgProgress}%`}} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(59,130,246,0.1)', color:'#3b82f6'}}>
            <FileImage size={20} />
          </div>
          <div className="kpi-value">{evidence.length}</div>
          <div className="kpi-label">Evidencias Cargadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'rgba(34,197,94,0.1)', color:'#22c55e'}}>
            <GraduationCap size={20} />
          </div>
          <div className="kpi-value">{careerData.length}/{careers.length}</div>
          <div className="kpi-label">Carreras con Actividades</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts">
        <div className="card" style={{flex:2}}>
          <div className="card-header">
            <span className="card-title">Avance por Carrera</span>
          </div>
          {careerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={careerData} margin={{top:5,right:10,bottom:5,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fontSize:11}} />
                <YAxis domain={[0,100]} tick={{fontSize:11}} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Avance']}
                  contentStyle={{borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'0.8rem'}}
                />
                <Bar dataKey="avance" fill="var(--color-accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>Sin datos de avance por carrera</p></div>
          )}
        </div>

        <div className="card" style={{flex:1, minWidth:220}}>
          <div className="card-header">
            <span className="card-title">Estado de Actividades</span>
          </div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                       dataKey="value" paddingAngle={3}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'0.8rem'}} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px',justifyContent:'center',marginTop:'8px'}}>
                {statusData.map(d => (
                  <div key={d.name} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'0.72rem'}}>
                    <span className="status-dot" style={{background:d.color}} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><p>Sin actividades</p></div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dashboard-bottom">
        {/* Recent Activities */}
        <div className="card" style={{flex:2}}>
          <div className="card-header">
            <span className="card-title">Actividades Recientes</span>
            <Link to="/actividades" className="btn btn-ghost btn-sm">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length > 0 ? (
            <div className="table-container" style={{border:'none'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Carrera</th>
                    <th>Estado</th>
                    <th>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(a => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/actividades/${a.id}`} style={{color:'var(--color-text)',fontWeight:500}}>
                          {a.title}
                        </Link>
                      </td>
                      <td><span className="text-muted">{a.careers?.code || '—'}</span></td>
                      <td><span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',minWidth:80}}>
                          <div className="progress-bar" style={{flex:1}}>
                            <div className="progress-fill" style={{width:`${a.progress_percent}%`}} />
                          </div>
                          <span style={{fontSize:'0.75rem',fontWeight:600}}>{a.progress_percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><p>Sin actividades recientes</p></div>
          )}
        </div>

        {/* Alerts */}
        <div className="card" style={{flex:1, minWidth: 260}}>
          <div className="card-header">
            <span className="card-title">Alertas</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {byStatus('retrasado') > 0 && (
              <div className="alert-item alert-danger">
                <AlertTriangle size={14} />
                <span>{byStatus('retrasado')} actividad(es) retrasada(s)</span>
              </div>
            )}
            {noEvidence.length > 0 && (
              <div className="alert-item alert-warning">
                <FileImage size={14} />
                <span>{noEvidence.length} actividad(es) sin evidencia</span>
              </div>
            )}
            {byStatus('retrasado') === 0 && noEvidence.length === 0 && (
              <div className="alert-item alert-success">
                <CheckCircle2 size={14} />
                <span>Sin alertas pendientes</span>
              </div>
            )}
          </div>

          {/* Upcoming timeline */}
          {timeline.length > 0 && (
            <>
              <div className="card-title" style={{marginTop:'var(--space-lg)', marginBottom:'var(--space-sm)'}}>
                Hitos Recientes
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {timeline.map(t => (
                  <div key={t.id} className="timeline-mini">
                    <span className="timeline-mini-date">
                      {new Date(t.event_date).toLocaleDateString('es-CL',{day:'numeric',month:'short'})}
                    </span>
                    <span className="timeline-mini-title">{t.title}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Objective Summary */}
      {objData.length > 0 && (
        <div className="card" style={{marginTop:'var(--space-lg)'}}>
          <div className="card-header">
            <span className="card-title">Resumen por Objetivo</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'var(--space-md)'}}>
            {objData.map((o, i) => (
              <div key={i} style={{padding:'var(--space-md)',background:'var(--color-surface-alt)',borderRadius:'var(--radius-md)'}}>
                <div style={{fontSize:'0.8rem',fontWeight:600,marginBottom:'4px'}}>{o.name}...</div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <div className="progress-bar" style={{flex:1}}>
                    <div className="progress-fill" style={{width:`${o.avance}%`}} />
                  </div>
                  <span style={{fontSize:'0.8rem',fontWeight:700}}>{o.avance}%</span>
                </div>
                <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',marginTop:'4px'}}>
                  {o.total} actividad(es)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .kpi-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--space-md); margin-bottom: var(--space-lg);
        }
        .dashboard-charts {
          display: flex; gap: var(--space-md);
          margin-bottom: var(--space-lg); flex-wrap: wrap;
        }
        .dashboard-bottom {
          display: flex; gap: var(--space-md); flex-wrap: wrap;
        }
        .alert-item {
          display: flex; align-items: center; gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 500;
        }
        .alert-danger { background: #fee2e2; color: #991b1b; }
        .alert-warning { background: #fef3c7; color: #92400e; }
        .alert-success { background: #dcfce7; color: #166534; }
        .timeline-mini {
          display: flex; gap: var(--space-sm);
          align-items: flex-start; font-size: 0.8rem;
        }
        .timeline-mini-date {
          font-weight: 600; color: var(--color-accent);
          white-space: nowrap; min-width: 50px;
        }
        .timeline-mini-title { color: var(--color-text-secondary); }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dashboard-charts, .dashboard-bottom { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
