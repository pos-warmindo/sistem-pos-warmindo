# QRIS Payment Integration - Implementation Documentation

## Overview
This document describes the QRIS (Quick Response Code Indonesian Standard) payment integration for the Warmindo WP 2 POS system. The implementation follows the specifications in Phase 4, Section 6 of the project blueprint.

## Architecture

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                    QRIS Payment Flow                            │
└─────────────────────────────────────────────────────────────────┘

User clicks "QRIS" Tab
       ↓
Generate QR Code
       ↓
POST /api/pakasir/generate
       ↓
┌──────────────────────────┐
│ 1. Validate shift        │
│ 2. Call Pakasir API      │
│ 3. Create order          │
│    (status: QRIS_PENDING)│
│ 4. Store trx_id          │
│ 5. Set expires_at        │
└──────────────────────────┘
       ↓
Display QR Code + 5-min Timer
       ↓
┌─────────────────────────────────────┐
│ Poll every 10s:                     │
│ GET /api/pakasir/status/:trx_id     │
│                                     │
│ Check Pakasir API for status        │
└─────────────────────────────────────┘
       ↓
   ┌───────┴───────┐
   │               │
PAID            EXPIRED
   │               │
   ↓               ↓
Update to     Timer = 0:00
PAID status   Update to EXPIRED
   │               │
Deduct        Clear Cart
Stock         Close Modal
   │
Clear Cart
Show Success

┌─────────────────────────────────────┐
│ Webhook (Parallel):                 │
│ POST /api/pakasir/webhook           │
│                                     │
│ 1. Verify HMAC signature            │
│ 2. Update order to PAID             │
│ 3. Insert payment record            │
│ 4. Return 200 OK immediately        │
└─────────────────────────────────────┘
```

## Components

### 1. Frontend: PaymentModal.tsx

**Location**: `src/components/pos/PaymentModal.tsx`

**Key Features**:
- Dual-tab interface (TUNAI | QRIS)
- QR code display using `qrcode.react`
- 5-minute countdown timer (MM:SS format)
- Status polling every 10 seconds
- Auto-expire on timeout
- Manual cancellation option

**State Management**:
```typescript
const [qrData, setQrData] = useState<{
  qr_string: string;
  trx_id: string;
  order_id: string;
  expires_at: string;
} | null>(null);
const [qrisTimeLeft, setQrisTimeLeft] = useState<number>(300); // 5 minutes
const [isPolling, setIsPolling] = useState<boolean>(false);
```

**Lifecycle**:
1. User switches to QRIS tab
2. Click "Generate QR Code" button
3. `handleGenerateQRIS()` calls `/api/pakasir/generate`
4. QR code displayed with countdown timer
5. Polling starts automatically (10-second intervals)
6. On payment success: clear cart, close modal, show success toast
7. On timeout: expire order, clear cart, show error toast
8. On cancel: void order, clear cart, close modal

### 2. API Route: Generate QRIS

**Location**: `src/app/api/pakasir/generate/route.ts`

**Method**: POST

**Request Body**:
```json
{
  "shift_id": "uuid",
  "total_amount": 25000,
  "subtotal": 25000,
  "cart_items": [
    {
      "product": { "id": "uuid", "name": "Indomie Goreng", "base_price": 10000 },
      "modifiers": [...],
      "quantity": 2,
      "lineTotal": 20000
    }
  ]
}
```

**Response**:
```json
{
  "qr_string": "00020101021226...",
  "trx_id": "TRX123456789",
  "order_id": "order-uuid",
  "expires_at": "2026-06-26T15:35:00Z"
}
```

**Process**:
1. Authenticate user
2. Validate active shift
3. Call Pakasir API (`POST /v1/transactions`)
4. Create order with status `QRIS_PENDING`
5. Insert order items and modifiers
6. Store `pakasir_trx_id` and `qris_expires_at`
7. Return QR code data

### 3. API Route: Check Status

**Location**: `src/app/api/pakasir/status/[trx_id]/route.ts`

**Method**: GET

**URL**: `/api/pakasir/status/:trx_id`

**Response**:
```json
{
  "status": "PENDING" | "PAID" | "EXPIRED",
  "trx_id": "TRX123456789"
}
```

**Process**:
1. Authenticate user
2. Call Pakasir API (`GET /v1/transactions/:trx_id`)
3. Map Pakasir status to system status
4. If PAID: update order in database
5. Return status to frontend

### 4. API Route: Webhook Handler

**Location**: `src/app/api/pakasir/webhook/route.ts`

**Method**: POST

**Headers**:
- `X-Pakasir-Signature`: HMAC-SHA256 signature

**Request Body**:
```json
{
  "trx_id": "TRX123456789",
  "status": "PAID",
  "amount": 25000
}
```

**Security**:
- Verifies HMAC-SHA256 signature using `PAKASIR_WEBHOOK_SECRET`
- Returns 401 if signature is invalid

**Process**:
1. Extract signature from header
2. Calculate expected signature
3. Verify signatures match
4. Find order by `pakasir_trx_id`
5. Update order status to `PAID`
6. Insert payment record (idempotent)
7. Return 200 OK immediately (< 500ms)

**Idempotency**:
- Uses `order_id` UNIQUE constraint on `payments` table
- Ignores duplicate webhook calls (error code 23505)

### 5. Cron Job: Expire QRIS

**Location**: `src/app/api/cron/expire-qris/route.ts`

**Schedule**: Every minute (`* * * * *`)

**Configuration**: `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/expire-qris",
    "schedule": "* * * * *"
  }]
}
```

**Process**:
1. Query orders with `status='QRIS_PENDING'` and `qris_expires_at < NOW()`
2. Update status to `EXPIRED`
3. Log expired order count

**Security**:
- Optional `CRON_SECRET` validation via Authorization header

## Database Schema

### Orders Table Updates
```sql
CREATE TABLE public.orders (
  -- ... existing fields ...
  pakasir_trx_id    VARCHAR(100),       -- Pakasir transaction ID
  qris_expires_at   TIMESTAMPTZ,        -- Expiry time (NOW() + 5 minutes)
  -- ... existing fields ...
);

