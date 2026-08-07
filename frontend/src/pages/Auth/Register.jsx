import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) return;

    setSubmitting(true);
    const success = await register(name, email, password, role);
    setSubmitting(false);

    if (success) {
      navigate('/');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.06) 0%, transparent 40%), var(--bg-primary)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 2rem' }}>
        
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.5rem'
          }}>
            Event<span style={{ color: 'var(--accent-purple)' }}>Z</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Create your account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-control"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-control"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Role */}
          <div className="form-group">
            <label className="form-label">Account Role Type</label>
            <select
              className="form-control form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="buyer">Event Ticket Buyer</option>
              <option value="organizer">Event Organizer / Company</option>
              <option value="gatekeeper">Venue Gatekeeper</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          {/* CTA */}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1.25rem' }} disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Register Account'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '14px', color: 'var(--text-secondary)' }}>
          <span>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--accent-purple)', fontWeight: 600, textDecoration: 'none' }} className="hover-underline">
            Login here
          </Link>
        </div>

      </div>

      <style>{`
        .hover-underline:hover {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};

export default Register;
