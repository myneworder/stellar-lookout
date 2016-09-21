var pgp = require('pg-promise')();

// From: https://github.com/vitaly-t/pg-promise/wiki/Performance-Boost
module.exports = function Inserts(template, data) {
  if (!(this instanceof Inserts)) {
    return new Inserts(template, data);
  }
  this._rawDBType = true;
  this.formatDBType = function () {
    return data.map(d=>'(' + pgp.as.format(template, d) + ')').join();
  };
}
