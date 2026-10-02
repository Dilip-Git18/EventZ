# EventZ - High-Concurrency Ticket Brokering Engine

EventZ is a full-stack ticket brokering platform designed to handle high-concurrency ticket purchases while preventing ticket overselling and unauthorized access.

The platform supports ticket buyers, event organizers, venue gatekeepers, and platform administrators through secure authentication, role-based access control, temporary ticket reservations, Redis-based distributed locking, and QR/JWT ticket validation.

## Features

### High-Concurrency Ticket Booking

* Prevents multiple users from purchasing the same ticket inventory simultaneously.
* Uses Redis distributed locking to safely manage concurrent booking requests.
* Protects ticket inventory from race conditions and overselling.

### Temporary Ticket Reservation

* Selected tickets are reserved for 5 minutes during checkout.
* Reserved inventory automatically becomes available again after the reservation expires.
* Redis TTL is used to manage reservation expiration.

### Role-Based Access Control

EventZ supports multiple user roles with different permissions:

* Ticket Buyer - Browse events, reserve tickets, purchase tickets, and access booked tickets.
* Event Organizer - Create and manage events and monitor ticket sales.
* Venue Gatekeeper - Scan tickets, verify ticket holders, view attendee information, and validate entry.
* Platform Super-Admin - Manage users, events, and platform-level operations.

### Secure QR Ticket Validation

* Generates a QR-based ticket after a successful booking.
* QR tickets contain securely signed JWT tokens.
* Gatekeepers can scan and validate tickets at the venue.
* Prevents invalid and already-used tickets from being accepted.

### Gatekeeper Attendee Verification

When a gatekeeper scans a customer's QR ticket, EventZ provides the relevant ticket-holder information for verification.

The gatekeeper can view:

* Customer name
* Customer profile image
* Ticket ID
* Event name
* Ticket type
* Booking information
* Ticket status

This allows the gatekeeper to perform an additional visual identity check by comparing the customer's profile image with the person presenting the ticket.

### Revenue Insights

* Provides event revenue and sales-related insights.
* Revenue processing can be handled asynchronously to avoid adding unnecessary work to the critical booking flow.

## Tech Stack

### Frontend

* React.js
* Vite
* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js

### Database and Infrastructure

* MongoDB Community Edition
* Redis

### Security

* JWT
* Role-Based Access Control (RBAC)
* Signed QR ticket tokens
* Redis distributed locks
* Resource ownership validation

## System Architecture

```text
                         +----------------------+
                         |     React + Vite     |
                         |      Frontend        |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |   Node.js + Express   |
                         |       REST API       |
                         +----------+-----------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
             +--------------+                +--------------+
             |    MongoDB   |                |     Redis    |
             |   Database   |                | Locks + TTL  |
             +--------------+                +--------------+
```

## Ticket Booking Flow

```text
User selects tickets
        |
        v
Authentication and Authorization
        |
        v
Acquire Redis Distributed Lock
        |
        v
Check Ticket Availability
        |
        v
Reserve Tickets for 5 Minutes
        |
        v
Complete Checkout
        |
        v
Confirm Booking
        |
        v
Generate Signed QR Ticket
        |
        v
Ticket Available to Buyer
```

The Redis distributed lock ensures that concurrent requests cannot reserve the same ticket inventory simultaneously.

## QR Ticket and Gatekeeper Verification Flow

```text
                    Customer QR Code
                           |
                           v
                    Scan QR Ticket
                           |
                           v
                 Verify Signed JWT
                           |
                           v
                  Check Ticket Status
                           |
              +------------+------------+
              |                         |
              v                         v
        Invalid / Used             Valid Ticket
              |                         |
              v                         v
        Reject Entry          Retrieve Ticket Holder
                                        |
                         +--------------+--------------+
                         |              |              |
                         v              v              v
                       Name       Profile Image    Ticket Details
                         |              |              |
                         +--------------+--------------+
                                        |
                                        v
                              Gatekeeper Verification
                                        |
                              +---------+---------+
                              |                   |
                              v                   v
                         Verification        Verification
                            Failed               Passed
                              |                   |
                              v                   v
                         Reject Entry        Allow Entry
                                                  |
                                                  v
                                           Mark Ticket Used
```

