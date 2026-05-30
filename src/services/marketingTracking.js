const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const STORAGE_KEY = 'catbook_utm_context';

const readStoredContext = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

export const captureUtmContext = () => {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const utm = UTM_KEYS.reduce((acc, key) => {
    const value = params.get(key);
    if (value) acc[key] = value;
    return acc;
  }, {});

  const clickIds = {
    gclid: params.get('gclid') || '',
    fbclid: params.get('fbclid') || '',
    ttclid: params.get('ttclid') || '',
  };

  const hasCampaignData = Object.keys(utm).length || Object.values(clickIds).some(Boolean);
  if (!hasCampaignData) return readStoredContext();

  const context = {
    ...utm,
    ...Object.fromEntries(Object.entries(clickIds).filter(([, value]) => value)),
    landing_path: window.location.pathname,
    captured_at: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  return context;
};

export const getMarketingContext = () => {
  if (typeof window === 'undefined') return {};
  return readStoredContext();
};

export const trackMarketingEvent = (eventName, payload = {}) => {
  if (typeof window === 'undefined') return;

  const event = {
    event: eventName,
    ...payload,
    marketing: getMarketingContext(),
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);

  if (typeof window.gtag === 'function') window.gtag('event', eventName, event);
  if (typeof window.fbq === 'function') window.fbq('trackCustom', eventName, event);
  if (window.ttq?.track) window.ttq.track(eventName, event);

  if (import.meta.env.DEV) {
    console.info('[marketing-placeholder]', eventName, {
      providers: {
        googleAnalytics: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
        metaPixel: import.meta.env.VITE_META_PIXEL_ID || '',
        tiktokPixel: import.meta.env.VITE_TIKTOK_PIXEL_ID || '',
      },
      event,
    });
  }
};
