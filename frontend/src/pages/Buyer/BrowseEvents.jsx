import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import EventCard from '../../components/EventCard';
import Loader from '../../components/Common/Loader';
import { Search, Calendar, RefreshCw } from 'lucide-react';

const BrowseEvents = () => {
  const { apiFetch, showToast } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
      if (filterDate) queryParams.push(`date=${encodeURIComponent(filterDate)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const data = await apiFetch(`/events${queryString}`);
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly
    const delayDebounceFn = setTimeout(() => {
      fetchEvents();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterDate]);

  return (
    <div>
      {/* Hero Branding Header */}
      <div style={{
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)',
        border: '1px solid rgba(124, 58, 237, 0.12)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.5rem',
            lineHeight: 1.2
          }}>
            Discover & Secure Live Experiences
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.5 }}>
            Book premium ticket inventories instantly with EventZ's high-concurrency reservation engine. Guaranteed race-condition protection.
          </p>
        </div>
        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'var(--accent-purple)',
          filter: 'blur(80px)',
          opacity: 0.3,
          zIndex: 1
        }} />
      </div>

      {/* Search and filter controls */}
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
            placeholder="Search events by title or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Date Filter */}
        <div style={{ position: 'relative', width: '200px', minWidth: '160px' }}>
          <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            type="date"
            className="form-control"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Clear Filters */}
        {(searchTerm || filterDate) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setFilterDate('');
            }}
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Events Grid */}
      {loading ? (
        <Loader />
      ) : events.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '24px'
        }}>
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          borderStyle: 'dashed',
          borderWidth: '2px'
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>
            No Events Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Try adjusting your search criteria or resetting filters to explore upcoming events.
          </p>
        </div>
      )}
    </div>
  );
};

export default BrowseEvents;