## Mobile Camera Scanning with CameraBridge

CameraBridge is a separate, standalone service that lets a phone camera scan tickets for an EventZ gatekeeper. It does **not** need EventZ credentials, an EventZ account, or a direct connection to the EventZ database. EventZ and CameraBridge work together through a short-lived barcode session and a read-only WebSocket connection:

```text
Phone browser       CameraBridge       EventZ gatekeeper browser       EventZ backend
     |                    |                       |                           |
     |-- scan QR -------->|                       |                           |
     |                    |-- scan + scan ID ---->|                           |
     |                    |                       |-- validate with login --->|
     |                    |                       |<-- ticket result ---------|
     |                    |<-- result + scan ID --|                           |
     |<-- show result ----|                       |                           |
```

The phone connects to CameraBridge using the mobile session link. The EventZ gatekeeper browser connects to the same session as a read-only viewer, receives each scan, and submits it to the normal EventZ ticket-validation API using the signed-in gatekeeper's EventZ session. EventZ remains responsible for checking the ticket, marking valid tickets as used, recording scan history, and returning attendee details. The validation response travels back through CameraBridge to the phone. The phone does not call EventZ directly.

### Connect a phone scanner to EventZ

1. Deploy and open the standalone CameraBridge web service over HTTPS. CameraBridge is hosted separately from EventZ; use its own service URL.
2. In CameraBridge, select **Barcode scanning** and choose **Create session link**. The generated session is short-lived (10 minutes by default).
3. Open the **mobile link** on the phone and allow camera access. Keep the CameraBridge session page available while scanning.
4. Copy the **viewer link** and paste it into **Connect Mobile Cam Bridge** in the EventZ gatekeeper's **Ticket Scanner** page. Connect the link. The mobile link can also be used there, but the viewer link is the least-privileged option.
5. Confirm EventZ shows the bridge as connected and the phone as connected, then scan a ticket. EventZ displays the validation result and attendee details in the gatekeeper page; the phone also receives the result.
6. When finished, stop the CameraBridge session. The session and its links expire automatically; create a new session for a later scanning session.

The phone must use the mobile link, not the viewer link. The viewer is read-only: it can deliver scans to EventZ and receive their validation results, but it cannot scan using a camera. CameraBridge does not validate ticket signatures or decide whether entry is allowed; only EventZ does that. If EventZ is unavailable or the gatekeeper is not signed in, the scan cannot be validated.

Camera access requires HTTPS on the phone. `BarcodeDetector` is used where supported. Manual token entry is available as a fallback, but automatic camera scan forwarding requires a supported barcode scanner in the mobile browser. CameraBridge sessions are in-memory and intended for a single service instance; restarting or scaling the bridge can invalidate active sessions. Treat session links as temporary credentials and do not post or share them publicly.

### Organizer Event Stats attendance report

After gatekeepers finish validating tickets through CameraBridge, download the **Excel-compatible scan sheet** from the CameraBridge host page. In EventZ, open **Event Stats** in the organizer sidebar, select the matching event, and upload that `.csv` file. EventZ compares ticket numbers from the sheet against that event's issued ticket holders and groups results into attended, rejected, and absent, showing each holder, ticket category, and ticket number. Multiple tickets for the same holder and category are grouped together.

The report does not save uploaded scan sheets or rejected scan rows to EventZ. Imported rows are held in the organizer page's memory only and are cleared when the page is refreshed or the event is changed. EventZ's existing `USED` ticket status and accepted scan rows take precedence over rejected duplicate attempts. Without an uploaded sheet, tickets already marked `USED` appear as attended and the remaining issued tickets appear as absent.

### Connection status and troubleshooting

| EventZ status | What it means |
| ------------- | ------------- |
| Bridge connected | The EventZ browser has an active WebSocket connection to the CameraBridge session. |
| Mobile connected | A phone browser has joined that session. |
| Both connected | Scans can be relayed to EventZ for validation. |
| Session ended or expired | Create a new barcode session in CameraBridge and replace the saved link in EventZ. |

