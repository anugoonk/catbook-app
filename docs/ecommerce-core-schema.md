# CatBook E-commerce Core Schema

Phase 1 uses a local JSON persistence adapter at `server/data/catbook-db.json`.
The table shape below is the target contract for moving to PostgreSQL or SQLite later.

## Core tables

### users
- `id` string primary key
- `email` string unique
- `ownerName` string
- `isAdmin` boolean
- `activeCat` json
- `createdAt` datetime
- `updatedAt` datetime

### products
- `id` string primary key
- `sku` string unique
- `slug` string unique
- `title` string
- `description` text
- `category` string
- `brand` string
- `species` string
- `lifeStage` string
- `price` number
- `stock` number
- `imageUrl` string
- `seller` json
- `status` enum: `active`, `draft`, `archived`
- `createdAt` datetime
- `updatedAt` datetime

### carts
- `id` string primary key
- `userId` string foreign key to `users.id`
- `status` enum: `active`, `checked_out`, `abandoned`
- `createdAt` datetime
- `updatedAt` datetime

### cart_items
- `id` string primary key
- `cartId` string foreign key to `carts.id`
- `productId` string foreign key to `products.id`
- `quantity` number
- `unitPrice` number snapshot
- `createdAt` datetime
- `updatedAt` datetime

### orders
- `id` string primary key
- `userId` string foreign key to `users.id`
- `orderNo` string unique
- `status` enum: `pending`, `paid`, `packed`, `shipping`, `delivered`, `cancelled`
- `paymentStatus` enum: `pending`, `paid`, `failed`, `refunded`, `pending_cod`
- `subtotal` number
- `shippingFee` number
- `discount` number
- `total` number
- `shippingAddress` json
- `createdAt` datetime
- `updatedAt` datetime

### order_items
- `id` string primary key
- `orderId` string foreign key to `orders.id`
- `productId` string foreign key to `products.id`
- `sku` string snapshot
- `title` string snapshot
- `quantity` number
- `unitPrice` number
- `lineTotal` number

### payments
- `id` string primary key
- `orderId` string foreign key to `orders.id`
- `method` enum: `promptpay`, `card`, `bank_transfer`, `cod`
- `status` enum: `pending`, `paid`, `failed`, `refunded`
- `amount` number
- `gatewayRef` string nullable
- `paidAt` datetime nullable
- `createdAt` datetime

### shipments
- `id` string primary key
- `orderId` string foreign key to `orders.id`
- `carrier` string
- `trackingNo` string
- `status` enum: `pending`, `packed`, `shipped`, `delivered`, `returned`
- `shippedAt` datetime nullable
- `deliveredAt` datetime nullable
- `createdAt` datetime

### stock_movements
- `id` string primary key
- `productId` string foreign key to `products.id`
- `type` enum: `in`, `reserve`, `release`, `sale`, `adjustment`, `return`
- `quantity` number
- `refType` string nullable
- `refId` string nullable
- `note` string nullable
- `createdAt` datetime

### audit_logs
- `id` string primary key
- `actorUserId` string nullable
- `action` string
- `entityType` string
- `entityId` string
- `metadata` json
- `createdAt` datetime

## Phase 1 migration order

1. Products: read catalog from database layer.
2. Cart: persist cart and cart items by user.
3. Orders: persist order header, order items, payment, shipment.
4. Stock: replace runtime sold count with stock movements.
5. Admin: use API-only mutation with audit logs.
