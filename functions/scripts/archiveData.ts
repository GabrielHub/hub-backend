import admin from 'firebase-admin';

const YEAR_TO_ARCHIVE = 2023;

export const archiveData = async (): Promise<void> => {
  const db = admin.firestore();

  const playerRef = db.collection('players');
  const querySnapshot = await playerRef.get();

  const batch = db.batch();
  querySnapshot.docs.forEach((doc) => {
    const playerData = doc.data();
    if (playerData?.gp) {
      const playerRef = db.collection(`playersArchive-${YEAR_TO_ARCHIVE}`).doc(doc.id);
      batch.set(playerRef, playerData);
    }
  });

  await batch.commit().then((docRef) => {
    // console.log('Document written with ID: ', JSON.stringify(docRef));
  });
};

export default {};
