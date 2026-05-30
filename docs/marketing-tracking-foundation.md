# Marketing Tracking Foundation

เอกสารนี้สรุปวิธีใช้ SEO, social campaign และ tracking foundation ของ CatBook ในช่วง development ก่อนต่อเครื่องมือจริง

## Product SEO Structure

ทุก product ที่ออกจาก `GET /api/v1/products` และ `GET /api/v1/products/:slug` จะมี metadata เพิ่มเติม:

```json
{
  "seo": {
    "title": "Product name | CatBook Shop",
    "description": "Category Brand description ราคา 000 บาท",
    "canonicalUrl": "http://127.0.0.1:5173/marketplace?product=product-slug"
  },
  "share": {
    "title": "Product name | CatBook Shop",
    "description": "Short share copy",
    "url": "http://127.0.0.1:5173/marketplace?product=product-slug",
    "image": "https://...",
    "type": "product"
  }
}
```

โครงนี้ใช้ต่อได้กับ Google Search, Facebook/LINE share preview, social campaign landing link และ remarketing event

## Sitemap And Robots

ไฟล์พื้นฐานอยู่ที่:

- `public/robots.txt`
- `public/sitemap.xml`

ก่อนขึ้น production ให้เปลี่ยน base URL จาก `http://127.0.0.1:5173` เป็น domain จริง เช่น `https://catbook.example.com`

Phase ถัดไปควรทำ dynamic sitemap ที่ดึง product active จาก database เพื่อให้สินค้าใหม่เข้าระบบ SEO โดยไม่ต้องแก้ XML เอง

## Tracking Placeholders

ตัวแปรใน `.env.example`:

```bash
VITE_GA_MEASUREMENT_ID=
VITE_META_PIXEL_ID=
VITE_TIKTOK_PIXEL_ID=
```

ตอนนี้ระบบยังไม่โหลด external pixel script จริง แต่มี placeholder ดังนี้:

- `window.dataLayer` สำหรับ Google Analytics / GTM
- `window.gtag` ถ้ามีการติดตั้ง GA script ในอนาคต
- `window.fbq` ถ้ามีการติดตั้ง Meta Pixel ในอนาคต
- `window.ttq.track` ถ้ามีการติดตั้ง TikTok Pixel ในอนาคต

ทุก event จะถูก push ผ่าน `trackMarketingEvent(eventName, payload)` และใน dev mode จะเห็น log `[marketing-placeholder]` ใน browser console

## UTM Capture

ระบบจับค่าเหล่านี้จาก URL แล้วเก็บใน `localStorage`:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `gclid`
- `fbclid`
- `ttclid`

ตัวอย่าง campaign URL:

```text
https://catbook.example.com/marketplace?utm_source=facebook&utm_medium=social&utm_campaign=kitten_starter_may&utm_content=carousel_01
```

เมื่อ user กด add to cart หรือดู marketplace event จะมี marketing context แนบไปด้วย เพื่อใช้ทำ attribution ภายหลัง

## Recommended Campaign Naming

ใช้รูปแบบ:

```text
utm_source=facebook|instagram|tiktok|line
utm_medium=social|paid_social|chat
utm_campaign=pet_segment_offer_month
utm_content=creative_format_variant
utm_term=audience_or_keyword
```

ตัวอย่าง:

```text
utm_source=tiktok
utm_medium=paid_social
utm_campaign=puppy_starter_may2026
utm_content=before_after_video_a
utm_term=dog_owner_new_customer
```

## Suggested Events

| Event | Trigger |
|---|---|
| `page_view` | เปิด app |
| `view_marketplace` | เปิดหรือเปลี่ยน category ใน marketplace |
| `view_product` | เปิด marketplace ด้วย `?product=slug` |
| `add_to_cart` | กดเพิ่มสินค้าลงตะกร้า |
| `begin_checkout` | Phase ถัดไป ควรยิงเมื่อเปิด checkout |
| `purchase` | Phase ถัดไป ควรยิงเมื่อ order สำเร็จ |

## Social Product Sharing

ใช้ `product.share.url` เป็น link สำหรับ Facebook, Instagram bio/link sticker, TikTok profile link, LINE OA broadcast หรือ LINE rich menu

ตัวอย่าง post copy:

```text
โปรลูกสุนัขเริ่มต้น 🐾
ดูชุด Starter Kit พร้อมของจำเป็นสำหรับน้องใหม่:
{product.share.url}?utm_source=facebook&utm_medium=social&utm_campaign=puppy_starter_may2026&utm_content=post_01
```

## Production Notes

- ต้องตั้ง `CATBOOK_PUBLIC_URL` เป็น domain จริง เพื่อให้ canonical/share URL ถูกต้อง
- ต้องเปลี่ยน `robots.txt` และ `sitemap.xml` เป็น production domain
- ต้องเพิ่ม consent/PDPA banner ก่อนเปิด pixel จริง
- ต้องตรวจว่า event purchase ไม่ส่งข้อมูลส่วนบุคคล เช่น เบอร์โทร/ที่อยู่
