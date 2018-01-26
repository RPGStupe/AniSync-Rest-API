var db = require('../firebase');

function addScoreToDB(uid) {
    db.collection('users').doc(uid).get().then(doc => {
        const currentScore = doc.data().score;
        console.log("Current score of " + uid + ": " + currentScore);
        db.collection('users').doc(uid).update({
            score: currentScore + 1
        });
    }).then(() => {
        console.log("Score of " + uid + " updated");
    });
}

module.exports.addScoreToDB = function (uid) {
    addScoreToDB(uid);
};