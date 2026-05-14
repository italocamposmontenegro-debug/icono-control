import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import {
  getActivityMetadata,
  listToTextarea,
  mergeMetadataIntoObservations,
  stripMetadataBlock,
  textareaToList,
} from '../utils/activityMetadata';

const STATUSES = ['pendiente','en_curso','finalizado','retrasado','suspendido'];
const PRIORITIES = ['baja','media','alta','critica'];
const STAGES = ['', 'Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4'];

const EMPTY_META_FORM = {
  projectName: '',
  stage: '',
  period: '',
  activityType: '',
  year: '',
  territory: '',
  institutionPartner: '',
  targetPopulation: '',
  career: '',
  courseName: '',
  semester: '',
  responsiblePerson: '',
  instrument: '',
  associatedObjective: '',
  territorialAxis: '',
  expectedEvidence: '',
  indicators: '',
  nextAction: '',
  pending: '',
  sourceObservation: '',
};

function metadataToForm(metadata = {}) {
  return {
    ...EMPTY_META_FORM,
    ...metadata,
    territorialAxis: listToTextarea(metadata.territorialAxis),
    expectedEvidence: listToTextarea(metadata.expectedEvidence),
    indicators: listToTextarea(metadata.indicators),
  };
}

function formToMetadata(form) {
  return {
    ...form,
    territorialAxis: textareaToList(form.territorialAxis),
    expectedEvidence: textareaToList(form.expectedEvidence),
    indicators: textareaToList(form.indicators),
  };
}

