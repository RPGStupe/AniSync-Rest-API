const UserSessionHandler = require('../websocket/userSessionHandler');
const RoomHandler = require('./roomHandler');
const User = require('./user');
const Video = require('./video');
const UserModel = require('../models/user');

module.exports.Room = function (host, hostname, hostuid, hostavatar, isHostAnonymous) {
    this.userMap = [];
    this.readyStates = [];
    this.video = "";
    this.playing = false;
    this.buffering = false;
    this.playlist = [];
    this.host = host;
    this.id = 0;
    this.timestamp = -1;
    this.lastVideo = undefined;
    this._9animeLink = "";
    this.autoNext = false;
    this.anime = undefined;
    this.current = 0;
    this.lastCurrent = 0;
    this.sessions = [];
    this.seeking = false;

    do {
        this.id = Math.floor(Math.random() * (10000));
    } while (RoomHandler.getInstance().roomsId[this.id]);

    RoomHandler.getInstance().roomSession[RoomHandler.getInstance().roomSession.length] = this;
    RoomHandler.getInstance().sessions[RoomHandler.getInstance().sessions.length] = host;

    this.sendRoomList = function () {
        let message = {
            action: "room-list",
            userList: []
        };
        for (let i = 0; i < this.userMap.length; i++) {
            const user = this.userMap[i];
            message.userList[i] = {
                uid: user.uid,
                name: user.name,
                avatarUrl: user.avatarUrl,
                isOwner: this.sessions[i] === this.host
            }
        }
        UserSessionHandler.sendToRoom(this, message);
    };

    this.addSession = function (session, name, uid, avatar, isUserAnonymous) {
        this.avatarUrl = "https://firebasestorage.googleapis.com/v0/b/proxsync.appspot.com/o/panda.svg?alt=media&token=6f4d5bf1-af69-4211-994d-66655456d91a";
        if (name.indexOf("<") !== -1) {
            name = "User " + Math.floor((Math.random() * (10000)));
        }
        this.userMap[this.userMap.length] = new User.User(uid, name, avatar, isUserAnonymous);
        this.readyStates[this.readyStates.length] = false;
        this.sessions[this.sessions.length] = session;
        const message = {
            action: "roomID",
            id: this.id
        };
        UserSessionHandler.sendToSession(session, message);
        if (this.video !== "") {
            this.sendVideoToSession(session, true);
            this.sendPlaylist();
        }

        RoomHandler.getInstance().roomSession[RoomHandler.getInstance().roomSession.length] = this;
        RoomHandler.getInstance().sessions[RoomHandler.getInstance().sessions.length] = session;
        this.sendRoomList();
    };


    this.addSession(host, hostname, hostuid, hostavatar, isHostAnonymous);
    RoomHandler.getInstance().roomsId[this.id] = this;


    function updatePlaylistInfo(video, episode, details) {
        if (!video.hasInfo && details !== undefined) {
            video.animeTitle = details.info.title;
            video.episode = episode;
            video.episodeTitle = details.episodes[episode - 1].info.title;
            video.episodePoster = details.episodes[episode - 1].thumbnail;
            video.episodeCount = details.info.episode_count;
            video.hasInfo = true;
            video.masteranime_id = details.info.id;
            video.masteranime_slug = details.info.slug;
            video.poster = details.poster;
            video.wallpaper = details.info.wallpaper_id + ".jpg";
        }
    }

    this.updatePlaylistInfoAll = function () {
        for (let video in this.playlist) {
            // updatePlaylistInfo(video);
        }
    };

    this.sendPlaylist = function () {
        this.updatePlaylistInfoAll();
        let message = {
            action: "playlist",
            playlist: []
        };

        for (let i = 0; i < this.playlist.length; i++) {
            const video = this.playlist[i];
            message.playlist[i] = {
                title: video.animeTitle,
                masteranime_slug: video.masteranime_slug,
                episodeTitle: video.episodeTitle,
                episodePoster: video.episodePoster,
                episode: video.episode,
                episodeCount: video.episodeCount,
                masteranime_id: video.masteranime_id,
                poster: video.poster,
                wallpaper: video.wallpaper
            };
        }
        console.log(message);
        UserSessionHandler.sendToRoom(this, message);
    };


    this.pause = function (current, session, intended) {
        if (this.playing) {
            this.buffering = !intended;
            this.playing = false;
            this.timestamp = current;
            const message = {
                action: "pause",
                current: current
            };
            if (!intended) {
                this.markReady(session, false);
            }
            UserSessionHandler.sendToRoom(this, message);
        }
    };


    this.markReady = function (session, status) {
        this.readyStates[this.sessions.indexOf(session)] = status;
        if (!this.playing && this.buffering) {
            this.play();
        }
    };

    this.play = function () {
        let flag = true;
        for (let i = 0; i < this.sessions.length; i++) {
            if (!this.readyStates[i]) {
                this.sendBufferedRequest(this.sessions[i]);
                this.buffering = true;
                flag = false;
            }
        }
        if (flag) {
            //start playing
            const message = {
                action: "play"
            };
            this.playing = true;
            this.buffering = false;
            UserSessionHandler.sendToRoom(this, message);
        }
    };

    this.sendBufferedRequest = function (session) {
        const message = {
            action: "bufferedRequest"
        };
        UserSessionHandler.sendToSession(session, message);
    };

    this.sendVideoToSession = function (session, newJoin) {
        if (newJoin) {
            if (this.timestamp != null) {
                console.log("pause");
                this.pause(this.timestamp, session, false);
            }
        }
        const urls = this.playlist[0].urls;
        let message = {
            action: "video",
            urls: urls
        };
        if (this.timestamp == null) {
            message['current'] = 0;
        } else {
            message['current'] = this.timestamp;
        }
        UserSessionHandler.sendToSession(session, message);
    };

    this.changeName = function (session, name) {
        const oldName = this.userMap[this.sessions.indexOf(session)].name;
        let newName = name;
        if (!newName.equals(oldName)) {
            if (newName.contains("<")) {
                newName = "User " + (Math.random() * (10000));
            }
            this.userMap[this.sessions.indexOf(session)].name = newName;
            this.sendRoomList();
        }
    };

    this.addScore = function (uid) {
        UserModel.addScoreToDB(uid);
    };

    this.handleUserScore = function () {
        if (this.current - this.lastCurrent < 1.5) {
            let msg = [];
            for (let i = 0; i < this.userMap.length; i++) {
                const uid = this.userMap[i].uid;
                RoomHandler.getInstance().userScore[uid].scoreTime += this.current - this.lastCurrent;
                console.log(uid + " time: " + RoomHandler.getInstance().userScore[uid].scoreTime);
                const neededScore = 10 * RoomHandler.getInstance().userScore[uid].connectionCount;
                if (RoomHandler.getInstance().userScore[uid].scoreTime >= neededScore) {
                    RoomHandler.getInstance().userScore[uid].scoreTime -= neededScore;
                    this.addScore(uid);
                }
            }
            UserSessionHandler.sendToRoom(this, msg);
        } else {
            this.lastCurrent = this.current;
        }
    };

    this.removeSession = function (session) {
        const index = this.sessions.indexOf(session);
        this.readyStates[index] = undefined;
        if (this.userMap[index] !== undefined) {
            RoomHandler.getInstance().removeUser(this.userMap[index].uid);
        }
        this.userMap[index] = undefined;
        this.sessions[index] = undefined;
        this.clearArrays();
        if (session === host) {
            if (this.sessions.length === 0) {
                RoomHandler.getInstance().roomsId[this.id] = undefined;
                let index = RoomHandler.getInstance().sessions.indexOf(session);
                RoomHandler.getInstance().sessions[index] = undefined;
                RoomHandler.getInstance().roomSession[index] = undefined;
                RoomHandler.getInstance().clearRoomHandlerArrays();
                return;
            } else {
                host = this.sessions[0];
                const message = {
                    action: "owner"
                };
                UserSessionHandler.sendToSession(host, message);
            }
        }
        this.sendRoomList();
    };

    this.clearArrays = function () {
        this.sessions = this.sessions.filter(function (n) {
            return n !== undefined
        });
        this.userMap = this.userMap.filter(function (n) {
            return n !== undefined
        });
        this.readyStates = this.readyStates.filter(function (n) {
            return n !== undefined
        });
        this.playlist = this.playlist.filter(function (n) {
            return n !== undefined
        });
    };

    this.sendVideoToRoom = function () {
        for (let i = 0; i < this.sessions.length; i++) {
            this.sendVideoToSession(this.sessions[i], false);
        }
    };

    this.playNow = function (skip) {
        if (skip > 0) {
            for (let i = 0; i < skip - 1; i++) {
                this.playlist[i] = undefined;
            }
            this.clearArrays();
            this.loadNextVideo();
        }
    };

    this.delete = function (num) {
        if (num === 0) {
            if (this.playlist.length !== 1) {
                this.loadNextVideo();
            }
        } else {
            this.playlist[num] = undefined;
            this.clearArrays();
            this.sendPlaylist();
        }
    };

    this.setVideo = function (urls, episode) {
        this.episode = episode;
        this.timestamp = null;
        for (let i = 0; i < this.sessions.length; i++) {
            this.markReady(this.sessions[i], false);
        }
        this.video = urls;
        this.playing = false;
        this.sendVideoToRoom();
        if (this.anime != null) {
            const message = {
                action: "animeInfo",
                title: this.anime.title,
                episode: this.episode,
                episodeCount: this.anime.episodeCount
            };
            UserSessionHandler.sendToRoom(this, message);
        }
    };

    this.addVideo = function (urls, episode, details) {
        console.log(urls);
        const index = this.playlist.length;
        this.playlist[index] = new Video.Video(urls, 0);
        if (this.playlist.length >= 1) {
            updatePlaylistInfo(this.playlist[index], episode, details);
            if (this.playlist.length !== 0 && index === 0) {
                this.setVideo(this.playlist[0].urls, this.playlist[0].episode);
            }
        }
        this.sendPlaylist();
    };

    this.clearPlaylist = function () {
        this.playlist = this.playlist.filter(function (n) {
            return n !== undefined
        });
    };

    this.loadNextVideo = function () {
        let video = this.playlist[0];
        this.playlist[0] = undefined;
        this.clearPlaylist();
        this.lastVideo = video;
        this.timestamp = undefined;

        // TODO: Auto play next episode
        // if (this.playlist.length > 0 && this.autoNext) {
        //     this.episode++;
        //     if (video != null) {
        //         this.addVideo(this.get9animeLink(this._9animeLink));
        //     }
        // } else
        if (this.playlist.length !== 0) {
            this.sendPlaylist();
            this.setVideo(this.playlist[0].urls, this.playlist[0].episode);
            this.play();
        } else {
            this.sendPlaylist();
        }
    };

    this.videoFinished = function () {
        this.playing = false;
        this.buffering = false;
        this.loadNextVideo();
    }
};