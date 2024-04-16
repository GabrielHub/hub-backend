export const roundForReadable = (value: number | undefined | null, precision = 1): number => {
  if (!value) {
    return 0;
  }
  const multiplier = 10 ** (precision || 0);
  return Math.round(value * multiplier) / multiplier;
};

export default {};
