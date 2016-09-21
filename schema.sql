CREATE TYPE notificationstatus AS ENUM ('ready', 'pending', 'complete');
CREATE TABLE lookout_notifications (
  id SERIAL PRIMARY KEY,
  ledger integer,
  opjson text,
  opid bigint,
  status notificationstatus,
  subscriber_internal_id integer,
  viewpoint CHAR(56)
);

CREATE TABLE lookout_ledgers (
  seqnum integer,
  notificationcount integer,
  timestamp timestamp with time zone
);
CREATE UNIQUE INDEX on lookout_ledgers(seqnum);

CREATE TABLE lookout_subscribers (
  internal_id SERIAL PRIMARY KEY,
  external_id VARCHAR(255),
  expiration timestamp with time zone,
  notificationcount integer default 0, -- increasing simple way to limit
  active boolean default true,
  integration VARCHAR(12),
  integration_data jsonb
);
-- We can have multiple of the same external id
CREATE UNIQUE INDEX on lookout_subscribers(integration, external_id);


CREATE TABLE lookout_subscribers_accounts (
  subscriber_internal_id integer,
  accountid CHAR(56)
);
CREATE INDEX on lookout_subscribers_accounts(notificationcount);
CREATE INDEX on lookout_subscribers_accounts(accountid);
