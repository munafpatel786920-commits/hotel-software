# Firestore Security Specification

This specification defines the access control models, security invariants, and test payloads designed to protect multi-tenant hotel data in the Hotel Management System.

## 1. Core Security Invariants
- **Multi-Tenant Isolation**: No user from Hotel A can read or write any record (booking, guest, room, payment, etc.) belonging to Hotel B.
- **Role-Based Access Control**: Sensitive actions (e.g., managing employees, editing hotel settings, viewing profit/loss statements) are restricted to Hotel Admin, Super Admin, or Manager roles.
- **Data Integrity**: Input values (such as currency codes, guest emails, room numbers) must conform to strict schemas, and dates must be chronologically logical (e.g., check-out date >= check-in date).

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads describe operations that are strictly forbidden and MUST return `PERMISSION_DENIED`.

### Payload 1: Cross-Tenant Booking Injection
An authenticated user from `hotel_123` attempts to insert a reservation for `hotel_999`.
```json
{
  "guestId": "guest_abc",
  "roomTypeId": "deluxe_room",
  "checkInDate": "2026-07-15",
  "checkOutDate": "2026-07-20",
  "status": "Reserved",
  "totalAmount": 500,
  "paidAmount": 0,
  "hotelId": "hotel_999" // Evil Injection
}
```

### Payload 2: Privilege Escalation via User Profile Self-Promotion
An authenticated receptionist attempts to promote themselves to `Hotel Admin`.
```json
{
  "uid": "user_receptionist_456",
  "name": "Jane Doe",
  "email": "jane@hotel.com",
  "role": "Hotel Admin", // Privilege Escalation
  "hotelId": "hotel_123"
}
```

### Payload 3: Unauthenticated Global Guest List Read
A guest or scanner bot attempts to retrieve the full list of guests without any credentials.
`GET /guests` -> Must result in `PERMISSION_DENIED`

### Payload 4: Cross-Tenant Inventory Extrusion
A manager from `hotel_123` attempts to read the inventory details of `hotel_999`.
`GET /inventory/item_789` (where item belongs to `hotel_999`) -> Must result in `PERMISSION_DENIED`

### Payload 5: Date-Inversion Reservation Bypass
A user attempts to book a room with a check-out date that occurs *before* the check-in date.
```json
{
  "guestId": "guest_abc",
  "roomTypeId": "suite_xyz",
  "checkInDate": "2026-08-10",
  "checkOutDate": "2026-08-01", // Malicious Date Inversion
  "status": "Reserved",
  "totalAmount": 100,
  "paidAmount": 0,
  "hotelId": "hotel_123"
}
```

### Payload 6: ID Poisoning Attack
An attacker tries to write a guest profile with an excessively long, junk-character document ID to cause denial-of-wallet or storage bloating.
`PUT /guests/g_@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@...` -> Must result in `PERMISSION_DENIED` due to `isValidId()` failure.

### Payload 7: Shadow Field Tax Evading Creation
A user attempts to inject undocumented custom fields into a room record (e.g. `isTaxExempt`).
```json
{
  "roomNumber": "101",
  "floor": "1",
  "roomTypeId": "std",
  "status": "Available",
  "hotelId": "hotel_123",
  "isTaxExempt": true // Shadow Field
}
```

### Payload 8: Delete Immutable Payments Log
A receptionist attempts to delete an historical payment transaction to hide financial discrepancies.
`DELETE /payments/pay_789` -> Must result in `PERMISSION_DENIED` (only Accountants/Managers can audit, or delete is entirely blocked).

### Payload 9: Unregistered User Tenant Spoofing
A newly signed-up Firebase User with no matching document in `/users` attempts to read hotel setup records.
`GET /hotels/hotel_123` -> Must result in `PERMISSION_DENIED` until their `/users/{uid}` document is safely verified and associated.

### Payload 10: Negative Financial Transactions
An employee attempts to register a negative cash book entry or expense.
```json
{
  "category": "Office Supplies",
  "amount": -5000, // Evil negative amount
  "date": "2026-07-13",
  "description": "Refund scam",
  "hotelId": "hotel_123"
}
```

### Payload 11: Cross-Tenant Employee Salary Peek
A standard receptionist attempts to read salary records of another hotel's employees.
`GET /employees/emp_999` (where employee is in `hotel_999`) -> Must result in `PERMISSION_DENIED`

### Payload 12: Hijacking Global System Settings
An attacker attempts to modify global settings parameters of the ERP application.
`PUT /settings/system` -> Must result in `PERMISSION_DENIED`

---

## 3. The Security Rule Test Suite Blueprint
Below is a conceptual test runner suite (`firestore.rules.test.ts`) utilizing the `@firebase/rules-unit-testing` harness.

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Hotel ERP Security Rules Suite', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'inspired-stratum-652jj',
      firestore: { rules: require('fs').readFileSync('firestore.rules', 'utf8') }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('prohibits cross-tenant writes (Payload 1)', async () => {
    const context = testEnv.authenticatedContext('user_123', { email: 'user@hotel123.com' });
    const db = context.firestore();
    
    // Seed user record first
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('users/user_123').set({
        uid: 'user_123',
        name: 'Staff A',
        email: 'user@hotel123.com',
        role: 'Receptionist',
        hotelId: 'hotel_123'
      });
    });

    const bookingRef = db.collection('bookings').doc('booking_new');
    await assertFails(bookingRef.set({
      guestId: 'guest_abc',
      roomTypeId: 'deluxe',
      checkInDate: '2026-07-15',
      checkOutDate: '2026-07-20',
      status: 'Reserved',
      totalAmount: 500,
      paidAmount: 0,
      hotelId: 'hotel_999' // Cross-tenant leak!
    }));
  });

  it('prevents self-promotion (Payload 2)', async () => {
    const context = testEnv.authenticatedContext('user_123');
    const db = context.firestore();
    const userRef = db.doc('users/user_123');
    await assertFails(userRef.update({ role: 'Hotel Admin' }));
  });
});
```
