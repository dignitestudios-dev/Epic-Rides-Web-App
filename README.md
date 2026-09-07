# Epic Rides Web Application

A modern React 19 web portal for the **Epic Rides** platform, serving two distinct production workflows:
1. **Driver Onboarding & Verification Wizard**: Multi-step registration, document uploads (Driver License, Registration, Insurance, Vehicle Details), Florida-restricted address verification, Stripe platform membership checkout, and administrative status tracking.
2. **Public Live Ride & Carpool Tracking**: Public-facing, real-time GPS telemetry and vehicle tracking over WebSockets (Socket.IO) with interactive Google Maps vector rendering.

For the comprehensive codebase architecture, API contract, and telemetry documentation, see [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md).

---

## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Installation
```bash
git clone <repository-url>
cd Epic-Rides-Web-App
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_MAP_ID=your_vector_map_id
VITE_API_BASE_URL=https://api.staging.epicridesapp.com/
```

### 4. Run Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## Route Overview

| Route | View | Description |
|---|---|---|
| `/` | `Login.jsx` | Driver login via US phone number |
| `/verification` | `Verification.jsx` | 6-digit SMS OTP verification & post-login routing |
| `/signup` | `Signup.jsx` | Personal profile & Florida-restricted address |
| `/license-information` | `LicenseInformation.jsx` | Driver license photo & expiration date upload |
| `/vehicle-details` | `VehicleDetails.jsx` | Vehicle registration document upload |
| `/insurance-information` | `InsuranceInformation.jsx` | Auto insurance policy card upload |
| `/add-vehicle-details` | `AddVehicleDetails.jsx` | Vehicle specifications, color, VIN & license plate |
| `/subscription` | `Subscription.jsx` | Membership plan selection & Stripe Checkout launch |
| `/complete-setup` | `Completesetup.jsx` | Stripe checkout session verification return handler |
| `/verified-account` | `VerifiedAccount.jsx` | Account status polling & rejected document resubmission hub |
| `/share` | `ShareTracking.jsx` | Public real-time tracking (dispatch to Ride or Carpool) |
| `/ride-ended` | `RideEnded.jsx` | Completed ride animation celebration |
| `/ride-cancelled` | `RideCancelled.jsx` | Cancelled ride notice |
| `/ride-not-found` | `RideNotFound.jsx` | 404 / expired ride notice |

---

## Key Architecture & Conventions

- **State Management**: Distributed across HTTP Cookies (7-day token/user), Redux Toolkit (`auth` and `vehicleTypes` slices), and browser Storage (`localStorage.completedSteps`, `sessionStorage.pendingStripeCheckout`).
- **Real-Time Telemetry**: Real-time Socket.IO connection over WebSockets directly to the backend telemetry engine.
- **Maps**: Google Maps JavaScript API with vector map capability and custom rotated vehicle markers based on bearing angle calculation.
- **Base URL**: Set at the top of `src/axios.js` (dev, staging, prod configurations).
- **Styling**: Tailwind CSS with Poppins and Inter typography, responsive mobile and desktop sidebar components.

For complete architectural details, see [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md).
