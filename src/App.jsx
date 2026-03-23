import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import ActivityFormPage from './pages/ActivityFormPage';
import CronogramaPage from './pages/CronogramaPage';
import EvidenciasPage from './pages/EvidenciasPage';
import HistorialPage from './pages/HistorialPage';
import ReportesPage from './pages/ReportesPage';
import CarrerasPage from './pages/CarrerasPage';
import UsuariosPage from './pages/UsuariosPage';
import { Loader } from 'lucide-react';

function ProtectedRoute({ children, adminOnly = false, editOnly = false }) {
  const { user, profile, loading, canEdit } = useAuth();

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== 'admin_comite') return <Navigate to="/" replace />;
  if (editOnly && !canEdit) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="actividades" element={<ActivitiesPage />} />
            <Route path="actividades/nueva" element={
              <ProtectedRoute editOnly><ActivityFormPage /></ProtectedRoute>
            } />
            <Route path="actividades/:id" element={<ActivityDetailPage />} />
            <Route path="actividades/:id/editar" element={
              <ProtectedRoute editOnly><ActivityFormPage /></ProtectedRoute>
            } />
            <Route path="cronograma" element={<CronogramaPage />} />
            <Route path="evidencias" element={<EvidenciasPage />} />
            <Route path="historial" element={<HistorialPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="carreras" element={
              <ProtectedRoute adminOnly><CarrerasPage /></ProtectedRoute>
            } />
            <Route path="usuarios" element={
              <ProtectedRoute adminOnly><UsuariosPage /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
