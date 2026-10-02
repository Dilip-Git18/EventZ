import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { DollarSign, Ticket, Users, BarChart3, PlusCircle, Percent, MapPin, CircleAlert, Edit3, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrganizerDashboard = () => {
  const { apiFetch, showToast } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({});
  const [savingEvent, setSavingEvent] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', price: '', capacity: '' });
  const [savingCategory, setSavingCategory] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [analyticsData, eventsData] = await Promise.all([
        apiFetch('/organizer/dashboard-analytics'),
        apiFetch('/organizer/events')
      ]);

      if (analyticsData.success) setAnalytics(analyticsData);
      if (eventsData.success) setEvents(eventsData.events || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openEditor = async (event) => {
    let editorEvent = event;
    try {
      const data = await apiFetch(`/events/${event._id}`);
      if (data.success && data.event) editorEvent = data.event;
    } catch (error) {
      showToast('Could not load the latest ticket categories.', 'error');
    }
    setEditingEvent(editorEvent);
    setEventForm({
      title: editorEvent.title || '',
      description: editorEvent.description || '',
      venueName: editorEvent.venueName || '',
      venueAddress: editorEvent.venueAddress || '',
      startDate: editorEvent.startDate ? editorEvent.startDate.slice(0, 16) : '',
      endDate: editorEvent.endDate ? editorEvent.endDate.slice(0, 16) : ''
    });
    setCategoryForm({ name: '', price: '', capacity: '' });
  };

  const saveEvent = async (event) => {
    setSavingEvent(true);
    try {
      const data = await apiFetch(`/events/${event._id}`, { method: 'PUT', body: JSON.stringify(eventForm) });
      if (data.success) {
        setEvents((current) => current.map((item) => item._id === event._id ? { ...item, ...data.event } : item));
        showToast('Event details updated.', 'success');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  const updateCategory = async (event, category, field, value) => {
    const parsedValue = field === 'name' ? value : Number(value);
    try {
      const data = await apiFetch(`/events/${event._id}/categories/${category._id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: parsedValue })
      });
      if (data.success) {
        setEditingEvent((current) => ({ ...current, categories: current.categories.map((item) => item._id === category._id ? data.category : item) }));
        setEvents((current) => current.map((item) => item._id === event._id ? { ...item, categories: item.categories.map((entry) => entry._id === category._id ? data.category : entry) } : item));
        showToast(`${category.name} updated.`, 'success');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const addCategory = async (event) => {
    setSavingCategory(true);
    try {
      const data = await apiFetch(`/events/${event._id}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: categoryForm.name.trim(), price: Number(categoryForm.price), capacity: Number(categoryForm.capacity) })
      });
      if (data.success) {
        const categories = [...(editingEvent.categories || []), data.category];
        setEditingEvent((current) => ({ ...current, categories, categoriesCount: categories.length, hasTicketsConfigured: true }));
        setEvents((current) => current.map((item) => item._id === event._id ? { ...item, categories, categoriesCount: categories.length, hasTicketsConfigured: true } : item));
        setCategoryForm({ name: '', price: '', capacity: '' });
        showToast('Ticket category added.', 'success');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  if (loading) return <Loader fullPage />;

  const { summary, categories, trends } = analytics || {
    summary: { totalRevenue: 0, totalTicketsSold: 0, bookingsCount: 0, attendanceRate: 0, totalCheckedIn: 0 },
    categories: [],
    trends: []
  };

  const formatEventDate = (value) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper to render a custom SVG Line Chart for revenue trends
  const renderTrendChart = () => {
    if (!trends || trends.length === 0) {
      return (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          No recent sales transactions recorded.
        </div>
      );
    }

    const chartHeight = 180;
    const chartWidth = 500;
    const padding = 30;

    const maxVal = Math.max(...trends.map((t) => t.revenue), 100);
    const pointsCount = trends.length;

    // Generate SVG path coordinates
    const points = trends.map((t, index) => {
      const x = padding + (index / (pointsCount - 1 || 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (t.revenue / maxVal) * (chartHeight - padding * 2);
      return { x, y, label: t._id.substring(5), val: t.revenue };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Closed path for gradient area fill
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z` 
      : '';

    return (
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', minWidth: '460px', display: 'block' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1={padding} y1={(chartHeight) / 2} x2={chartWidth - padding} y2={(chartHeight) / 2} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

          {/* Area under line */}
          {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

          {/* Trend line */}
          {linePath && <path d={linePath} fill="none" stroke="var(--accent-purple)" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Data points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--accent-purple)" stroke="#fff" strokeWidth="1.5" />
              {/* Date label */}
              {idx % Math.max(1, Math.floor(pointsCount / 5)) === 0 && (
                <text x={p.x} y={chartHeight - 10} fill="var(--text-secondary)" fontSize="8" textAnchor="middle">
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
            Organizer Analytics Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Monitor real-time event revenue and venue attendance metrics.
          </p>
        </div>
        
        <Link to="/organizer/create-event" className="btn btn-primary">
          <PlusCircle size={16} />
          <span>Create New Event</span>
        </Link>
      </div>

      {/* Summary statistics grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '2.5rem'
      }}>
        {/* Rev */}
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
              Total Net Revenue
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Tickets */}
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
            <Ticket size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tickets Sold
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {summary.totalTicketsSold}
            </span>
          </div>
        </div>

        {/* Checked In */}
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
            <Users size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Attended Gates
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {summary.totalCheckedIn} / {summary.totalTicketsSold}
            </span>
          </div>
        </div>

        {/* Attendance Rate */}
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
            <Percent size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Attendance Ratios
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
              {summary.attendanceRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Main split grid: trends & categories table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '30px',
        marginBottom: '2rem'
      }}>
        {/* Left: Trend Graph */}
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-purple)' }} />
            <span>Revenue Velocity Trends</span>
          </h3>
          {renderTrendChart()}
        </div>

        {/* Right: Ticket Category Breakdown Table */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '1rem' }}>
            Ticket Inventory Category Distributions
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '220px' }} className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 4px' }}>Category Name</th>
                  <th style={{ padding: '8px 4px' }}>Event Details</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Sold / Max</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Gross Net</th>
                </tr>
              </thead>
              <tbody>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-main)' }}>
                      <td style={{ padding: '10px 4px', fontWeight: 600 }}>{cat.name}</td>
                      <td style={{ padding: '10px 4px', color: 'var(--text-secondary)', maxWidth: '120px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {cat.eventTitle}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                        {cat.sold} / {cat.capacity}
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--accent-green)' }}>
                        ${cat.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                      No active ticket classes configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Created events list */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '0.25rem' }}>
              Created Events
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Events you created, with ticket category status.
            </p>
          </div>

          <Link to="/organizer/create-event" className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: '13px' }}>
            <PlusCircle size={16} />
            <span>Create Another</span>
          </Link>
        </div>

        {events.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {events.map((event) => {
              const bannerStyle = event.bannerUrl
                ? { backgroundImage: `url(http://localhost:5001${event.bannerUrl})` }
                : { background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(236, 72, 153, 0.12))' };

              return (
                <div key={event._id} className="glass-card" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    height: '140px',
                    borderRadius: '10px',
                    border: '1px solid var(--glass-border)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    ...bannerStyle
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
                        {event.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <MapPin size={13} />
                        <span>{event.venueName}</span>
                      </div>
                    </div>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: event.hasTicketsConfigured ? 'var(--accent-green)' : 'var(--accent-pink)',
                      background: event.hasTicketsConfigured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 72, 153, 0.12)'
                    }}>
                      {event.hasTicketsConfigured ? 'Tickets ready' : 'Needs categories'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{formatEventDate(event.startDate)}</span>
                    <span>{event.categoriesCount || 0} categories</span>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => openEditor(event)} style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '12px' }}>
                    <Edit3 size={14} />
                    <span>Edit event & ticket categories</span>
                  </button>

                  {!event.hasTicketsConfigured && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.14)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      lineHeight: 1.4
                    }}>
                      <CircleAlert size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '1px' }} />
                      <span>Add at least one ticket category before buyers can reserve this event.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No events created yet.
          </div>
        )}
      </div>
      {editingEvent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(3, 4, 8, .78)' }}>
          <div className="glass-panel" style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ color: '#fff', margin: 0 }}>Edit {editingEvent.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '5px 0 0' }}>Update event details, capacity, or add a ticket category.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingEvent(null)}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {['title', 'venueName', 'venueAddress'].map((field) => (
                <input key={field} className="form-control" placeholder={field === 'venueName' ? 'Venue name' : field === 'venueAddress' ? 'Venue address' : 'Event title'} value={eventForm[field]} onChange={(e) => setEventForm({ ...eventForm, [field]: e.target.value })} />
              ))}
              <textarea className="form-control" rows="3" placeholder="Event description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label className="form-label">Start<input className="form-control" type="datetime-local" value={eventForm.startDate} onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })} /></label>
                <label className="form-label">End<input className="form-control" type="datetime-local" value={eventForm.endDate} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })} /></label>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => saveEvent(editingEvent)} disabled={savingEvent}><Save size={14} />{savingEvent ? 'Saving…' : 'Save event details'}</button>
            </div>
            <h4 style={{ color: '#fff', margin: '24px 0 10px' }}>Existing ticket categories</h4>
            {(editingEvent.categories || []).length > 0 ? (editingEvent.categories || []).map((category) => (
              <div key={category._id} style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr .8fr', gap: '8px', marginBottom: '8px', padding: '10px', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <label className="form-label">Category<input className="form-control" value={category.name} onChange={(e) => setEditingEvent({ ...editingEvent, categories: editingEvent.categories.map((item) => item._id === category._id ? { ...item, name: e.target.value } : item) })} onBlur={(e) => updateCategory(editingEvent, category, 'name', e.target.value)} /></label>
                <label className="form-label">Price<input className="form-control" type="number" min="0" value={category.price} onChange={(e) => setEditingEvent({ ...editingEvent, categories: editingEvent.categories.map((item) => item._id === category._id ? { ...item, price: e.target.value } : item) })} onBlur={(e) => updateCategory(editingEvent, category, 'price', e.target.value)} /></label>
                <label className="form-label">Capacity<input className="form-control" type="number" min="1" value={category.capacity} onChange={(e) => setEditingEvent({ ...editingEvent, categories: editingEvent.categories.map((item) => item._id === category._id ? { ...item, capacity: e.target.value } : item) })} onBlur={(e) => updateCategory(editingEvent, category, 'capacity', e.target.value)} /></label>
              </div>
            )) : <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No categories configured yet. Add the first category below.</p>}
            <h4 style={{ color: '#fff', margin: '22px 0 10px' }}>Add another ticket category</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr .8fr auto', gap: '8px' }}>
              <input className="form-control" placeholder="Category name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
              <input className="form-control" type="number" min="0" placeholder="Price" value={categoryForm.price} onChange={(e) => setCategoryForm({ ...categoryForm, price: e.target.value })} />
              <input className="form-control" type="number" min="1" placeholder="Capacity" value={categoryForm.capacity} onChange={(e) => setCategoryForm({ ...categoryForm, capacity: e.target.value })} />
              <button type="button" className="btn btn-secondary" onClick={() => addCategory(editingEvent)} disabled={savingCategory || !categoryForm.name || !categoryForm.capacity}><PlusCircle size={14} />Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
