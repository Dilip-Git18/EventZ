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

## Local Development

EventZ is designed to run completely on localhost without requiring cloud services.

### Prerequisites

Install the following:

* Node.js
* npm
* MongoDB Community Edition
* Redis

### Default Local Services

| Service  | Address                 |
| -------- | ----------------------- |
| Frontend | `http://localhost:5173` |
| Backend  | `http://localhost:5000` |
| MongoDB  | `localhost:5001`        |
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
http://localhost:5000
```

## Frontend Setup

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
