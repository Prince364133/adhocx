# AdhocX Production DevOps & CI/CD Secrets Guide

This document is the authoritative reference for setting up, managing, and maintaining the **AdhocX Production CI/CD Pipeline**, container registries (GHCR & AWS ECR), and AWS cloud deployment.

---

## 1. GitHub Secrets Catalog

Navigate to your GitHub Repository:
`Settings -> Secrets and variables -> Actions -> New repository secret`

Add the following secrets:

### A. AWS Cloud Credentials & ECR
| Secret Name | Description | Example / Required Format |
| :--- | :--- | :--- |
| `AWS_ACCESS_KEY_ID` | AWS IAM User access key with ECR and ECS permissions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM User secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Target AWS region (Default: `ap-south-1` Mumbai) | `ap-south-1` |
| `AWS_ECR_REGISTRY` | AWS ECR Registry URI | `123456789012.dkr.ecr.ap-south-1.amazonaws.com` |
| `AWS_ECS_CLUSTER` | AWS ECS Fargate Cluster Name | `adhocx-production` |
| `AWS_ECS_API_SERVICE` | AWS ECS API Service Name | `adhocx-api-service` |
| `AWS_ECS_ADMIN_SERVICE`| AWS ECS Admin Service Name | `adhocx-admin-service` |

### B. Production Database & Redis
| Secret Name | Description | Example / Required Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | Authoritative PostgreSQL + PostGIS connection string | `postgresql://user:pass@host:5432/adhocx?schema=public` |
| `REDIS_URL` | Production Redis / Valkey connection string | `redis://default:pass@redis-host:6379` |

### C. Security, Payments & Notifications
| Secret Name | Description | Example / Required Format |
| :--- | :--- | :--- |
| `JWT_SECRET` | 32+ character high-entropy key for access tokens | `prod_jwt_secret_key_32_characters!` |
| `JWT_REFRESH_SECRET` | 32+ character key for refresh tokens | `prod_refresh_secret_key_32_chars!` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | `...` |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay Webhook Signature Secret | `...` |
| `SMTP_HOST` | Email SMTP Host | `smtp.gmail.com` |
| `SMTP_PORT` | Email SMTP Port | `587` |
| `SMTP_USER` | Email SMTP Username | `adhocx.ofc@gmail.com` |
| `SMTP_PASS` | Email App Password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM_EMAIL` | Official Sender Email Address | `support@adhocx.com` |

---

## 2. GitHub Actions Workflows Overview

| Workflow | File | Triggers | Description |
| :--- | :--- | :--- | :--- |
| **CI Pipeline** | `.github/workflows/ci.yml` | Push & PR (`main`, `develop`) | Matrix linting, typechecking, vulnerability scanning, transient PostgreSQL+Redis spin-up, and live e2e test execution. |
| **Docker Publish** | `.github/workflows/docker-publish.yml` | Push to `main`, tags `v*.*.*`, manual dispatch | Multi-stage Buildx with layer cache; pushes to **GHCR** (`ghcr.io`) and **AWS ECR**; runs Trivy security scan. |
| **AWS Deploy** | `.github/workflows/deploy-aws.yml` | After Docker publish on `main`, manual dispatch | Runs Prisma schema sync, authenticates to AWS, and triggers zero-downtime rolling service updates on ECS. |

---

## 3. Container Images & Registries

### GitHub Container Registry (GHCR)
Images are automatically built and published under your GitHub organization / user namespace:
- `ghcr.io/prince364133/adhocx-api:latest` (and `:sha-<hash>`, `:v1.0.0`)
- `ghcr.io/prince364133/adhocx-admin:latest` (and `:sha-<hash>`, `:v1.0.0`)
- `ghcr.io/prince364133/adhocx-marketing:latest` (and `:sha-<hash>`, `:v1.0.0`)

### AWS Elastic Container Registry (ECR)
When `AWS_ACCESS_KEY_ID` is set, images are pushed to:
- `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/adhocx-api:latest`
- `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/adhocx-admin:latest`
- `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/adhocx-marketing:latest`

---

## 4. Local Full-Stack Docker Orchestration

To run the entire AdhocX platform locally with all services:

```bash
# 1. Build and boot all containers (PostGIS + Redis + API + Admin + Marketing)
docker compose up --build -d

# 2. Check container health
docker compose ps

# 3. View live logs
docker compose logs -f api

# 4. Tear down
docker compose down
```

**Port Mappings in Docker Compose:**
- **API Backend**: `http://localhost:7001` (Swagger docs: `/docs`, Health: `/api/v1/health`)
- **Admin Control Panel**: `http://localhost:7002`
- **Marketing Portal**: `http://localhost:8080`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
