var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Anime = require('./models/anime');
var Scraper = require('./models/scraper');

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/api/anime/getAnime/:name', function (req, res) {
    Anime.getAnime(function (json) {
        res.json(json);
    }, req.params.name);
});

// app.get('/api/watchlistImport/:old_uid/:new_uid', function (req, res) {
//     Scraper.watchlistImport(function (json) {
//         res.json(json);
//     }, req.params.old_uid, req.params.new_uid)
// });

app.get('/api/anime/getAllAnime', function (req, res) {
    Anime.getAllAnime(function (result) {
        res.json(result);
    });
});

app.get('/api/anime/addAnime/:name', function (req, res) {
    Scraper.addAnimeToDatabase(function (result) {
        res.json(result);
    }, req.params.name);
});

app.get('/api/watchlist/addAnime/:user/:name/:episode', function (req, res) {
    Scraper.addAnimeToWatchlist(function (result) {
        res.json(result);
    }, req.params.user, req.params.name, req.params.episode);
});

app.get('/api/anime/getAnimeLinksEmbedded/:name/:episode', function (req, res) {
    Scraper.getAnimeLinksEmbedded(function (result) {
        res.json(result);
    }, req.params.name, req.params.episode);
});

app.get('/api/anime/getAnimeLinksDirect/:name/:episode', function (req, res) {
    Scraper.getAnimeLinksDirect(function (result) {
        res.json(result);
    }, req.params.name, req.params.episode);
});

app.listen(3000);


console.log('Running on port 3000...');