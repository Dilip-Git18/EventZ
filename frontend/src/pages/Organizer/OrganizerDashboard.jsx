import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { DollarSign, Ticket, Users, BarChart3, Calendar, PlusCircle, CheckCircle, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrganizerDashboard = () => {
  const { apiFetch, showToast } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const data = await apiFetch('/organizer/dashboard-analytics');
      if (data.success) {
        setAnalytics(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <Loader fullPage />;

  const { summary, categories, trends } = analytics || {
    summary: { totalRevenue: 0, totalTicketsSold: 0, bookingsCount: 0, attendanceRate: 0, totalCheckedIn: 0 },
    categories: [],
    trends: []
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
    </div>
  );
};

export default OrganizerDashboard;
