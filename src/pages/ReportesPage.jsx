import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Download, FileText } from 'lucide-react';

const STATUS_LABELS = { pendiente:'Pendiente', en_curso:'En Curso', finalizado:'Finalizado', retrasado:'Retrasado', suspendido:'Suspendido' };
const PRIORITY_LABELS = { baja:'Baja', media:'Media', alta:'Alta', critica:'Crítica' };

export default function ReportesPage() {
  const [activities, setActivities] = useState([]);
  const [careers, setCareers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCareer, setFilterCareer] = useState('');
  const [filterObjective, setFilterObjective] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function load() {
      const [aRes, cRes, oRes] = await Promise.all([
        supabase.from('activities').select('*, careers(name, code), objectives(title)').order('start_date'),
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
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterCareer && a.career_id !== filterCareer) return false;
    if (filterObjective && a.objective_id !== filterObjective) return false;
    if (dateFrom && a.start_date && a.start_date < dateFrom) return false;
    if (dateTo && a.end_date && a.end_date > dateTo) return false;
    return true;
  });

  const exportCSV = () => {
    const header = ['Título','Carrera','Objetivo','Estado','Prioridad','Avance','Fecha Inicio','Fecha Término','Observaciones'];
    const rows = filtered.map(a => [
      `"${a.title}"`,
      a.careers?.name || '',
      `"${a.objectives?.title || ''}"`,
      STATUS_LABELS[a.status] || a.status,
      PRIORITY_LABELS[a.priority] || a.priority,
      `${a.progress_percent}%`,
      a.start_date || '',
      a.end_date || '',
      `"${(a.observations || '').replace(/"/g,'""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `icono_control_reporte_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const win = window.open('', '_blank');
    const avgProgress = filtered.length ? Math.round(filtered.reduce((s,a) => s + a.progress_percent, 0) / filtered.length) : 0;
    const byStatus = (s) => filtered.filter(a => a.status === s).length;

    win.document.write(`
      <html><head><title>Reporte Ícono Control</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
        h1 { font-size: 1.5rem; margin-bottom: 4px; }
        .subtitle { color: #868e96; font-size: 0.85rem; margin-bottom: 24px; }
        .kpis { display: flex; gap: 16px; margin-bottom: 24px; }
        .kpi { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; text-align: center; }
        .kpi strong { display: block; font-size: 1.3rem; }
        .kpi span { font-size: 0.75rem; color: #868e96; }
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #dee2e6; font-size: 0.75rem; text-transform: uppercase; color: #868e96; }
        td { padding: 8px; border-bottom: 1px solid #e9ecef; }
        .footer { margin-top: 32px; font-size: 0.75rem; color: #868e96; }
      </style></head><body>
      <h1>Ícono Control — Reporte Ejecutivo</h1>
      <div class="subtitle">Proyecto Ícono • Facultad de Ciencias de la Vida • UVM<br>Generado: ${new Date().toLocaleDateString('es-CL',{dateStyle:'long'})}</div>
      <div class="kpis">
        <div class="kpi"><strong>${filtered.length}</strong><span>Total</span></div>
        <div class="kpi"><strong>${avgProgress}%</strong><span>Avance</span></div>
        <div class="kpi"><strong>${byStatus('en_curso')}</strong><span>En Curso</span></div>
        <div class="kpi"><strong>${byStatus('finalizado')}</strong><span>Finalizadas</span></div>
        <div class="kpi"><strong>${byStatus('retrasado')}</strong><span>Retrasadas</span></div>
      </div>
      <table>
        <thead><tr><th>Actividad</th><th>Carrera</th><th>Estado</th><th>Avance</th><th>Fechas</th></tr></thead>
        <tbody>
          ${filtered.map(a => `<tr>
            <td>${a.title}</td>
            <td>${a.careers?.code || '—'}</td>
            <td>${STATUS_LABELS[a.status]}</td>
            <td>${a.progress_percent}%</td>
            <td>${a.start_date || '—'} → ${a.end_date || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Reporte confidencial — Proyecto Ícono, UVM</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (loading) return <div className="page-content"><div className="skeleton skeleton-card" style={{height:300}} /></div>;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Exportación y resumen ejecutivo</p>
        </div>
        <div style={{display:'flex',gap:'var(--space-sm)'}}>
          <button className="btn btn-outline" onClick={exportCSV}><Download size={14} /> Exportar CSV</button>
          <button className="btn btn-primary" onClick={printReport}><FileText size={14} /> Resumen Imprimible</button>
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
        <input className="form-input" type="date" placeholder="Desde" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input className="form-input" type="date" placeholder="Hasta" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Vista previa ({filtered.length} actividades)</span></div>
        {filtered.length === 0 ? (
          <div className="empty-state"><BarChart3 size={48} /><p>Sin datos para los filtros seleccionados.</p></div>
        ) : (
          <div className="table-container" style={{border:'none'}}>
            <table className="data-table">
              <thead><tr><th>Actividad</th><th>Carrera</th><th>Objetivo</th><th>Estado</th><th>Avance</th><th>Inicio</th><th>Término</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{fontWeight:500}}>{a.title}</td>
                    <td>{a.careers?.code || '—'}</td>
                    <td style={{fontSize:'0.8rem',color:'var(--color-text-secondary)',maxWidth:200}}>{a.objectives?.title?.substring(0,40) || '—'}</td>
                    <td><span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                    <td style={{fontWeight:600}}>{a.progress_percent}%</td>
                    <td style={{fontSize:'0.8rem'}}>{a.start_date || '—'}</td>
                    <td style={{fontSize:'0.8rem'}}>{a.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
