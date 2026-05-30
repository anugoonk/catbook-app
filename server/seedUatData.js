import { writeDatabase } from './database.js';
import { buildUatSeedDatabase } from './fixtures/uatSeedData.js';

const database = buildUatSeedDatabase();
await writeDatabase(database);

console.log(JSON.stringify({
  ok: true,
  message: 'UAT seed data has been written to the development database.',
  counts: {
    users: database.users.length,
    products: database.products.length,
    carts: Object.keys(database.carts).length,
    orders: Object.values(database.orders).flat().length,
    payments: database.payments.length,
    shipments: database.shipments.length,
  },
}, null, 2));
