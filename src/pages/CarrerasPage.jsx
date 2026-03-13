import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, X, Save, GraduationCap } from 'lucide-react';

export default function CarrerasPage() {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'', code:'', description:'', active:true });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('careers').select('*').order('name');
    setCareers(data || []);
    setLoading(false);
  }

  function openEdit(c) {
    setEditId(c.id);
    setForm({ name:c.name, code:c.code, description:c.description||'', active:c.active });
    setShowForm(true);
  }

  function openNew() {
    setEditId(null);
    setForm({ name:'', code:'', description:'', active:true });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editId) {
      await supabase.from('careers').update(form).eq('id', editId);
    } else {
      await supabase.from('careers').insert(form);
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta carrera?')) return;
    await supabase.from('careers').delete().eq('id', id);
    load();
  }

  if (loading) return <div className="page-content"><div className="skeleton skeleton-card" style={{height:300}} /></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Carreras</h1>
          <p className="page-subtitle">{careers.length} carreras registradas</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nueva Carrera</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Editar Carrera' : 'Nueva Carrera'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:'var(--space-md)'}}>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Código</label>
                  <input className="form-input" required value={form.code} onChange={e => setForm({...form, code:e.target.value.toUpperCase()})} maxLength={10} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
                </div>
                <div className="form-group" style={{flexDirection:'row',alignItems:'center',gap:'var(--space-sm)'}}>
                  <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({...form, active:e.target.checked})} />
                  <label htmlFor="active" style={{fontSize:'0.85rem'}}>Carrera activa</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Save size={14} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Código</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {careers.map(c => (
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.name}</td>
                <td><span className="badge" style={{background:'var(--color-surface-alt)'}}>{c.code}</span></td>
                <td style={{fontSize:'0.85rem',color:'var(--color-text-secondary)',maxWidth:300}}>{c.description || '—'}</td>
                <td>
                  <span className={`badge ${c.active ? 'badge-finalizado' : 'badge-suspendido'}`}>
                    {c.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