If EventZ says the bridge is disconnected, check that the viewer link belongs to an active barcode session and that the browser can reach the CameraBridge service. If the bridge is connected but the mobile device is not, open the mobile link on the phone and grant camera permission. If a scan arrives but cannot be validated, check that the EventZ backend is running and that the gatekeeper is logged in; CameraBridge cannot replace EventZ validation.

## Local Development

EventZ is designed to run completely on localhost without requiring cloud services.

### Prerequisites

Install the following:

* Node.js
* npm
* MongoDB Community Edition
* Redis

On macOS with Homebrew, install and start the local services with:

```bash
brew install mongodb-community redis
brew services start mongodb-community
brew services start redis
```

Verify Redis is available before starting the backend:

```bash
redis-cli -h 127.0.0.1 -p 6379 ping
```

The expected response is `PONG`.

### Default Local Services

| Service  | Address                 |
| -------- | ----------------------- |
| Frontend | `http://localhost:5173` |
| Backend  | `http://localhost:5001` |
| MongoDB  | `localhost:27017`       |
| Redis    | `localhost:6379`        |

Make sure MongoDB and Redis are running locally before starting the application.

## Backend Setup

```bash
cd backend
npm install
npm start
```

Backend:

```text
http://localhost:5001
```

## Frontend Setup

Create `frontend/.env` and set the backend API URL:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

For a deployed frontend, set `VITE_API_BASE_URL` to the deployed EventZ backend URL ending in `/api`, then rebuild/redeploy the frontend. Profile photos are served by the backend at `/uploads/...`, so gatekeeper images use this same backend origin.

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Local Services

### MongoDB

Used for persistent application data including:

* Users
* Events
* Tickets
* Bookings
* Other application records

### Redis

Used for:

* Distributed locking
* Temporary ticket reservations
* Reservation expiration using TTL
* Concurrency control

### Node.js and Express

Provides the backend REST APIs and business logic.

### React and Vite

Provides the web-based user interface.

No cloud database or cloud deployment is required for local development.

## Security

EventZ implements multiple security mechanisms:

* JWT-based authentication
* Role-based authorization
* Resource ownership validation
* Redis distributed locking
* Temporary ticket reservations with expiration
* Signed QR/JWT ticket tokens
* Ticket status validation
* Replay protection for already-used tickets
* Protected backend APIs

## User Roles

| Role             | Responsibilities                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Ticket Buyer     | Browse events, reserve tickets, purchase tickets, and access booked tickets                         |
| Event Organizer  | Create events, manage events, manage ticket inventory, and monitor sales                            |
| Venue Gatekeeper | Scan QR tickets, view ticket-holder details and profile image, verify attendees, and validate entry |
| Super Admin      | Manage users, events, and platform-level operations                                                 |

## Core Booking Logic

EventZ focuses on preventing ticket overselling under concurrent requests.

For example, if multiple users attempt to purchase the final available ticket at the same time:

```text
User A -----+
            |
User B -----+----> Redis Lock ----> Inventory Check
            |
User C -----+
                         |
                         v
                  One request gets lock
                         |
                         v
                  Ticket is reserved
                         |
                         v
                  Lock is released
                         |
                         v
              Other requests re-check
                    availability
```

This prevents multiple concurrent requests from successfully reserving the same inventory.

## Project Goals

The primary goals of EventZ are to:

1. Prevent ticket overselling under high concurrency.
2. Provide secure temporary ticket reservations.
3. Implement strict role-based access control.
4. Provide secure QR-based ticket verification.
5. Allow gatekeepers to verify attendees using ticket-holder information and profile images.
6. Prevent replay of already-used tickets.
7. Provide event revenue and sales insights.
8. Keep the complete application runnable locally.

## Future Improvements

Potential future improvements include:

* Payment gateway integration
* Advanced event analytics
* Email and SMS notifications
* Reservation-expiry notifications
* Automated load testing
* Improved monitoring and logging
* Production deployment configuration
* Advanced fraud detection


## Author

Dilip Kumar

Computer Science and Engineering
