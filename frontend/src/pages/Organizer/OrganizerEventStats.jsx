import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CheckCircle2, FileSpreadsheet, Mail, Search, Upload, UserRound, UserX, XCircle } from 'lucide-react';
import Loader from '../../components/Common/Loader';
import { API_BASE_URL, useAuth } from '../../context/AuthContext';
import { getTicketAttendanceStatus, normalizeTicketNumber, parseScanReportCsv } from '../../utils/scanReport';

const API_ORIGIN = new URL(API_BASE_URL).origin;

const sections = [
  { status: 'ATTENDED', title: 'Attended', icon: CheckCircle2, color: 'var(--accent-green)' },
  { status: 'REJECTED', title: 'Rejected', icon: XCircle, color: 'var(--accent-red)' },
  { status: 'ABSENT', title: 'Absent', icon: UserX, color: 'var(--accent-yellow)' }
];

const OrganizerEventStats = () => {
  const { apiFetch, showToast } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [tickets, setTickets] = useState([]);
  const [scanStatuses, setScanStatuses] = useState(new Map());
  const [rejectedTickets, setRejectedTickets] = useState([]);
  const [rejectedReportImportedAt, setRejectedReportImportedAt] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const authRef = useRef({ apiFetch, showToast });
  authRef.current = { apiFetch, showToast };

  useEffect(() => {
    let active = true;
    authRef.current.apiFetch('/organizer/events')
      .then((data) => {
        if (active && data.success) setEvents(data.events || []);
      })
      .catch((error) => authRef.current.showToast(error.message, 'error'))
      .finally(() => {
        if (active) setLoadingEvents(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setTickets([]);
    setTicketSearch('');
    setScanStatuses(new Map());
    setRejectedTickets([]);
    setRejectedReportImportedAt('');
    setUploadName('');
    setUploadMessage('');
    if (!eventId) return undefined;

    let active = true;
    setLoadingTickets(true);
    authRef.current.apiFetch(`/organizer/events/${encodeURIComponent(eventId)}/tickets`)
      .then((data) => {
        if (active && data.success) {
          setTickets(data.tickets || []);
          setRejectedTickets(data.rejectedScanReport?.rejectedTickets || []);
          setRejectedReportImportedAt(data.rejectedScanReport?.importedAt || '');
        }
      })
      .catch((error) => authRef.current.showToast(error.message, 'error'))
      .finally(() => {
        if (active) setLoadingTickets(false);
      });
    return () => { active = false; };
  }, [eventId]);

  const selectedEvent = events.find((event) => event._id === eventId);
  const searchedTicket = ticketSearch.trim()
    ? tickets.find((ticket) => normalizeTicketNumber(ticket.ticketNumber) === normalizeTicketNumber(ticketSearch))
    : null;
  const validTicketNumbers = useMemo(
    () => new Set(tickets.map((ticket) => normalizeTicketNumber(ticket.ticketNumber))),
    [tickets]
  );
  const validTicketIds = useMemo(
    () => new Map(tickets.map((ticket) => [String(ticket._id).toLowerCase(), normalizeTicketNumber(ticket.ticketNumber)])),
    [tickets]
  );

  const handleSheetUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      if (!eventId) throw new Error('Select an event before uploading a scan sheet.');
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Upload the CSV scan sheet downloaded from CameraBridge.');

      const parsed = parseScanReportCsv(await file.text(), eventId, validTicketNumbers, validTicketIds);
      const data = await apiFetch(`/organizer/events/${encodeURIComponent(eventId)}/rejected-scans`, {
        method: 'PUT',
        body: JSON.stringify({ rejectedTickets: parsed.rejectedTickets })
      });
      setScanStatuses(parsed.ticketStatuses);
      setRejectedTickets(data.rejectedScanReport.rejectedTickets);
      setRejectedReportImportedAt(data.rejectedScanReport.importedAt);
      setUploadName(file.name);
      const ignored = parsed.ignoredRows + parsed.ignoredStatusRows;
      setUploadMessage(`${parsed.ticketStatuses.size} event tickets matched; ${parsed.rejectedTickets.length} rejected ticket number${parsed.rejectedTickets.length === 1 ? '' : 's'} saved for this event.${ignored ? ` ${ignored} unsupported or unrelated rows were ignored.` : ''}`);
      showToast('Scan sheet imported and rejected ticket counts saved for this event.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const reportSections = useMemo(() => {
    const ticketsByStatus = new Map(sections.map(({ status }) => [status, new Map()]));
    tickets.forEach((ticket) => {
      const status = getTicketAttendanceStatus(ticket, scanStatuses);
      const attendeeName = ticket.attendeeName || 'Unknown attendee';
      const categoryName = ticket.categoryName || 'Uncategorized';
      const key = `${categoryName}\u0000${attendeeName}`;
      const groups = ticketsByStatus.get(status);
      if (!groups.has(key)) groups.set(key, { attendeeName, categoryName, ticketNumbers: [] });
      groups.get(key).ticketNumbers.push(ticket.ticketNumber);
    });

    return sections.map((section) => ({
      ...section,
      groups: [...ticketsByStatus.get(section.status).values()]
        .map((group) => ({ ...group, ticketNumbers: group.ticketNumbers.sort() }))
        .sort((left, right) => left.categoryName.localeCompare(right.categoryName) || left.attendeeName.localeCompare(right.attendeeName))
    }));
  }, [tickets, scanStatuses]);

  if (loadingEvents) return <Loader fullPage />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
        <BarChart3 size={28} color="var(--accent-purple)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>Event Stats</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '1.5rem' }}>
        Compare issued ticket holders with the accepted and rejected scans exported from CameraBridge.
      </p>

      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
        <div>
          <label htmlFor="stats-event" className="form-label">Choose an event</label>
          <select id="stats-event" className="form-control form-select" value={eventId} onChange={(event) => setEventId(event.target.value)}>
            <option value="">Select one of your events</option>
            {events.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="scan-sheet" className="form-label">CameraBridge scan sheet (optional)</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="scan-sheet" className="btn btn-secondary" style={{ cursor: eventId && !loadingTickets ? 'pointer' : 'not-allowed', opacity: eventId && !loadingTickets ? 1 : 0.55 }}>
              <Upload size={17} /> Upload CSV
            </label>
            <input id="scan-sheet" type="file" accept=".csv,text/csv" onChange={handleSheetUpload} disabled={!eventId || loadingTickets} style={{ display: 'none' }} />
            {uploadName && <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{uploadName}</span>}
          </div>
        </div>
        <div>
          <label htmlFor="ticket-search" className="form-label">Search ticket number</label>
          <div style={{ position: 'relative' }}>
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            <input
              id="ticket-search"
              className="form-control"
              type="search"
              placeholder="Enter ticket number"
              value={ticketSearch}
              onChange={(event) => setTicketSearch(event.target.value)}
              disabled={!eventId || loadingTickets}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
        </div>
        <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
          Upload the Excel-compatible CSV from the CameraBridge host. Rejected ticket numbers and their scan counts are saved to this EventZ event and remain available after refresh. Attended and absent are based on issued tickets, accepted rows, and EventZ check-in status.
        </p>
      </div>

      {ticketSearch.trim() && eventId && !loadingTickets && (
        <section className="glass-panel" aria-live="polite" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {searchedTicket ? (
            <>
              {searchedTicket.buyerPhoto ? (
                <img
                  src={new URL(searchedTicket.buyerPhoto, API_ORIGIN).href}
                  alt={`${searchedTicket.buyerName} profile`}
                  onError={(event) => { event.currentTarget.hidden = true; }}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }}
                />
              ) : (
                <div aria-hidden="true" style={{ width: '96px', height: '96px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  <UserRound size={36} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: '0.6rem' }}>{searchedTicket.attendeeName}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Buyer: {searchedTicket.buyerName}</p>
                {searchedTicket.buyerEmail && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <Mail size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{searchedTicket.buyerEmail}
                  </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Ticket {searchedTicket.ticketNumber} · {searchedTicket.categoryName} · {searchedTicket.status}
                </p>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No ticket found with number “{ticketSearch.trim()}” for this event.</p>
          )}
        </section>
      )}

      {uploadMessage && (
        <div role="status" style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 1rem' }}>
          <FileSpreadsheet size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{uploadMessage}
        </div>
      )}

      {!events.length ? (
        <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>You have not created any events yet.</div>
      ) : !eventId ? (
        <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>Choose an event to view its ticket-holder attendance.</div>
      ) : loadingTickets ? (
        <Loader />
      ) : (
        <>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{selectedEvent?.title || 'Event attendance'}</h2>
          {reportSections.map(({ status, title, icon: Icon, color, groups }) => {
            const rejectedSection = status === 'REJECTED' && rejectedReportImportedAt;
            const ticketCount = rejectedSection
              ? rejectedTickets.length
              : groups.reduce((total, group) => total + group.ticketNumbers.length, 0);
            return (
              <section key={status} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem', borderTop: `3px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '1rem' }}>
                  <Icon size={20} color={color} />
                  <h3 style={{ fontSize: '1.1rem' }}>{title}</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{ticketCount} ticket{ticketCount === 1 ? '' : 's'}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: rejectedSection ? '240px' : '520px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                        {rejectedSection ? (
                          <>
                            <th style={{ padding: '10px 8px' }}>Rejected ticket number</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>Rejection count</th>
                          </>
                        ) : (
                          <>
                            <th style={{ padding: '10px 8px' }}>Ticket holder</th>
                            <th style={{ padding: '10px 8px' }}>Category</th>
                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>Tickets</th>
                            <th style={{ padding: '10px 8px' }}>Ticket number(s)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedSection
                        ? rejectedTickets.length ? rejectedTickets.map(({ ticketNumber, rejectionCount }) => (
                          <tr key={ticketNumber} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '12px 8px', fontWeight: 600 }}>{ticketNumber}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>{rejectionCount}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="2" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No rejected ticket numbers in the uploaded sheet.</td></tr>
                        )
                        : groups.length ? groups.map((group) => (
                        <tr key={`${group.categoryName}-${group.attendeeName}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{group.attendeeName}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{group.categoryName}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>{group.ticketNumbers.length}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{group.ticketNumbers.join(', ')}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No {title.toLowerCase()} ticket holders.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};

export default OrganizerEventStats;
