const RoomHandler = require('./roomHandler');

module.exports.User = function(uid, name, avatarUrl, isAnonymous) {
    this.uid = uid;
    this.name = name;
    this.avatarUrl = avatarUrl;
    this.isAnonymous = isAnonymous;
    this.userScoreTime = 0;
    RoomHandler.getInstance().addUser(this);
};