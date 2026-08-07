import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { Calendar, MapPin, Ticket, ArrowLeft, Info } from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch, showToast, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({}); // Mapping of categoryId -> quantity selector
  const [reservingId, setReservingId] = useState(null);

  const fetchEventDetails = async () => {
    try {
      const data = await apiFetch(`/events/${id}`);
      if (data.success) {
        setEvent(data.event);
        // Initialize quantities to 1 for all categories
        const initialQuants = {};
        data.event.categories.forEach((cat) => {
          initialQuants[cat._id] = 1;
        });
        setQuantities(initialQuants);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const handleQuantityChange = (catId, val, remaining) => {
    const maxAllowed = Math.min(10, remaining);
    const parsed = Math.max(1, Math.min(maxAllowed, parseInt(val) || 1));
    setQuantities((prev) => ({
      ...prev,
      [catId]: parsed
    }));
  };

  const handleReserve = async (categoryId) => {
    if (user.role !== 'buyer') {
      showToast('Only buyer accounts can reserve tickets.', 'warning');
      return;
    }

    const qty = quantities[categoryId] || 1;
    setReservingId(categoryId);

    try {
      const data = await apiFetch('/bookings/reserve', {
        method: 'POST',
        body: JSON.stringify({ categoryId, quantity: qty })
      });

      if (data.success) {
        showToast('Inventory locked! Finalize your booking.', 'success');
        navigate(`/checkout/${data.booking._id}`);
      }
    } catch (err) {
      showToast(err.message, 'error');
      // Refresh event details to get updated capacity count
      fetchEventDetails();
    } finally {
      setReservingId(null);
    }
  };

  if (loading) return <Loader fullPage />;
  if (!event) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: '#fff' }}>Event Not Found</h3>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Events
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.startDate);
  const dateString = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timeString = startDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div>
      {/* Back Link */}
      <Link to="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '1.5rem',
        transition: 'var(--transition-smooth)'
      }} className="back-link">
        <ArrowLeft size={16} />
        <span>Back to Events</span>
      </Link>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: '30px',
        alignItems: 'start'
      }} className="details-grid">

        {/* Left Column: Event details */}
        <div>
          {/* Banner */}
          <div style={{
            height: '320px',
            width: '100%',
            backgroundImage: `url(http://localhost:5001${event.bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '16px',
            border: '1px solid var(--glass-border)',
            marginBottom: '2rem',
            position: 'relative'
          }}>
            {event.status === 'cancelled' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(239, 68, 68, 0.55)',
                backdropFilter: 'blur(4px)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <h2 style={{ fontSize: '2.5rem', color: '#fff', letterSpacing: '0.05em' }}>EVENT CANCELLED</h2>
              </div>
            )}
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '1rem',
            lineHeight: 1.2
          }}>
            {event.title}
          </h1>

          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Calendar size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>{dateString} at {timeString}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <MapPin size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>{event.venueName}</span>
            </div>
          </div>

          {/* Description */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '1rem' }}>
              About The Event
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '15px',
              lineHeight: 1.7,
              whiteSpace: 'pre-line'
            }}>
              {event.description}
            </p>
          </div>

          {/* Venue Location Address */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '0.75rem' }}>
              Venue Location Address
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
              <strong>{event.venueName}</strong>
              <br />
              {event.venueAddress}
            </p>
          </div>
        </div>

        {/* Right Column: Ticket Category selectors */}
        <div>
          <div className="glass-card" style={{ padding: '2rem 1.5rem', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#fff',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Ticket size={22} style={{ color: 'var(--accent-purple)' }} />
              <span>Select Tickets</span>
            </h3>

            {/* List Categories */}
            {event.categories && event.categories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {event.categories.map((cat) => {
                  const isSoldOut = cat.remaining <= 0;
                  const qty = quantities[cat._id] || 1;

                  return (
                    <div
                      key={cat._id}
                      style={{
                        padding: '1.25rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{cat.name}</h4>
                          {isSoldOut ? (
                            <span style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 600 }}>SOLD OUT</span>
                          ) : cat.remaining <= 5 ? (
                            <span style={{ fontSize: '11px', color: 'var(--accent-pink)', fontWeight: 600 }}>
                              HURRY! ONLY {cat.remaining} LEFT
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 500 }}>
                              {cat.remaining} tickets available
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                          ${cat.price.toFixed(2)}
                        </span>
                      </div>

                      {/* Reserve Options */}
                      {!isSoldOut && event.status !== 'cancelled' && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                          <select
                            className="form-control"
                            value={qty}
                            onChange={(e) => handleQuantityChange(cat._id, e.target.value, cat.remaining)}
                            style={{ width: '84px', textAlign: 'center', padding: '6px' }}
                          >
                            {Array.from({ length: Math.min(10, cat.remaining) }, (_, index) => index + 1).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                            onClick={() => handleReserve(cat._id)}
                            disabled={reservingId === cat._id}
                          >
                            {reservingId === cat._id ? 'Securing Lock...' : 'Reserve Now'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>
                No ticket configurations are available yet.
                <div style={{ marginTop: '0.5rem', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  The organizer needs to add at least one ticket category before buyers can reserve tickets for this event.
                </div>
              </div>
            )}

            {/* Lock Info */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '1.5rem',
              padding: '10px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4
            }}>
              <Info size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <p>
                <strong>Redis Distributed Locking Active</strong>: Reserving tickets locks them exclusively for 5 minutes. Complete checkout before expiration to receive valid entry QRs.
              </p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .back-link:hover {
          color: #fff !important;
          transform: translateX(-2px);
        }

        @media (max-width: 768px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default EventDetails;
