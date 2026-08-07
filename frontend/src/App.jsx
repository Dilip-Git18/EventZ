import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Loader from './components/Common/Loader';
import Toast from './components/Common/Toast';
import Sidebar from './components/Common/Sidebar';
import Navbar from './components/Common/Navbar';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Buyer Pages
import BrowseEvents from './pages/Buyer/BrowseEvents';
import EventDetails from './pages/Buyer/EventDetails';
import Checkout from './pages/Buyer/Checkout';
import BookingHistory from './pages/Buyer/BookingHistory';
import Profile from './pages/Buyer/Profile';

// Organizer Pages
import OrganizerDashboard from './pages/Organizer/OrganizerDashboard';
import CreateEvent from './pages/Organizer/CreateEvent';
import OrganizerBookings from './pages/Organizer/OrganizerBookings';

// Gatekeeper Pages
import GatekeeperDashboard from './pages/Gatekeeper/GatekeeperDashboard';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';

// Route protection component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Role-based route protection component
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Home router component based on user roles
const HomeRouter = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'buyer':
      return <BrowseEvents />;
    case 'organizer':
      return <Navigate to="/organizer/dashboard" replace />;
    case 'gatekeeper':
      return <Navigate to="/gatekeeper/scanner" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppContent = () => {
  const { user, loading, toast } = useAuth();

  if (loading) {
    return <Loader fullPage />;
  }

  return (
    <BrowserRouter>
      {/* Toast Alert Portal */}
      {toast && (
        <div className="toast-container">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      {user ? (
        // Authenticated dashboard layout
        <div className="app-container">
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '260px' }} className="content-layout">
            <Navbar />
            <main className="main-content" style={{ margin: 0, padding: '2rem' }}>
              <Routes>
                {/* Home redirection based on role */}
                <Route path="/" element={<HomeRouter />} />

                {/* Shared Buyer / Profile Page */}
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Buyer only routes */}
                <Route path="/events/:id" element={
                  <RoleProtectedRoute allowedRoles={['buyer']}><EventDetails /></RoleProtectedRoute>
                } />
                <Route path="/checkout/:id" element={
                  <RoleProtectedRoute allowedRoles={['buyer']}><Checkout /></RoleProtectedRoute>
                } />
                <Route path="/bookings" element={
                  <RoleProtectedRoute allowedRoles={['buyer']}><BookingHistory /></RoleProtectedRoute>
                } />

                {/* Organizer only routes */}
                <Route path="/organizer/dashboard" element={
                  <RoleProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></RoleProtectedRoute>
                } />
                <Route path="/organizer/create-event" element={
                  <RoleProtectedRoute allowedRoles={['organizer']}><CreateEvent /></RoleProtectedRoute>
                } />
                <Route path="/organizer/bookings" element={
                  <RoleProtectedRoute allowedRoles={['organizer']}><OrganizerBookings /></RoleProtectedRoute>
                } />

                {/* Gatekeeper only routes */}
                <Route path="/gatekeeper/scanner" element={
                  <RoleProtectedRoute allowedRoles={['gatekeeper']}><GatekeeperDashboard /></RoleProtectedRoute>
                } />

                {/* Admin only routes */}
                <Route path="/admin/dashboard" element={
                  <RoleProtectedRoute allowedRoles={['admin']}><AdminDashboard /></RoleProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <RoleProtectedRoute allowedRoles={['admin']}><AdminDashboard /></RoleProtectedRoute>
                } />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      ) : (
        // Unauthenticated login/register layout
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}

      <style>{`
        /* Adjust layout responsiveness */
        @media (max-width: 768px) {
          .content-layout {
            margin-left: 0 !important;
          }
          .main-content {
            padding: 1.25rem !important;
          }
        }
      `}</style>
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
