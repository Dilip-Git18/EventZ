import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Ticket,
  User,
  LayoutDashboard,
  PlusCircle,
  Users,
  ScanQrCode,
  History,
  Shield,
  Layers
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) return null;

  const renderLinks = () => {
    switch (user.role) {
      case 'buyer':
        return (
          <>
            <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Calendar size={18} />
              <span>Browse Events</span>
            </NavLink>
            <NavLink to="/bookings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Ticket size={18} />
              <span>My Tickets</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <User size={18} />
              <span>My Profile</span>
            </NavLink>
          </>
        );

      case 'organizer':
        return (
          <>
            <NavLink to="/organizer/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/organizer/create-event" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <PlusCircle size={18} />
              <span>Create Event</span>
            </NavLink>
            <NavLink to="/organizer/bookings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Ticket size={18} />
              <span>Event Bookings</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <User size={18} />
              <span>My Profile</span>
            </NavLink>
          </>
        );

      case 'gatekeeper':
        return (
          <>
            <NavLink to="/gatekeeper/scanner" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ScanQrCode size={18} />
              <span>Ticket Scanner</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <User size={18} />
              <span>My Profile</span>
            </NavLink>
          </>
        );

      case 'admin':
        return (
          <>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Shield size={18} />
              <span>System Analytics</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Manage Users</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <User size={18} />
              <span>My Profile</span>
            </NavLink>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <aside className="sidebar" style={{
      width: '260px',
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--glass-border)',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem',
      zIndex: 1000
    }}>
      {/* Brand logo */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.4)'
          }}>
            <Layers size={20} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#fff'
          }}>
            Event<span style={{ color: 'var(--accent-purple)' }}>Z</span>
          </span>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {renderLinks()}
      </nav>

      {/* Footer Info */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        <p>© 2026 EventZ Engine</p>
        <p style={{ color: 'var(--accent-purple)', fontWeight: 500, marginTop: '2px' }}>v1.0.0 Production Ready</p>
      </div>

      <style>{`
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.85rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 0.95rem;
          border-radius: 8px;
          transition: var(--transition-smooth);
        }

        .sidebar-link:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(3px);
        }

        .sidebar-link.active {
          color: #fff;
          background: var(--accent-purple);
          box-shadow: 0 4px 14px 0 var(--accent-purple-glow);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
