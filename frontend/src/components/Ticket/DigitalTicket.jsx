import React from 'react';
import { Calendar, MapPin, User, Download, CheckCircle, Clock } from 'lucide-react';
import { API_BASE_URL } from '../../context/AuthContext';

const DigitalTicket = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const event = ticket.event;
  const category = ticket.category;
  const buyer = ticket.buyer || { name: 'Valued Guest' };

  const startDate = new Date(event.startDate);
  const dateString = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeString = startDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleDownloadPdf = () => {
    // Open the backend PDF generation URL in a new window or trigger download
    window.open(`${API_BASE_URL}/tickets/${ticket._id}/pdf`, '_blank');
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    ticket.qrCodeData
  )}&size=200x200&color=ffffff&bgcolor=111318`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1500,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '750px',
          animation: 'ticketPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ticket Outer Wrapper */}
        <div style={{
          display: 'flex',
          background: 'linear-gradient(145deg, #12141c, #191c26)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(124, 58, 237, 0.15)',
          position: 'relative'
        }} className="ticket-body">

          {/* Left: Decorative Colored Block or Banner */}
          <div style={{
            width: '180px',
            position: 'relative',
            backgroundImage: `url(http://localhost:5001${event.bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '1.5rem',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)'
          }} className="ticket-banner-left">
            {/* Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to top, rgba(18, 20, 28, 0.95) 20%, rgba(18, 20, 28, 0.1))'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                background: 'var(--accent-purple)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                display: 'inline-block',
                marginBottom: '8px',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.05em'
              }}>
                {category.name.toUpperCase()}
              </div>
              <h4 style={{ fontSize: '15px', color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                {event.title}
              </h4>
            </div>
          </div>

          {/* Center: Main Details */}
          <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1.2
                }}>
                  {event.title}
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <Calendar size={15} style={{ color: 'var(--accent-purple)' }} />
                  <span>{dateString} @ {timeString}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <MapPin size={15} style={{ color: 'var(--accent-purple)' }} />
                  <span>{event.venueName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <User size={15} style={{ color: 'var(--accent-purple)' }} />
                  <span>Holder: {buyer.name}</span>
                </div>
              </div>
            </div>

            {/* Bottom: Ticket serial details */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>SERIAL NO.</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--accent-purple)' }}>
                  {ticket.ticketNumber}
                </span>
              </div>
              <button onClick={handleDownloadPdf} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                <Download size={14} />
                <span>PDF Ticket</span>
              </button>
            </div>
          </div>

          {/* Dotted Tear line */}
          <div style={{
            width: '1px',
            borderRight: '2px dashed rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            {/* Round notches top & bottom */}
            <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(5, 5, 8, 1)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }} />
            <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(5, 5, 8, 1)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />
          </div>

          {/* Right: Stub section with QR Code */}
          <div style={{
            width: '200px',
            background: 'rgba(10, 11, 14, 0.4)',
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textAlign: 'center'
          }} className="ticket-stub-right">
            {/* Status Indicator */}
            {ticket.status === 'USED' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-red)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <CheckCircle size={14} />
                <span>USED ENTRY</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <CheckCircle size={14} />
                <span>VALID TICKET</span>
              </div>
            )}

            {/* QR Image */}
            <div style={{
              padding: '8px',
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: ticket.status === 'USED' ? 'grayscale(1) opacity(0.3)' : 'none'
            }}>
              <img src={qrCodeUrl} alt="QR Code" style={{ width: '110px', height: '110px', display: 'block' }} />
            </div>

            <span style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.2 }}>
              SCAN QR AT GATES<br />FOR ADMISSION
            </span>
          </div>

        </div>

        {/* Close Button below card */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="btn btn-secondary" style={{ borderRadius: '50px' }} onClick={onClose}>
            Close Ticket Stub
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ticketPop {
          from {
            transform: scale(0.95) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .ticket-body {
            flex-direction: column;
          }
          .ticket-banner-left {
            width: 100%;
            height: 120px;
          }
          .ticket-stub-right {
            width: 100%;
            border-top: 1px dashed rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>
    </div>
  );
};

export default DigitalTicket;
