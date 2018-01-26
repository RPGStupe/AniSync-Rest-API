let RoomHandler = function () {
    this.roomSession = [];
    this.sessions = [];
    this.roomsId = [];
    this.userScore = [];

    this.clearRoomHandlerArrays = function () {
        this.sessions = this.sessions.filter(function(n){ return n !== undefined });
        this.roomSession = this.roomSession.filter(function(n){ return n !== undefined });
    };

    this.getRoomBySession = function(session) {
        let index = this.sessions.indexOf(session);
        if (index === -1) {
            return undefined;
        }
        return this.roomSession[index];
    };

    this.getRoomById = function (id) {
        return this.roomsId[id];
    };

    this.addUser = function(user) {
        let thisUser = this.userScore[user.uid];
        if (thisUser === undefined) {
            this.userScore[user.uid] = {
                connectionCount: 1,
                scoreTime: 0
            };
        } else {
            this.userScore[user.uid].connectionCount += 1;
        }
    };

    this.removeUser = function (uid) {
        let thisUser = this.userScore[uid];
        if (thisUser !== undefined) {
            this.userScore[uid].connectionCount -= 1;
            if (this.userScore[uid].connectionCount === 0) {
                this.userScore[uid].connectionCount = undefined;
            }
        }
    }
};

function Singleton() {
    this.instance = null;
    this.getInstance = function getInstance() {
        if (!this.instance) {
            this.instance = new RoomHandler();
        }
        return this.instance;
    }
}

let singleton = new Singleton();

module.exports.getInstance = function () {
    return singleton.getInstance();
};