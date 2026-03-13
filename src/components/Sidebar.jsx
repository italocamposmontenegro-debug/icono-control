import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, ClipboardList, CalendarRange, FileImage,
  Clock, BarChart3, GraduationCap, Users, LogOut, ChevronLeft,
  Menu, Shield
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin_comite', 'responsable_carrera', 'visualizador'] },
  { to: '/actividades', label: 'Actividades', icon: ClipboardList, roles: ['admin_comite', 'responsable_carrera', 'visualizador'] },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarRange, roles: ['admin_comite', 'responsable_carrera', 'visualizador'] },
  { to: '/evidencias', label: 'Evidencias', icon: FileImage, roles: ['admin_comite', 'responsable_carrera', 'visualizador'] },
  { to: '/historial', label: 'Historial', icon: Clock, roles: ['admin_comite', 'responsable_carrera', 'visualizador'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin_comite', 'responsable_carrera', 'visualizador'] },
  { to: '/carreras', label: 'Carreras', icon: GraduationCap, roles: ['admin_comite'] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['admin_comite'] },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = navItems.filter(
    item => item.roles.includes(profile?.role)
  );

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <Shield size={22} className="brand-icon" />
            <span className="brand-text">Ícono Control</span>
          </div>
        )}
        <button className="btn-ghost sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {filteredItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && profile && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {(profile.full_name || profile.email || '?')[0].toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{profile.full_name || profile.email}</span>
              <span className="user-role">{profile.role?.replace('_', ' ')}</span>
            </div>
          </div>
        )}
        <button className="sidebar-link logout-link" onClick={handleSignOut} title="Cerrar sesión">
          <LogOut size={18} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width); height: 100vh; position: fixed;
          left: 0; top: 0; z-index: 100;
          background: var(--color-primary); color: #fff;
          display: flex; flex-direction: column;
          transition: width 0.2s ease;
          overflow: hidden;
        }
        .sidebar-collapsed { width: var(--sidebar-collapsed); }

        .sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--space-md) var(--space-md);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          min-height: var(--header-height);
        }
        .sidebar-brand { display: flex; align-items: center; gap: var(--space-sm); }
        .brand-icon { color: var(--color-accent); }
        .brand-text { font-weight: 700; font-size: 1rem; white-space: nowrap; }
        .sidebar-toggle {
          color: rgba(255,255,255,0.5); background: none; border: none;
          padding: 4px; border-radius: var(--radius-sm);
        }
        .sidebar-toggle:hover { color: #fff; background: rgba(255,255,255,0.1); }

        .sidebar-nav { flex: 1; padding: var(--space-sm); overflow-y: auto; }

        .sidebar-link {
          display: flex; align-items: center; gap: var(--space-sm);
          padding: 0.55rem 0.75rem; border-radius: var(--radius-sm);
          color: rgba(255,255,255,0.6); font-size: 0.875rem; font-weight: 500;
          transition: all 0.15s ease; cursor: pointer;
          border: none; background: none; width: 100%; text-align: left;
          margin-bottom: 2px;
        }
        .sidebar-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .sidebar-link.active {
          color: #fff; background: rgba(197,163,78,0.2);
          border-left: 3px solid var(--color-accent);
        }

        .sidebar-footer {
          padding: var(--space-sm);
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .sidebar-user {
          display: flex; align-items: center; gap: var(--space-sm);
          padding: var(--space-sm) var(--space-sm) var(--space-md);
        }
        .user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--color-accent); color: var(--color-primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
        }
        .user-info { display: flex; flex-direction: column; overflow: hidden; }
        .user-name { font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: capitalize; }

        .logout-link { color: rgba(255,255,255,0.4) !important; }
        .logout-link:hover { color: #ef4444 !important; background: rgba(239,68,68,0.1) !important; }

        @media (max-width: 768px) {
          .sidebar { width: var(--sidebar-collapsed); }
          .sidebar .brand-text,
          .sidebar .sidebar-link span,
          .sidebar .sidebar-user,
          .sidebar .logout-link span { display: none; }
        }
      `}</style>
    </aside>
  );
}
