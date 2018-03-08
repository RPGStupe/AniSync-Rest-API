const request = require('request');
const db = require('../firebase');
const FieldValue = require('firebase-admin').firestore.FieldValue;

const releaseUrl = "https://www.masterani.me/api/releases";
let timer;

const start = function () {
    update();
    timer = setInterval(update, 900000);
};

const stop = function () {
    clearInterval(timer);
};

function update() {
    console.log('Updating notifications...');
    request(releaseUrl, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            const json = JSON.parse(body);
            db.collection('watching').get().then(querySnapshot => {
                updateWithJson(json, createWatchingJson(querySnapshot));
            });
        }
    });
}

function updateWithJson(releases, watching) {
    releases.forEach(item => {
        if (watching[item.anime.slug] !== undefined) {
            const watchingObj = watching[item.anime.slug];
            newNotification = {
                episodeCount: watchingObj.episodeCount,
                currentEpisode: item.episode,
                title: watchingObj.title,
                masteranime_id: watchingObj.masteranime_id,
                masteranime_slug: watchingObj.masteranime_slug,
                hidden: false
            };
            updateForUsers(newNotification, watchingObj.users);
        }
    });
}

function createWatchingJson(snapshot) {
    let res = {};
    snapshot.forEach(function (doc) {
        const obj = doc.data();
        res[obj.masteranime_slug] = {
            episodeCount: obj.episodeCount,
            masteranime_id: obj.masteranime_id,
            masteranime_slug: obj.masteranime_slug,
            title: obj.title,
            users: obj.users
        };
    });
    return res;
}

function updateForUsers(notification, users) {
    for (const uid in users) {
        if (users.hasOwnProperty(uid)) {
            notification.watchlist = users[uid];
            //check if old notification exists
            const notificationsRef = db.collection('users').doc(uid).collection('notifications');
            notificationsRef.where('masteranime_slug', '==', notification.masteranime_slug)
                .get()
                .then(function (querySnapshot) {
                    if (querySnapshot.empty && Number(users[uid]) === notification.currentEpisode - 1) {
                        console.log(notification);
                        notificationsRef.add(notification)
                            .then(function (ref) {
                                ref.update({updatedAt: FieldValue.serverTimestamp()});
                                console.log('added ' + notification + " for " + uid);
                            })
                            .catch(function (error) {
                                console.log('Error adding document: ', error);
                            });
                        db.collection('users').doc(uid).update({newNotifications: true});
                    } else if (!querySnapshot.empty) {
                        querySnapshot.forEach(function (item) {
                            if(item.data().currentEpisode !== notification.currentEpisode) {
                                notificationsRef.doc(item.id).update(notification).then(function () {
                                    console.log('Successfully updated the notification with id ', item.id)
                                }).catch(function (error) {
                                    console.log('Something went wrong while updating a notification: ', error);
                                });
                                notificationsRef.doc(item.id).update({updatedAt: FieldValue.serverTimestamp()}).then(function () {
                                    console.log('Successfully updated creation time for id ', item.id)
                                }).catch(function (error) {
                                    console.log('Something went wrong while updating a notification: ', error);
                                });
                                db.collection('users').doc(uid).update({newNotifications: true});
                            }
                        })
                    }
                }).catch(function (error) {
                console.log('Error getting documents: ', error);
            });
        }
    }
}

module.exports = {
    start,
    stop
};