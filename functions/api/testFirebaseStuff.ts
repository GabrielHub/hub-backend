import { Request, Response } from "express";

// * Just using this to test some stuff I don't want to set up the firestore emulator for
const testFirebaseStuff = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // await addNBAData();
  res.send("Stop using me");
};

export default testFirebaseStuff;
