import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { ScanQrCode, Clipboard, FileUp, CheckCircle2, AlertTriangle, XCircle, History } from 'lucide-react';

const GatekeeperDashboard = () => {
  const { apiFetch, showToast } = useAuth();
  
  // Scanner modes and inputs
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' or 'upload' or 'camera'
  const [rawPayload, setRawPayload] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation results
  const [result, setResult] = useState(null); // { success, duplicate, message, ticketDetails }
  const [scanLogs, setScanLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchScanLogs = async () => {
    try {
      const data = await apiFetch('/gatekeeper/scan-history');
      if (data.success) {
        setScanLogs(data.scans);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchScanLogs();
  }, []);

  const handleValidate = async (e) => {
    if (e) e.preventDefault();
    if (!rawPayload.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const data = await apiFetch('/gatekeeper/validate-ticket', {
        method: 'POST',
        body: JSON.stringify({ qrCodeData: rawPayload.trim() })
      });

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          ticketDetails: data.ticketDetails
        });
        showToast('Ticket validated successfully! Entry approved.', 'success');
        setRawPayload(''); // clear input
        fetchScanLogs(); // refresh history
      }
    } catch (err) {
      // Check if duplicate scan error
      if (err.message && err.message.includes('DUPLICATE')) {
        // Find if they returned detailed duplicate metadata
        // Since we return 400, our fetch wrapper catches the exception message.
        // Let's decode or handle duplicate checks
        setResult({
          success: false,
          duplicate: true,
          message: err.message
        });
      } else {
        setResult({
          success: false,
          duplicate: false,
          message: err.message || 'Validation failed. Ticket is invalid.'
        });
      }
      showToast('Validation rejected.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for mock uploading and parsing QR code screenshot
  const handleMockFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('File selected. Simulating QR decryption...', 'success');
    
    // For local testing, we instruct the user to copy-paste the token,
    // but we can offer a file reader that simulates reading the raw text.
    // If the file name contains a JWT pattern, we can extract it, 
    // but let's read the file as text just in case the user saves the raw token in a text file.
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (content && content.length > 50) {
        setRawPayload(content.trim());
        showToast('QR signature extracted! Click Validate Ticket.', 'success');
        setActiveTab('paste');
      } else {
        showToast('Could not decode QR signature from this file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '30px', alignItems: 'start' }} className="gatekeeper-grid">
      
      {/* Left Column: Validation Panel */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
          Venue Entry Gatekeeper Console
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '2rem' }}>
          Scan digital QR codes to check signature authenticity and reject duplicates.
        </p>

        {/* Validator Interface */}
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem 1.5rem' }}>
          {/* Tab selection */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
            <button
              onClick={() => setActiveTab('paste')}
              className="btn btn-secondary"
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '10px',
                background: activeTab === 'paste' ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                borderColor: activeTab === 'paste' ? 'var(--accent-purple)' : 'var(--glass-border)'
              }}
            >
              <Clipboard size={14} />
              <span>Copy-Paste QR Signature</span>
            </button>
            
            <button
              onClick={() => setActiveTab('upload')}
              className="btn btn-secondary"
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '10px',
                background: activeTab === 'upload' ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                borderColor: activeTab === 'upload' ? 'var(--accent-purple)' : 'var(--glass-border)'
              }}
            >
              <FileUp size={14} />
              <span>Load QR File</span>
            </button>
          </div>

          {/* Form */}
          {activeTab === 'paste' && (
            <form onSubmit={handleValidate}>
              <div className="form-group">
                <label className="form-label">Paste Ticket QR Code Signature (Signed JWT Token)</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Paste the raw JWT token payload here..."
                  value={rawPayload}
                  onChange={(e) => setRawPayload(e.target.value)}
                  style={{ fontSize: '11px', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={submitting}>
                <ScanQrCode size={16} />
                <span>{submitting ? 'Authenticating signature...' : 'Validate Ticket Admission'}</span>
              </button>
            </form>
          )}

          {activeTab === 'upload' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', border: '2px dashed var(--glass-border)', borderRadius: '8px' }}>
              <FileUp size={36} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Load ticket signature from text or image file.
              </p>
              <input
                type="file"
                id="qr-file-input"
                onChange={handleMockFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="qr-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                Choose file
              </label>
            </div>
          )}
        </div>

        {/* Validation Output Banner Card */}
        {result && (
          <div className="glass-card" style={{
            padding: '2rem',
            border: result.success
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : result.duplicate
                ? '1px solid rgba(245, 158, 11, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.4)',
            background: result.success
              ? 'rgba(16, 185, 129, 0.08)'
              : result.duplicate
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
            animation: 'popIn 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                {result.success && <CheckCircle2 size={36} style={{ color: 'var(--accent-green)' }} />}
                {result.duplicate && <AlertTriangle size={36} style={{ color: 'var(--accent-yellow)' }} />}
                {!result.success && !result.duplicate && <XCircle size={36} style={{ color: 'var(--accent-red)' }} />}
              </div>
              
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: '0.5rem'
                }}>
                  {result.success ? 'ACCESS APPROVED!' : result.duplicate ? 'DUPLICATE SCAN DETECTED!' : 'ENTRY REJECTED!'}
                </h3>
                
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: result.success ? '1rem' : 0
                }}>
                  {result.message}
                </p>

                {result.success && result.ticketDetails && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--text-main)'
                  }}>
                    <div>Event: <strong>{result.ticketDetails.eventName}</strong></div>
                    <div>Category: <strong>{result.ticketDetails.categoryName}</strong></div>
                    <div>Attendee: <strong>{result.ticketDetails.buyerName}</strong></div>
                    <div>Serial: <strong>{result.ticketDetails.ticketNumber}</strong></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Scan History */}
      <div className="glass-panel" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          color: '#fff',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <History size={18} style={{ color: 'var(--accent-purple)' }} />
          <span>My Entry Scan History Log</span>
        </h3>

        {loadingLogs ? (
          <Loader />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }} className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 4px' }}>Ticket</th>
                  <th style={{ padding: '8px 4px' }}>Attendee</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Scanned Time</th>
                </tr>
              </thead>
              <tbody>
                {scanLogs.length > 0 ? (
                  scanLogs.map((log) => {
                    const scanTime = new Date(log.scannedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 4px' }}>
                          <span style={{ display: 'block', fontWeight: 600, color: '#fff' }}>{log.ticketNumber}</span>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>{log.event?.title}</span>
                        </td>
                        <td style={{ padding: '10px 4px', color: 'var(--text-main)' }}>{log.buyer?.name}</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', color: 'var(--text-secondary)' }}>{scanTime}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                      No tickets verified at this gate yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn {
          from {
            transform: translateY(10px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .gatekeeper-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default GatekeeperDashboard;
