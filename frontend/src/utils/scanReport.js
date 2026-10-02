export const normalizeTicketNumber = (value) => String(value || '').trim().toUpperCase();

export function parseScanReportCsv(contents, eventId, validTicketNumbers, validTicketIds = new Map()) {
  const text = String(contents || '').replace(/^\uFEFF/, '');
  const records = [];
  let record = [];
  let cell = '';
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (insideQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        insideQuotes = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      insideQuotes = true;
    } else if (character === ',') {
      record.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      record.push(cell);
      if (record.some((value) => value.trim())) records.push(record);
      record = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (insideQuotes) throw new Error('The scan sheet has an unclosed quoted field.');
  record.push(cell);
  if (record.some((value) => value.trim())) records.push(record);
  if (!records.length) throw new Error('The scan sheet is empty.');

  const headers = records[0].map((header) => header.trim().toLowerCase());
  const ticketNumberIndex = headers.indexOf('ticket number');
  const ticketIdIndex = headers.indexOf('ticket id');
  const statusIndex = headers.indexOf('status');
  const eventIdIndex = headers.indexOf('event id');
  if (ticketNumberIndex === -1 || statusIndex === -1) {
    throw new Error('This file is missing the required Ticket Number and Status columns.');
  }

  const ticketStatuses = new Map();
  const rejectedTicketCounts = new Map();
  let ignoredRows = 0;
  let ignoredStatusRows = 0;

  records.slice(1).forEach((values) => {
    if (values.length !== headers.length) {
      throw new Error('The scan sheet contains a row with an unexpected number of columns.');
    }

    const rowEventId = eventIdIndex === -1 ? '' : values[eventIdIndex].trim().toLowerCase();
    if (rowEventId && rowEventId !== String(eventId).toLowerCase()) {
      throw new Error('This scan sheet belongs to a different event. Select its matching event and try again.');
    }

    const scannedTicketNumber = normalizeTicketNumber(values[ticketNumberIndex]);
    const status = values[statusIndex].trim().toUpperCase();
    if (!scannedTicketNumber || !['ACCEPTED', 'REJECTED'].includes(status)) {
      ignoredStatusRows += 1;
      return;
    }
    if (status === 'REJECTED') {
      rejectedTicketCounts.set(scannedTicketNumber, (rejectedTicketCounts.get(scannedTicketNumber) || 0) + 1);
    }

    const ticketId = ticketIdIndex === -1 ? '' : values[ticketIdIndex].trim().toLowerCase();
    const ticketNumber = validTicketIds.get(ticketId)
      || (validTicketNumbers.has(scannedTicketNumber) ? scannedTicketNumber : '');
    if (!ticketNumber) {
      if (status === 'REJECTED') return;
      ignoredRows += 1;
      return;
    }

    const currentStatus = ticketStatuses.get(ticketNumber);
    if (status === 'ACCEPTED' || !currentStatus) ticketStatuses.set(ticketNumber, status);
  });

  if (!ticketStatuses.size && !rejectedTicketCounts.size) {
    throw new Error('No accepted or rejected scan rows matched tickets for this event.');
  }

  const rejectedTickets = [...rejectedTicketCounts]
    .map(([ticketNumber, rejectionCount]) => ({ ticketNumber, rejectionCount }))
    .sort((left, right) => left.ticketNumber.localeCompare(right.ticketNumber));

  return { ticketStatuses, rejectedTickets, ignoredRows, ignoredStatusRows };
}

export function getTicketAttendanceStatus(ticket, scanStatuses) {
  const scanStatus = scanStatuses.get(normalizeTicketNumber(ticket.ticketNumber));
  if (scanStatus) return scanStatus === 'ACCEPTED' ? 'ATTENDED' : 'REJECTED';
  if (ticket.status === 'USED') return 'ATTENDED';
  return 'ABSENT';
}
