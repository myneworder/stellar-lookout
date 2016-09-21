// Takes in a operation object from js-stellar-sdk
var assetToString = function(assetType, assetIssuer, assetCode) {
  if (assetType == 'native') {
    return 'lumens';
  } else {
    return `${assetCode} *(issuer: ${String(assetIssuer)})`;
  }
};

var extractAmount = function(op) {
  return `${stripExtraZeros(op.amount)} ${assetToString(op.asset_type, op.asset_issuer, op.asset_code)}`;
}

var stripExtraZeros = function(input) {
  return input.replace(/.?0*$/,'');
}

module.exports = function(op, viewpoint) {
  switch(op.type) {
  case 'path_payment':
  case 'payment':
    if (op.from == viewpoint) {
      return `Sent ${extractAmount(op)} to ${op.to}\n\n${op._links.self.href}`
    }
    if (op.to == viewpoint) {
      return `Received ${extractAmount(op)} from ${op.from}\n\n${op._links.self.href}`
    }
    break;
  case 'create_account':
    if (op.funder == viewpoint) {
      return `Sent ${stripExtraZeros(op.starting_balance)} ${assetToString('native')} to ${op.account}\n\n${op._links.self.href}`
    }
    if (op.account == viewpoint) {
      return `Received ${stripExtraZeros(op.starting_balance)} ${assetToString('native')} from ${op.funder}\n\n${op._links.self.href}`
    }
    break;
  break;
  }

  if (op.source_account == viewpoint) {
    return `Sent transaction with ${op.type} operation.`;
  }

  // Generic unimplemented types
  return `Involved in transaction with ${op.type} operation initiated by ${op.source_account}`;
};