# CatBook UAT Checklist

เอกสารนี้ใช้สำหรับทดสอบ Phase 1 ของระบบ e-commerce สัตว์เลี้ยงก่อนขึ้น production โดยเน้น flow หลักที่ต้องไม่พังก่อนรับลูกค้าจริง

## Test Data

บัญชีทดสอบใช้รหัสผ่าน development คือ `1234`

| Role | Email | ใช้ทดสอบ |
|---|---|---|
| Admin | `admin@catbook.com` | Admin dashboard, product, stock, order, payment, backup |
| Customer | `mali@catbook.com` | ซื้อสินค้า, ดู order tracking, order paid/shipped |
| Customer | `thungngern@catbook.com` | stock ไม่พอ, payment failed |
| Customer | `somchun@catbook.com` | cancel order/refund |

Seed data สำหรับ UAT อยู่ที่ [server/fixtures/uatSeedData.js](D:/Claude/catbook-app/server/fixtures/uatSeedData.js) และสามารถ reset dev database ได้ด้วยคำสั่ง:

```bash
npm run db:seed:uat
```

สินค้าสำคัญสำหรับทดสอบ:

| SKU | สถานะ | Stock | ใช้ทดสอบ |
|---|---:|---:|---|
| `UAT-DOG-PUPPY-STARTER` | active | 10 | ซื้อสินค้า end-to-end |
| `UAT-CAT-LOW-STOCK` | active | 1 | stock ไม่พอ, low stock |
| `UAT-CAT-OUT-STOCK` | active | 0 | out of stock |
| `UAT-CAT-MEDICINE` | active | 4 | หมวดเวชภัณฑ์ |
| `UAT-SERVICE-GROOMING` | draft | 20 | admin edit/publish/archive |
| `UAT-CAT-CARE-BUNDLE` | archived | 6 | archived product ไม่ควรขายหน้าร้าน |

## UAT-01 ซื้อสินค้า End-To-End

Precondition: login เป็น `mali@catbook.com`

| Step | Expected Result |
|---|---|
| เปิด Marketplace และค้นหา `UAT-DOG-PUPPY-STARTER` | พบสินค้า active พร้อมราคา 1,290 บาท และ stock มากกว่า 0 |
| Add to cart จำนวน 1 | Cart แสดงสินค้า 1 รายการ ยอดรวมถูกต้อง |
| Refresh หน้าเว็บ | Cart ยังอยู่ เพราะเก็บฝั่ง server |
| Checkout ด้วย shipping address ครบถ้วน และเลือก `promptpay` | สร้าง order สำเร็จ, cart ถูกล้าง, ได้ payment instruction แบบ mock PromptPay |
| เปิดหน้า Orders | เห็น order ใหม่ status `pending`, payment `pending`, shipping `pending` |
| Admin mark paid | Customer เห็น payment status เป็น `paid` และ order status เป็น `paid` |

Pass Criteria: สร้าง order ได้, stock ลดตามจำนวนที่ซื้อ, cart ไม่หายหลัง refresh, order แสดงใน customer tracking

## UAT-02 Stock ไม่พอ

Precondition: login เป็น `thungngern@catbook.com`

| Step | Expected Result |
|---|---|
| เพิ่มสินค้า `UAT-CAT-LOW-STOCK` จำนวน 2 ลง cart | Cart รับจำนวนได้เพื่อเตรียมทดสอบ checkout conflict |
| Checkout ด้วย address ครบถ้วนและเลือก `bank_transfer` | API ตอบ 409 `Insufficient stock` |
| ตรวจหน้า Orders | ไม่เกิด order ใหม่จาก checkout ที่ล้มเหลว |
| ตรวจ Admin Product | Stock ของ `UAT-CAT-LOW-STOCK` ยังเป็น 1 |

Pass Criteria: ระบบไม่สร้าง order และไม่ตัด stock เมื่อจำนวนใน cart มากกว่า stock ที่มี

## UAT-03 Admin เพิ่ม/แก้/Archive สินค้า

Precondition: login เป็น `admin@catbook.com`

| Step | Expected Result |
|---|---|
| เปิด Admin Dashboard > Products | เห็นสินค้าจาก API และ summary low stock |
| เพิ่มสินค้าใหม่ SKU `UAT-ADMIN-NEW-001` | สร้างสินค้าได้, status default/selected ถูกต้อง, มี audit log `product.create` |
| แก้ราคาและ stock | Product update สำเร็จ, stock movement type `adjustment` ถูกสร้างเมื่อ stock เปลี่ยน |
| Archive สินค้า | Status เป็น `archived`, สินค้าไม่ควรถูกนำไปขายหน้าร้านใน flow ปกติ |
| ลองเพิ่ม SKU ซ้ำ | ระบบแจ้ง validation error `SKU already exists` |

