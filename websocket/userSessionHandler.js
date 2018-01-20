module.exports.sendToSession = function (session, message) {
    session.send(JSON.stringify(message));
};

module.exports.sendToRoom = function (room, message) {
    for (let i = 0; i < Object.keys(room.sessions).length; i++) {
        room.sessions[Object.keys(room.sessions)[i]].send(JSON.stringify(message));
    }
};