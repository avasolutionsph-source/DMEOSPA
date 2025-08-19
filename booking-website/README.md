# Ava Solutions Booking Website

Customer-facing booking portal that shares login with the marketing site and pushes bookings to the PWA backend so owners see them in the POS.

## Local dev
- Static prototype served by any HTTP server (Netlify recommended)
- Uses PWA backend at `http://localhost:4000/api` or production render URL

## Features
- Login (reuse marketing JWT).
- Store selector (branches).
- Availability lookup.
- Booking form submission -> POST /api/bookings.
