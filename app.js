var express = require('express');
var app = express();
var Scraper = require('./models/scraper');
const RoomHandler = require('./user/roomHandler');
WebSocket = require('./websocket/websocket');
const notificationUpdater = require('./util/notificationUpdater');


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

app.get('/api/anime/search/:name', async function (req, res) {
    const json = await Scraper.search(req.params.name);
    res.json(json);
});

app.get('/api/anime/loadAnime/:room/:id/:slug/:episode', async function (req, res) {
    const json = await Scraper.loadAnime(req.params.slug, req.params.episode);
    const details = await Scraper.getAnimeDetailMasterAnimeFromId(req.params.id);

    const room = RoomHandler.getInstance().getRoomById(req.params.room);
    if (room !== undefined) {
        room.addVideo(json, req.params.episode, details);
    }
    res.json(json[0]);
});

app.get('/api/anime/getAnimeById/:id', async function (req, res) {
    const json = await Scraper.getAnimeById(req.params.id);
    res.json(json);
});

// app.get('/api/watchlistImport/:old_uid/:new_uid', function (req, res) {
//     Scraper.watchlistImport(function (json) {
//         res.json(json);
//     }, req.params.old_uid, req.params.new_uid)
// });

app.get('/api/anime/getAnimeLinksEmbedded/:name/:episode', async function (req, res) {
    const result = await Scraper.getAnimeLinksEmbedded(req.params.name, req.params.episode);
    res.json(result);
});

app.get('/api/anime/getAnimeLinksDirect/:name/:episode', async function (req, res) {
    const result = await Scraper.getAnimeLinksDirect(req.params.name, req.params.episode);
    res.json(result);
});

app.listen(3000);


console.log('Running on port 3000...');

notificationUpdater.start();

console.log('Notification updates started');