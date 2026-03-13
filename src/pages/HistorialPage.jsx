import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, ArrowRight } from 'lucide-react';

const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };

export default function HistorialPage() {
  const [updates, setUpdates] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('updates');

  useEffect(() => {
    async function load() {
      const [uRes, tRes] = await Promise.all([
        supabase.from('activity_updates')
          .select('*, activities(title), profiles!activity_updates_updated_by_fkey(full_name)')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('timeline_events')
          .select('*, profiles!timeline_events_created_by_fkey(full_name), careers(name)')
          .order('event_date', { ascending: false }),
      ]);
      setUpdates(uRes.data || []);
      setTimeline(tRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="page-content">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height:60,marginBottom:8,borderRadius:8}} />)}</div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial y Bitácora</h1>
          <p className="page-subtitle">Trazabilidad de cambios y eventos del proyecto</p>
        </div>
      </div>

      <div style={{display:'flex',gap:'var(--space-sm)',marginBottom:'var(--space-lg)'}}>
        <button className={`btn ${tab==='updates'?'btn-primary':'btn-outline'}`} onClick={() => setTab('updates')}>
          Cambios en Actividades
        </button>
        <button className={`btn ${tab==='timeline'?'btn-primary':'btn-outline'}`} onClick={() => setTab('timeline')}>
          Línea de Tiempo
        </button>
      </div>

      {tab === 'updates' && (
        updates.length === 0 ? (
          <div className="empty-state"><Clock size={48} /><p>Sin cambios registrados aún.</p></div>
        ) : (
          <div className="card">
            <div style={{display:'flex',flexDirection:'column',position:'relative',paddingLeft:24}}>
              <div style={{position:'absolute',left:8,top:0,bottom:0,width:2,background:'var(--color-border)'}} />
              {updates.map(u => (
                <div key={u.id} style={{position:'relative',paddingBottom:'var(--space-lg)',paddingLeft:'var(--space-md)'}}>
                  <div style={{position:'absolute',left:-20,top:4,width:10,height:10,borderRadius:'50%',background:'var(--color-accent)',border:'2px solid var(--color-surface)'}} />
                  <div style={{fontSize:'0.85rem',fontWeight:600}}>{u.activities?.title || 'Actividad'}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--color-text-secondary)',display:'flex',alignItems:'center',gap:4}}>
                    {u.previous_status && (
                      <>
                        <span className={`badge badge-${u.previous_status}`} style={{fontSize:'0.65rem'}}>{STATUS_LABELS[u.previous_status]}</span>
                        <ArrowRight size={12} />
                        <span className={`badge badge-${u.new_status}`} style={{fontSize:'0.65rem'}}>{STATUS_LABELS[u.new_status]}</span>
                      </>
                    )}
                    {u.previous_progress_percent != null && (
                      <span style={{marginLeft:4}}> | {u.previous_progress_percent}% → {u.new_progress_percent}%</span>
                    )}
                  </div>
                  {u.update_comment && <div style={{fontSize:'0.8rem',marginTop:2}}>{u.update_comment}</div>}
                  <div style={{fontSize:'0.72rem',color:'var(--color-text-light)',marginTop:2}}>
                    {u.profiles?.full_name || 'Usuario'} • {new Date(u.created_at).toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {tab === 'timeline' && (
        timeline.length === 0 ? (
          <div className="empty-state"><Clock size={48} /><p>Sin eventos en la línea de tiempo.</p></div>
        ) : (
          <div className="card">
            <div style={{display:'flex',flexDirection:'column',position:'relative',paddingLeft:24}}>
              <div style={{position:'absolute',left:8,top:0,bottom:0,width:2,background:'var(--color-accent)',opacity:0.3}} />
              {timeline.map(t => (
                <div key={t.id} style={{position:'relative',paddingBottom:'var(--space-xl)',paddingLeft:'var(--space-md)'}}>
                  <div style={{position:'absolute',left:-20,top:4,width:12,height:12,borderRadius:'50%',background:'var(--color-accent)',border:'2px solid var(--color-surface)'}} />
                  <div style={{fontSize:'0.8rem',fontWeight:700,color:'var(--color-accent)'}}>
                    {new Date(t.event_date).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}
                  </div>
                  <div style={{fontSize:'0.95rem',fontWeight:600,marginTop:2}}>{t.title}</div>
                  {t.description && <div style={{fontSize:'0.85rem',color:'var(--color-text-secondary)',marginTop:2}}>{t.description}</div>}
                  {t.careers && <span className="badge" style={{background:'var(--color-surface-alt)',marginTop:4}}>{t.careers.name}</span>}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
