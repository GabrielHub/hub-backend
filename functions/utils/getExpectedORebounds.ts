/** Guess the expected o rebounds using a normal distribution */
const getExpectedORebounds = (treb: number, expected: number): number => {
  const stdDev = treb / 6;
  const randomNumber = stdDev * (2 * Math.random() - 1);
  const finalNumber = Math.min(Math.max(randomNumber + expected, 0), treb);
  return Math.floor(finalNumber);
};

export default getExpectedORebounds;
