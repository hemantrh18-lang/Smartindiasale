# Meesho Sale — demo storefront

Upload `index.html`, `style.css`, and `app.js` into the root of your GitHub Pages repository.

## Admin
Demo PIN: `2468`. Open Admin → enter PIN → UPI & QR to update your merchant name, UPI ID, and optional static QR image URL.

## Amount-prefilled UPI / QR
The checkout creates a `upi://pay` intent with the current cart total and generates a QR encoding that same intent if the QR library loads. UPI apps differ, so test carefully with a small amount. An uploaded static QR may not include the order amount.

## Important limitations
This is a front-end demo. Products, payment settings, cart, and orders are stored in the current browser's localStorage only. Orders will not sync across devices or appear in a shared admin. Payment status must be verified manually; this site cannot securely verify payments. For a real store, use a backend/database with proper access controls and a payment provider supporting server-side verification/webhooks. Do not put secret keys in frontend code.
