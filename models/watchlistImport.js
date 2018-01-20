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