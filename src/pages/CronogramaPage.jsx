import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateOnly, parseDateOnly } from '../utils/date';

const STATUS_COLORS = { pendiente:'#eab308', en_curso:'#3b82f6', finalizado:'#22c55e', retrasado:'#ef4444', suspendido:'#6b7280' };
const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };

export default function CronogramaPage() {
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCareer, setFilterCareer] = useState('');
  const [filterObjective, setFilterObjective] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    async function load() {
      const [aRes, cRes, oRes] = await Promise.all([
        supabase.from('activities').select('*, careers(name, code)').not('start_date','is',null).order('start_date'),
        supabase.from('careers').select('*').eq('active',true).order('name'),
        supabase.from('objectives').select('*').eq('active',true).order('order_index'),
      ]);
      setActivities(aRes.data || []);
      setCareers(cRes.data || []);
      setObjectives(oRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = activities.filter(a => {
    if (filterCareer && a.career_id !== filterCareer) return false;
    if (filterObjective && a.objective_id !== filterObjective) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  // Calculate timeline range
  const dates = filtered.flatMap(a => {
    const start = parseDateOnly(a.start_date);
    const end = a.end_date ? parseDateOnly(a.end_date) : parseDateOnly(a.start_date);
    return start && end ? [start, end] : [];
  });
  const minDate = dates.length ? new Date(Math.min(...dates)) : new Date();
  const maxDate = dates.length ? new Date(Math.max(...dates)) : new Date();
  const totalDays = Math.max(Math.ceil((maxDate - minDate) / 86400000), 30);

  // Generate month labels
  const months = [];
  const mStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (mStart <= maxDate) {
    months.push({ label: formatDateOnly(mStart, { month:'short', year:'2-digit' }), offset: Math.max(0, (mStart - minDate) / 86400000 / totalDays * 100) });
    mStart.setMonth(mStart.getMonth() + 1);
  }

  if (loading) {
    return <div className="page-content"><div className="skeleton skeleton-card" style={{height:400}} /></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cronograma</h1>
          <p className="page-subtitle">Vista temporal de actividades del proyecto</p>
        </div>
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
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No hay actividades con fechas definidas.</p></div>
      ) : (
        <div className="card" style={{overflow:'auto'}}>
          {/* Month headers */}
          <div style={{position:'relative',height:24,marginBottom:8,borderBottom:'1px solid var(--color-border)'}}>
            {months.map((m,i) => (
              <span key={i} style={{
                position:'absolute', left:`${m.offset}%`, fontSize:'0.7rem',
                color:'var(--color-text-muted)', fontWeight:600, whiteSpace:'nowrap'
              }}>{m.label}</span>
            ))}
          </div>

          {/* Gantt rows */}
          <div style={{display:'flex',flexDirection:'column',gap:6,minWidth:600}}>
            {filtered.map(a => {
              const start = parseDateOnly(a.start_date);
              const end = a.end_date ? parseDateOnly(a.end_date) : new Date(start.getTime() + 7 * 86400000);
              const left = ((start - minDate) / 86400000 / totalDays) * 100;
              const width = Math.max(((end - start) / 86400000 / totalDays) * 100, 2);

              return (
                <div key={a.id} style={{display:'flex', alignItems:'center', gap:8, height:32}}>
                  <div style={{width:180,flexShrink:0,fontSize:'0.8rem',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={a.title}>
                    {a.title}
                  </div>
                  <div style={{flex:1,position:'relative',height:20,background:'var(--color-surface-alt)',borderRadius:4}}>
                    <div style={{
                      position:'absolute', left:`${left}%`, width:`${width}%`,
                      height:'100%', borderRadius:4,
                      background: STATUS_COLORS[a.status] || '#3b82f6',
                      opacity: 0.8, minWidth: 8,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <span style={{fontSize:'0.6rem',color:'#fff',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden'}}>
                        {a.progress_percent}%
                      </span>
                    </div>
                  </div>
                  <span style={{fontSize:'0.7rem',color:'var(--color-text-muted)',width:40,textAlign:'right',flexShrink:0}}>
                    {a.careers?.code}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{display:'flex',gap:'var(--space-md)',marginTop:'var(--space-lg)',flexWrap:'wrap'}}>
            {Object.entries(STATUS_LABELS).map(([code,label]) => (
              <div key={code} style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.72rem'}}>
                <span className="status-dot" style={{background:STATUS_COLORS[code]}} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
