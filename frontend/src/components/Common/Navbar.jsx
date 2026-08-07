import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '70px',
      padding: '0 2rem',
      background: 'rgba(10, 11, 14, 0.4)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)',
      position: 'sticky',
      top: 0,
      zIndex: 900
    }}>
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {user.role.toUpperCase()} PANEL
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/profile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-main)',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'var(--transition-smooth)'
        }} className="nav-profile-link">
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--accent-purple-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(124, 58, 237, 0.3)'
          }}>
            <UserIcon size={16} className="text-purple-400" style={{ color: '#a78bfa' }} />
          </div>
          <span>{user.name}</span>
        </Link>

        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => e.target.style.color = '#ef4444'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .nav-profile-link:hover {
          color: #a78bfa !important;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
