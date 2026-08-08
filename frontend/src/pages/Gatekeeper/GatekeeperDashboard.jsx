import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Common/Loader';
import { ScanQrCode, Clipboard, FileUp, CheckCircle2, AlertTriangle, XCircle, History } from 'lucide-react';
import jsQR from 'jsqr';

const GatekeeperDashboard = () => {
  const { apiFetch, showToast } = useAuth();
  
  // Scanner modes and inputs
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' or 'upload' or 'camera'
  const [rawPayload, setRawPayload] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decodingFile, setDecodingFile] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraLoopRef = useRef(null);
  const cameraCanvasRef = useRef(null);

  // Validation results
  const [result, setResult] = useState(null); // { success, duplicate, message, ticketDetails }
  const [scanLogs, setScanLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

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

  const fetchEvents = async () => {
    try {
      const data = await apiFetch('/events');
      if (data.success) setEvents(data.events || []);
    } catch (err) {
      showToast('Could not load events list', 'error');
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const validatePayload = async (payload) => {
    const ticketPayload = String(payload || '').trim();
    if (!ticketPayload) return;

    setSubmitting(true);
    setResult(null);

    try {
      const data = await apiFetch('/gatekeeper/validate-ticket', {
        method: 'POST',
        body: JSON.stringify({ qrCodeData: ticketPayload, eventId: selectedEventId || undefined })
      });

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          ticketDetails: data.ticketDetails
        });
        showToast('Ticket validated successfully! Entry approved.', 'success');
        setRawPayload('');
        fetchScanLogs(); // refresh history
      }
    } catch (err) {
      // Check if duplicate scan error or event mismatch
      if (err.message && err.message.includes('DUPLICATE')) {
        // Find if they returned detailed duplicate metadata
        // Since we return 400, our fetch wrapper catches the exception message.
        // Let's decode or handle duplicate checks
        setResult({
          success: false,
          duplicate: true,
          message: err.message
        });
      } else if (err.scannedTicket) {
        // event mismatch details returned from server
        setResult({
          success: false,
          duplicate: false,
          message: err.message || 'Event mismatch',
          ticketDetails: {
            ticketNumber: err.scannedTicket.ticketNumber,
            attendeeName: err.scannedTicket.attendeeName,
            eventName: err.scannedTicket.eventName
          }
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

  const handleValidate = async (e) => {
    if (e) e.preventDefault();
    await validatePayload(rawPayload);
  };

  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').trim());
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });

  const extractJwtFromText = (text) => {
    const normalizedText = String(text || '');
    const taggedSignature = normalizedText.match(/QR-SIGNATURE\s*:?\s*([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i);
    if (taggedSignature?.[1]) {
      return taggedSignature[1].trim();
    }

    const jwtMatch = normalizedText.match(/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    return jwtMatch?.[1]?.trim() || '';
  };

  const scanCanvasForQr = async (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return '';
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const attemptedRegions = [
      imageData,
      cropImageData(imageData, 0.54, 0.06, 0.42, 0.88),
      cropImageData(imageData, 0.48, 0.04, 0.48, 0.92),
      cropImageData(imageData, 0.04, 0.04, 0.92, 0.92)
    ].filter(Boolean);

    for (const region of attemptedRegions) {
      const code = jsQR(region.data, region.width, region.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code?.data) {
        return code.data.trim();
      }
    }

    return '';
  };

  const cropImageData = (imageData, leftRatio, topRatio, widthRatio, heightRatio) => {
    const cropCanvas = document.createElement('canvas');
    const cropWidth = Math.max(1, Math.floor(imageData.width * widthRatio));
    const cropHeight = Math.max(1, Math.floor(imageData.height * heightRatio));
    const startX = Math.max(0, Math.floor(imageData.width * leftRatio));
    const startY = Math.max(0, Math.floor(imageData.height * topRatio));

    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;

    const cropContext = cropCanvas.getContext('2d', { willReadFrequently: true });
    if (!cropContext) {
      return null;
    }

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = imageData.width;
    sourceCanvas.height = imageData.height;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) {
      return null;
    }

    sourceContext.putImageData(imageData, 0, 0);
    cropContext.drawImage(sourceCanvas, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return cropContext.getImageData(0, 0, cropWidth, cropHeight);
  };

  const decodeImageFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        import('@zxing/browser')
          .then(async ({ BrowserQRCodeReader }) => {
            const canvasCandidates = [1, 2, 3].map((scale) => {
              const canvas = document.createElement('canvas');
              canvas.width = image.width * scale;
              canvas.height = image.height * scale;

              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (context) {
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
              }

              return canvas;
            });

            for (const canvas of canvasCandidates) {
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (!context) continue;

              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const grayscale = new Uint8ClampedArray(imageData.data);

              for (let index = 0; index < grayscale.length; index += 4) {
                const average = (grayscale[index] + grayscale[index + 1] + grayscale[index + 2]) / 3;
                const value = average > 185 ? 255 : 0;
                grayscale[index] = value;
                grayscale[index + 1] = value;
                grayscale[index + 2] = value;
              }

              const processedCanvas = document.createElement('canvas');
              processedCanvas.width = imageData.width;
              processedCanvas.height = imageData.height;
              const processedContext = processedCanvas.getContext('2d', { willReadFrequently: true });
              if (!processedContext) continue;

              processedContext.putImageData(new ImageData(grayscale, imageData.width, imageData.height), 0, 0);

              const qrReader = new BrowserQRCodeReader();

              try {
                const result = await qrReader.decodeFromCanvas(processedCanvas);
                if (result?.getText()) {
                  resolve(result.getText().trim());
                  return;
                }
              } catch {
                // fall through to jsQR region scans and hidden-text fallback
              }

              const scanned = await scanCanvasForQr(processedCanvas);
              if (scanned) {
                resolve(scanned);
                return;
              }
            }

            const fallbackText = extractJwtFromText(await readFileAsText(file));
            if (fallbackText) {
              resolve(fallbackText);
              return;
            }

            reject(new Error('No QR code found in this image.'));
          })
          .catch(() => reject(new Error('QR decoder could not be loaded.')));
      };

      image.onerror = () => reject(new Error('Could not load the selected image.'));
      image.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const decodePdfFile = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        continue;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const decoded = await scanCanvasForQr(canvas);
      if (decoded) {
        return decoded;
      }

      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      const extractedToken = extractJwtFromText(pageText);
      if (extractedToken) {
        return extractedToken;
      }
    }

    throw new Error('No QR code found in the PDF ticket.');
  };

  const stopCameraScan = async () => {
    if (cameraLoopRef.current) {
      cancelAnimationFrame(cameraLoopRef.current);
      cameraLoopRef.current = null;
    }

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus('idle');
  };

  const scanCurrentFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      cameraLoopRef.current = requestAnimationFrame(scanCurrentFrame);
      return;
    }

    const canvas = cameraCanvasRef.current || document.createElement('canvas');
    cameraCanvasRef.current = canvas;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      cameraLoopRef.current = requestAnimationFrame(scanCurrentFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });

    if (qrCode?.data) {
      const text = qrCode.data.trim();
      setRawPayload(text);
      showToast('Camera scan successful. Validating ticket...', 'success');
      await validatePayload(text);
      stopCameraScan();
      setActiveTab('paste');
      return;
    }

    cameraLoopRef.current = requestAnimationFrame(scanCurrentFrame);
  };

  const startCameraScan = async () => {
    if (cameraStreamRef.current || !videoRef.current) {
      return;
    }

    setCameraError('');
    setCameraStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      cameraStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraStatus('scanning');
      cameraLoopRef.current = requestAnimationFrame(scanCurrentFrame);
    } catch (err) {
      setCameraError(err.message || 'Unable to start camera scanner.');
      setCameraStatus('error');
      showToast(err.message || 'Unable to start camera scanner.', 'error');
    }
  };

  // Decode uploaded QR image or raw token text
  const handleMockFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDecodingFile(true);

    try {
      let payload = '';

      if (file.type.startsWith('image/')) {
        payload = await decodeImageFile(file);
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        payload = await decodePdfFile(file);
      } else {
        payload = await readFileAsText(file);
      }

      if (!payload || payload.length < 20) {
        throw new Error('Could not detect a valid QR signature in this file.');
      }

      setRawPayload(payload);
      setActiveTab('paste');
      showToast('QR signature extracted. Validate the ticket now.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not decode QR signature from this file.', 'error');
    } finally {
      setDecodingFile(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      startCameraScan();
    } else {
      stopCameraScan();
    }

    return () => {
      stopCameraScan();
    };
  }, [activeTab]);

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
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', minWidth: '120px' }}>Active Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--glass-border)' }}
            >
              <option value="">-- Select event (optional) --</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>{ev.title}</option>
              ))}
            </select>
          </div>
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

            <button
              onClick={() => setActiveTab('camera')}
              className="btn btn-secondary"
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '10px',
                background: activeTab === 'camera' ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                borderColor: activeTab === 'camera' ? 'var(--accent-purple)' : 'var(--glass-border)'
              }}
            >
              <ScanQrCode size={14} />
              <span>Use Camera</span>
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
                Load a QR image, screenshot, or raw token text file.
              </p>
              <input
                type="file"
                id="qr-file-input"
                accept="image/*,application/pdf,.pdf,.txt,.json"
                onChange={handleMockFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="qr-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                {decodingFile ? 'Decoding QR...' : 'Choose file'}
              </label>
            </div>
          )}

          {activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: '100%', minHeight: '280px', objectFit: 'cover', display: 'block' }}
                />

                <div style={{
                  position: 'absolute',
                  inset: '18% 15%',
                  border: '2px solid rgba(124, 58, 237, 0.85)',
                  borderRadius: '14px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.22)'
                }} />

                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(10, 11, 14, 0.72)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontSize: '12px',
                  lineHeight: 1.4
                }}>
                  <strong style={{ color: 'var(--accent-purple)' }}>
                    {cameraStatus === 'requesting' ? 'Requesting camera access...' : cameraStatus === 'scanning' ? 'Scanning for QR code...' : 'Camera ready'}
                  </strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Hold the ticket QR inside the frame. The scan will validate automatically.
                  </div>
                </div>
              </div>

              {cameraError && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px'
                }}>
                  {cameraError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={startCameraScan}
                  disabled={cameraStatus === 'requesting' || cameraStatus === 'scanning'}
                >
                  <ScanQrCode size={14} />
                  <span>{cameraStatus === 'requesting' || cameraStatus === 'scanning' ? 'Scanning...' : 'Start Scanner'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={stopCameraScan}
                >
                  Stop Camera
                </button>
              </div>
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
                    gridTemplateColumns: '88px 1fr',
                    gap: '14px',
                    alignItems: 'start',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--text-main)'
                  }}>
                    <div style={{ width: '88px' }}>
                      {result.ticketDetails.buyerPhoto ? (
                        <img
                          src={`http://localhost:5001${result.ticketDetails.buyerPhoto}`}
                          alt="Buyer profile"
                          style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                        />
                      ) : (
                        <div style={{
                          width: '88px',
                          height: '88px',
                          borderRadius: '12px',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          background: 'rgba(245, 158, 11, 0.08)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          textAlign: 'center',
                          padding: '8px',
                          lineHeight: 1.3
                        }}>
                          Photo not uploaded
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>Event: <strong>{result.ticketDetails.eventName}</strong></div>
                      <div>Category: <strong>{result.ticketDetails.categoryName}</strong></div>
                      <div>Attendee: <strong>{result.ticketDetails.attendeeName || result.ticketDetails.buyerName}</strong></div>
                      <div>Serial: <strong>{result.ticketDetails.ticketNumber}</strong></div>
                      {!result.ticketDetails.buyerPhoto && (
                        <div style={{ gridColumn: '1 / -1', color: 'var(--accent-yellow)', fontSize: '12px' }}>
                          Warning: this buyer has not uploaded a profile photo yet.
                        </div>
                      )}
                    </div>
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
                  <th style={{ padding: '8px 4px' }}>Status</th>
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
                        <td style={{ padding: '10px 4px', color: log.status === 'APPROVED' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>{log.status}</td>
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
