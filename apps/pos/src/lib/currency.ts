const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (currencyCode: string) => {
  const cached = formatterCache.get(currencyCode);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  });
  formatterCache.set(currencyCode, formatter);
  return formatter;
};

export const formatMoney = (amount: number, currencyCode: string) =>
  getFormatter(currencyCode).format(amount);

export const formatMoneyCompact = (amount: number, currencyCode: string) =>
  getFormatter(currencyCode).format(amount).replace(/\.00$/, '');
