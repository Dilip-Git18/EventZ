import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Shield, Save, Camera } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile, uploadProfilePhoto } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) return;

    if (password && password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setUpdating(true);
    await updateProfile(name, email, password || null);
    setUpdating(false);
    setPassword('');
    setConfirmPassword('');
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);

    try {
      await uploadProfilePhoto(file);
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
        My Profile Settings
      </h1>

      {!user?.profilePhoto && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.9rem 1rem',
          borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          lineHeight: 1.5
        }}>
          Upload a profile photo so gatekeepers can verify your identity at the entrance.
        </div>
      )}

      <div className="glass-card" style={{ padding: '2rem' }}>
        
        {/* Header summary of current role status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--glass-border)',
          marginBottom: '2rem'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--accent-purple-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            color: '#a78bfa'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{user?.name}</h4>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Role level: {user?.role}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Profile Photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={30} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="file"
                id="profile-photo-upload"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="profile-photo-upload" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} />
                <span>{photoUploading ? 'Uploading photo...' : 'Choose Photo'}</span>
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                JPG, PNG, or WEBP. Used only for gatekeeper verification.
              </span>
            </div>
          </div>
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
                placeholder="Full Name"
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
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          {/* Password Section */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '1rem' }}>
              Change Password (optional)
            </h4>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Leave blank to keep current"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Leave blank to keep current"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}
            disabled={updating}
          >
            <Save size={16} />
            <span>{updating ? 'Saving Profile Changes...' : 'Save Settings'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};

export default Profile;
