var admin = require('firebase-admin');
var serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://anisync-be184.firebaseio.com'
});


var db = module.exports = admin.firestore();