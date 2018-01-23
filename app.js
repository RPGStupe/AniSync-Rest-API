var express = require('express');
var app = express();
var Anime = require('./models/anime');
var Scraper = require('./models/scraper');
const RoomHandler = require('./user/roomHandler');
WebSocket = require('./websocket/websocket');


app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/api/anime/search/:name', function (req, res) {
    Scraper.search(function (json) {
        res.json(json);
    }, req.params.name);
});

// TODO: multiple video sources and qualities
app.get('/api/anime/loadAnime/:room/:slug/:episode', function (req, res) {
    Scraper.loadAnime(function (json) {
        res.json(json[0]);
        const room = RoomHandler.getInstance().getRoomById(req.params.room);
        if (room !== undefined) {
            for (let i = 0; i < json.length; i++) {
                if (json[i].host_id === 1) {
                    room.addVideo(json[i].url_direct);
                    break;
                }
            }
        }
    }, req.params.slug, req.params.episode);
});

app.get('/api/anime/getAnime/:name', function (req, res) {
    Anime.getAnime(function (json) {
        res.json(json);
    }, req.params.name);
});

app.get('/api/anime/getAnimeById/:id', function (req, res) {
    Anime.getAnimeFromId(function (json) {
        res.json(json);
    }, req.params.id);
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