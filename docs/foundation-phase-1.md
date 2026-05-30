# CatBook Phase 1 Foundation

เอกสารนี้คือ baseline สำหรับเปลี่ยน CatBook จาก React prototype ที่ใช้ mock state ให้เป็นระบบ E-commerce + Social Pets ที่พร้อมต่อ backend จริง

## เป้าหมาย Phase 1

- ย้าย business logic สำคัญออกจาก client ไปอยู่หลัง API
- ทำ authentication และ authorization ฝั่ง server
- ทำ product, cart, order, payment, shipment และ stock flow ให้มี data persistence
- วาง security, audit log และ PDPA baseline ก่อนเชื่อม payment/social integration จริง
- ให้ frontend เดิมค่อย ๆ เปลี่ยนจาก mock data เป็น API โดยไม่ต้องรื้อ UX ทั้งชุด

## Recommended Architecture

Frontend:
- React/Vite app ปัจจุบัน
- เรียก API ผ่าน service layer เช่น `src/services/apiClient.js`
- เก็บ session ผ่าน HttpOnly cookie หรือ short-lived access token + refresh flow

Backend:
- Node.js API หรือ Next.js API routes ก็ได้ แต่ต้องมี server-side RBAC
- PostgreSQL เป็น primary database
- Object storage สำหรับรูปสินค้า/โพสต์ เช่น S3-compatible storage
- Queue/background jobs สำหรับ email/LINE OA notification และ payment reconciliation

Infrastructure:
- CDN สำหรับ static assets และ product images
- Centralized logging + error tracking
- Automated backup database รายวัน
- CI gate: lint, build, unit tests, dependency audit

## Core Database Schema

### users
- id
- email
- password_hash
- display_name
- phone
- status: active, suspended, deleted
- created_at
- updated_at

### roles
- id
- code: super_admin, catalog_manager, fulfillment, customer_support, marketing, customer
- name

### user_roles
- user_id
- role_id

### pets
- id
- user_id
- name
- species: cat, dog, other
- breed
- birthdate
- avatar_url
- profile_status

### categories
- id
- parent_id
- name
- slug
- sort_order
- is_active

### brands
- id
- name
- slug
- is_active

### products
- id
- sku
- name
- slug
- brand_id
- category_id
- description
- species
- life_stage
- breed_size
- price
- compare_at_price
- cost
- status: draft, active, archived
- seo_title
- seo_description
- created_at
- updated_at

### product_images
- id
- product_id
- url
- alt_text
- sort_order

### inventory
- product_id
- quantity_on_hand
- quantity_reserved
- low_stock_threshold
- updated_at

### stock_movements
- id
- product_id
- order_id
- type: receive, reserve, release, deduct, adjust, return
- quantity
- note
- created_by
- created_at

### carts
- id
- user_id
- status: active, converted, abandoned
- created_at
- updated_at

### cart_items
- cart_id
- product_id
- quantity
- unit_price_snapshot

### coupons
- id
- code
- discount_type: fixed, percent, free_shipping
- discount_value
- min_order_amount
- usage_limit
- usage_per_customer
- starts_at
- ends_at
- status

### orders
- id
- order_no
- user_id
- cart_id
- status: pending_payment, paid, packing, shipped, delivered, cancelled, returned, refunded
- payment_status: unpaid, pending, paid, failed, refunded
- subtotal
- discount_total
- shipping_fee
- grand_total
- coupon_id
- shipping_name
- shipping_phone
- shipping_address
- created_at
- updated_at

### order_items
- id
- order_id
- product_id
- sku_snapshot
- name_snapshot
- unit_price
- quantity
- total

### payments
- id
- order_id
- provider: promptpay, omise, bank_transfer, cod
- provider_ref
- amount
- status: pending, paid, failed, expired, refunded
- paid_at
- raw_webhook_id
- created_at

### shipments
- id
- order_id
- carrier
- tracking_number
- status: preparing, picked_up, in_transit, delivered, failed, returned
- shipped_at
- delivered_at

### reviews
- id
- product_id
- user_id
- order_id
- rating
- comment
- status: pending, approved, rejected
- created_at

### audit_logs
- id
- actor_user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- ip_address
- user_agent
- created_at

