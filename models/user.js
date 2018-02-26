const db = require('../firebase');

const addScoreToDB = async function (uid) {
    const doc = await db.collection('users').doc(uid).get();
    const currentScore = doc.data().score;
    await db.collection('users').doc(uid).update({
        score: currentScore + 1
    });
    console.log("Score of " + uid + " updated");
};

module.exports = {
    addScoreToDB
};