# QRIS Development Testing Guide

## Quick Start for Local Development

The QRIS integration has been set up with **MOCK MODE** for local development, so you can test the complete flow without needing real Pakasir API credentials.

## Configuration

In your `.env.local` file, you should see:

```bash
NEXT_PUBLIC_USE_MOCK_QRIS=true
```

This enables mock mode, which:
- ✅ Generates fake QR codes for testing
- ✅ Creates orders in database normally
- ✅ Allows simulated payments
- ✅ Triggers real stock deduction
- ✅ Follows the complete payment flow

## Testing Flow

### 1. Generate QRIS (Normal User Flow)

1. Open the POS page
2. Add items to cart
3. Click "Bayar" button
4. Select "QRIS" tab
5. Click "Generate QR Code"
6. You'll see a QR code and countdown timer

**What happens:**
- Order created with status `QRIS_PENDING`
- Mock transaction ID generated (e.g., `MOCK-1719400000-abc123`)
- QR code displayed
- 5-minute countdown starts
- Polling starts (every 10 seconds)

### 2. Simulate Payment (Developer Action)

To simulate a successful QRIS payment, use one of these methods:

#### Method A: Using Browser Console

Open browser console and run:

```javascript
// Get the transaction ID from the QR modal
const trxId = "MOCK-1719400000-abc123"; // Replace with actual ID shown

fetch('/api/pakasir/mock-pay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ trx_id: trxId })
})
.then(r => r.json())
.then(console.log);
```

#### Method B: Using cURL

```bash
curl -X POST http://localhost:3000/api/pakasir/mock-pay \
  -H "Content-Type: application/json" \
  -d '{"trx_id":"MOCK-1719400000-abc123"}'
```

#### Method C: Using Thunder Client / Postman

- URL: `POST http://localhost:3000/api/pakasir/mock-pay`
- Body (JSON):
```json
{
  "trx_id": "MOCK-1719400000-abc123"
}
```

**What happens after mock payment:**
- ✅ Order status changes to `PAID`
- ✅ Stock deduction trigger fires
- ✅ Frontend polling detects the change
- ✅ Success toast appears
- ✅ Cart clears
- ✅ Modal closes

### 3. Test Expiry Flow

To test QRIS expiration:

1. Generate QRIS normally
2. **Wait 5 minutes** (or modify countdown for faster testing)
3. Timer reaches 00:00
4. Order status updates to `EXPIRED`
5. Error toast appears
6. Cart clears
7. Modal closes

### 4. Test Cancellation

1. Generate QRIS normally
2. Click "Batalkan QRIS" button
3. Order status updates to `VOIDED`
4. Cart clears
5. Modal closes

## Viewing Orders in Database

Check Supabase to see order status changes:

```sql
-- View recent QRIS orders
SELECT 
  id,
  status,
  payment_method,
  pakasir_trx_id,
  total_amount,
  qris_expires_at,
  created_at
FROM orders
WHERE payment_method = 'QRIS'
ORDER BY created_at DESC
LIMIT 10;
```

## Common Testing Scenarios

### Scenario 1: Happy Path - Successful Payment
```
1. Generate QRIS ✓
2. Simulate payment within 5 minutes ✓
3. Verify stock deducted ✓
4. Verify payment record created ✓
```

### Scenario 2: Timeout - QRIS Expires
```
1. Generate QRIS ✓
2. Wait 5 minutes ✓
3. Verify order marked EXPIRED ✓
4. Verify no stock deduction ✓
```

### Scenario 3: User Cancels
```
1. Generate QRIS ✓
2. Click "Batalkan QRIS" ✓
3. Verify order marked VOIDED ✓
4. Verify no stock deduction ✓
```

### Scenario 4: Insufficient Stock
```
1. Lower stock to near zero ✓
2. Generate QRIS ✓
3. Simulate payment ✓
4. Verify stock deduction fails ✓
5. Order rolls back ✓
```

