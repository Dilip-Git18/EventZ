import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { Clock, ShieldAlert, CreditCard, ArrowLeft, CheckCircle2 } from 'lucide-react';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch, showToast } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msLeft, setMsLeft] = useState(null);
  const [paying, setPaying] = useState(false);

  // Form states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const fetchBooking = async () => {
    try {
      const data = await apiFetch(`/bookings/${id}`);
      if (data.success) {
        setBooking(data.booking);
        // Calculate initial ms left
        const diff = new Date(data.booking.expiresAt) - Date.now();
        setMsLeft(Math.max(0, diff));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  // Countdown timer effect
  useEffect(() => {
    if (msLeft === null || msLeft <= 0) return;

    const timer = setInterval(() => {
      const diff = new Date(booking.expiresAt) - Date.now();
      if (diff <= 0) {
        setMsLeft(0);
        clearInterval(timer);
      } else {
        setMsLeft(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [msLeft, booking]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (msLeft <= 0 || paying) return;

    setPaying(true);
    try {
      const data = await apiFetch(`/bookings/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paymentDetails: {
            cardName,
            cardNumber
          }
        })
      });

      if (data.success) {
        showToast('Payment successful! Your tickets are generated.', 'success');
        navigate('/bookings');
      }
    } catch (err) {
      showToast(err.message, 'error');
      fetchBooking(); // Refresh booking status
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loader fullPage />;
  if (!booking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: '#fff' }}>Reservation not found</h3>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Browse
        </Link>
      </div>
    );
  }

  // Format countdown mm:ss
  const formatTime = (ms) => {
    if (ms === null || ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = msLeft !== null && msLeft <= 0;
  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      
      {/* Back Link */}
      <Link to={`/events/${booking.event._id}`} style={{
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
        <span>Cancel & Return to Event</span>
      </Link>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>
        Complete Checkout
      </h1>

      {/* Reservation Expiration Banner */}
      {!isConfirmed && !isExpired && (
        <div className="timer-pulse" style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)' }}>
            <Clock size={20} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Temporary Reservation Lock Active</span>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-red)' }}>
            {formatTime(msLeft)}
          </span>
        </div>
      )}

      {/* Expired state block */}
      {isExpired && !isConfirmed && (
        <div style={{
          background: 'rgba(107, 114, 128, 0.1)',
          border: '1px solid var(--glass-border)',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <ShieldAlert size={48} style={{ color: 'var(--accent-red)', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>
            Reservation Lock Expired
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            To release inventory for other buyers, bookings must be finalized in 5 minutes. Please go back to select tickets again.
          </p>
          <Link to={`/events/${booking.event._id}`} className="btn btn-primary">
            Select Tickets Again
          </Link>
        </div>
      )}

      {/* Checkout Split Layout */}
      {!isExpired && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Order Details Summary */}
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fff', marginBottom: '1rem' }}>
              Order Ticket Summary
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Event Name</span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{booking.event.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Ticket Category</span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{booking.category.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Quantity</span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{booking.quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Ticket Price</span>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>${booking.category.price.toFixed(2)} each</span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                marginTop: '4px'
              }}>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>Total Amount Due</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                  ${booking.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Secure Payment Form */}
          <div className="glass-card">
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              color: '#fff',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CreditCard size={18} style={{ color: 'var(--accent-purple)' }} />
              <span>Simulated Secure Payment</span>
            </h3>

            <form onSubmit={handlePay}>
              <div className="form-group">
                <label className="form-label">Name on Credit Card</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Credit Card Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                  maxLength="19"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Expiration Date</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    maxLength="5"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Security Code (CVV)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    maxLength="3"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}
                disabled={paying}
              >
                {paying ? (
                  <span>Processing Transaction...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Authorize & Pay ${booking.totalAmount.toFixed(2)}</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      )}

      <style>{`
        .back-link:hover {
          color: #fff !important;
          transform: translateX(-2px);
        }
      `}</style>
    </div>
  );
};

export default Checkout;
