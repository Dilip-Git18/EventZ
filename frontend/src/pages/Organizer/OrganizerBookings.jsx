import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { Ticket, Search, Filter } from 'lucide-react';

const OrganizerBookings = () => {
  const { apiFetch, showToast } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrganizerBookings = async () => {
    try {
      const data = await apiFetch('/organizer/bookings');
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerBookings();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge badge-confirmed">Confirmed</span>;
      case 'PENDING':
        return <span className="badge badge-pending">Pending</span>;
      case 'EXPIRED':
        return <span className="badge badge-expired">Expired</span>;
      default:
        return <span className="badge badge-cancelled">{status}</span>;
    }
  };

  // Filter bookings locally
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.buyer?.name.toLowerCase().includes(search.toLowerCase()) ||
      b.buyer?.email.toLowerCase().includes(search.toLowerCase()) ||
      b.event?.title.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === '' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) return <Loader fullPage />;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
        Event Ticket Sales Log
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '2rem' }}>
        View and audit reservation details for tickets ordered across all your events.
      </p>

      {/* Filter Toolbar */}
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
            placeholder="Search by buyer name, email, or event title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Status select */}
        <div style={{ position: 'relative', width: '200px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          <select
            className="form-control form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          >
            <option value="">All Reservation Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PENDING">PENDING</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 8px' }}>Buyer Details</th>
              <th style={{ padding: '12px 8px' }}>Event Name</th>
              <th style={{ padding: '12px 8px' }}>Category</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Quantity</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Revenue</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 8px' }}>Transaction Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((b) => {
                const dateString = new Date(b.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-main)' }}>
                    <td style={{ padding: '14px 8px' }}>
                      <span style={{ display: 'block', fontWeight: 600 }}>{b.buyer?.name}</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{b.buyer?.email}</span>
                    </td>
                    <td style={{ padding: '14px 8px', fontWeight: 500 }}>{b.event?.title}</td>
                    <td style={{ padding: '14px 8px' }}>{b.category?.name}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 600 }}>{b.quantity}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-green)' }}>
                      ${b.totalAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>{getStatusBadge(b.status)}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>{dateString}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  No booking transactions match your search/filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrganizerBookings;
