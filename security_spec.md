# Security Specification & Payload-First TDD

## Data Invariants
1. Public catalog/content collections (`site_config`, `kathas`, `katha_types`, `shorts`, `gallery`) are publicly readable (`get` and `list`) so devotees can browse without signing in, and strictly writable only by verified admins (`isAdmin()`).
2. `bookings` contains Yajman PII (`yajmanName`, `phone`, `cityState`). Public visitors can only `create` a new booking document with `status == 'pending'`, empty `adminNotes`, and server timestamps (`request.time`). Reading, listing, updating, or deleting `bookings` is strictly restricted to `isAdmin()`.
3. `admins` collection is strictly restricted to `isAdmin()` for read/write, with the runtime owner email (`evoljaat@gmail.com`) bootstrapped only when `request.auth.token.email_verified == true`.
4. All document IDs are validated against `^[a-zA-Z0-9_-]+$` with max length 128.
5. Every string field enforces strict `.size()` bounds matching `firebase-blueprint.json` to prevent resource exhaustion attacks.
6. Every `create` and `update` enforces strict `hasAll` + `hasOnly` key checks and `request.time` timestamp integrity.

## The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated site_config overwrite**: Unauthenticated user writes to `/site_config/main`.
2. **Non-admin katha creation**: Authenticated non-admin user tries to create `/kathas/k1`.
3. **Spoofed unverified admin email**: User with `email: 'evoljaat@gmail.com'` and `email_verified: false` attempts admin write.
4. **Booking PII scrape**: Unauthenticated or non-admin user executes `list` or `get` on `/bookings`.
5. **Booking status shortcut on create**: Public user creates booking with `status: 'confirmed'` instead of `'pending'`.
6. **Booking shadow field injection**: Public user creates booking with extra key `isVerified: true`.
7. **Booking fake timestamp**: Public user creates booking with client-supplied `createdAt` not equal to `request.time`.
8. **Booking oversized phone/message**: Public user submits `message` with 5000 characters (> 1000 max).
9. **ID Poisoning**: Write to `/bookings/invalid$id*123` or 200-char doc ID.
10. **Self-escalation to admins**: Non-admin user writes `/admins/<ownUid>` with `role: 'admin'`.
11. **Immutable createdAt tampering**: Admin updates `/kathas/k1` and changes `createdAt`.
12. **Invalid Katha status enum**: Admin creates `/kathas/k2` with `status: 'hacked'`.
