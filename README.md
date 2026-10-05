# Travel CRM REST API (Node.js & Express)

A high-performance, modular RESTful API backend built with **Node.js**, **Express**, and **MySQL**, designed specifically for the **Travel CRM** project (`travelcrm`).

This API connects directly to the shared MySQL database (`travel_portal`), providing comprehensive endpoints for public client apps (Web / Mobile) and internal CRM workflows.

---

## Features

- **Express 4.x** with security headers (`helmet`), CORS configuration, and HTTP request logging (`morgan`).
- **MySQL Connection Pool** (`mysql2/promise`) with automatic keep-alive, parameterized queries, and SQL injection protection.
- **Full Authentication System**:
  - Compatible with Laravel's bcrypt password hashing (`$2y$` / `$2a$`).
  - JWT Bearer token generation and verification.
  - Registration, login, profile management, and password change.
- **Core Travel Modules**:
  - **Tour Packages**: Filter by destination, price, duration, featured status; view detailed itineraries, hotel options, and departure dates.
  - **Hotels**: Search, star rating filtering, hotel rooms with pricing and amenities.
  - **Cabs & Vehicles**: Vehicle types (Sedan, SUV, Innova, Tempo), capacity, pricing, and locations.
  - **Flights**: Airport autocomplete, airlines information.
  - **Destinations**: Regional destinations, guides, highlights, and associated package counts.
  - **Bookings**: Multi-product booking creation, user booking history, booking details, and cancellation.
  - **CRM Leads**: Public enquiry capture, lead listing, status updates (`new` -> `contacted` -> `converted` -> `lost`), and priority filtering.
  - **CRM Quotations**: Customer quotation preview by token/number, and instant accept/reject decisions.
  - **Settings & Content**: Public branding settings, promotional banners, customer testimonials, and FAQs.

---

## Project Structure

```
travelcrm_api/
├── .env                  # Environment configuration
├── .env.example          # Environment example template
├── .gitignore            # Git ignore rules
├── package.json          # Node dependencies and scripts
├── server.js             # Express app entry point
└── src/
    ├── config/
    │   └── db.js         # MySQL connection pool
    ├── controllers/
    │   ├── authController.js
    │   ├── bookingController.js
    │   ├── cabController.js
    │   ├── destinationController.js
    │   ├── flightController.js
    │   ├── hotelController.js
    │   ├── leadController.js
    │   ├── packageController.js
    │   ├── quotationController.js
    │   └── settingsController.js
    ├── middleware/
    │   ├── auth.js       # JWT verifyToken and optionalAuth
    │   ├── errorHandler.js # Central error handling & 404 handler
    │   └── rateLimiter.js  # API throttling & rate limiters
    ├── routes/
    │   ├── authRoutes.js
    │   ├── bookingRoutes.js
    │   ├── cabRoutes.js
    │   ├── destinationRoutes.js
    │   ├── flightRoutes.js
    │   ├── hotelRoutes.js
    │   ├── index.js      # Aggregated router (/api/v1)
    │   ├── leadRoutes.js
    │   ├── packageRoutes.js
    │   ├── quotationRoutes.js
    │   └── settingsRoutes.js
    └── utils/
        └── response.js   # Standardized JSON response formatters
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended; v24 installed)
- **XAMPP MySQL** running on `127.0.0.1:3306` with database `travel_portal`

### 2. Installation
Navigate to the project folder:
```bash
cd C:\xampp\htdocs\travelcrm_api
npm install
```

### 3. Environment Setup
Check `.env`:
```env
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=travel_portal

JWT_SECRET=travelcrm_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

### 4. Running the Server
```bash
# Production / standard start:
npm start

# Development mode with hot-reload:
npm run dev
```

Server will be running at: `http://localhost:5000`

---

## API Endpoints Reference

All API routes are prefixed with `/api/v1` (or `/api`).

### 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register customer (`name`, `email`, `password`, `phone`) |
| `POST` | `/api/v1/auth/login` | Public | Login customer (`email`, `password`) -> returns JWT token |
| `GET` | `/api/v1/auth/profile` | Bearer Token | Get authenticated user profile |
| `PUT` | `/api/v1/auth/profile` | Bearer Token | Update user profile (`name`, `phone`, `city`, `address`, etc.) |
| `PUT` | `/api/v1/auth/change-password`| Bearer Token | Change password (`currentPassword`, `newPassword`) |

---

### 2. Tour Packages (`/api/v1/packages`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/packages` | Public | List packages with pagination (`page`, `limit`, `search`, `destination_id`, `min_price`, `max_price`, `duration`, `is_featured`, `sort`) |
| `GET` | `/api/v1/packages/featured` | Public | Get featured tour packages |
| `GET` | `/api/v1/packages/:identifier` | Public | Get full package details by `slug` or `id` (includes itineraries, hotel options, departures) |

