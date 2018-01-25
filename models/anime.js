var db = require('../firebase');
var Scraper = require('./scraper');

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

// Get anime
module.exports.getAnimeFromId = function (callback, id) {
    if (id === undefined || id === "") {
        callback({status: "No id provided"});
    } else {
        console.log("Getting " + id + " from database");
        var animeRef = db.collection('anime');
        animeRef.where('masteranime_id', '==', parseInt(id)).get().then(function (snapshot) {
            if (snapshot.docs.length > 1) {
                callback({status: "Multiple anime found where only one should be. Probably a database error."})
            } else if (snapshot.docs.length === 0) {
                console.log("Anime not in database. Adding entry and returning result...");
                Scraper.addAnimeToDatabaseFromId(id, function (result) {
                    callback(result);
                })
            }
            snapshot.docs.forEach(function (doc) {
                console.log("Anime found. Still adding to db cause of episode reasons");
                Scraper.getAnimeDetailMasterAnimeFromId(function (data) {
                    const entry = Scraper.createAnimeEntryDatabase(data);
                    var animeRef = db.collection('anime');
                    console.log("Getting anime details from masterani.me");
                    animeRef.doc(doc.ref.id).set(entry).then(function () {
                        console.log("Setting db entry...");
                        Scraper.updateEpisodes(data, animeRef.doc(doc.ref.id).collection("episodes"), function () {
                            console.log("Updating episodes");
                            getAnimeFromDocumentId(doc.ref.id, function (result) {
                                console.log("Getting document");
                                callback(result);
                            });
                        });
                    });
                }, id);
            });
        }).catch(err => {
            console.log('Error getting documents', err);
        });
    }
};

function getAnimeFromDocumentId(documentId, callback) {
    var animeRef = db.collection('anime');
    var animeJson;
    animeRef.doc(documentId).get()
        .then(doc => {
            if (!doc.exists) {
                callback({status: "Anime not found in database"})
            } else {
                animeJson = doc.data();
                var counter = 0;
                animeRef.doc(documentId).collection("episodes").get().then(snapshot => {
                    animeJson.episodes = [];
                    snapshot.docs.forEach(function (doc, index, docs) {
                        animeJson.episodes[parseInt(doc.data().episode) - 1] = doc.data();
                        counter++;
                        if (counter === docs.length) {
                            callback(animeJson);
                        }
                    })
                })
            }
        })
        .catch(err => {
            console.log('Error getting document', err);
            callback({status: 'Error getting document ' + err})
        });
}

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

module.exports.getAnimeFromDocumentId = function (documentId, callback) {
    getAnimeFromDocumentId(documentId, callback);
};