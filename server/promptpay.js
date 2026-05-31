// EMVCo Merchant Presented QR — PromptPay standard (NITMX / Bank of Thailand)

const f = (tag, value) => `${tag}${String(value).length.toString().padStart(2, '0')}${value}`;

const crc16 = (str) => {
  let crc = 0xFFFF;
  for (const ch of str) {
    crc ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const toProxy = (phoneOrId) => {
  const digits = String(phoneOrId).replace(/\D/g, '');
  if (digits.length === 13) return digits; // National ID
  if (digits.startsWith('66')) return `00${digits}`;
  if (digits.startsWith('0')) return `0066${digits.slice(1)}`;
  return `0066${digits}`;
};

export const buildPromptPayPayload = (phoneOrId, amount) => {
  const proxy = toProxy(phoneOrId);
  const merchantAccount = f('00', 'A000000677010111') + f('01', proxy);

  const parts = [
    f('00', '01'),           // Payload Format Indicator
    f('01', '12'),           // Point of Initiation: dynamic (single use)
    f('29', merchantAccount), // Merchant Account Info (PromptPay)
    f('53', '764'),          // Currency: THB
    f('54', amount.toFixed(2)), // Transaction Amount
    f('58', 'TH'),           // Country Code
    f('59', 'CATBOOK SHOP'), // Merchant Name (max 25 chars, uppercase, ASCII)
    f('60', 'BANGKOK'),      // Merchant City
    '6304',                  // CRC placeholder (always last)
  ];

  const payload = parts.join('');
  return payload + crc16(payload);
};
