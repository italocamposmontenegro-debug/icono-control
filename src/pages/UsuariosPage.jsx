/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Edit, X, Save, Users } from 'lucide-react';

const ROLES = ['admin_comite', 'responsable_carrera', 'visualizador'];
const ROLE_LABELS = { admin_comite:'Administrador Comité', responsable_carrera:'Responsable Carrera', visualizador:'Visualizador' };

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState([]);
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(null);
  const [form, setForm] = useState({ full_name:'', role:'visualizador', career_id:'', active:true });

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*, careers(name)').order('created_at', { ascending: false }),
      supabase.from('careers').select('*').eq('active',true).order('name'),
    ]);
    setProfiles(pRes.data || []);
    setCareers(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(p) {
    setEditProfile(p);
    setForm({ full_name:p.full_name||'', role:p.role, career_id:p.career_id||'', active:p.active });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await supabase.from('profiles').update({
      full_name: form.full_name,
      role: form.role,
      career_id: form.career_id || null,
      active: form.active,
    }).eq('id', editProfile.id);
    setEditProfile(null);
    void load();
  }

  if (loading) return <div className="page-content"><div className="skeleton skeleton-card" style={{height:300}} /></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">{profiles.length} usuarios registrados</p>
        </div>
      </div>

      <div className="card" style={{marginBottom:'var(--space-lg)',padding:'var(--space-md)',background:'var(--color-accent-bg)',border:'1px solid var(--color-accent)',borderRadius:'var(--radius-md)'}}>
        <p style={{fontSize:'0.8rem',color:'var(--color-text-secondary)'}}>
          <strong>Nota:</strong> Los usuarios se crean a través de Supabase Auth. Desde aquí puedes editar su perfil, rol y carrera asignada.
          Para crear un nuevo usuario, regístralo desde el panel de Supabase o invita por correo.
        </p>
      </div>

      {editProfile && (
        <div className="modal-overlay" onClick={() => setEditProfile(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Usuario</h2>
              <button className="btn btn-ghost" onClick={() => setEditProfile(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:'var(--space-md)'}}>
                <div className="form-group">
                  <label className="form-label">Correo</label>
                  <input className="form-input" disabled value={editProfile.email} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({...form, role:e.target.value})}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                {form.role === 'responsable_carrera' && (
                  <div className="form-group">
                    <label className="form-label">Carrera Asignada</label>
                    <select className="form-select" value={form.career_id} onChange={e => setForm({...form, career_id:e.target.value})}>
                      <option value="">Sin asignar</option>
                      {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group" style={{flexDirection:'row',alignItems:'center',gap:'var(--space-sm)'}}>
                  <input type="checkbox" id="user-active" checked={form.active} onChange={e => setForm({...form, active:e.target.checked})} />
                  <label htmlFor="user-active" style={{fontSize:'0.85rem'}}>Usuario activo</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditProfile(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Save size={14} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="empty-state"><Users size={48} /><p>Sin usuarios registrados aún.</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Carrera</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight:500}}>{p.full_name || '—'}</td>
                  <td style={{fontSize:'0.85rem',color:'var(--color-text-secondary)'}}>{p.email}</td>
                  <td><span className="badge" style={{background:'var(--color-accent-bg)',color:'var(--color-accent)',fontWeight:600}}>{ROLE_LABELS[p.role]}</span></td>
                  <td>{p.careers?.name || '—'}</td>
                  <td>
                    <span className={`badge ${p.active ? 'badge-finalizado' : 'badge-suspendido'}`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit size={14} /></button>
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