### consents
- id
- user_id
- consent_type: privacy_policy, marketing, analytics
- version
- accepted_at
- revoked_at

## API Contract v1

Authentication:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`

Products:
- `GET /api/v1/products`
- `GET /api/v1/products/:slug`
- `POST /api/v1/admin/products`
- `PATCH /api/v1/admin/products/:id`
- `DELETE /api/v1/admin/products/:id`

Categories:
- `GET /api/v1/categories`
- `POST /api/v1/admin/categories`
- `PATCH /api/v1/admin/categories/:id`

Cart:
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:productId`
- `DELETE /api/v1/cart/items/:productId`
- `DELETE /api/v1/cart`

Checkout and Orders:
- `POST /api/v1/checkout/quote`
- `POST /api/v1/checkout/place-order`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:orderNo`
- `POST /api/v1/orders/:orderNo/cancel`
- `GET /api/v1/admin/orders`
- `PATCH /api/v1/admin/orders/:id/status`

Payments:
- `POST /api/v1/payments/:orderNo/initiate`
- `POST /api/v1/payments/webhooks/:provider`
- `GET /api/v1/admin/payments`

Shipments:
- `POST /api/v1/admin/shipments`
- `PATCH /api/v1/admin/shipments/:id`
- `GET /api/v1/orders/:orderNo/tracking`

Promotions:
- `POST /api/v1/coupons/validate`
- `POST /api/v1/admin/coupons`
- `PATCH /api/v1/admin/coupons/:id`

Reviews:
- `GET /api/v1/products/:productId/reviews`
- `POST /api/v1/products/:productId/reviews`
- `PATCH /api/v1/admin/reviews/:id/status`

Audit and Admin:
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/reports/sales`
- `GET /api/v1/admin/reports/low-stock`
- `GET /api/v1/admin/audit-logs`

## Critical Business Rules

Checkout:
- Recalculate price, discount, shipping และ stock availability ที่ server ทุกครั้ง
- ห้ามเชื่อราคา/qty/discount จาก client
- Reserve stock เมื่อสร้าง order เป็น `pending_payment`
- Release stock เมื่อ payment หมดเวลา/cancel
- Deduct stock เมื่อ payment สำเร็จหรือ COD order ถูก confirm

Payment:
- ใช้ gateway webhook เป็น source of truth
- Verify webhook signature ทุกครั้ง
- Payment status ต้อง idempotent กัน webhook ซ้ำ
- Order จะเป็น `paid` ได้เฉพาะเมื่อ amount ตรงกับ grand_total

Admin:
- ทุก admin API ต้องตรวจ role server-side
- role change, order status change, stock adjustment, refund ต้องเขียน audit log
- ห้ามใช้ field จาก client เช่น `isAdmin` เป็นตัวตัดสินสิทธิ์

PDPA:
- เก็บ consent version
- มี endpoint export/delete account ใน phase ถัดไป
- จำกัดการเข้าถึงข้อมูลลูกค้าตาม role
- Mask เบอร์โทร/ที่อยู่ในหน้าที่ไม่จำเป็น

## Migration Path From Current UI

1. เพิ่ม API service layer
2. เปลี่ยน login จาก `mockUsers` เป็น `/auth/login`
3. เปลี่ยน marketplace จาก `buildMarket(mockUsers)` เป็น `GET /products`
4. เปลี่ยน cart context ให้ sync กับ `/cart`
5. เปลี่ยน checkout ให้เรียก `/checkout/quote` และ `/checkout/place-order`
6. เปลี่ยน order context ให้โหลดจาก `/orders`
7. เปลี่ยน admin dashboard ให้ใช้ admin APIs และ server-side RBAC
8. ย้าย image upload ไป object storage ผ่าน signed upload URL

## Phase 1 Done Criteria

- `npm run lint` ผ่านแบบไม่มี errors
- `npm run build` ผ่าน
- ไม่มี mock password หรือ quick login บน production build
- มี backend auth + RBAC server-side
- Product/cart/order/payment/stock ใช้ database
- Checkout recalculates totals server-side
- Payment webhook idempotent และ verify signature
- Admin actions เขียน audit log
- มี backup, logging และ error monitoring baseline