export default function ActivityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title:'', description:'', objective_id:'', career_id:'',
    start_date:'', end_date:'', status:'pendiente', priority:'media',
    progress_percent:0, responsible_profile_id:'',
    internal_assistants_text:'', external_assistants_text:'', observations:''
  });
  const [careers, setCareers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [metaForm, setMetaForm] = useState(EMPTY_META_FORM);

  useEffect(() => {
    async function load() {
      const [cRes, oRes, pRes] = await Promise.all([
        supabase.from('careers').select('*').eq('active', true).order('name'),
        supabase.from('objectives').select('*').eq('active', true).order('order_index'),
        supabase.from('profiles').select('id, full_name, email').eq('active', true),
      ]);
      setCareers(cRes.data || []);
      setObjectives(oRes.data || []);
      setProfiles(pRes.data || []);

      if (isEdit) {
        const { data } = await supabase.from('activities').select('*').eq('id', id).single();
        if (data) {
          if (!isAdmin && profile?.role === 'responsable_carrera' && data.career_id !== profile?.career_id) {
            setBlocked(true);
            setError('No tienes permisos para editar actividades de otra carrera.');
            setLoading(false);
            return;
          }

          const metadata = getActivityMetadata(data);
          setForm({
            title: data.title || '',
            description: data.description || '',
            objective_id: data.objective_id || '',
            career_id: data.career_id || '',
            start_date: data.start_date || '',
            end_date: data.end_date || '',
            status: data.status || 'pendiente',
            priority: data.priority || 'media',
            progress_percent: data.progress_percent || 0,
            responsible_profile_id: data.responsible_profile_id || '',
            internal_assistants_text: data.internal_assistants_text || '',
            external_assistants_text: data.external_assistants_text || '',
            observations: stripMetadataBlock(data.observations || ''),
          });
          setMetaForm(metadataToForm(metadata));
        }
      }
      setLoading(false);
    }
    load();
  }, [id, isAdmin, isEdit, profile?.career_id, profile?.role]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleMetaChange = (field, value) => setMetaForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    setError('');
    setSaving(true);

    const payload = {
      ...form,
      observations: mergeMetadataIntoObservations(form.observations, formToMetadata(metaForm)),
      objective_id: form.objective_id || null,
      career_id: form.career_id || null,
      responsible_profile_id: form.responsible_profile_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      progress_percent: parseInt(form.progress_percent) || 0,
    };

    try {
      if (isEdit) {
        // Get old values for audit
        const { data: old } = await supabase.from('activities').select('status, progress_percent').eq('id', id).single();

        const { error: err } = await supabase.from('activities').update(payload).eq('id', id);
        if (err) throw err;

        // Log change if status or progress changed
        if (old && (old.status !== payload.status || old.progress_percent !== payload.progress_percent)) {
          await supabase.from('activity_updates').insert({
            activity_id: id,
            updated_by: profile.id,
            previous_status: old.status,
            new_status: payload.status,
            previous_progress_percent: old.progress_percent,
            new_progress_percent: payload.progress_percent,
            update_comment: '',
          });
        }
        navigate(`/actividades/${id}`);
      } else {
        payload.created_by = profile.id;
        if (!isAdmin && profile.career_id) {
          payload.career_id = profile.career_id;
        }
        const { data, error: err } = await supabase.from('activities').insert(payload).select().single();
        if (err) throw err;
        navigate(`/actividades/${data.id}`);
      }
    } catch (err) {
      setError(err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-content"><div className="skeleton skeleton-card" style={{height:400}} /></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:'var(--space-md)'}}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <h1 className="page-title">{isEdit ? 'Editar Actividad' : 'Nueva Actividad'}</h1>
        </div>
      </div>

      <div className="card" style={{maxWidth:800}}>
        {blocked ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'var(--space-md)'}}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" required value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Nombre de la actividad" />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Descripción detallada de la actividad" />
          </div>

          <div className="card" style={{background:'var(--color-surface-alt)', boxShadow:'none', padding:'var(--space-md)'}}>
            <div className="card-title" style={{marginBottom:'var(--space-md)'}}>Seguimiento Proyecto Iconico 2026</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Proyecto</label>
                <input className="form-input" value={metaForm.projectName} onChange={e => handleMetaChange('projectName', e.target.value)} placeholder="Proyecto asociado" />
              </div>
              <div className="form-group">
                <label className="form-label">Etapa</label>
                <select className="form-select" value={metaForm.stage} onChange={e => handleMetaChange('stage', e.target.value)}>
                  {STAGES.map(stage => <option key={stage || 'empty'} value={stage}>{stage || 'Sin etapa'}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Periodo</label>
                <input className="form-input" value={metaForm.period} onChange={e => handleMetaChange('period', e.target.value)} placeholder="Ej: mayo-octubre 2026" />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <input className="form-input" value={metaForm.activityType} onChange={e => handleMetaChange('activityType', e.target.value)} placeholder="Intervención, evaluación, diagnóstico..." />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Territorio</label>
                <input className="form-input" value={metaForm.territory} onChange={e => handleMetaChange('territory', e.target.value)} placeholder="Casablanca / sector / institución" />
              </div>
              <div className="form-group">
                <label className="form-label">Población objetivo</label>
                <input className="form-input" value={metaForm.targetPopulation} onChange={e => handleMetaChange('targetPopulation', e.target.value)} placeholder="Personas mayores, cuidadoras..." />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Institución vinculada</label>
                <input className="form-input" value={metaForm.institutionPartner} onChange={e => handleMetaChange('institutionPartner', e.target.value)} placeholder="Municipalidad, corporación..." />
              </div>
              <div className="form-group">
                <label className="form-label">Carrera(s) / disciplina(s)</label>
                <input className="form-input" value={metaForm.career} onChange={e => handleMetaChange('career', e.target.value)} placeholder="Carrera o interdisciplinaria" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Asignatura(s)</label>
                <input className="form-input" value={metaForm.courseName} onChange={e => handleMetaChange('courseName', e.target.value)} placeholder="Asignaturas asociadas" />
              </div>
              <div className="form-group">
                <label className="form-label">Semestre</label>
                <input className="form-input" value={metaForm.semester} onChange={e => handleMetaChange('semester', e.target.value)} placeholder="Primer semestre, segundo semestre..." />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Responsable operativo</label>
                <input className="form-input" value={metaForm.responsiblePerson} onChange={e => handleMetaChange('responsiblePerson', e.target.value)} placeholder="Nombre responsable" />
              </div>
              <div className="form-group">
                <label className="form-label">Instrumento asociado</label>
                <input className="form-input" value={metaForm.instrument} onChange={e => handleMetaChange('instrument', e.target.value)} placeholder="SF-36 V2 u otro" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ejes críticos</label>
              <textarea className="form-textarea" value={metaForm.territorialAxis} onChange={e => handleMetaChange('territorialAxis', e.target.value)} placeholder="Un eje por línea" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Evidencias esperadas</label>
                <textarea className="form-textarea" value={metaForm.expectedEvidence} onChange={e => handleMetaChange('expectedEvidence', e.target.value)} placeholder="Una evidencia por línea" />
              </div>
              <div className="form-group">
                <label className="form-label">Indicadores asociados</label>
                <textarea className="form-textarea" value={metaForm.indicators} onChange={e => handleMetaChange('indicators', e.target.value)} placeholder="Un indicador por línea" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Próxima acción</label>
                <textarea className="form-textarea" value={metaForm.nextAction} onChange={e => handleMetaChange('nextAction', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Datos pendientes</label>
                <textarea className="form-textarea" value={metaForm.pending} onChange={e => handleMetaChange('pending', e.target.value)} placeholder="Por definir / pendiente de confirmar" />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Carrera</label>
              <select className="form-select" value={form.career_id} onChange={e => handleChange('career_id', e.target.value)} disabled={!isAdmin && profile?.career_id}>
                <option value="">Seleccionar carrera</option>
                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Objetivo</label>
              <select className="form-select" value={form.objective_id} onChange={e => handleChange('objective_id', e.target.value)}>
                <option value="">Seleccionar objetivo</option>
                {objectives.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha Inicio</label>
              <input className="form-input" type="date" value={form.start_date} onChange={e => handleChange('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Término</label>
              <input className="form-input" type="date" value={form.end_date} onChange={e => handleChange('end_date', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select className="form-select" value={form.priority} onChange={e => handleChange('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Avance (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.progress_percent} onChange={e => handleChange('progress_percent', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Responsable</label>
              <select className="form-select" value={form.responsible_profile_id} onChange={e => handleChange('responsible_profile_id', e.target.value)}>
                <option value="">Seleccionar responsable</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Asistentes Internos</label>
            <textarea className="form-textarea" value={form.internal_assistants_text} onChange={e => handleChange('internal_assistants_text', e.target.value)} placeholder="Nombres de asistentes internos" style={{minHeight:50}} />
          </div>

          <div className="form-group">
            <label className="form-label">Asistentes Externos</label>
            <textarea className="form-textarea" value={form.external_assistants_text} onChange={e => handleChange('external_assistants_text', e.target.value)} placeholder="Nombres de asistentes externos" style={{minHeight:50}} />
          </div>

          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <textarea className="form-textarea" value={form.observations} onChange={e => handleChange('observations', e.target.value)} placeholder="Notas adicionales" />
          </div>

          <div style={{display:'flex', gap:'var(--space-sm)', justifyContent:'flex-end', marginTop:'var(--space-md)'}}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
