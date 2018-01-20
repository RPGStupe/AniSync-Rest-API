const WebSocket = require('ws');
const https = require('https');
const RoomHandler = require('../user/roomHandler');
const Room = require('../user/room');
const UserSessionHandler = require('./userSessionHandler');
const fs = require('fs');

const wss = new WebSocket.Server({port:3001});


wss.on('connection', function connection(ws, req) {
    ws.send(JSON.stringify({status:"HALLO"}));
    ws.on('message', function incoming(message) {
        const jsonMsg = JSON.parse(message);
        console.log("message");

        if ('changeName' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            const name = jsonMsg.name;
            if (name !== null && !name.equals("") && room !== undefined) {
                room.changeName(ws, name);
            }
        } else if ('create' === jsonMsg.action) {
            console.log("Create room");
            const name = jsonMsg.name;
            let roomOld = RoomHandler.getInstance().getRoomBySession(ws);
            if (roomOld !== undefined) {
                roomOld.removeSession(ws);
            }
            new Room.Room(ws, name, jsonMsg.uid, jsonMsg.isAnonymous);
        } else if ('join' === jsonMsg.action) {
            let roomOld = RoomHandler.getInstance().getRoomBySession(ws);
            if (roomOld !== undefined) {
                roomOld.removeSession(ws);
            }
            let id = jsonMsg.id;
            const room = RoomHandler.getInstance().roomsId[id];
            if (room === undefined) {
                const message = {
                    action: "roomID",
                    id: -1
                };
                UserSessionHandler.sendToSession(ws, message);
            } else {
                room.addSession(ws, jsonMsg.name, jsonMsg.uid, jsonMsg.isAnonymous);
            }
        } else if ('leave' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.removeSession(ws);
            }
        } else if ('finished' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.videoFinished();
            }
        } else if ('autoNext' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.autoNext = jsonMsg.value;
            }
        } else if ('uid' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            room.userMap[room.sessions.indexOf(ws)].uid = jsonMsg.value;
        } else if ('episodeLink' === jsonMsg.action) {
            //TODO: Direct link from name and episode
        } else if ('search' === jsonMsg.action) {
            //TODO: Search results
        } else if ('changeRoomName' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (RoomHandler.getInstance().roomsId[jsonMsg.name] === undefined) {
                if (room !== undefined) {
                    room.id = jsonMsg.name;
                    RoomHandler.getInstance().roomsId[room.id] = room;
                    const message = {
                        action: "newRoomId",
                        id: room.id
                    };
                    UserSessionHandler.sendToRoom(room, message);
                }
            }
        } else if ('resync' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.pause(jsonMsg.current, ws, false);
            }
        } else if ('video' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.addVideo(jsonMsg.url);
            }
        } else if ('playNow' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.playNow(jsonMsg.episode);
            }
        } else if ('delete' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.delete(jsonMsg.episode);
            }
        } else if ('play' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.play();
            }
        } else if ('stopped' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                let intended = jsonMsg.intended;
                room.pause(jsonMsg.current, ws, intended);
            }
        } else if ('bufferedIndication' === jsonMsg.action) {
            let readyState = jsonMsg.readyState;
            if (readyState === 4) {
                let room = RoomHandler.getInstance().getRoomBySession(ws);
                if (room !== undefined) {
                    room.markReady(ws, true);
                }
            }
        } else if ('current' === jsonMsg.action) {
            let room = RoomHandler.getInstance().getRoomBySession(ws);
            if (room !== undefined) {
                room.current = jsonMsg.current;
            }
        } else if ('addToWatchlist' === jsonMsg.action) {
            //TODO: add watchlist
        }
    });
});

