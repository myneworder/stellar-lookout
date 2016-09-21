// Returns whether an account is involved in an operation

var stellarBase = require('stellar-base');
var _ = require('lodash');

var accountLocations = [
  'from',
  'to',
  'source_account',
  'funder',
  'account',
];
module.exports = function accountsInvolvedInOp(op) {
  var involvedAccounts = {};
  _.each(accountLocations, location => {
    if (location == undefined) {
      return;
    }
    let item = _.get(op, location);
    if (stellarBase.Keypair.isValidPublicKey(item)) {
      involvedAccounts[item] = true;
    }
  })
  return involvedAccounts;
}