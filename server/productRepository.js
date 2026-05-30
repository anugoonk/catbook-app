import { readDatabase } from './database.js';
import { filterProducts } from './productCatalog.js';
import { withProductMarketingMetadata } from './marketingMetadata.js';

export const listProducts = async (searchParams = new URLSearchParams(), { origin } = {}) => {
  const database = await readDatabase();
  return filterProducts(database.products, searchParams)
    .filter(product => (product.status || 'active') === 'active')
    .map(product => withProductMarketingMetadata(product, origin));
};

export const findProduct = async (productId) => {
  const database = await readDatabase();
  const product = database.products.find(item => item.id === productId) || null;
  return product ? withProductMarketingMetadata(product) : null;
};

export const findProductBySlug = async (slug, { origin } = {}) => {
  const database = await readDatabase();
  const product = database.products.find(item => item.slug === slug && (item.status || 'active') === 'active') || null;
  return product ? withProductMarketingMetadata(product, origin) : null;
};
