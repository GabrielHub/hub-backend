export const calculateFreeThrowsMade = (points: number, twoPM: number, threePM: number): number => {
  const ftm = points - (twoPM * 2 + threePM * 3);
  return ftm;
};

export default {};
