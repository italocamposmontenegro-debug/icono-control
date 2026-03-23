/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDateOnly, formatDateTime, getTodayDateInputValue } from '../utils/date';
import {
  ArrowLeft, Edit, Trash2, Plus, FileImage, CheckCircle2,
  Clock
} from 'lucide-react';

const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };
const PRIORITY_LABELS = { baja:'Baja', media:'Media', alta:'Alta', critica:'Crítica' };
const EVIDENCE_TYPES = { registro_fotografico:'Registro Fotográfico', acta:'Acta', lista_asistencia:'Lista Asistencia', correo:'Correo', aparicion_medios:'Aparición Medios', documento:'Documento', otro:'Otro' };

export default function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const [activity, setActivity] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title:'', description:'', due_date:'', status:'pendiente' });
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({ title:'', description:'', evidence_type:'documento', evidence_date:'' });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const canEditThis = isAdmin || (profile?.role === 'responsable_carrera' && activity?.career_id === profile?.career_id);

  const load = useCallback(async () => {
    const [aRes, tRes, eRes, uRes] = await Promise.all([
      supabase.from('activities').select('*, careers(name,code), objectives(title), profiles!activities_responsible_profile_id_fkey(full_name,email)').eq('id', id).single(),
      supabase.from('tasks').select('*, profiles!tasks_assigned_to_profile_id_fkey(full_name)').eq('activity_id', id).order('created_at'),
      supabase.from('evidence').select('*, profiles!evidence_uploaded_by_fkey(full_name)').eq('activity_id', id).order('created_at', { ascending: false }),
      supabase.from('activity_updates').select('*, profiles!activity_updates_updated_by_fkey(full_name)').eq('activity_id', id).order('created_at', { ascending: false }).limit(20),
    ]);
    setActivity(aRes.data);
    setTasks(tRes.data || []);
    setEvidenceList(eRes.data || []);
    setUpdates(uRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete() {
    if (!confirm('¿Eliminar esta actividad y todos sus datos asociados?')) return;
    await supabase.from('activities').delete().eq('id', id);
    navigate('/actividades');
  }

  async function addTask(e) {
    e.preventDefault();
    await supabase.from('tasks').insert({ ...taskForm, activity_id: id });
    setShowTaskForm(false);
    setTaskForm({ title:'', description:'', due_date:'', status:'pendiente' });
    void load();
  }

  async function toggleTask(task) {
    const newStatus = task.status === 'finalizado' ? 'pendiente' : 'finalizado';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    void load();
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId);
    void load();
  }

  async function uploadEvidence(e) {
    e.preventDefault();
    if (!evidenceFile) return;
    setUploading(true);
    const ext = evidenceFile.name.split('.').pop();
    const path = `${profile.id}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('evidence').upload(path, evidenceFile);
    if (upErr) { alert('Error subiendo archivo: ' + upErr.message); setUploading(false); return; }
    await supabase.from('evidence').insert({
      ...evidenceForm, activity_id: id, uploaded_by: profile.id, file_path: path,
      evidence_date: evidenceForm.evidence_date || getTodayDateInputValue(),
    });
    setShowEvidenceForm(false);
    setEvidenceForm({ title:'', description:'', evidence_type:'documento', evidence_date:'' });
    setEvidenceFile(null);
    setUploading(false);
    void load();
  }

  async function downloadEvidence(ev) {
    const { data } = await supabase.storage.from('evidence').createSignedUrl(ev.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  if (loading) {
    return <div className="page-content"><div className="skeleton skeleton-card" style={{height:300}} /></div>;
  }
  if (!activity) {
    return <div className="page-content"><div className="empty-state"><p>Actividad no encontrada.</p></div></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{display:'flex', alignItems:'center', gap:'var(--space-md)'}}>
          <button className="btn btn-ghost" onClick={() => navigate('/actividades')}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">{activity.title}</h1>
            <div style={{display:'flex', gap:'var(--space-sm)', alignItems:'center', marginTop:4}}>
              <span className={`badge badge-${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
              <span className={`badge badge-${activity.priority}`}>{PRIORITY_LABELS[activity.priority]}</span>
              {activity.careers && <span className="badge" style={{background:'var(--color-surface-alt)'}}>{activity.careers.name}</span>}
            </div>
          </div>
        </div>
        {canEditThis && (
          <div style={{display:'flex', gap:'var(--space-sm)'}}>
            <Link to={`/actividades/${id}/editar`} className="btn btn-outline"><Edit size={14} /> Editar</Link>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'var(--space-lg)'}}>
        {/* Main Column */}
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-lg)'}}>
          {/* Description */}
          <div className="card">
            <div className="card-title" style={{marginBottom:'var(--space-sm)'}}>Descripción</div>
            <p style={{fontSize:'0.9rem', color:'var(--color-text-secondary)', lineHeight:1.7}}>
              {activity.description || 'Sin descripción.'}
            </p>
            {activity.observations && (
              <>
                <div className="card-title" style={{marginTop:'var(--space-lg)', marginBottom:'var(--space-sm)'}}>Observaciones</div>
                <p style={{fontSize:'0.85rem', color:'var(--color-text-muted)', lineHeight:1.6}}>{activity.observations}</p>
              </>
            )}
          </div>

          {/* Tasks */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tareas ({tasks.length})</span>
              {canEditThis && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowTaskForm(!showTaskForm)}>
                  <Plus size={14} /> Agregar
                </button>
              )}
            </div>
            {showTaskForm && (
              <form onSubmit={addTask} style={{display:'flex',flexDirection:'column',gap:'var(--space-sm)',marginBottom:'var(--space-md)',padding:'var(--space-md)',background:'var(--color-surface-alt)',borderRadius:'var(--radius-md)'}}>
                <input className="form-input" placeholder="Título de la tarea" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title:e.target.value})} />
                <div className="form-row">
                  <input className="form-input" type="date" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date:e.target.value})} />
                  <div style={{display:'flex',gap:'var(--space-sm)'}}>
                    <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTaskForm(false)}>Cancelar</button>
                  </div>
                </div>
              </form>
            )}
            {tasks.length === 0 ? (
              <p style={{fontSize:'0.85rem', color:'var(--color-text-muted)', padding:'var(--space-md) 0'}}>Sin tareas registradas.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {tasks.map(t => (
                  <div key={t.id} style={{display:'flex',alignItems:'center',gap:'var(--space-sm)',padding:'var(--space-sm)',borderRadius:'var(--radius-sm)',background: t.status === 'finalizado' ? 'rgba(34,197,94,0.05)' : 'transparent'}}>
                    <button className="btn btn-ghost" style={{padding:2}} onClick={() => canEditThis && toggleTask(t)}>
                      <CheckCircle2 size={18} style={{color: t.status === 'finalizado' ? '#22c55e' : 'var(--color-text-light)'}} />
                    </button>
                    <div style={{flex:1}}>
                      <span style={{fontSize:'0.85rem', textDecoration: t.status === 'finalizado' ? 'line-through' : 'none', color: t.status === 'finalizado' ? 'var(--color-text-muted)' : 'var(--color-text)'}}>{t.title}</span>
                      {t.due_date && <span style={{fontSize:'0.7rem',color:'var(--color-text-muted)',marginLeft:8}}>{formatDateOnly(t.due_date)}</span>}
                    </div>
                    {canEditThis && <button className="btn btn-ghost btn-sm" onClick={() => deleteTask(t.id)}><Trash2 size={12} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evidence */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Evidencias ({evidenceList.length})</span>
              {canEditThis && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowEvidenceForm(!showEvidenceForm)}>
                  <Plus size={14} /> Subir
                </button>
              )}
            </div>
            {showEvidenceForm && (
              <form onSubmit={uploadEvidence} style={{display:'flex',flexDirection:'column',gap:'var(--space-sm)',marginBottom:'var(--space-md)',padding:'var(--space-md)',background:'var(--color-surface-alt)',borderRadius:'var(--radius-md)'}}>
                <input className="form-input" placeholder="Título de la evidencia" required value={evidenceForm.title} onChange={e => setEvidenceForm({...evidenceForm, title:e.target.value})} />
                <div className="form-row">
                  <select className="form-select" value={evidenceForm.evidence_type} onChange={e => setEvidenceForm({...evidenceForm, evidence_type:e.target.value})}>
                    {Object.entries(EVIDENCE_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className="form-input" type="date" value={evidenceForm.evidence_date} onChange={e => setEvidenceForm({...evidenceForm, evidence_date:e.target.value})} />
                </div>
                <input type="file" onChange={e => setEvidenceFile(e.target.files[0])} required style={{fontSize:'0.85rem'}} />
                <div style={{display:'flex',gap:'var(--space-sm)'}}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>{uploading ? 'Subiendo...' : 'Subir'}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowEvidenceForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
            {evidenceList.length === 0 ? (
              <p style={{fontSize:'0.85rem', color:'var(--color-text-muted)', padding:'var(--space-md) 0'}}>Sin evidencias.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {evidenceList.map(ev => (
                  <div key={ev.id} style={{display:'flex',alignItems:'center',gap:'var(--space-sm)',padding:'var(--space-sm)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)'}}>
                    <FileImage size={16} style={{color:'var(--color-accent)',flexShrink:0}} />
                    <div style={{flex:1}}>
                      <span style={{fontSize:'0.85rem',fontWeight:500}}>{ev.title}</span>
                      <span style={{fontSize:'0.7rem',color:'var(--color-text-muted)',marginLeft:8}}>
                        {EVIDENCE_TYPES[ev.evidence_type]} • {ev.profiles?.full_name || 'N/A'}
                      </span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => downloadEvidence(ev)}>Descargar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Column */}
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-lg)'}}>
          {/* Progress */}
          <div className="card">
            <div className="card-title" style={{marginBottom:'var(--space-md)'}}>Avance</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'2.5rem',fontWeight:800,color:'var(--color-accent)'}}>{activity.progress_percent}%</div>
              <div className="progress-bar" style={{marginTop:8}}>
                <div className="progress-fill" style={{width:`${activity.progress_percent}%`}} />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <div className="card-title" style={{marginBottom:'var(--space-md)'}}>Detalles</div>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--space-md)'}}>
              <div>
                <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',textTransform:'uppercase',fontWeight:600}}>Objetivo</div>
                <div style={{fontSize:'0.85rem'}}>{activity.objectives?.title || '—'}</div>
              </div>
              <div>
                <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',textTransform:'uppercase',fontWeight:600}}>Responsable</div>
                <div style={{fontSize:'0.85rem'}}>{activity.profiles?.full_name || activity.profiles?.email || '—'}</div>
              </div>
              <div>
                <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',textTransform:'uppercase',fontWeight:600}}>Fechas</div>
                <div style={{fontSize:'0.85rem'}}>
                  {formatDateOnly(activity.start_date)}
                  {' → '}
                  {formatDateOnly(activity.end_date)}
                  {activity.duration_days != null && ` (${activity.duration_days} días)`}
                </div>
              </div>
              {activity.internal_assistants_text && (
                <div>
                  <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',textTransform:'uppercase',fontWeight:600}}>Asistentes Internos</div>
                  <div style={{fontSize:'0.85rem'}}>{activity.internal_assistants_text}</div>
                </div>
              )}
              {activity.external_assistants_text && (
                <div>
                  <div style={{fontSize:'0.7rem',color:'var(--color-text-muted)',textTransform:'uppercase',fontWeight:600}}>Asistentes Externos</div>
                  <div style={{fontSize:'0.85rem'}}>{activity.external_assistants_text}</div>
                </div>
              )}
            </div>
          </div>

          {/* Update History */}
          <div className="card">
            <div className="card-title" style={{marginBottom:'var(--space-md)'}}>Historial de Cambios</div>
            {updates.length === 0 ? (
              <p style={{fontSize:'0.85rem',color:'var(--color-text-muted)'}}>Sin cambios registrados.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {updates.slice(0, 5).map(u => (
                  <div key={u.id} style={{fontSize:'0.8rem',padding:'var(--space-sm)',background:'var(--color-surface-alt)',borderRadius:'var(--radius-sm)'}}>
                    <div style={{fontWeight:500}}>{u.profiles?.full_name || 'Usuario'}</div>
                    <div style={{color:'var(--color-text-muted)',fontSize:'0.72rem'}}>
                      {u.previous_status && `${STATUS_LABELS[u.previous_status]} → ${STATUS_LABELS[u.new_status]}`}
                    {u.previous_progress_percent != null && ` | ${u.previous_progress_percent}% → ${u.new_progress_percent}%`}
                  </div>
                  {u.update_comment && <div style={{marginTop:2}}>{u.update_comment}</div>}
                  <div style={{color:'var(--color-text-light)',fontSize:'0.7rem',marginTop:2}}>
                      {formatDateTime(u.created_at, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .page-content > div:last-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
