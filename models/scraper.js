const request = require('request');
const htmlparser = require('htmlparser');
const db = require('../firebase');

const getRequest = function (url) {
    return new Promise(function (resolve) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                resolve(body);
            }
        });
    });
};

const getAnimeSearchMasteranime = function (name) {
    return new Promise(async function (resolve) {
        if (name.length > 30) {
            name = name.substr(0, 30);
        }
        const url = 'https://www.masterani.me/api/anime/search?search=' + name + '&sb=true';
        const body = await getRequest(url);
        const jsonResult = JSON.parse(body);
        resolve(jsonResult);
    });
};


const getAnimeById = function (id) {
    return new Promise(async resolve => {
        if (id === undefined || id === "") {
            resolve({status: "No id provided"});
        } else {
            const data = await getAnimeDetailMasterAnimeFromId(id);
            const entry = createAnimeEntryDatabase(data);
            updateEpisodes(data, entry);
            resolve(entry);
        }
    });
};


const createAnimeEntryDatabase = function (masteranimeDetailJson) {
    const genres = {};

    masteranimeDetailJson.genres.forEach(function (item) {
        genres[item.name] = true;
    });

    return {
        title: masteranimeDetailJson.info.title,
        masteranime_id: masteranimeDetailJson.info.id,
        masteranime_slug: masteranimeDetailJson.info.slug,
        episode_count: masteranimeDetailJson.info.episode_count,
        synopsis: masteranimeDetailJson.info.synopsis,
        synonyms: masteranimeDetailJson.synonyms,
        masteranime_genres: genres,
        episodes: []
    };
};

const updateEpisodes = function (masteranimeDetailJson, entry) {
    return new Promise(function (resolve) {
        let counter = 0;
        masteranimeDetailJson.episodes.forEach(async function (episode, index, episodes) {
            const jsonEp = {
                masteranime_id: episode.info.id,
                masteranime_anime_id: episode.info.anime_id,
                episode: episode.info.episode,
                episode_title: episode.info.title,
                aired: episode.info.aired,
                description: episode.info.description,
                masteranime_thumbnail: episode.thumbnail
            };
            entry.episodes.push(jsonEp);
            counter++;
            if (counter === episodes.length) {
                resolve(entry);
            }
        });
    });
};

const addAnimeEntryToDatabase = function (masteranimeDetailed) {
    return new Promise(async function (resolve) {
        const animeEntry = createAnimeEntryDatabase(masteranimeDetailed);
        const ref = await db.collection('anime').add(animeEntry);
        const documentId = ref.id;
        console.log('Added document with ID: ', ref.id);
        await updateEpisodes(masteranimeDetailed, animeRef.doc(documentId).collection("episodes"));
        const result = await Anime.getAnimeFromDocumentId(documentId);
        resolve(result);
    });
};


const getAnimeLinksEmbedded = function (slug, episode) {
    return new Promise(async function (resolve, reject) {
        const url = 'https://www.masterani.me/anime/watch/' + slug + '/' + episode;
        const body = await getRequest(url);
        const handler = new htmlparser.DefaultHandler(function (error, dom) {
            if (error) {
                console.log(error);
                reject({});
            }
            else {
                dom[2].children[3].children.forEach(item => {
                    if (item.type === "script") {
                        if (item.children !== undefined) {
                            item.children.forEach(item => {
                                if (item.raw.indexOf("var args") !== -1) {
                                    let args = item.raw.replace("var args = ", "");
                                    const start = args.indexOf("mirrors:");
                                    if (start !== -1) {
                                        args = args.substring(start + "mirrors:".length, args.indexOf("auto_update:")).trim();
                                        console.log(args);
                                        const argsJson = JSON.parse(args.substr(0, args.length - 1));
                                        const resultJson = [];
                                        argsJson.forEach(function (item, index, array) {
                                            let type;
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
                                                resolve(resultJson);
                                            }
                                        })
                                    }
                                } else if (item.raw.indexOf("var videos") !== -1) {
                                    let args = item.raw.match("var videos = (\\[.*\\])");
                                    let videos = JSON.parse(args[1]);
                                    const resultJson = [];
                                    videos.forEach(function (item, index, array) {
                                        let type = "sub";
                                        if (item.type === 1) {
                                            type = "sub";
                                        } else if (item.type === 2) {
                                            type = "dub";
                                        }
                                        resultJson[index] = {
                                            type: type,
                                            host_id: 0,
                                            host_name: "masterani.me",
                                            quality: item.res,
                                            url_embedded: item.src
                                        };
                                        if (index === array.length - 1) {
                                            resolve(resultJson);
                                        }
                                    });
                                }
                            })
                        }
                    }
                });
                resolve([]);
            }
        });
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(body);
    });
};

