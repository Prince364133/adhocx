---
title: TLS, DNS and Certificates
description: Nginx hostname and certificate expectations, Cloudflare routing boundaries, and missing renewal automation.
---

# TLS, DNS and Certificates

**Evidence status:** Host routing and certificate paths were checked against
`infrastructure/nginx/production.conf` and deployment workflows. No DNS
provider account, live certificate, certificate store or production endpoint
was queried.

## Host routing and TLS termination

The Nginx gateway listens on HTTP and HTTPS and declares TLS 1.2/1.3. It
expects certificate and private-key files at:

```text
/etc/nginx/ssl/cert.pem
/etc/nginx/ssl/key.pem
```

The root `docker-compose.prod.yml` mounts the Nginx configuration and
certificate directory into the gateway. The host routing declared by Nginx
is:

| Name/path | Configured destination |
|---|---|
| `app.adhocx.com`, `m.adhocx.com` | Mobile Flutter Web; `/api/v1/` proxies to API |
| `admin.adhocx.com` | Admin; `/api/v1/` proxies to API |
| `api.adhocx.com` | API |
| Catch-all `/` | Redirects to `https://www.adhocx.com` |
| `adhocx.com`, `www.adhocx.com` | Nginx comments identify the Marketing site as Cloudflare Worker-hosted |

These are source-defined hostnames; they do not prove that the corresponding
DNS records exist or point to the intended service. The Cloudflare Worker
workflow deploys the Marketing app, but no DNS-record management workflow
was found.

## Certificate automation and limitations

The EC2 production workflow copies any available certificate files and
creates a self-signed certificate when the expected certificate file is
absent. That fallback is not a trusted public certificate and does not
provide renewal, expiry monitoring, domain validation or a Certificate
Authority workflow. No Certbot/ACME or automated certificate-renewal
workflow was found.

Do not treat the workflow's self-signed fallback as successful public TLS
provisioning. Before production traffic is enabled, the authorized
certificate/DNS owner must provide a valid certificate/key through the
approved secret or host-management process and define renewal and expiry
monitoring.

## Change checklist

For an approved hostname or certificate change:

1. Confirm the hostname, target service, change owner and rollback plan.
2. Verify the intended DNS provider/zone and record before modifying it;
   repository files do not contain the authoritative DNS inventory.
3. Obtain and validate the certificate chain, SANs/hostnames, validity dates
   and private-key match using approved tooling. Never paste or commit the
   private key.
4. Install the files at the configured gateway paths with restricted file
   permissions through the approved host/secret-management mechanism.
5. Validate Nginx configuration and TLS response in a non-production
   environment before reload.
6. Confirm HTTP/HTTPS routing, upstream health and the Marketing Worker
   hostname independently.
7. Record the change, expiry date, renewal owner and evidence location.

The gateway `/healthz` endpoint is a static Nginx response and does not
validate DNS, certificate trust or upstream health.

## Open operational gaps

- DNS records and their owner are not represented in repository
  configuration.
- Certificate issuance, renewal, expiry alerting and key rotation are not
  automated in the checked-in workflows.
- The production deploy's self-signed fallback can mask missing valid
  certificate provisioning.
- The live certificate/hostname mapping and current renewal status remain
  unverified.

## Sources

- `infrastructure/nginx/production.conf`
- `docker-compose.prod.yml`
- `.github/workflows/production-deploy.yml`
- `.github/workflows/deploy-marketing-cloudflare.yml`
- [Deployment overview](./deployment-overview.md)
- [CI/CD and release workflows](./ci-cd.md)
