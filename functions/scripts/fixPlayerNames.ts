import admin from 'firebase-admin';
import { log } from 'firebase-functions/logger';

// * Fix player names by always making them lowercase and removing duplicates

export const fixPlayerNames = async () => {
  const db = admin.firestore();
  const games = await db.collection('games').get();

  for (const game of games.docs) {
    // * Make name field of game lowercase and update
    const gameData = game.data();
    const name = gameData.name;
    const lowerName = name.toLowerCase();
    if (name !== lowerName) {
      log(`Updating game ${game.id} name from ${name} to ${lowerName}`);
      await game.ref.update({ name: lowerName });
    }
  }
};

export default {};
