module.exports = function(config) {
  var client = require('twilio')(config.accountSid, config.authToken);

  var LookupsClient = require('twilio').LookupsClient;
  var lookupClient = new LookupsClient(config.accountSid, config.authToken);

  var twilio = {};
  // Used so that different formatting of a phone number will still correspond to the same row in the DB
  // If after normalizing, the id is invalid, then will throw an error
  twilio.normalizeId = function(inputId) {
    let normalized = String(inputId).replace(/[^0-9]/g, '');
    if (normalized.length == 0) {
      throw new Error('Input ID normalized to empty string')
    }
    if (normalized.length < 7) {
      throw new Error('Phone number too short')
    }
    return normalized;
  }

  // Call the twilio API to see that this is a valid number
  // throws error if invalid. Still returns because it is a promise
  // Can either return a promise or a value
  twilio.validateId = function(inputId) {
    return new Promise(function(resolve, reject) {
      lookupClient.phoneNumbers(inputId).get({
      }, function(error, number) {
        if (error) {
          reject('Invalid phone number');
        }
        resolve();
      });
    })
  }

  // Gives the opportunity to modify integration config
  // TODO: somehow support hooks for modifying account
  twilio.setupAccount = function() {
    // KLUDGE: pick number better
    return {
      sourceNumber: config.numbers[0],
    }
  }


  twilio.sendNotification = function(accountInfo, message) {
    client.messages.create({
      body: message,
      to: accountInfo.external_id,
      from: accountInfo.integration_data.sourceNumber
    }, function(err, data) {
      if (err) {
        throw new Error(err);
      }
      console.log(data);
    });
  };

  return twilio;
};