const roundUpTo = (amount: number, step: number) => Math.ceil(amount / step) * step;

export const suggestTenderAmounts = (totalAmount: number): number[] => {
  const suggestions = new Set<number>([
    totalAmount,
    roundUpTo(totalAmount, 50),
    roundUpTo(totalAmount, 100),
    roundUpTo(totalAmount, 500)
  ]);

  return [...suggestions].sort((left, right) => left - right).slice(0, 4);
};
