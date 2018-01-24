var request = require('request');
var Anime = require('./anime');
var htmlparser = require('htmlparser');
var db = require('../firebase');

function getRequest(url, callback) {
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(body);
        }
    });
}

function getAnimeSearchMasteranime(name, callback) {
    if (name.length > 30) {
        name = name.substr(0, 30);
    }
    var url = 'https://www.masterani.me/api/anime/search?search=' + name + '&sb=true';
    getRequest(url, function (body) {
        var jsonResult = JSON.parse(body);
        callback(jsonResult);
    });
}

function getAnimeDetailMasteranime(id, callback) {
    var urlAnimeInfo = 'https://www.masterani.me/api/anime/' + id + '/detailed';
    getRequest(urlAnimeInfo, function (body) {
        var jsonResult = JSON.parse(body);
        callback(jsonResult);
    });
}

function createAnimeEntryDatabase(masteranimeDetailJson) {
    var genres = {};

    masteranimeDetailJson.genres.forEach(function (item) {
        genres[item.name] = true;
    });

    var data = {
        title: masteranimeDetailJson.info.title,
        masteranime_id: masteranimeDetailJson.info.id,
        masteranime_slug: masteranimeDetailJson.info.slug,
        episode_count: masteranimeDetailJson.info.episode_count,
        synopsis: masteranimeDetailJson.info.synopsis,
        synonyms: masteranimeDetailJson.synonyms,
        masteranime_genres: genres
    };
    return data;
}

function createAnimeEntryJson(masteranimeDetailJson) {
    var genres = {};

    masteranimeDetailJson.genres.forEach(function (item) {
        genres[item.name] = true;
    });

    var data = {
        title: masteranimeDetailJson.info.title,
        masteranime_id: masteranimeDetailJson.info.id,
        masteranime_slug: masteranimeDetailJson.info.slug,
        episode_count: masteranimeDetailJson.info.episode_count,
        synopsis: masteranimeDetailJson.info.synopsis,
        synonyms: masteranimeDetailJson.synonyms,
        masteranime_genres: genres
    };

    data.episodes = [];

    for (var i = 0; i < masteranimeDetailJson.episodes.length; i++) {
        dataEp = {
            masteranime_id: episode.info.id,
            masteranime_anime_id: episode.info.anime_id,
            episode: episode.info.episode,
            episode_title: episode.info.title,
            aired: episode.info.aired,
            description: episode.info.description,
            masteranime_thumbnail: episode.thumbnail
        };
        data.episodes[i] = dataEp;
    }
    return data;
}

function updateEpisodes(masteranimeDetailJson, animeDocRef, callback) {
    var counter = 0;
    masteranimeDetailJson.episodes.forEach(function (episode, index, episodes) {
        jsonEp = {
            masteranime_id: episode.info.id,
            masteranime_anime_id: episode.info.anime_id,
            episode: episode.info.episode,
            episode_title: episode.info.title,
            aired: episode.info.aired,
            description: episode.info.description,
            masteranime_thumbnail: episode.thumbnail
        };
        animeDocRef.doc(episode.info.episode).set(jsonEp).then(function () {
            counter++;
            if (counter === episodes.length) {
                callback();
            }
        });
    })
}

function addAnimeEntryToDatabase(masteranimeDetailed, callback) {
    var animeEntry = createAnimeEntryDatabase(masteranimeDetailed);
    var animeRef = db.collection('anime');
    animeRef.add(animeEntry).then(function (ref) {
        var documentId = ref.id;
        console.log('Added document with ID: ', ref.id);
        updateEpisodes(masteranimeDetailed, animeRef.doc(documentId).collection("episodes"), function () {
            Anime.getAnimeFromDocumentId(documentId, function (result) {
                callback(result);
            });
        });
    });
}

function getAnimeId(name, callback) {
    getAnimeSearchMasteranime(name, function (searchResult) {
        callback(searchResult.info.id);
    });
}

function addAnimeToDatabase(name, callback) {
    getAnimeId(name, function (id) {
        getAnimeDetailMasteranime(id, function (jsonResult) {
            // Check if anime already exists
            var animeRef = db.collection('anime');
            var queryRef = animeRef.where('title', '==', jsonResult.info.title);
            var documentId;

            queryRef.get().then(function (snapshot) {
                if (snapshot.docs.length === 0) {
                    db.collection('anime').add(createAnimeEntryDatabase(jsonResult)).then(function (ref) {
                        documentId = ref.id;
                        console.log('Added document with ID: ', ref.id);
                        updateEpisodes(jsonResult, animeRef.doc(documentId).collection("episodes"));
                        callback({status: 'Added database entry'});
                    });
                } else {
                    var doc = snapshot.docs[0];
                    var data = createAnimeEntryDatabase(jsonResult);
                    doc.ref.set(data).then(function () {
                        documentId = doc.ref.id;
                        updateEpisodes(jsonResult, animeRef.doc(documentId).collection("episodes"));
                        callback({status: 'Updated database entry'});
                    });
                }
            }).catch(function (err) {
                console.log('Error getting documents', err);
                callback({status: "Error getting database entry"});
            });
        })
    })
}