const decodeMp4UploadLink = function (raw) {
    const information = raw.substring(raw.indexOf('|'), raw.lastIndexOf('|'));
    const splitInfo = information.split("|");
    let prefix;
    let id;
    let port;
    splitInfo.forEach(function (item, index) {
        if (item.match("www[\\d]")) {
            prefix = item;
        } else if (item.match("[a-zA-z0-9]{30,}")) {
            id = item;
            port = splitInfo[index + 1];
        }
    });
    return 'https://' + prefix + '.mp4upload.com:' + port + '/d/' + id + '/video.mp4';
};

const getAnimeLinksDirect = function (slug, episode) {
    return new Promise(async function (resolve) {
        const embedded = await getAnimeLinksEmbedded(slug, episode);
        const resultJson = [];
        let counter = 0;
        let indexJson = 0;
        embedded.forEach(async function (itemJson, index, data) {
            const url = itemJson.url_embedded;
            if (itemJson.host_id === 1 || itemJson.host_id === 14 || itemJson.host_id === 20 || itemJson.host_id === 0) {
                if (itemJson.host_id === 0) {
                    resultJson[indexJson] = itemJson;
                    resultJson[indexJson].url_direct = resultJson[indexJson].url_embedded;
                    delete resultJson[indexJson]["url_embedded"];
                    indexJson++;
                    counter++;
                    if (counter === data.length) {
                        resolve(resultJson);
                    }
                } else {
                    const body = await getRequest(url);
                    const handler = new htmlparser.DefaultHandler(function (error, dom) {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            if (itemJson.host_id === 1) {
                                if (dom[0].raw.indexOf('File was deleted') === -1) {
                                    dom[0].children[3].children.forEach(function (item) {
                                        if (item.name === 'div' && item.children !== undefined) {
                                            item.children.forEach(function (item) {
                                                if (item.name === 'script' && item.children !== undefined) {
                                                    item.children.forEach(function (item) {
                                                        if (item.raw.indexOf('split(') !== -1) {
                                                            const linkDirect = decodeMp4UploadLink(item.raw);
                                                            resultJson[indexJson] = itemJson;
                                                            resultJson[indexJson].url_direct = linkDirect;
                                                            indexJson++;
                                                        }
                                                    })
                                                }
                                            });
                                        }
                                    })
                                } else {
                                    console.log('File was deleted');
                                }
                            } else if (itemJson.host_id === 14) {
                                const linkDirect = dom[2].children[3].children[7].children[1].children[3].children[0].raw.match('https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)')[0];
                                resultJson[indexJson] = itemJson;
                                resultJson[indexJson].url_direct = linkDirect;
                                indexJson++;
                            } else if (itemJson.host_id === 20) {
                                //tiwi.kiwi
                                let linkDirectArr = body.match('https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)\\.mpd');
                                if (linkDirectArr === null) {
                                    linkDirectArr = body.match('https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)\\.mp4');
                                }
                                if (linkDirectArr !== null) {
                                    resultJson[indexJson] = itemJson;
                                    resultJson[indexJson].url_direct = linkDirectArr[0].replace(/.$/, "4");
                                    indexJson++;
                                }
                            }
                        }
                        counter++;
                        if (counter === data.length) {
                            resolve(resultJson);
                        }
                    });
                    const parser = new htmlparser.Parser(handler);
                    parser.parseComplete(body);
                }
            } else {
                counter++;
                if (counter === data.length) {
                    resolve(resultJson);
                }
            }

        });
    });
};

const getAnimeDetailMasterAnimeFromId = function (id) {
    return new Promise(async function (resolve) {
        const urlAnimeInfo = 'https://www.masterani.me/api/anime/' + id + '/detailed';
        const body = await getRequest(urlAnimeInfo);
        const jsonResult = JSON.parse(body);
        resolve(jsonResult);
    });
};

const addAnimeToDatabaseFromId = function (id) {
    return new Promise(async function (resolve) {
        console.log("Adding to Database");
        const result = await getAnimeDetailMasterAnimeFromId(id);
        const animeEntry = await addAnimeEntryToDatabase(result);
        resolve(animeEntry);
    });
};

const search = function (name) {
    return new Promise(async function (resolve) {
        if (name.length > 30) {
            name = name.substr(0, 30);
        }
        const data = await getAnimeSearchMasteranime(name);
        resolve(data);
    });
};

const loadAnime = function (slug, episode) {
    return new Promise(async function (resolve) {
        const data = await getAnimeLinksDirect(slug, episode);
        resolve(data);
    });
};

module.exports = {
    loadAnime,
    search,
    getAnimeLinksDirect,
    getAnimeLinksEmbedded,
    getAnimeDetailMasterAnimeFromId,
    getAnimeById
};