CREATE INDEX idx_orders_pakasir_trx_id  
  ON public.orders(pakasir_trx_id) 
  WHERE pakasir_trx_id IS NOT NULL;

CREATE INDEX idx_orders_qris_expires    
  ON public.orders(qris_expires_at) 
  WHERE status = 'QRIS_PENDING';
```

### Order Status Flow
```
QRIS_PENDING → PAID      (webhook or polling success)
QRIS_PENDING → EXPIRED   (5-minute timeout)
QRIS_PENDING → VOIDED    (user cancellation)
```

## Environment Variables

Add to `.env.local`:

```bash
# Pakasir API Configuration
PAKASIR_PROJECT=warmindo-pos
PAKASIR_API_KEY=your_api_key_here
PAKASIR_WEBHOOK_SECRET=your_webhook_secret_here
PAKASIR_BASE_URL=https://app.pakasir.com

# Cron Job Security
CRON_SECRET=your_cron_secret_here
```

## Testing

### Local Testing

1. **Generate QRIS**:
```bash
curl -X POST http://localhost:3000/api/pakasir/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shift_id": "your-shift-id",
    "total_amount": 25000,
    "subtotal": 25000,
    "cart_items": [...]
  }'
```

2. **Check Status**:
```bash
curl http://localhost:3000/api/pakasir/status/TRX123456789
```

3. **Test Webhook** (requires ngrok or similar):
```bash
# Calculate signature
echo -n '{"trx_id":"TRX123","status":"PAID","amount":25000}' | \
  openssl dgst -sha256 -hmac "your_webhook_secret"

# Send webhook
curl -X POST http://localhost:3000/api/pakasir/webhook \
  -H "Content-Type: application/json" \
  -H "X-Pakasir-Signature: calculated_signature" \
  -d '{"trx_id":"TRX123","status":"PAID","amount":25000}'
```

4. **Test Cron Job**:
```bash
curl http://localhost:3000/api/cron/expire-qris \
  -H "Authorization: Bearer your_cron_secret"
```

### Integration Testing Checklist

- [ ] Generate QR code successfully
- [ ] QR code displays correctly (scan with mobile app)
- [ ] Countdown timer shows 05:00 and decrements
- [ ] Polling starts automatically
- [ ] Payment success updates order to PAID
- [ ] Stock deduction triggers on PAID status
- [ ] Cart clears after successful payment
- [ ] Timer expiry updates order to EXPIRED
- [ ] Expired order shows error toast
- [ ] Cancel button voids order
- [ ] Webhook signature validation works
- [ ] Webhook updates order correctly
- [ ] Duplicate webhooks are idempotent
- [ ] Cron job expires old pending orders

## Error Handling

### Frontend Errors
- Network failure → "Gagal membuat QR Code" toast
- Insufficient stock → "Stok bahan baku tidak mencukupi" toast
- Expired QRIS → "QRIS kadaluarsa. Buat pesanan baru." toast

### Backend Errors
- Missing environment variables → 500 error logged
- Invalid Pakasir API response → 500 error with details
- Database errors → Logged and returned as 500
- Webhook signature mismatch → 401 Unauthorized

## Performance Considerations

1. **Webhook Response Time**: Must return 200 OK in < 500ms
   - Payment insertion happens before webhook returns
   - No heavy processing in webhook handler

2. **Polling Frequency**: 10 seconds
   - Balances responsiveness with API load
   - Stops immediately on success or expiry

3. **Countdown Timer**: Client-side only
   - No server polling for timer
   - 1-second interval updates

4. **Database Indexes**: 
   - `pakasir_trx_id` for webhook lookups
   - `qris_expires_at` for cron job queries

## Security

1. **Webhook Verification**: HMAC-SHA256 signature
2. **Cron Authentication**: Bearer token (optional)
3. **RLS Policies**: All database queries respect Row Level Security
4. **API Key Protection**: Server-side environment variables only

## Deployment Checklist

- [ ] Install `qrcode.react` package
- [ ] Set all environment variables in Vercel
- [ ] Configure Vercel Cron job
- [ ] Register webhook URL with Pakasir
- [ ] Test webhook with production credentials
- [ ] Monitor cron job execution logs
- [ ] Test end-to-end QRIS flow in production

## Known Limitations

1. **Pakasir API Mock**: Implementation assumes Pakasir API structure
   - Verify actual API response format
   - Adjust field mappings if needed

2. **5-Minute Timeout**: Hardcoded
   - Could be made configurable via environment variable

3. **Polling Only**: No WebSocket/SSE for real-time updates
   - Acceptable for 10-second polling interval
   - Consider upgrading for better UX

4. **Single QR Per Session**: Generating new QR closes previous
   - Previous order marked as VOIDED
   - Could support multiple pending QRs with order queue

## Future Enhancements

1. **Receipt Integration**: Auto-print after QRIS payment
2. **Sound Notification**: Play sound on successful payment
3. **QR Refresh**: Allow regenerating expired QR without clearing cart
4. **Payment History**: Show recent QRIS transactions
5. **Analytics**: Track QRIS vs TUNAI payment preferences

## Support

For issues or questions:
- Check server logs in Vercel dashboard
- Review Pakasir API documentation
- Verify environment variables are set correctly
- Test webhook signature calculation

---

**Implementation Date**: June 26, 2026  
**Developer**: Dev B3  
**Blueprint Version**: Phase 4, Section 6