## Debugging Tips

### Check Server Logs

Look for these log messages:

```
[Pakasir] Using MOCK QRIS mode
[Pakasir] Mock transaction created: MOCK-xxx
[Pakasir Status] Using MOCK mode for MOCK-xxx
[Mock Pay] Successfully marked order xxx as PAID
```

### Check Network Tab

- `/api/pakasir/generate` should return 200 with QR data
- `/api/pakasir/status/:trx_id` polls every 10 seconds
- Response should change from `PENDING` to `PAID`

### Check Database

```sql
-- Check order status progression
SELECT id, status, created_at, updated_at, paid_at
FROM orders
WHERE pakasir_trx_id LIKE 'MOCK-%'
ORDER BY created_at DESC;

-- Check stock movements
SELECT 
  rm.name,
  sm.quantity_change,
  sm.quantity_before,
  sm.quantity_after,
  sm.created_at
FROM stock_movements sm
JOIN raw_materials rm ON rm.id = sm.material_id
WHERE sm.order_id IN (
  SELECT id FROM orders WHERE pakasir_trx_id LIKE 'MOCK-%'
)
ORDER BY sm.created_at DESC;
```

## Switching to Production Mode

When ready to use real Pakasir API:

1. Update `.env.local`:
```bash
NEXT_PUBLIC_USE_MOCK_QRIS=false
PAKASIR_BASE_URL=https://api.pakasir.com  # Real API URL
PAKASIR_API_KEY=your_real_api_key
PAKASIR_WEBHOOK_SECRET=your_real_webhook_secret
```

2. Register webhook with Pakasir:
   - URL: `https://yourdomain.com/api/pakasir/webhook`
   - Method: POST
   - They will provide the webhook secret

3. Test with real QR codes:
   - Use actual payment apps to scan
   - Verify webhook receives callbacks
   - Monitor production logs

## Troubleshooting

### "Pakasir API not configured" error
- Check that `NEXT_PUBLIC_USE_MOCK_QRIS=true` in `.env.local`
- Restart dev server after changing env vars

### QR code not displaying
- Check browser console for errors
- Verify `qrcode.react` package is installed
- Check that response contains `qr_string`

### Polling not working
- Check Network tab for failed requests
- Verify order was created with correct `pakasir_trx_id`
- Check that polling interval (10s) is running

### Stock not deducting
- Check that order reaches `PAID` status
- Verify trigger `fn_deduct_stock_on_payment` exists
- Check for error in stock deduction logic
- Verify `product_recipes` are configured

### Timer not counting down
- Check React state updates
- Verify countdown interval is running
- Check browser console for errors

## Performance Testing

Test with multiple concurrent orders:

```bash
# Generate 5 QRIS orders simultaneously
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/pakasir/generate \
    -H "Content-Type: application/json" \
    -d '{"shift_id":"...","total_amount":25000,"subtotal":25000,"cart_items":[...]}' &
done
```

## Security Notes for Production

⚠️ **Important**: Mock mode is for development only!

- Never deploy with `NEXT_PUBLIC_USE_MOCK_QRIS=true` to production
- Always verify webhook HMAC signatures in production
- Use environment-specific API keys
- Monitor failed webhook attempts
- Set up proper error alerting

## Next Steps

After successful local testing:

1. ✅ Test all user flows in mock mode
2. ✅ Verify stock deduction accuracy
3. ✅ Test edge cases (timeout, cancel, insufficient stock)
4. ✅ Get real Pakasir API credentials
5. ✅ Deploy to staging with mock mode
6. ✅ Switch to production mode
7. ✅ Test with real payments (small amounts)
8. ✅ Monitor production for 24 hours
9. ✅ Go live!

---

**Happy Testing! 🚀**

If you encounter issues, check the server logs and database state. Most issues can be debugged by following the order status transitions and checking for error messages in the console.
