import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { ShieldAlert, Users, Calendar, DollarSign, Search, ShieldCheck, UserX, UserCheck } from 'lucide-react';

const AdminDashboard = () => {
  const { apiFetch, showToast, user: currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const fetchAdminData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        apiFetch('/admin/system-stats'),
        apiFetch('/admin/users')
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (usersData.success) setUsers(usersData.users);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (userId) => {
    if (userId === currentUser.id) {
      showToast('You cannot block your own administrator account.', 'warning');
      return;
    }

    setTogglingId(userId);
    try {
      const data = await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PUT'
      });

      if (data.success) {
        showToast(data.message, 'success');
        // Update user state locally
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, status: data.user.status } : u))
        );
        // Refresh statistics (blocked count might affect things later)
        const statsData = await apiFetch('/admin/system-stats');
        if (statsData.success) setStats(statsData.stats);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <Loader fullPage />;

  // Filter users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === '' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
        System Platform Analytics & Admin
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '2rem' }}>
        Global system administration node. Manage user registration statuses and audit overall transactional volume.
      </p>

      {/* Global Performance Statistics Summary Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '2.5rem'
        }}>
          {/* Revenue */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={22} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Platform Revenue
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                ${stats.bookings.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Tickets Sold */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(124, 58, 237, 0.12)',
              color: 'var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={22} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Buyers
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {stats.users.buyer} / {stats.users.total}
              </span>
            </div>
          </div>

          {/* Organizers */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(236, 72, 153, 0.12)',
              color: 'var(--accent-pink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={22} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Organizers
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {stats.users.organizer}
              </span>
            </div>
          </div>

          {/* Events published */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Events Created
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {stats.events}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* User Management Title & Search bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search users by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filter Role */}
        <select
          className="form-control form-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="">All Account Roles</option>
          <option value="buyer">Buyers</option>
          <option value="organizer">Organizers</option>
          <option value="gatekeeper">Gatekeepers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 8px' }}>Name</th>
              <th style={{ padding: '12px 8px' }}>Email Address</th>
              <th style={{ padding: '12px 8px' }}>Role</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Account Status</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Action Toggle</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isBlocked = u.status === 'blocked';
                const isMe = u._id === currentUser.id;

                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-main)' }}>
                    <td style={{ padding: '14px 8px', fontWeight: 600 }}>{u.name} {isMe && <span style={{ color: 'var(--accent-purple)', fontSize: '11px' }}>(You)</span>}</td>
                    <td style={{ padding: '14px 8px' }}>{u.email}</td>
                    <td style={{ padding: '14px 8px', textTransform: 'capitalize' }}>{u.role}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                      {isBlocked ? (
                        <span className="badge badge-cancelled" style={{ fontSize: '10px' }}>Blocked</span>
                      ) : (
                        <span className="badge badge-confirmed" style={{ fontSize: '10px' }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        className={`btn ${isBlocked ? 'btn-primary' : 'btn-danger'}`}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          opacity: isMe ? 0.3 : 1,
                          cursor: isMe ? 'not-allowed' : 'pointer'
                        }}
                        disabled={togglingId === u._id || isMe}
                      >
                        {isBlocked ? (
                          <>
                            <UserCheck size={12} />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <UserX size={12} />
                            <span>Block User</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  No accounts found matching your query filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
