var _ = require('lodash');

var config = require('./config');
var stellarBase = require('stellar-base');

var pgp = require('pg-promise')();
var db = pgp(config.postgres);

var _ = require('lodash');
var Inserts = require('./utils/Inserts');



// Account can be represented in one of two ways
// integer: internal_id
// Example: 22

// object: pair of external_id and integration string
// Example: {
//   integration: 'twilio',
//   external_id: '415 555 1234', // will be put through the integration's normalizeId function
// }

var assertIntegrationExists = (integration) => {
  if (!(integration in config.integrations)) {
    throw new Error('Integration ' + integration + ' does not exist');
  }
}

// Yes, this is inefficient, but dev time costs more than SELECT time
// Takes in an account object, integer, or stringed integer
// Will not error even if the internal id doesn't exist
var resolveInternalId = (account) => {
  if (_.isNumber(account) || _.isString(account)) {
    let parsedInt = parseInt(account);
    if (parsedInt <= 0 || isNaN(account)) {
      throw new Error('Invalid internal id. Parsed as ' + parsedInt)
    } else {
      return Promise.resolve(parsedInt);
    }
  }
  if (!('external_id' in account) || !('integration' in account)) {
    throw new Error('getInternalId() requires either an internal_id or an object containing both external_id and integration')
  }
  assertIntegrationExists(account.integration);
  return db.one('SELECT internal_id from ' + config.tablePrefix + 'subscribers WHERE integration=${integration} AND external_id=${external_id}', account)
  .then(result => {
    return result.internal_id;
  })
};

// GET: Get info about subscriber
var getInfo = (account) => {
  var info = {};

  return resolveInternalId(account)
  .catch(error => {
    console.log(error);
    console.dir(account);
    throw new Error('Unable to find account')
  })
  .then(id => {
    return db.one('SELECT * from ' + config.tablePrefix + 'subscribers WHERE internal_id=$1', [id])
  })
  .then(subscriber => {
    info = subscriber;
    return db.any('SELECT * from ' + config.tablePrefix + 'subscribers_accounts WHERE subscriber_internal_id=$1', [info.internal_id])
  })
  .then(accounts => {
    info.accounts = _.map(accounts, 'accountid');
    return info;
  })
  .catch(error => {
    console.dir(error)
    throw new Error('Unable to get info on account:');
  })
};

// Simply delete all the current accounts and add new ones
// Returns the result of what was put in
var setSubscriptions = (account, subscribers) => {
  var info;
  return getInfo(account)
    .then(firstInfo => {
      info = _.assign({}, firstInfo);

      if (!_.isArray(subscribers)) {
        throw new Error('Subscribers must be an array of accountId strings');
      }
      let newAccounts = _.reduce(subscribers, (validAccounts, currentItem) => {
        if (stellarBase.Keypair.isValidPublicKey(currentItem) && validAccounts.indexOf(currentItem) == -1) {
          return validAccounts.concat(currentItem);
        };
        return validAccounts;
      }, []);

      if (config.maxAccountsPerSubscriber && newAccounts.length > config.maxAccountsPerSubscriber) {
        throw new Error(`Attempting to insert more than the ${config.maxAccountsPerSubscriber} allowed.`);
      }

      return _.map(newAccounts, (sub) => {
        return {
          subscriber_internal_id: info.internal_id,
          accountid: sub,
        }
      });
    })
    .then(subscriberArrayObj => {

      return db.tx(function (t) {
        var values = new Inserts('${subscriber_internal_id}, ${accountid}', subscriberArrayObj);
        let batchQueries = [
          t.none('DELETE from ' + config.tablePrefix + 'subscribers_accounts WHERE subscriber_internal_id=$1', [info.internal_id]),
        ];
        if (subscriberArrayObj.length > 0) {
          batchQueries.push(t.any(`insert into ${config.tablePrefix}subscribers_accounts(subscriber_internal_id, accountid) VALUES $1 returning subscriber_internal_id, accountid`, values));
        }
        return t.batch(batchQueries);
      });
    })
    .then((batchResults) => {
      return batchResults[1] || [];
    })
    .catch(console.error)
}

// Create the account
// Either triggered on the website or via a message on the app
// createAccount is a special case in which it will return to the http request and also send a text
// We could use infinity as a default but 9999 is portable
var createAccount = (account, opts) => {
  opts = _.assign({
    expiration: '9999-12-31', // If integer, will be offset
    active: true,
    integration_data: {},
  }, opts);

  assertIntegrationExists(account.integration);
  var integration = config.integrations[account.integration];

  var subscriberInfo = {
    integration: account.integration,
    external_id: integration.normalizeId(account.external_id),
    expiration: opts.expiration,
    active: opts.active,
    integration_data: {},
  };

  return Promise.resolve()
  .then(() => {
    integration.validateId(account.external_id);
    return;
  })
  .then(() => {
    subscriberInfo.integrationData = integration.setupAccount(subscriberInfo);
    return;
  })
  .then(() => {
    return db.one("INSERT into " + config.tablePrefix + "subscribers(integration, external_id, expiration, active, integration_data) values(${integration}, ${external_id}, ${expiration}, ${active}, ${integrationData}) returning internal_id, active;",
      subscriberInfo);
  })
  .then((createAccountResult) => {
    return createAccountResult;
  })
  .catch((createAccountError) => {
    if (createAccountError.code == '23505') {
      throw new Error('Account already exists');
    }
    throw createAccountError;
  })
};

// private. use activateAccount and deactivateAccount
var changeActivation = (account, activation) => {
  return resolveInternalId(account)
  .then(internal_id => {
    return db.one(`UPDATE ${config.tablePrefix}subscribers SET active=$1 where internal_id=$2 returning internal_id, active;`, [activation, internal_id])
  })
  .then(changeResult => {
    return 'Changed activation';
  })
}

var activateAccount = (number) => {
  return changeActivation(number, true);
}
var deactivateAccount = (number) => {
  return changeActivation(number, false);
}

var sendNotification = (account, message) => {
  return getInfo(account)
  .then(accountInfo => {
    return config.integrations[account.integration].sendNotification(accountInfo, message);
  })
}

module.exports = {
  getInfo,
  createAccount,
  setSubscriptions,
  changeActivation,
  sendNotification,
}