function newWatchlistEntry(json, episode) {

    var data = {
        title: json.title,
        episode: episode
    };
    return data;
}

function addAnimeToWatchlist(user, name, episode, callback) {
    getAnimeSearchMasteranime(name, function (jsonResult) {
        var documentId;
        var animeRef = db.collection('anime');
        if (jsonResult.length === 0) {
            callback({status: "Anime not found"});
        } else {
            addAnimeToDatabase(name, function (docId) {
                animeRef.doc(docId).get().then(function (doc) {
                    if (!doc.exists) {
                        console.log('No such document!');
                    } else {
                        var data = doc.data();
                        var watchlistRef = db.collection('users').doc(user).collection('watchlist');
                        var queryRef = watchlistRef.where('title', '==', data.title);


                        queryRef.get().then(function (snapshot) {
                            if (snapshot.docs.length === 0) {
                                watchlistRef.add(newWatchlistEntry(data, episode)).then(function (ref) {
                                    documentId = ref.id;
                                    callback({status: 'added to watchlist'});
                                });
                            } else {
                                snapshot.docs.forEach(function (doc) {
                                    doc.ref.set(newWatchlistEntry(data, episode)).then(function () {
                                        documentId = doc.ref.id;
                                        callback({status: 'added to watchlist'});
                                    });
                                })
                            }
                        }).catch(function (err) {
                            callback({status: "Error getting database entry"});
                        });

                    }
                }).catch(function (err) {
                    callback({status: "Error getting document entry"});
                });
            });
        }
    });
}

