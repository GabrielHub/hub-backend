import admin from "firebase-admin";
import { Request, Response } from "express";

interface IQueryParams {
  playerID: string;
}

type IRequest = Request & {
  query: IQueryParams;
};

interface IPlayerData {
  offensiveRanking: number;
  defensiveRanking: number;
  [key: string]: any; // replace any with the actual type
}

interface IRanking {
  offense: number;
  defense: number;
}

// * Fetches individual defensive and offensive ranking for one player (for the player page)
const fetchIndividualRanking = async (
  req: IRequest,
  res: Response,
): Promise<void> => {
  const { playerID } = req.query;

  if (!playerID || typeof playerID !== "string") {
    throw new Error("Invalid query parameters");
  }

  const ranking: IRanking = {
    offense: 0,
    defense: 0,
  };

  const db = admin.firestore();
  const playerData: IPlayerData | undefined = await db
    .collection("players")
    .doc(playerID)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return doc.data() as IPlayerData;
      }
      throw new Error("Player does not exist");
    });

  const queryORTG = db
    .collection("players")
    .where("offensiveRanking", ">", playerData?.offensiveRanking)
    .orderBy("offensiveRanking", "desc");

  const offensiveRanking = await queryORTG.get();

  const queryDRTG = db
    .collection("players")
    .where("defensiveRanking", "<", playerData?.defensiveRanking)
    .orderBy("defensiveRanking", "asc");

  const defensiveRanking = await queryDRTG.get();

  ranking.offense = offensiveRanking.size + 1;
  ranking.defense = defensiveRanking.size + 1;

  res.send(ranking);
};

export default fetchIndividualRanking;
