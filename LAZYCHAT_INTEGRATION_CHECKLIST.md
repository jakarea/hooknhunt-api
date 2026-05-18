# LazyChat Integration Checklist
## Verification against: https://warp-sneeze-31e.notion.site/Hook-n-Hunt-Custom-Integration-34b9d83e370180edb24efa83855579f7

---

## 1. PRODUCT API ENDPOINTS (Our System → LazyChat)

### Products List API
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| Endpoint: `/api/v2/lazychat-retail/products` | ✅ | EXISTS | Line 63 in api.php |
| Method: GET | ✅ | IMPLEMENTED | LazychatRetailController@products |
| Pagination support | ✅ | YES | per_page, page parameters |
| `updated_since` filter | ✅ | YES | For incremental sync |
| Returns published products only | ✅ | YES | Filters by status='published' |
| Returns products with retail variants | ✅ | YES | whereHas('variants') with channel='retail' |

### Single Product API  
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| Endpoint: `/api/v2/lazychat-retail/products/{id}` | ✅ | EXISTS | Line 66 in api.php |
| Method: GET | ✅ | IMPLEMENTED | LazychatRetailController@showProduct |
| Returns 404 if no active retail variants | ✅ | YES | Line 193 |

---

## 2. PRODUCT DATA FORMAT (API Response)

