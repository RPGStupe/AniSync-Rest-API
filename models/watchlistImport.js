async function getAnimeSearchMasteranimeWatchlistImport(name) {
    var url = 'https://www.masterani.me/api/anime/search?search=' + name + '&sb=true';
    var quote = await getRequestWatchlistImport(url);
    var jsonResult = JSON.parse(quote);
    return jsonResult;
}

function getRequestWatchlistImport(url) {
    return new Promise(function (resolve, reject) {
        var quote;
        request(encodeURI(url), function (error, response, body) {
            quote = body;
            resolve(quote);
        });
    });
}


const watchlistImport = function (old_uid, new_uid) {
    return new Promise(async function (resolve) {
        const json = require('../proxsync-db.json');
        const watchlistJsonOld = json.users[old_uid].watchlist;
        const keys = Object.keys(watchlistJsonOld);
        const jsonResult = {successful: [], failed: []};
        let indexSuccessful = 0;
        let indexFailed = 0;
        resolve({status: "started"});
        for (let i = 0, len = keys.length; i < len; i++) {
            const realTitle = watchlistJsonOld[keys[i]].title;
            let title = watchlistJsonOld[keys[i]].title;
            let titleSearch = title;
            if (title.length > 30) {
                titleSearch = titleSearch.substr(0, 30);
            }
            const result = await getAnimeSearchMasteranimeWatchlistImport(titleSearch);
            if (result.length === 0) {
                console.log("Failed: " + realTitle);
                jsonResult.failed[indexFailed] = realTitle;
                indexFailed++;
            } else {
                title = title.replace(/[^\x00-\x7F]/g, "?");
                title = title.replace(/\(tv\)/ig, "").trim().toLowerCase();
                for (let x = 0; x < result.length; x++) {
                    let title2 = result[x].title;
                    title2 = title2.replace(/[^\x00-\x7F]/g, "?");
                    title2 = title2.replace(/\(tv\)/ig, "").trim().toLowerCase();
                    if (title === title2) {
                        console.log("Successful: " + realTitle);
                        jsonResult.successful[indexSuccessful] = realTitle;
                        indexSuccessful++;
                        const watchlistRef = db.collection('users').doc(new_uid).collection('watchlist');
                        const ref = await watchlistRef.add(newWatchlistEntryImportWatchlist(watchlistJsonOld[keys[i]], result[x]));
                        const documentId = ref.id;
                        console.log("added entry to watchlist; id: " + documentId);
                        break;
                    } else {
                        if (x === result.length - 1) {
                            jsonResult.failed[indexFailed] = realTitle;
                            indexFailed++;
                        }
                    }
                }
            }
            await sleep(1000);
        }
    });
};

const newWatchlistEntryImportWatchlist = function (dataDB, dataSearch) {
    return {
        title: dataSearch.title,
        episode: dataDB.episode,
        status: dataDB.status,
        rating: dataDB.rating,
        poster: dataDB.poster,
        episodeCount: dataDB.episodeCount,
        masteranime_id: dataSearch.id,
        masteranime_slug: dataSearch.slug
    };
};


const sleep = function (ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms)
    });
};