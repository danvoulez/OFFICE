
export const sanitizeInput = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[<>]/g, '').trim().slice(0, 10000);
};

export const validateHash = (hash: string): boolean => {
  return /^0X[0-9A-F]{32,}$/i.test(hash);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6
  }).format(value);
};
