# Stellar Lookout (Live demo: [stellarlookout.com](http://stellarlookout.com))

[![screenshot](https://cloud.githubusercontent.com/assets/5728307/18715311/b5e645a2-7fcd-11e6-9bd9-1e141e02786f.png)](http://stellarlookout.com)

Stellar Lookout is a modular service used to monitor monitor transactions that happen on a specific account. It will then safely store the notification in the database and then dispatch the relevant notification in near real-time.

It is designed in a robust way so that it will not miss any transactions. It walks through ledgers one at a time looking for relevant transactions.

## Parts
There are three distinct parts of the stellar-lookout project. They are modularized and work with each other through the database.

### Watcher
The watcher continuously requests the next ledger and sees if there are any operations that involve accounts that are being tracked. If accounts exist, then the watcher will put an entry into the notification table.

### Notifier
The notifier continuously checks the database for any new notifications. If new notifications exist, the notifier will dispatch the notification using the relevant

### Subscription API
The subscription API is a small interface to the database. It provides abstractions to easily retrieve and modify subscriptions.

## Integrations
Stellar Lookout is designed to accept plugins that integrate with different messaging system. With a simple plugin file, the lookout can gain the ability to send notifications in different systems.

## Dependencies
Node.js Version > 6
PostgreSQL version >= 9.5

## Development and Roadmap
I ([Iris Li](https://iris.li/)) am currently actively working on this project. Depending on how much support and interest this project gets, I will continue to develop this app and make improvements that the community wants.

Addditionally, I will work to improve the public service so that anyone can subscriber to messages on the Stellar network.

My goal for this tool is for it to be a highly reliable daemon for watching transactions on the network.