# Quick Place Order API Integration Guide

## 🚀 API Endpoint
```
POST /api/v2/store/orders/quick-place
```

## 📦 Required Payload
```json
{
  "customer_name": "John Doe",
  "customer_phone": "01712345678",
  "shipping_address": "Full address here",
  "items": [
    {
      "product_id": 34,
      "variant_id": 425,
      "quantity": 1
    }
  ]
}
```

## 🔑 Required Form Fields
- **customer_name**: text input (min 2 chars)
- **customer_phone**: tel input (11 digits, format: 01xxxxxxxxx)
- **shipping_address**: textarea (min 10 chars)
- **variant_id**: select dropdown (value = variant ID)

## 💰 Price Display (Frontend Only)
```javascript
// Show prices to customer - don't send to API
const DELIVERY_CHARGE = 70;

// Display prices for each variant
const VARIANT_PRICES = {
  '424': 450,   // 2.1m
  '425': 850,   // 2.4m (default)
  '427': 950,   // 2.7m
  '429': 1050,  // 3.0m
  '431': 1150   // 3.6m
};
```

## 📱 HTML Example
```html
<form id="order-form">
  <input type="text" id="customer-name" required>
  <input type="tel" id="customer-phone" required>
  <textarea id="shipping-address" required></textarea>
  
  <select id="variant-select" required>
    <option value="424">২.১ মিটার (৪৫০ টাকা)</option>
    <option value="425" selected>২.৪ মিটার (৮৫০ টাকা)</option>
    <option value="427">২.৭ মিটার (৯৫০ টাকা)</option>
  </select>
  
  <button type="submit">অর্ডার সম্পন্ন করুন</button>
</form>
```

## 🔧 JavaScript Integration
```javascript
const API_URL = window.location.origin + '/api/v2/store/orders/quick-place';

document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const payload = {
    customer_name: document.getElementById('customer-name').value,
    customer_phone: document.getElementById('customer-phone').value,
    shipping_address: document.getElementById('shipping-address').value,
    items: [{
      product_id: 34,  // Your product ID
      variant_id: parseInt(document.getElementById('variant-select').value),
      quantity: 1
    }]
  };
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Order placed! Invoice: ' + data.data.invoiceNo);
  } else {
    alert('Error: ' + data.message);
  }
});
```

## ✅ Success Response
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "invoiceNo": "WEB-6A3C77BB0A8E0",
    "totalAmount": 920,
    "isReturningCustomer": true
  }
}
```

## ❌ Error Response
```json
{
  "success": false,
  "message": "Invalid phone number format"
}
```

## ⚠️ Important Notes

1. **Don't send prices** - API calculates them automatically
2. **Use variant IDs** - Not product prices in dropdown values
3. **Phone format** - Must be 11 digits starting with 01
4. **No authentication required** - Works for guests
5. **Auto account creation** - New users get SMS credentials

## 🎯 Quick Test
```bash
curl -X POST https://hooknhunt-api.test/api/v2/store/orders/quick-place \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test",
    "customer_phone": "01712345678",
    "shipping_address": "Test Address",
    "items": [{"product_id": 34, "variant_id": 425, "quantity": 1}]
  }'
```

## 📋 Complete Example File
See `/public/landing-page.html` for full working example.

---

**That's it! Just 4 fields + variant selection + simple API call.**