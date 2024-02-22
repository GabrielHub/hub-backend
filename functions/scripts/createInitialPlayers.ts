import admin from 'firebase-admin';

const PLAYERS = [
  {
    name: 'WetBread',
    alias: ['WetBread', 'wetbread', 'WashedBread'],
    ftPerc: 55.6
  },
  {
    name: 'Bam',
    alias: ['Bam', 'BamBamKam31', 'VUBHI 24'],
    ftPerc: 85.8
  },
  {
    name: 'Rob',
    alias: ['Rob', 'Robbed you again', 'RobTheBuilder'],
    ftPerc: 75.7
  },
  {
    name: 'Maestro',
    alias: ['Maestro', 'Maestromagic'],
    ftPerc: 78.5
  },
  {
    name: 'Kikkiaro',
    alias: ['Kikkiaro'],
    ftPerc: 82.5
  },
  {
    name: 'Edu',
    alias: ['Edu', 'Eduard', 'Edu@RD'],
    ftPerc: 69.5
  },
  {
    name: 'Toz',
    alias: ['Toz'],
    ftPerc: 92.9
  },
  {
    name: 'Chiacma',
    alias: ['Chiacma'],
    ftPerc: 83.8
  },
  {
    name: 'iJvy',
    alias: ['iJvy'],
    ftPerc: 71
  },
  {
    name: 'Havoc',
    alias: ['Havoc'],
    ftPerc: 72.8
  },
  {
    name: 'DPhenomenal',
    alias: ['DPhenomenal', 'DPhenomenal1'],
    ftPerc: 84.4
  },
  {
    name: 'The Truth',
    alias: ['The Truth'],
    ftPerc: 99
  },
  {
    name: 'Crush',
    alias: ['Crush'],
    ftPerc: 57.1
  },
  {
    name: 'Guilty',
    alias: ['Guilty', 'GLXTY', 'GLXTY-24'],
    ftPerc: 12.5
  },
  {
    name: 'Sky',
    alias: ['Sky'],
    ftPerc: 67.6
  },
  {
    name: 'GoogleMe',
    alias: ['GoogleMe', 'CoogleMe', 'it be like that sometimes'],
    ftPerc: 85.7
  },
  {
    name: 'young hampton',
    alias: ['young hampton', 'mr. shoot or get shot'],
    ftPerc: 75
  }
];

export const createInitialPlayers = async () => {
  const db = admin.firestore();
  const batch = db.batch();

  PLAYERS.forEach((player) => {
    const playerRef = db.collection('players').doc();
    batch.set(playerRef, {
      ...player,
      _createdAt: admin.firestore.Timestamp.now(),
      _updatedAt: admin.firestore.Timestamp.now()
    });
  });

  await batch.commit();
};

export default {};
