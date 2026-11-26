---
title: Swagger API Reference
description: Interactive API reference generated from the NestJS controllers.
---

# Swagger API reference

The API generates its OpenAPI document from the registered NestJS controllers
when the server starts. In local development, open:

- [Swagger UI](http://localhost:7001/docs)
- [OpenAPI JSON](http://localhost:7001/docs-json)

The Swagger document includes the API's registered controller operations and
DTO schemas. Route and DTO changes are reflected after restarting the API.

Swagger is disabled by default in production. Setting `ENABLE_SWAGGER=true`
explicitly enables it; review access controls before doing that in a production
environment.

To point the documentation site's **API Reference (Swagger)** navigation item
at another API, set `API_DOCS_URL` at build time.
