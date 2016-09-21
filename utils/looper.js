// Sleep time is in ms and is configured in config.js
module.exports = function looper(sleep, target) {
  var done = () => {
    setTimeout(() => {
      target(done);
    }, sleep);
  }
  target(done);
};