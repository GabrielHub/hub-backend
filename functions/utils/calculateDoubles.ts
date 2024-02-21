type DoublesResult = {
  dd: number;
  td: number;
  qd: number;
};

const calculateDoubles = (
  points: number,
  rebounds: number,
  assists: number,
  steals: number,
  blocks: number,
): DoublesResult => {
  const stats = [points, rebounds, assists, steals, blocks];
  let count = 0;

  stats.forEach((stat) => {
    if (stat >= 10) {
      count++;
    }
  });

  return {
    dd: count === 2 ? 1 : 0,
    td: count === 3 ? 1 : 0,
    qd: count === 4 ? 1 : 0,
  };
};

export default calculateDoubles;
