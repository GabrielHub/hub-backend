import admin from "firebase-admin";
import { Request, Response } from "express";

interface IRequestBody {
  playerID: string;
  ftPerc: string;
  alias: string[];
  aliasesToAdd?: string[];
}

type IRequest = Request & {
  body: IRequestBody;
};

// TODO This is updated on the honor system... there must be some way to authenticate without logging in?
// * For individual player pages (FT% and alias only)
const updatePlayerDetails = async (
  req: IRequest,
  res: Response,
): Promise<void> => {
  // * aliasesToAdd only contains the new aliases to check against the database
  // * alias is the existing alias array
  const { playerID, ftPerc, alias, aliasesToAdd = [] } = req.body;

  // * Sanitize FT format
  const formattedFT = parseInt(ftPerc, 10);

  if (!playerID || typeof playerID !== "string") {
    throw new Error("Invalid player passed");
  }

  if (!ftPerc || Number.isNaN(formattedFT)) {
    throw new Error("Invalid ftPerc");
  }

  const db = admin.firestore();

  if (aliasesToAdd.length) {
    // * Trim inputs for whitespace and validate types
    const formattedAlias = aliasesToAdd.map((name) => {
      if (typeof name !== "string") {
        throw new Error("Invalid aliases");
      }
      return name.trim();
    });

    // * Make sure alias is unique
    const querySnapshot = await db
      .collection("players")
      .where("alias", "array-contains-any", formattedAlias)
      .get();
    if (querySnapshot.size) {
      throw new Error("Aliases already exist");
    }
  }

  const aliasesToUpdate = [...alias, ...aliasesToAdd];
  await db.collection("players").doc(playerID).update({
    alias: aliasesToUpdate,
    ftPerc: formattedFT,
  });

  res.send(aliasesToUpdate);
};

export default updatePlayerDetails;