function getAnimeLinksEmbedded(slug, episode, callback) {
        var url = 'https://www.masterani.me/anime/watch/' + slug + '/' + episode;
        getRequest(url, function (body) {
            var handler = new htmlparser.DefaultHandler(function (error, dom) {
                if (error) {

                }
                else {
                    dom[2].children[3].children.forEach(function (item) {
                        if (item.type === "script") {
                            if (item.children !== undefined) {
                                item.children.forEach(function (item) {
                                    if (item.raw.indexOf("var args") !== -1) {
                                        var args = item.raw.replace("var args = ", "");
                                        args = args.substring(args.indexOf("mirrors:") + "mirrors:".length, args.indexOf("auto_update:")).trim();
                                        var argsJson = JSON.parse(args.substr(0, args.length - 1));
                                        var resultJson = [];
                                        argsJson.forEach(function (item, index, array) {
                                            var type;
                                            if (item.type === 1) {
                                                type = "sub";
                                            } else if (item.type === 2) {
                                                type = "dub";
                                            }
                                            resultJson[index] = {
                                                type: type,
                                                host_id: item.host_id,
                                                host_name: item.host.name,
                                                quality: item.quality,
                                                url_embedded: item.host.embed_prefix + item.embed_id + (item.host.embed_suffix === null ? "" : item.host.embed_suffix)
                                            };
                                            if (index === array.length - 1) {
                                                callback(resultJson);
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    });
                }
            });
            var parser = new htmlparser.Parser(handler);
            parser.parseComplete(body);
        });
}

function decodeMp4UploadLink(raw) {
    var information = raw.substring(raw.indexOf('|'), raw.lastIndexOf('|'));
    var splitInfo = information.split("|");
    var prefix;
    var id;
    var port;
    splitInfo.forEach(function (item, index) {
        if (item.match("www[\\d]")) {
            prefix = item;
        } else if (item.match("[a-zA-z0-9]{30,}")) {
            id = item;
            port = splitInfo[index + 1];
        }
    });
    var link = 'https://' + prefix + '.mp4upload.com:' + port + '/d/' + id + '/video.mp4';
    return link;
}

function getAnimeLinksDirect(slug, episode, callback) {
    getAnimeLinksEmbedded(slug, episode, function (embedded) {
        var resultJson = [];
        var counter = 0;
        var indexJson = 0;
        embedded.forEach(function (itemJson, index, data) {
            var url = itemJson.url_embedded;
            if (itemJson.host_id === 1 || itemJson.host_id === 14) {
                getRequest(url, function (body) {
                    var handler = new htmlparser.DefaultHandler(function (error, dom) {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            if (itemJson.host_id === 1) {
                                if (dom[0].raw.indexOf('File was deleted') === -1) {
                                    dom[0].children[3].children.forEach(function (item) {
                                        if (item.name === 'script' && item.children !== undefined) {
                                            item.children.forEach(function (item) {
                                                if (item.raw.indexOf('eval(') !== -1) {
                                                    var linkDirect = decodeMp4UploadLink(item.raw);
                                                    resultJson[indexJson] = itemJson;
                                                    resultJson[indexJson].url_direct = linkDirect;
                                                    indexJson++;
                                                }
                                            })
                                        }
                                    })
                                }
                            } else if (itemJson.host_id === 14) {
                                var linkDirect = dom[2].children[3].children[7].children[1].children[3].children[0].raw.match('https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)')[0];
                                resultJson[indexJson] = itemJson;
                                resultJson[indexJson].url_direct = linkDirect;
                                indexJson++;
                            }
                        }
                        counter++;
                        if (counter === data.length) {
                            callback(resultJson);
                        }
                    });
                    var parser = new htmlparser.Parser(handler);
                    parser.parseComplete(body);
                });
            } else {
                counter++;
                if (counter === data.length) {
                    console.log("finished all");
                    callback(resultJson);
                }
            }
        });
    });
}

function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms)
    });
}

function newWatchlistEntryImportWatchlist(dataDB, dataSearch) {
    var data = {
        title: dataSearch.title,
        episode: dataDB.episode,
        status: dataDB.status,
        rating: dataDB.rating,
        poster: dataDB.poster,
        episodeCount: dataDB.episodeCount,
        masteranime_id: dataSearch.id,
        masteranime_slug: dataSearch.slug
    };
    return data;
}

async function watchlistImport(old_uid, new_uid, callback) {
    var json = require('../proxsync-db.json');
    var watchlistJsonOld = json.users[old_uid].watchlist;
    var keys = Object.keys(watchlistJsonOld);
    var jsonResult = {successful: [], failed: []};
    var indexSuccessful = 0;
    var indexFailed = 0;
    callback({status: "started"});
    for (var i = 0, len = keys.length; i < len; i++) {
        var realTitle = watchlistJsonOld[keys[i]].title;
        var title = watchlistJsonOld[keys[i]].title;
        var titleSearch = title;
        if (title.length > 30) {
            titleSearch = titleSearch.substr(0, 30);
        }
        var result = await getAnimeSearchMasteranimeWatchlistImport(titleSearch);
        if (result.length !== 0) {
            title = title.replace(/[^\x00-\x7F]/g, "?");
            title = title.replace(/\(tv\)/ig, "").trim().toLowerCase();
            for (var x = 0; x < result.length; x++) {
                var title2 = result[x].title;
                title2 = title2.replace(/[^\x00-\x7F]/g, "?");
                title2 = title2.replace(/\(tv\)/ig, "").trim().toLowerCase();
                if (title === title2) {
                    console.log("Successful: " + realTitle);
                    jsonResult.successful[indexSuccessful] = realTitle;
                    indexSuccessful++;
                    var watchlistRef = db.collection('users').doc(new_uid).collection('watchlist');
                    watchlistRef.add(newWatchlistEntryImportWatchlist(watchlistJsonOld[keys[i]], result[x])).then(function (ref) {
                        var documentId = ref.id;
                        console.log("added entry to watchlist; id: " + documentId);
                    });
                    break;
                } else {
                    if (x === result.length - 1) {
                        console.log("Failed: " + realTitle);
                        jsonResult.failed[indexFailed] = realTitle;
                        indexFailed++;
                    }
                }
            }
        } else {
            console.log("Failed: " + realTitle);
            jsonResult.failed[indexFailed] = realTitle;
            indexFailed++;
        }
        await sleep(1000);
    }
}


function getAnimeDetailMasteranimeFromId(id, callback) {
    var urlAnimeInfo = 'https://www.masterani.me/api/anime/' + id + '/detailed';
    getRequest(urlAnimeInfo, function (body) {
        var jsonResult = JSON.parse(body);
        callback(jsonResult);
    });
}

function addAnimeToDatabaseFromId(id, callback) {
    console.log("Adding to Database");
    getAnimeDetailMasteranimeFromId(id, function (result) {
        addAnimeEntryToDatabase(result, function (animeEntry) {
            callback(animeEntry);
        })
    })
}

function search(name, callback) {
    if (name.length > 30) {
        name = name.substr(0, 30);
    }

    getAnimeSearchMasteranime(name, function (data) {
        callback(data);
    })
}

function loadAnime(slug, episode, callback) {
    getAnimeLinksDirect(slug, episode, function (data) {
        callback(data);
    });
}

module.exports.search = function (callback, name) {
    search(name, callback);
}

module.exports.getAnimeLinksEmbedded = function (callback, slug, episode) {
    getAnimeLinksEmbedded(slug, episode, callback);
};

module.exports.getAnimeLinksDirect = function (callback, name, episode) {
    getAnimeLinksDirect(name, episode, callback);
};

module.exports.addAnimeToDatabase = function (callback, name) {
    addAnimeToDatabase(name, callback);
};

module.exports.addAnimeToWatchlist = function (callback, user, name, episode) {
    addAnimeToWatchlist(user, name, episode, callback);
};

module.exports.watchlistImport = function (callback, old_uid, new_uid) {
    watchlistImport(old_uid, new_uid, callback);
};

module.exports.addAnimeToDatabaseFromId = function (id, callback) {
    addAnimeToDatabaseFromId(id, callback);
};

module.exports.loadAnime = function (callback, slug, episode) {
    loadAnime(slug, episode, callback);
};

module.exports.getAnimeDetailMasterAnimeFromId = function (callback, id) {
    getAnimeDetailMasteranime(id, callback);
};