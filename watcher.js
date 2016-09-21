var _ = require('lodash');

var looper = require('./utils/looper');
var get = require('./utils/get');
var config = require('./config');
var pgp = require('pg-promise')();
var db = pgp(config.postgres);
var Inserts = require('./utils/Inserts');
var accountsInvolvedInOp = require('./utils/accountsInvolvedInOp');

looper(config.watcherSleep, (done) => {
  var currentLedger = 0;
  var ledgerOperations = [];
  var filteredNotifications = [];

  db.oneOrNone(`select seqnum from ${config.tablePrefix}ledgers order by seqnum desc limit 1;`)
  .then(latestLedgerResult => {
    if (latestLedgerResult == null) {
      currentLedger = config.minLedger;
    } else {
      currentLedger = Math.max(config.minLedger, latestLedgerResult.seqnum + 1);
    }

    console.log(`Getting operations for ledger ${currentLedger}`);
    return get(`${config.horizonUrl}/ledgers/${currentLedger}/operations`);
  })
  .then(JSON.parse)
    // Step: filter desired messages
  .then((response) => {
    if (response._embedded.records.length == 0) {
      return;
    }

    _.each(response._embedded.records, op => {
      ledgerOperations.push({
        ledger: currentLedger,
        op: op,
        opjson: JSON.stringify(op),
        opid: op.id,
        status: 'ready',
        accountsInvolved: accountsInvolvedInOp(op)
      });
    });

    var allAccountsInvolved = {};
    _.each(ledgerOperations, notification => {
      _.assign(allAccountsInvolved, notification.accountsInvolved)
    })
    return db.any("SELECT * FROM lookout_subscribers_accounts where accountid IN ($1^)", pgp.as.csv(_.keys(allAccountsInvolved)))
    .then(subscriptions => {
      var filteredNotificationsObj = {};
      _.each(subscriptions, sub => {
        _.each(ledgerOperations, note => {
          // Prevent duplication of op per subscriber
          filteredNotificationsObj[sub.subscriber_internal_id + '.' + sub.accountid + '.' + note.opid] = _.assign({}, note, {
            subscriber_internal_id: sub.subscriber_internal_id,
            viewpoint: sub.accountid
          });
        })
      });

      filteredNotifications = _.values(filteredNotificationsObj);
      return;
    })
  })
  .then(() => {
    return db.tx(function (t) {
      // If no notifications: just insert a ledger entry
      // If has notifications: insert the notifications
      let batchQueries = [
        t.one(`insert into ${config.tablePrefix}ledgers(seqnum, notificationcount, timestamp) values($1, $2, NOW()) returning *`, [currentLedger, filteredNotifications.length])
      ];

      if (filteredNotifications.length) {
        var values = new Inserts('${ledger}, ${opjson}, ${opid}, ${status}, ${subscriber_internal_id}, ${viewpoint}', filteredNotifications);
        batchQueries.push(t.any(`insert into ${config.tablePrefix}notifications(ledger, opjson, opid, status, subscriber_internal_id, viewpoint) VALUES $1 returning id, opid`, values));
      }
      return t.batch(batchQueries);
    })
  })
  .then((insertResult) => {
    if (insertResult[1]) {
      var notificationsList = '';
      notificationsList = _.map(insertResult[1], (notification) => {
        return notification.id + ':' + notification.opid;
      }).join(', ');

      console.log(`Ledger ${currentLedger}: Inserted ${insertResult[1].length} notification(s) ${notificationsList}`);
      return;
    }

  })
  .catch((err) => {
    console.error(err)
  })
  .then(() => {
    done();
  })
});
