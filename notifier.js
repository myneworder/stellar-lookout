var config = require('./config');

var looper = require('./utils/looper');
var pgp = require('pg-promise')();
var db = pgp(config.postgres);
var subscriptionApi = require('./subscriptionApi');


// Get the oldest ready
looper(config.notifierSleep, (done) => {
  var notification;
  db.one(`select * from ${config.tablePrefix}notifications where status = 'ready' ORDER BY id asc limit 1`)
    .catch((error) => {
      if (error.code == pgp.errors.queryResultErrorCode.noData) {
        throw 'No ready notifications in the queue.';
      }

      console.log('Error in fetching notification.')
      throw error;
    })
    // TODO: use db.tx
    .then(function (newNotification) {
      notification = newNotification;
      return subscriptionApi.getInfo(notification.subscriber_internal_id)
    })
    .then(accountInfo => {
      // Perform notification
      var message = config.opToMessage(JSON.parse(notification.opjson), notification.viewpoint);

      subscriptionApi.sendNotification(accountInfo, message);
      // Update that we completed it
      return notification.id;
    })
    .then(id => {
      return db.none(`UPDATE ${config.tablePrefix}notifications set status='complete' where id=$1`, [id]);
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function() {
      done();
    })
});