Pass Criteria: เพิ่ม/แก้/archive ได้จริงบน database layer และ validation ป้องกันข้อมูลซ้ำหรือ stock ติดลบ

## UAT-04 Payment Paid / Failed / Refund

Precondition: login เป็น `admin@catbook.com`

| Step | Expected Result |
|---|---|
| เปิด order `UAT-ORDER-PAID` | เห็น payment status `paid`, shipping `packed` |
| เลือก order pending จาก checkout ใหม่ แล้วกด Mark Paid | payment status เป็น `paid`, order status เปลี่ยนเป็น `paid`, payment record มี `paidAt` |
| เปิด order `UAT-ORDER-FAILED` | payment status เป็น `failed`, shipping ยัง `pending` |
| พยายามเปลี่ยน failed order เป็น `shipped` | ระบบปฏิเสธด้วย 409 `Cannot ship an order with failed payment` |
| Mark Failed ใน order ที่ยังไม่ส่ง | payment status เป็น `failed`, order กลับเป็น `pending`, shipping เป็น `pending` |
| Refund order ที่ paid | payment status เป็น `refunded`, payment record มี `refundedAt` |

Pass Criteria: paid/failed/refund อัปเดตทั้ง order และ payments table, failed payment ไม่สามารถส่งต่อ shipping

## UAT-05 Cancel Order

Precondition: login เป็น `admin@catbook.com`

| Step | Expected Result |
|---|---|
| เลือก order ที่ยังไม่ delivered | แสดงช่อง cancel reason |
| กด cancel โดยไม่กรอก reason | ระบบแจ้ง `Cancel reason is required` |
| กรอก reason แล้ว cancel | order status เป็น `cancelled`, shipping status เป็น `cancelled`, cancel reason ถูกบันทึก |
| ถ้า order เคย paid | payment status เปลี่ยนเป็น `refunded` |
| ตรวจ stock ของสินค้าใน order | stock ถูกคืนตามจำนวนสินค้าใน order |

Pass Criteria: cancel ต้องมี reason, คืน stock ได้, paid order ถูก refund เมื่อ cancel

## UAT-06 Customer Order Tracking

Precondition: login เป็น `mali@catbook.com`

| Step | Expected Result |
|---|---|
| เปิดหน้า Orders | เห็นรายการ order ของลูกค้าคนนั้นเท่านั้น |
| เปิด `UAT-ORDER-SHIPPED` | เห็นรายการสินค้า, payment `paid`, shipping `shipped`, tracking no `KEX-UAT-0001` |
| ตรวจ timeline | Step ถึง `shipped` ถูก highlight และยังไม่ถึง `delivered` |
| เปิด order cancelled ถ้าเป็นเจ้าของ order | เห็น cancel reason และสถานะ cancelled ชัดเจน |
| ลองเปิด order ของลูกค้าคนอื่นด้วย URL ตรง | ระบบไม่แสดง order หรือได้ `Order not found` |

Pass Criteria: Customer เห็นรายละเอียด order ครบและไม่สามารถดู order ของคนอื่น

## UAT-07 Health / Backup Foundation

Precondition: login เป็น `admin@catbook.com`

| Step | Expected Result |
|---|---|
| เปิด `GET /api/v1/health` | ตอบ `ok: true`, มี service, uptime, database counts |
| เรียก `POST /api/v1/admin/system/backup` พร้อม CSRF | สร้าง backup JSON ใน `server/backups` สำเร็จ |
| เรียก backup โดยไม่ login หรือไม่มี CSRF | ได้ 401/403 ตามกรณี |

Pass Criteria: health ใช้ monitor ได้ และ backup endpoint ถูกป้องกันด้วย admin auth + CSRF

## Exit Criteria

- Test case UAT-01 ถึง UAT-07 ผ่านทั้งหมด
- ไม่มี Critical/High bug เปิดค้าง
- `npm run lint` ผ่าน
- `npm run build` ผ่าน
- ทีมรับทราบข้อจำกัดว่า JSON database เป็น dev layer และต้องย้ายไป managed database ก่อน production จริง
