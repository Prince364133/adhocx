---
title: Shared Infrastructure Services
description: Redis, PostgreSQL, H3 and notification infrastructure used across integrations.
---

# Shared Infrastructure Services

**Evidence status:** Verified against API Redis, database and location
services.

## Redis

Redis provides:

- cache and rate limiting
- token revocation
- dispatch offer state
- live pub/sub
- stream-ticket support
- distributed scheduler/lock primitives

The Redis module has graceful fallback behavior where explicitly implemented,
but fallback behavior is instance-local and must not be considered distributed.

## PostgreSQL and PostGIS

PostgreSQL is the authoritative record for all external-provider follow-up
state. PostGIS/PostgreSQL deployment infrastructure provides the geospatial
database baseline.

External provider events must be reconciled with PostgreSQL records rather
than being treated as the only system of record.

## H3

H3 spatial indexing supports:

- office and employee location indexes
- pickup-location indexing
- nearby-driver candidate lookup
- dispatch rings

H3 is a spatial indexing aid. Road distance and route time may require a
provider/route adapter for authoritative road results.

## Notification Queue

The API contains a notification queue/service layer that coordinates:

- in-app notifications
- Firebase push
- MSG91 SMS
- campaign/audience workflows

Queue/notification delivery status must remain separate from business-state
completion.
