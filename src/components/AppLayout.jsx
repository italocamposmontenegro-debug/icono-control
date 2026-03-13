import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .app-layout { display: flex; min-height: 100vh; }
        .main-content {
          margin-left: var(--sidebar-width);
          flex: 1; min-height: 100vh;
          background: var(--color-bg);
          transition: margin-left 0.2s ease;
        }
        @media (max-width: 768px) {
          .main-content { margin-left: var(--sidebar-collapsed); }
        }
      `}</style>
    </div>
  );
}
