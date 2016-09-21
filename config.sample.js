// Copy the sample config file to config.js

module.exports = {
  // https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax#configuration-object
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'db',
    user: 'user',
    password: 'pass',
  },
  tablePrefix: 'lookout_', // Prefix on table names. Will simply be concatenated in queries so many sure the prefix doesn't cause syntax errors
  opToMessage: require('./utils/opToMessage'),
  // Remote horizon url. No trailing slash
  // TODO: support for multiple horizon connections for increased reliability
  horizonUrl: 'https://horizon.stellar.org',
  integrations: {
    twilio: require('./integrations/twilio.js')({
      numbers: ['18005555555'],
      accountSid: 'AAAAA',
      authToken: 'BBBBB',
    }),
  },
  watcherSleep: 1000, // How long to sleep *between* loops of the watcher
  notifierSleep: 500, // How long to sleep *between* loops of the notifier
  minLedger: 6519601,

  // Subscription API
  // maxAccountsPerSubscriber: 10, // uncomment to add limitation (not yet implemented)
}