import React from 'react';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
  const startDate = new Date(event.startDate);
  const dateString = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate price range and total inventory remaining
  const prices = event.categories?.map((cat) => cat.price) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  
  // Custom capacity check (could be simulated or loaded)
  const totalCapacity = event.categories?.reduce((sum, cat) => sum + cat.capacity, 0) || 0;
  const formatRupee = (amount) => `₹${amount.toFixed(2)}`;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Banner */}
      <div style={{
        height: '160px',
        width: '100%',
        backgroundImage: `url(http://localhost:5001${event.bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '8px',
        marginBottom: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative'
      }}>
        {/* Date overlay */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(10, 11, 14, 0.75)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Calendar size={12} className="text-purple-400" style={{ color: 'var(--accent-purple)' }} />
          <span>{dateString}</span>
        </div>

        {event.status === 'cancelled' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(239, 68, 68, 0.4)',
            backdropFilter: 'blur(2px)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 800,
              color: '#fff',
              background: '#ef4444',
              padding: '6px 14px',
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }}>
              CANCELLED
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.5rem',
            lineHeight: 1.3
          }}>
            {event.title}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{event.venueName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <Ticket size={13} style={{ color: 'var(--text-muted)' }} />
              <span>{event.categories?.length || 0} Ticket Categories</span>
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>TICKETS FROM</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--accent-purple)' }}>
              {formatRupee(minPrice)}
            </span>
          </div>
          <Link to={`/events/${event._id}`} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
            Get Tickets
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
