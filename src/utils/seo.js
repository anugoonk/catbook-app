const DEFAULT_META = {
  title: 'CatBook Shop | Pet social commerce',
  description: 'CatBook Shop รวมสินค้าและบริการสำหรับสัตว์เลี้ยง พร้อม marketplace, cart, checkout และ order tracking',
  image: '/favicon.svg',
  url: '/',
};

const upsertMeta = (selector, attrs) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attrs.identity).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  Object.entries(attrs.values).forEach(([key, value]) => element.setAttribute(key, value));
};

const upsertLink = (rel, href) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

export const setSeoMeta = (meta = {}) => {
  if (typeof document === 'undefined') return;

  const next = { ...DEFAULT_META, ...meta };
  const absoluteUrl = new URL(next.url, window.location.origin).toString();
  const absoluteImage = new URL(next.image || DEFAULT_META.image, window.location.origin).toString();

  document.title = next.title;
  upsertMeta('meta[name="description"]', { identity: { name: 'description' }, values: { content: next.description } });
  upsertMeta('meta[property="og:title"]', { identity: { property: 'og:title' }, values: { content: next.title } });
  upsertMeta('meta[property="og:description"]', { identity: { property: 'og:description' }, values: { content: next.description } });
  upsertMeta('meta[property="og:type"]', { identity: { property: 'og:type' }, values: { content: next.type || 'website' } });
  upsertMeta('meta[property="og:url"]', { identity: { property: 'og:url' }, values: { content: absoluteUrl } });
  upsertMeta('meta[property="og:image"]', { identity: { property: 'og:image' }, values: { content: absoluteImage } });
  upsertMeta('meta[name="twitter:card"]', { identity: { name: 'twitter:card' }, values: { content: 'summary_large_image' } });
  upsertMeta('meta[name="twitter:title"]', { identity: { name: 'twitter:title' }, values: { content: next.title } });
  upsertMeta('meta[name="twitter:description"]', { identity: { name: 'twitter:description' }, values: { content: next.description } });
  upsertMeta('meta[name="twitter:image"]', { identity: { name: 'twitter:image' }, values: { content: absoluteImage } });
  upsertLink('canonical', absoluteUrl);
};

export const productSeoMeta = (product) => ({
  title: product?.seo?.title || `${product?.title || 'Product'} | CatBook Shop`,
  description: product?.seo?.description || product?.desc || DEFAULT_META.description,
  image: product?.share?.image || product?.img || DEFAULT_META.image,
  url: product?.share?.url || `/marketplace?product=${encodeURIComponent(product?.slug || product?.id || '')}`,
  type: 'product',
});

export const defaultSeoMeta = DEFAULT_META;
