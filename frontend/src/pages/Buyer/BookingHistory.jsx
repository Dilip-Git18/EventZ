import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import DigitalTicket from '../../components/Ticket/DigitalTicket';
import { Calendar, Ticket, CheckCircle2, Clock, AlertTriangle, ArrowRight, Eye, Download, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../context/AuthContext';

const BookingHistory = () => {
  const { apiFetch, showToast } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchBookings = async () => {
    try {
      const data = await apiFetch('/bookings/my-bookings');
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
    fetchBookings();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge badge-confirmed">Confirmed</span>;
      case 'PENDING':
        return <span className="badge badge-pending">Pending Pay</span>;
      case 'EXPIRED':
        return <span className="badge badge-expired">Expired</span>;
      default:
        return <span className="badge badge-cancelled">{status}</span>;
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
        My Bookings & Tickets
      </h1>

      {bookings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bookings.map((booking) => {
            const eventDate = new Date(booking.event.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div key={booking._id} className="glass-card" style={{ padding: '1.75rem' }}>
                {/* Header Summary */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingBottom: '1rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>
                      {booking.event.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <Calendar size={14} />
                      <span>{eventDate}</span>
                      <span>•</span>
                      <span>{booking.event.venueName}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getStatusBadge(booking.status)}
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                      ${booking.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Body details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Category: <strong>{booking.category.name}</strong> ({booking.quantity} tickets)
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Order Ref: {booking._id}
                    </p>
                  </div>

                  {/* Actions & Ticket rendering */}
                  {booking.status === 'PENDING' && (
                    <Link to={`/checkout/${booking._id}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                      <span>Pay Now</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>

                {/* Sub-item: Ticket Lists if Confirmed */}
                {booking.status === 'CONFIRMED' && booking.tickets && booking.tickets.length > 0 && (
                  <div style={{
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Issued Digital Tickets
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {booking.tickets.map((t) => (
                        <div
                          key={t._id}
                          style={{
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', display: 'block' }}>
                              {t.ticketNumber}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              color: t.status === 'USED' ? 'var(--accent-red)' : 'var(--accent-green)',
                              fontWeight: 500
                            }}>
                              {t.status === 'USED' ? 'USED' : 'VALID'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedTicket({ ...t, event: booking.event, category: booking.category })}
                              className="btn btn-secondary"
                              style={{ padding: '6px', borderRadius: '4px' }}
                              title="View Ticket"
                            >
                              <Eye size={14} />
                            </button>
                            <a
                              href={`${API_BASE_URL}/tickets/${t._id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '6px', borderRadius: '4px' }}
                              title="Download PDF"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
          <Ticket size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>
            No Bookings Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
            You haven't reserved or purchased any event tickets yet.
          </p>
          <Link to="/" className="btn btn-primary">
            Explore Events
          </Link>
        </div>
      )}

      {/* Ticket Drawer Modal */}
      {selectedTicket && (
        <DigitalTicket ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
};

export default BookingHistory;
