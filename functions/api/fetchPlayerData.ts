import admin from "firebase-admin";
import { Response } from "express";

interface IPlayerData {
  [key: string]: any; // replace any with the actual type
}

// * For individual player pages
const fetchPlayerData = async (req: any, res: Response): Promise<void> => {
  const { playerID } = req.query;

  if (!playerID || typeof playerID !== "string") {
    throw new Error("Invalid parameter passed");
  }

  const db = admin.firestore();
  const playerData: IPlayerData | undefined = await db
    .collection("players")
    .doc(playerID)
    .get()
    .then((doc) => {
      // * undefined if player does not exist
      return doc.data();
    });

  res.send(playerData);
};

export default fetchPlayerData;
