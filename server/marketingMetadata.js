const SITE_NAME = 'CatBook Shop';
const DEFAULT_ORIGIN = process.env.CATBOOK_PUBLIC_URL || 'http://127.0.0.1:5173';

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const truncate = (value, limit) => {
  const text = stripHtml(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}…`;
};

export const productShareUrl = (product, origin = DEFAULT_ORIGIN) => {
  const base = String(origin || DEFAULT_ORIGIN).replace(/\/$/, '');
  const slug = product.slug || product.id;
  return `${base}/marketplace?product=${encodeURIComponent(slug)}`;
};

export const buildProductMarketingMetadata = (product, origin = DEFAULT_ORIGIN) => {
  const title = truncate(`${product.title} | ${SITE_NAME}`, 60);
  const category = product.category ? `${product.category} ` : '';
  const brand = product.brand ? `${product.brand} ` : '';
  const description = truncate(`${category}${brand}${product.desc || product.title} ราคา ${Number(product.price || 0).toLocaleString('th-TH')} บาท`, 155);
  const url = productShareUrl(product, origin);

  return {
    seo: {
      title,
      description,
      canonicalUrl: url,
    },
    share: {
      title,
      description,
      url,
      image: product.img || '',
      type: 'product',
    },
  };
};

export const withProductMarketingMetadata = (product, origin = DEFAULT_ORIGIN) => ({
  ...product,
  ...buildProductMarketingMetadata(product, origin),
});