---

### 3. Hotels & Rooms (`/api/v1/hotels`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/hotels` | Public | List hotels (`destination_id`, `city`, `star_rating`, `min_price`, `max_price`, `is_featured`, `sort`) |
| `GET` | `/api/v1/hotels/featured` | Public | Get featured hotels |
| `GET` | `/api/v1/hotels/:identifier` | Public | Get hotel details by `slug` or `id` with available rooms and amenities |

---

### 4. Cabs & Vehicles (`/api/v1/cabs`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/cabs/types` | Public | List vehicle categories (Sedan, SUV, Tempo Traveller) |
| `GET` | `/api/v1/cabs/vehicles` | Public | List vehicles (`vehicle_type_id`, `capacity`, `is_ac`) |
| `GET` | `/api/v1/cabs/locations` | Public | Pickup and drop destinations (Airport, Srinagar, Gulmarg, etc.) |

---

### 5. Flights (`/api/v1/flights`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/flights/airports` | Public | Search/autocomplete airports by code, city, or name |
| `GET` | `/api/v1/flights/airlines` | Public | List active airlines |

---

### 6. Destinations (`/api/v1/destinations`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/destinations` | Public | List destinations with package & hotel counts |
| `GET` | `/api/v1/destinations/:identifier` | Public | Get destination details with attractions and packages |

---

### 7. Bookings (`/api/v1/bookings`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Optional Auth | Create new booking (`product_type`, `product_id`, `total_amount`, `contact`, `travellers`) |
| `GET` | `/api/v1/bookings/my-bookings` | Bearer Token | List all bookings for authenticated customer |
| `GET` | `/api/v1/bookings/:identifier` | Optional Auth | Get booking details by `booking_reference` or `id` |
| `POST` | `/api/v1/bookings/:id/cancel` | Optional Auth | Request cancellation for a booking |

---

### 8. CRM Leads (`/api/v1/leads`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/leads` | Public | Capture enquiry lead (`name`, `phone`, `email`, `destination`, `product_type`, `budget`, etc.) |
| `GET` | `/api/v1/leads` | Public/Staff | List CRM leads with filters (`status`, `priority`, `destination`, `search`, `page`, `limit`) |
| `GET` | `/api/v1/leads/:id` | Public/Staff | Get lead details with follow-ups and quotation history |
| `PATCH` | `/api/v1/leads/:id/status` | Public/Staff | Update lead status (`new`, `contacted`, `quotation_sent`, `negotiating`, `converted`, `lost`) |

---

### 9. CRM Quotations (`/api/v1/quotations`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/quotations` | Public/Staff | List quotations (`status`, `search`, `page`, `limit`) |
| `GET` | `/api/v1/quotations/:token` | Public | Retrieve quotation by `public_token`, `quotation_number`, or `id` |
| `POST` | `/api/v1/quotations/:token/action` | Public | Customer action: accept or reject quote (`action: "accept"` or `"reject"`) |

---

### 10. Settings & Content (`/api/v1/settings`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/settings` | Public | Company branding, logo, contact, and Google Analytics configuration |
| `GET` | `/api/v1/settings/banners` | Public | Active promotional banners |
| `GET` | `/api/v1/settings/testimonials`| Public | Customer reviews and testimonials |
| `GET` | `/api/v1/settings/faqs` | Public | FAQs grouped or filtered by category |

---

## API Throttling & Rate Limiting

The API includes multi-tiered rate limiting powered by `express-rate-limit` with standard `RateLimit-*` response headers.

### Rate Limiting Tiers

| Tier | Endpoints | Default Limit | Purpose |
|---|---|---|---|
| **Global API** | All `/api/*` and `/api/v1/*` | 100 reqs / 15 mins | Protects against excessive traffic & DoS |
| **Authentication** | `POST /api/v1/auth/login`, `register` | 10 reqs / 15 mins | Prevents brute-force & credential stuffing |
| **Submissions** | `POST /api/v1/leads`, `POST /api/v1/bookings` | 20 reqs / 15 mins | Prevents bot inquiry spam |

### Configuration (`.env`)

```env
# Global API throttle (ms window and request count)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Auth route throttle
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10

# Form / inquiry submission throttle
SUBMISSION_RATE_LIMIT_WINDOW_MS=900000
SUBMISSION_RATE_LIMIT_MAX=20
```

### Rate Limit Response (HTTP 429)

When a client exceeds the limit, the server returns standard `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` HTTP headers along with JSON:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "errors": {
    "code": "TOO_MANY_REQUESTS",
    "retryAfterSeconds": 900,
    "windowMinutes": 15
  }
}
```
