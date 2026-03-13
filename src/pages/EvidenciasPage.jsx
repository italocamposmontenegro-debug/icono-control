import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileImage, Download, Search } from 'lucide-react';

const EVIDENCE_TYPES = { registro_fotografico:'Registro Fotográfico', acta:'Acta', lista_asistencia:'Lista Asistencia', correo:'Correo', aparicion_medios:'Aparición Medios', documento:'Documento', otro:'Otro' };

export default function EvidenciasPage() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('evidence')
        .select('*, activities(title, careers(code)), profiles!evidence_uploaded_by_fkey(full_name)')
        .order('created_at', { ascending: false });
      setEvidence(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = evidence.filter(e => {
    if (filterType && e.evidence_type !== filterType) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function download(ev) {
    const { data } = await supabase.storage.from('evidence').createSignedUrl(ev.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  if (loading) {
    return <div className="page-content">{[1,2,3].map(i => <div key={i} className="skeleton" style={{height:60,marginBottom:8,borderRadius:8}} />)}</div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Evidencias</h1>
          <p className="page-subtitle">{filtered.length} evidencias registradas</p>
        </div>
      </div>

      <div className="filters-bar">
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--color-text-muted)'}} />
          <input className="form-input" placeholder="Buscar evidencias..." style={{paddingLeft:32,width:'100%'}}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(EVIDENCE_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><FileImage size={48} /><p>Sin evidencias registradas.</p></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'var(--space-md)'}}>
          {filtered.map(ev => (
            <div key={ev.id} className="card" style={{display:'flex',flexDirection:'column',gap:'var(--space-sm)'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'var(--space-sm)'}}>
                <div style={{width:36,height:36,borderRadius:'var(--radius-sm)',background:'var(--color-accent-bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <FileImage size={16} style={{color:'var(--color-accent)'}} />
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'0.9rem'}}>{ev.title}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--color-text-muted)'}}>
                    {EVIDENCE_TYPES[ev.evidence_type]} • {ev.activities?.careers?.code || '—'} • {ev.activities?.title?.substring(0,30) || '—'}
                  </div>
                </div>
              </div>
              {ev.description && <p style={{fontSize:'0.8rem',color:'var(--color-text-secondary)'}}>{ev.description}</p>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto'}}>
                <span style={{fontSize:'0.72rem',color:'var(--color-text-light)'}}>
                  {ev.profiles?.full_name || 'N/A'} • {new Date(ev.created_at).toLocaleDateString('es-CL')}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => download(ev)}><Download size={14} /> Descargar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
