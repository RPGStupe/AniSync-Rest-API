var request = require('request');
var htmlparser = require('htmlparser');
var db = require('../firebase');

function getRequest(url, callback) {
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(body);
        }
    });
};

function getAnimeSearchMasteranime(name, callback) {
    var url = 'https://www.masterani.me/api/anime/search?search=' + name + '&sb=true';
    getRequest(url, function (body) {
        var jsonResult = JSON.parse(body);
        callback(jsonResult);
    });
}

function getAnimeDetailMasteranime(name, callback) {
    getAnimeSearchMasteranime(name, function (jsonResult) {
        var urlAnimeInfo = 'https://www.masterani.me/api/anime/' + jsonResult[0].id + '/detailed';
        getRequest(urlAnimeInfo, function (body) {
            var jsonResult = JSON.parse(body);
            callback(jsonResult);
        });
    });
}

function newAnimeEntry(jsonResult) {
    var genres = {};

    jsonResult.genres.forEach(function (item) {
        genres[item.name] = true;
    });

    var data = {
        title: jsonResult.info.title,
        masteranime_id: jsonResult.info.id,
        masteranime_slug: jsonResult.info.slug,
        episode_count: jsonResult.info.episode_count,
        synopsis: jsonResult.info.synopsis,
        synonyms: jsonResult.synonyms,
        masteranime_genres: genres
    };
    return data;
}

function addAnimeToDatabase(name, callback) {
    getAnimeDetailMasteranime(name, function (jsonResult) {
        // Check if anime already exists
        var animeRef = db.collection('anime');
        var queryRef = animeRef.where('title', '==', jsonResult.info.title);
        var documentId;

        queryRef.get().then(function (snapshot) {
            if (snapshot.docs.length === 0) {
                db.collection('anime').add(newAnimeEntry(jsonResult)).then(function (ref) {
                    documentId = ref.id;
                    console.log('Added document with ID: ', ref.id);
                    callback({status: 'Added database entry'});
                });
            } else {
                var doc = snapshot.docs[0];
                var data = newAnimeEntry(jsonResult);
                doc.ref.set(data).then(function () {
                    documentId = doc.ref.id;
                    callback({status: 'Updated database entry'});
                });
            }
        }).catch(function (err) {
            console.log('Error getting documents', err);
            callback({status: "Error getting database entry"});
        });
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

function getAnimeLinksEmbedded(name, episode, callback) {
    getAnimeSearchMasteranime(name, function (jsonResult) {
        var slug = jsonResult[0].slug;
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
    })
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

function getAnimeLinksDirect(name, episode, callback) {
    getAnimeLinksEmbedded(name, episode, function (embedded) {
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

module.exports.getAnimeLinksEmbedded = function (callback, name, episode) {
    getAnimeLinksEmbedded(name, episode, callback);
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