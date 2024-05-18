import admin from 'firebase-admin';

export const returnAuthToken = (req): string | null => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

const getAuthToken = (req, res, next) => {
  req.authToken = returnAuthToken(req);
  next();
};

export const checkIfAdmin = (req, res, next) => {
  getAuthToken(req, res, async () => {
    try {
      const { authToken } = req;
      const userInfo = await admin.auth().verifyIdToken(authToken);

      if (userInfo.admin === true) {
        req.authId = userInfo.uid;
        return next();
      }

      throw new Error('unauthorized');
    } catch (e) {
      return res.status(401).send({ error: 'You are not authorized to make this request' });
    }
  });
};

export const checkIfAuthenticated = async (req, res, next) => {
  getAuthToken(req, res, async () => {
    try {
      const { authToken } = req;
      const userInfo = await admin.auth().verifyIdToken(authToken);
      req.authId = userInfo.uid;

      return next();
    } catch (e) {
      return res.status(401).send({ error: 'You are not authorized to make this request' });
    }
  });
};
