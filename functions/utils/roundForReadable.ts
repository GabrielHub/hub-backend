export const roundForReadable = (value: number, precision = 1): number => {
  if (value === 0) {
    return 0;
  }
  const multiplier = 10 ** (precision || 0);
  return Math.round(value * multiplier) / multiplier;
};

export default {};
