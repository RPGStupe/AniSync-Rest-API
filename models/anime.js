var db = require('../firebase');
// Add anime
module.exports.addAnime = function (callback, data) {
    db.collection('anime').doc().set(data).then(callback);
};

// Get anime
module.exports.getAnime = function (callback, id) {
    if (id === undefined || id === "") {
        callback({});
    } else {
        var animeRef = db.collection('anime').doc(id);
        animeRef.get().then(function (doc) {
            if (!doc.exists) {
                callback({});
            } else {
                callback(doc.data())
            }
        });
    }
};

// Get animes
module.exports.getAllAnime = function (callback) {
    var animeRef = db.collection('anime');
    animeRef.get().then(function (querySnapshot) {
        var docs = querySnapshot.docs;
        var resultJson = {anime: {}};
        docs.forEach(function (doc, index, docs) {
            resultJson.anime[doc.id] = doc.data();
            if (index === docs.length - 1) {
                callback(resultJson);
            }
        })
    });
};