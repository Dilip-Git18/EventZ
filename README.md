# EventZ

**EventZ is a full-stack event ticketing platform built by Dilip Kumar.** It brings event discovery, ticket reservations, QR-based entry, and organizer analytics together in one role-based application.

The project focuses on a reliable ticket lifecycle: buyers reserve tickets, complete checkout, and receive signed QR tickets; gatekeepers validate those tickets at entry; organizers manage events and review sales and attendance.

## Features

### For ticket buyers

- Browse published events and view event details.
- Reserve tickets while completing checkout.
- Receive individual digital tickets with signed QR codes.
- View booking history and ticket details.

### For event organizers

- Create and manage events and ticket categories.
- Review ticket sales, revenue, inventory, and attendance analytics.
- Search issued tickets by ticket number to view the attendee, buyer contact details, and buyer profile photo when available.
- Upload a CameraBridge scan sheet to review attended, rejected, and absent ticket activity.
- View rejected ticket numbers and rejection counts. The latest imported rejection report is saved per event and remains available after refresh.

### For venue gatekeepers

- Scan QR tickets and validate them against EventZ.
- View attendee, ticket, category, event, and buyer-photo details when available.
- Prevent repeated entry by rejecting tickets that have already been used.
- Review approved scan history.
- Connect a phone camera through the standalone CameraBridge service.

### For administrators

- Review platform activity and manage users, events, and bookings.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router, Lucide |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Reservation coordination | Redis, ioredis |
| Authentication | JWT, HTTP-only cookies, role-based authorization |
| Ticket entry | Signed QR/JWT payloads |
| Mobile scanning bridge | Express, WebSocket (`ws`), browser camera APIs |

## Application flow

```text
Buyer                    EventZ                    Gatekeeper
  |                         |                           |
  |-- reserve tickets ---->|                           |
  |                         |-- coordinate inventory    |
  |-- complete checkout -->|                           |
  |<-- signed QR tickets --|                           |
  |                                                     |
  |-------------------- present ticket ---------------->|
  |                         |<-- validate signed QR ----|
  |                         |-- check booking/status -->|
  |                         |-- mark valid ticket USED ->|
  |                         |<-- attendee details ------|
```

Redis coordinates temporary reservations and inventory checks. MongoDB stores users, events, bookings, tickets, and application records. EventZ validates tickets and decides whether entry is accepted.

## CameraBridge integration

CameraBridge is a separate, standalone phone-camera scanning service included in the [`mobile-cam/`](./mobile-cam/) directory. It relays barcode scans over a short-lived session; it does not contain EventZ credentials, access the EventZ database, or decide whether a ticket is valid.

```text
Phone camera -> CameraBridge session -> EventZ gatekeeper browser -> EventZ validation API
```

1. Deploy or run CameraBridge over HTTPS when using a phone camera.
2. Create a barcode session in CameraBridge and open its mobile link on the phone.
3. Paste the session's read-only viewer link into **Connect Mobile Cam Bridge** on the EventZ Gatekeeper page.
4. Scan a ticket. The gatekeeper browser forwards it to EventZ for normal validation.
5. When scanning is complete, download the CameraBridge CSV report.
6. In EventZ's organizer portal, open **Event Stats**, select the event, and upload the CSV.

The **Rejected** report shows ticket numbers marked `REJECTED` and counts the rejected rows for each number, including duplicate scan attempts. EventZ persists only the rejected ticket numbers, counts, importing organizer, and import time for the selected event; it does not store the uploaded CSV or other scan details. A later upload replaces the prior rejected report for that event. Accepted scans and EventZ's existing `USED` ticket status drive attendance; issued tickets without an accepted or used status remain absent.

For CameraBridge-specific setup and deployment instructions, see [`mobile-cam/README.md`](./mobile-cam/README.md).

## Run locally

### Prerequisites

- Node.js and npm
- MongoDB
- Redis

Start MongoDB and Redis using your operating system's preferred service manager. With Homebrew on macOS:

```bash
brew services start mongodb-community
brew services start redis
```

### Configure the backend

Create `backend/.env` for local development:

```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/eventz
REDIS_URI=redis://127.0.0.1:6379
JWT_SECRET=replace-with-a-long-random-local-secret
JWT_EXPIRE=24h
```

Keep `.env` files and real credentials out of version control. For production, use strong secrets and the connection strings for your managed MongoDB and Redis services.

Install dependencies and start the backend:

```bash
cd backend
npm install
npm start
```

The API listens on `http://localhost:5001`. Its status endpoint is `http://localhost:5001/api/status`.

### Configure and start the frontend

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

Then install dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Local service addresses

| Service | Local address |
| --- | --- |
| EventZ frontend | `http://localhost:5173` |
| EventZ API | `http://localhost:5001/api` |
| MongoDB | `mongodb://127.0.0.1:27017/eventz` |
| Redis | `redis://127.0.0.1:6379` |

## Build and lint

Run these commands from `frontend/`:

```bash
npm run build
npm run lint
```

## Project structure

```text
EventZ/
├── backend/
│   ├── config/       # MongoDB and Redis configuration
│   ├── middleware/   # Authentication, authorization, and errors
│   ├── models/       # MongoDB models
│   ├── routes/       # REST API routes
│   └── server.js     # Express application
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       └── pages/
└── mobile-cam/       # Standalone CameraBridge service and docs
```

## Security notes

- Use HTTPS in production, especially for mobile camera access.
- Keep `JWT_SECRET`, database URLs, and other credentials private.
- Event and ticket APIs enforce authentication, role access, and resource ownership.
- CameraBridge session links are short-lived credentials; share them only with the devices participating in a scan.
- Rejected scan imports are limited to the minimum report data required for organizer review; the original CSV is not uploaded or retained by EventZ.

## Author

**Dilip Kumar**
Computer Science and Engineering