### Product Level Fields
| Field | Type | Required | Status | Value Check |
|------|------|----------|--------|-------------|
| `id` | integer | ✅ | YES | Product ID |
| `title` | string | ✅ | YES | retail_name or name |
| `slug` | string | ✅ | YES | Product slug |
| `url` | string | ✅ | YES | Frontend product URL |
| `description` | string | ✅ | YES | HTML description |
| `summary` | string | ✅ | YES | Empty string (we don't have short_description) |
| `published` | boolean | ✅ | YES | status === 'published' |
| `is_draft` | boolean | ✅ | YES | status === 'draft' |
| `featured` | boolean | ✅ | YES | Always false |
| `purchasable` | boolean | ✅ | YES | published AND stock > 0 |
| `sku` | string | ✅ | YES | First variant's SKU |
| `brand` | string | ✅ | YES | Brand name |
| `weight` | string | ✅ | YES | First variant's weight |
| `tags` | array | ✅ | YES | From seo_tags |
| `note` | string/null | ✅ | YES | Always null |
| `categories` | array | ✅ | YES | Category with id, title, slug |
| `images` | array | ✅ | YES | [{url: "..."}] |
| `attributes` | array | ✅ | YES | Size, Color, Material |
| `created_at` | string | ✅ | YES | ISO 8601 |
| `updated_at` | string | ✅ | YES | ISO 8601 |

### Pricing Object
| Field | Type | Required | Status | Value Check |
|------|------|----------|--------|-------------|
| `regular_price` | string | ✅ | YES | Formatted with 2 decimals |
| `sale_prices` | array | ✅ | YES | Objects with sale_price, on_sale_from, on_sale_to |
| `wholesale_prices` | array | ✅ | YES | Empty array (not in variations) |

### Inventory Object
| Field | Type | Required | Status | Value Check |
|------|------|----------|--------|-------------|
| `stock_status` | boolean | ✅ | YES | sum(stock) > 0 |
| `stocks` | array | ✅ | YES | Empty array at product level |

### Variation Fields
| Field | Type | Required | Status | Value Check |
|------|------|----------|--------|-------------|
| `id` | integer | ✅ | YES | Variant ID |
| `title` | string | ✅ | YES | variant_name |
| `sku` | string/null | ✅ | YES | Variant SKU |
| `published` | boolean | ✅ | YES | is_active |
| `weight` | string/null | ✅ | YES | Variant weight |
| `pricing.regular_price` | string | ✅ | YES | Formatted price |
| `pricing.sale_prices` | array | ✅ | YES | Sale price objects |
| `pricing.wholesale_prices` | ❌ | N/A | Not required for variations |
| `inventory.stock_status` | boolean | ✅ | YES | stock > 0 |
| `inventory.stocks` | array | ✅ | YES | [{quantity, date, note}] |
| `images` | array | ✅ | YES | Variant images |
| `attributes` | array | ✅ | YES | Variant attributes |
| `created_at` | string | ✅ | YES | ISO 8601 |
| `updated_at` | string | ✅ | YES | ISO 8601 |

---

## 3. PRODUCT WEBHOOK (Our System → LazyChat)

### Webhook Dispatch
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| Job dispatched on product create | ✅ | YES | Line 402 in ProductController |
| Job dispatched on product update | ✅ | YES | Line 1130 in ProductController |
| Job dispatched on product delete | ✅ | YES | Line 1388 in ProductController |
| Queue name: `lazychat-webhooks` | ✅ | YES | Configured |
| Max retries: 3 | ✅ | YES | Configured |
| Backoff: 30 seconds | ✅ | YES | Configured |

### Webhook Payload Format
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| Wrapped in `payload` object | ✅ | YES | {payload: productData} |
| Topic header: `X-Webhook-Topic` | ✅ | YES | Set in sendWebhook |
| Auth: Bearer token | ✅ | YES | From .env |
| URL matches config | ✅ | YES | LAZYCHAT_WEBHOOK_CREATE_URL |

### Webhook Response Logging
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| Payload logged to file | ✅ | YES | lazychat-payloads.log |
| Response logged to file | ✅ | YES | lazychat-responses.log |
| Log table: `lazychat_webhook_logs` | ✅ | YES | Exists (1147 rows) |

---

## 4. ORDER CREATION ENDPOINT (LazyChat → Our System)

### Endpoint Configuration
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| URL: `/api/v2/lazychat-retail/order/create` | ✅ | YES | Line 75 in api.php |
| Method: POST | ✅ | YES |  |
| Middleware: `lazychat.auth` | ✅ | YES | Line 76 |
| Controller: `LazychatRetailController@receiveOrder` | ✅ | YES | Line 77 |

### Authentication
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| Bearer token required | ✅ | YES | LazychatAuth middleware |
| Token from: `LAZYCHAT_API_TOKEN` | ✅ | YES | In .env |
| Invalid token returns 403 | ✅ | YES | Implemented |
| Missing token returns 401 | ✅ | YES | Implemented |
| Rate limiting on failed attempts | ✅ | YES | 5 attempts = alert |

### Request Body Format
| Field | Type | Required | Status | Notes |
|------|------|----------|--------|-------|
| `id` | string/integer | ✅ | YES | Lazychat order ID |
| `contact.name` | string | ✅ | YES | Required |
| `contact.phone` | string | ✅ | YES | Required, regex validation |
| `contact.email` | email | ✅ | YES | Nullable |
| `contact.address_1` | string | ✅ | YES | Required |
| `total_price` | numeric | ✅ | YES | Required |
| `deliveryCharge` | numeric | ✅ | YES | Required |
| `payment_method` | string | ✅ | YES | cash_on_delivery or cod |
| `payment_status` | string | ✅ | YES | unpaid or paid |
| `note` | string | ✅ | YES | Nullable |
| `line_items` | array | ✅ | YES | Required, min 1, max 50 |
| `line_items[].product_id` | integer | ✅ | YES | Must exist in products |
| `line_items[].variation_id` | integer | ✅ | YES | Must exist in product_variants |
| `line_items[].sku` | string | ✅ | YES | Required |
| `line_items[].name` | string | ✅ | YES | Required |
| `line_items[].price` | numeric | ✅ | YES | Required |
| `line_items[].quantity` | integer | ✅ | YES | Required, min 1, max 100 |

### Order Processing Logic
| Step | Required | Status | Notes |
|------|----------|--------|-------|
| Customer resolved or created | ✅ | YES | resolveLazychatCustomer() |
| Order created with invoice LZ-* | ✅ | YES | Line 560 |
| Channel set to `retail_web` | ✅ | YES | Line 562 |
| Status set to `pending` | ✅ | YES | Line 563 |
| external_data.lazychat populated | ✅ | YES | Lines 587-592 |
| Line items processed | ✅ | YES | processLazychatOrderItem() |
| Stock decremented | ✅ | YES | Line 748 |
| OrderCreated event dispatched | ✅ | YES | Line 601 |
| Database transaction | ✅ | YES | Lines 548-603 |

### Response Format
| Field | Type | Status | Notes |
|------|------|----------|--------|-------|
| Success: 201 Created | ✅ | YES | Line 623 |
| Returns order_id | ✅ | YES | Line 617 |
| Returns invoice_no | ✅ | YES | Line 618 |
| Returns total_amount | ✅ | YES | Line 619 |
| Returns status | ✅ | YES | Line 620 |
| Returns payment_status | ✅ | YES | Line 621 |
| Error: 422 Validation | ✅ | YES | Line 534-545 |
| Error: 500 Server Error | ✅ | YES | Line 636-640 |

---

## 5. QUEUE SYSTEM

### Queue Configuration
| Field | Required | Status | Notes |
|------|----------|--------|-------|
| `jobs` table exists | ✅ | YES | Has 1 job |
| `failed_jobs` table exists | ✅ | YES | Has 24 failed jobs |
| Queue: `lazychat-webhooks` | ✅ | YES | Configured |
| Worker runs via cronjob | ✅ | YES | User confirmed |

### Failed Jobs
| Issue | Status | Notes |
|-------|--------|-------|
| 24 failed jobs from May 17 | ⚠️ | NEEDS RETRY | All due to infinite recursion bug |
| Bug fixed in Product.php | ✅ | YES | Ready to deploy |

---

## 6. CONFIGURATION

### Environment Variables
| Variable | Required | Status | Value |
|----------|----------|--------|-------|
| `LAZYCHAT_ENABLED` | ✅ | YES | true |
| `LAZYCHAT_API_TOKEN` | ✅ | YES | Set in .env |
| `LAZYCHAT_WEBHOOK_CREATE_URL` | ✅ | YES | flow.lazychat.io URL |
| `LAZYCHAT_WEBHOOK_CREATE_TOKEN` | ✅ | YES | Set in .env |
| `LAZYCHAT_WEBHOOK_DELETE_URL` | ✅ | YES | flow.lazychat.io URL |
| `LAZYCHAT_WEBHOOK_DELETE_TOKEN` | ✅ | YES | Set in .env |
| `LAZYCHAT_QUEUE_NAME` | ✅ | YES | lazychat-webhooks |
| `LAZYCHAT_MAX_RETRIES` | ✅ | YES | 3 |
| `LAZYCHAT_RETRY_DELAY` | ✅ | YES | 30 |
| `LAZYCHAT_TIMEOUT` | ✅ | YES | 30 |

### Database Tables
| Table | Required | Status | Rows |
|-------|----------|--------|------|
| `lazychat_webhook_logs` | ✅ | YES | 1147 |
| `jobs` | ✅ | YES | 1 |
| `failed_jobs` | ✅ | YES | 24 |
| `product_affiliate_commissions` | ✅ | YES | 13 |
| `affiliates` | ✅ | YES | 0 (OK, can be empty) |

---

## 7. FILES TO DEPLOY

### Local Files Ready
| File | Status | Destination |
|------|--------|------------|
| `app/Models/Product.php` | ✅ | /home/alugxzaz/probesh.hooknhunt.com/app/Models/ |
| `app/Services/ThirdParty/LazychatService.php` | ✅ | /home/alugxzaz/probesh.hooknhunt.com/app/Services/ThirdParty/ |
| `app/Jobs/SendLazychatWebhook.php` | ✅ | /home/alugxzaz/probesh.hooknhunt.com/app/Jobs/ |
| `app/Http/Middleware/LazychatAuth.php` | ✅ | Already exists |
| `app/Http/Controllers/Api/V2/LazychatRetailController.php` | ✅ | Already exists |

---

## 8. ISSUES FOUND

| Issue | Severity | Status | Solution |
|-------|----------|--------|----------|
| Product.php infinite recursion bug on server | 🔴 CRITICAL | ⚠️ PENDING | Deploy fixed Product.php |
| 24 failed jobs stuck in queue | 🟠 HIGH | ⚠️ PENDING | Run `php artisan queue:retry all` after deploy |
| Queue worker not running continuously | 🟡 MEDIUM | ℹ️ INFO | Cronjob handles it |

---

## 9. IMMEDIATE ACTIONS NEEDED

### 1. Deploy Files to Production
```bash
scp app/Models/Product.php \
    alugxzaz@probesh.hooknhunt.com:/home/alugxzaz/probesh.hooknhunt.com/app/Models/

scp app/Services/ThirdParty/LazychatService.php \
    alugxzaz@probesh.hooknhunt.com:/home/alugxzaz/probesh.hooknhunt.com/app/Services/ThirdParty/

scp app/Jobs/SendLazychatWebhook.php \
    alugxzaz@probesh.hooknhunt.com:/home/alugxzaz/probesh.hooknhunt.com/app/Jobs/
```

### 2. Clear Caches on Server
```bash
cd /home/alugxzaz/probesh.hooknhunt.com
php artisan cache:clear
php artisan config:clear
```

### 3. Retry Failed Jobs
```bash
php artisan queue:retry all
```

### 4. Test Order Creation Endpoint
```bash
curl -X POST 'https://probesh.hooknhunt.com/api/v2/lazychat-retail/order/create' \
  -H 'Authorization: Bearer a5fc3bd489db739ae2af19796fea0af2d03cb6d31682fd8dbc5914c863b344fb' \
  -H 'Content-Type: application/json' \
  -d '{
  "id": "test-001",
  "contact": {
    "name": "Test Customer",
    "phone": "01700000000",
    "address_1": "Test Address",
    "district": "Dhaka",
    "division": "Dhaka",
    "thana": "Dhaka"
  },
  "total_price": 100,
  "deliveryCharge": 50,
  "payment_method": "cash_on_delivery",
  "payment_status": "unpaid",
  "line_items": [
    {
      "product_id": 237,
      "sku": "test",
      "name": "Test Product",
      "price": 100,
      "quantity": 1
    }
  ]
}'
```

---

## 10. FINAL VERIFICATION

### Product Sync (Our → LazyChat)
- [ ] API accessible: GET /api/v2/lazychat-retail/products
- [ ] Single product: GET /api/v2/lazychat-retail/products/{id}
- [ ] Webhook sending after product create
- [ ] Webhook sending after product update
- [ ] Webhook sending after product delete
- [ ] Failed jobs being retried

### Order Creation (LazyChat → Us)
- [ ] Endpoint accessible: POST /api/v2/lazychat-retail/order/create
- [ ] Authentication working
- [ ] Order created successfully
- [ ] Customer resolved/created
- [ ] Stock decremented
- [ ] Invoice generated correctly

---

## STATUS SUMMARY

**Overall Status: 🟡 READY TO DEPLOY**

| Component | Status | Notes |
|-----------|--------|-------|
| Product API | ✅ READY | Fully implemented |
| Product Webhook | ⚠️ BLOCKED | Waiting for Product.php deploy |
| Order API | ✅ READY | Fully implemented |
| Authentication | ✅ READY | Bearer token working |
| Queue System | ✅ READY | Jobs table ready |

**Next Step:** Deploy the 3 files to production server to unblock webhooks.
