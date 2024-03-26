import admin from 'firebase-admin';

const getAuthToken = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    req.authToken = req.headers.authorization.split(' ')[1];
  } else {
    req.authToken = null;
  }
  next();
};

export const checkIfAuthenticated = async (req, res, next) => {
  getAuthToken(req, res, async () => {
    try {
      const { authToken } = req;
      const userInfo = await admin.auth().verifyIdToken(authToken);
      req.authId = userInfo.uid;

      // * Also check their custom claims for the admin flag
      const user = await admin.auth().getUser(userInfo.uid);
      const customClaims = user.customClaims;
      if (!customClaims?.admin) {
        return res
          .status(401)
          .send({ error: 'You do not have the correct permissions to make this request' });
      }

      return next();
    } catch (e) {
      return res.status(401).send({ error: 'You are not authorized to make this request' });
    }
  });
};
