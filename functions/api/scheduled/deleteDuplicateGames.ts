import admin from 'firebase-admin';
import { log, error } from 'firebase-functions/logger';
import { GameData } from '../../types';

// * Fields to use in comparisons (checking if a game is a duplicate)
const similarityFieldsToCheck = [
  'name',
  'pos',
  'pts',
  'treb',
  'ast',
  'stl',
  'blk',
  'pf',
  'tov',
  'fgm',
  'fga',
  'threepm',
  'threepa',
  'o3PA',
  'o3PM',
  'oFGA',
  'oFGM',
  'plusMinus',
  'oppPos'
];

const findDuplicateGames = (games: GameData[]): string[] => {
  // Create an object to store unique combinations of property values
  const uniqueCombinations = {};

  // Iterate through each object in the input array
  games.forEach((game) => {
    // Generate a unique key based on the values of the specified properties
    const key = similarityFieldsToCheck.map((stat) => game[stat]).join(',');

    // If the key doesn't exist in uniqueCombinations, create an array for it
    if (!uniqueCombinations[key]) {
      uniqueCombinations[key] = [];
    }

    // Push the game's id into the array associated with the key
    uniqueCombinations[key].push(game.id);
  });

  // Filter out keys that have only one object (i.e., not duplicates)
  const duplicateKeys = Object.keys(uniqueCombinations).filter(
    (key) => uniqueCombinations[key].length > 1
  );

  // Flatten the arrays of ids for duplicate keys into a single array
  const duplicateIds = [].concat(...duplicateKeys.map((key) => uniqueCombinations[key]));

  // log the duplicate ids and the stats that were used to determine the duplicates
  log('duplicateIds', duplicateIds);
  log('duplicateKeys', duplicateKeys);

  // Return the array of duplicate ids
  return duplicateIds;
};

/**
 * @description Deletes duplicate games from the database, used to be scheduled but now is done from dashboard
 * @return {Promise<null>}
 */
const deleteDuplicateGames = async (): Promise<null> => {
  const db = admin.firestore();
  log('running deleteDuplicateGames');
  try {
    const querySnapshot = await db.collection('games').get();

    const gameList: GameData[] = [];
    querySnapshot.docs.forEach((doc) => {
      gameList.push({ ...(doc.data() as GameData), id: doc.id });
    });

    const gamesToDelete = findDuplicateGames(gameList);

    log('deleting', gamesToDelete.length, 'duplicate games');

    const promises = gamesToDelete.map((id) => db.collection('games').doc(id).delete());

    await Promise.all(promises);

    return null;
  } catch (err) {
    error('Error running deleteDuplicateGames', err);
    return null;
  }
};

export default deleteDuplicateGames;
