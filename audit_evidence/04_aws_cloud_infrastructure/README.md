# 04 — AWS & Cloud Infrastructure Security Evidence Drop-Zone

**Target Component:** AWS Production Environment (`ap-south-1`), Cloudflare R2 / CDN, Network & Database  
**Standard:** CIS AWS Foundations Benchmark v3.0 / CERT-In Cloud Guidelines  

---

## 1. Required Files in this Folder

The DevOps & Cloud Architect must provide:

1. `iam_credential_report.csv`: Freshly generated AWS IAM Credential Report:
   ```bash
   aws iam generate-credential-report
   aws iam get-credential-report --output text --query 'Content' | base64 -d > audit_evidence/04_aws_cloud_infrastructure/iam_credential_report.csv
   ```
2. `security_groups_inbound_rules.json`: Export of all security groups verifying zero `0.0.0.0/0` exposure on SSH (22), Postgres (5432), and Redis (6379):
   ```bash
   aws ec2 describe-security-groups --query "SecurityGroups[*].{GroupName:GroupName,GroupId:GroupId,IpPermissions:IpPermissions}" --output json > audit_evidence/04_aws_cloud_infrastructure/security_groups_inbound_rules.json
   ```
3. `s3_block_public_access_proof.json`: Proof of S3 Account & Bucket-Level Public Access Block:
   ```bash
   aws s3control get-public-access-block --account-id <AWS_ACCOUNT_ID> > audit_evidence/04_aws_cloud_infrastructure/s3_account_public_block.json
   aws s3api get-public-access-block --bucket adhocx-kyc-documents > audit_evidence/04_aws_cloud_infrastructure/s3_bucket_public_block.json
   ```
4. `rds_kms_encryption_status.json`: Proof of RDS PostgreSQL encryption using AWS KMS (AES-256):
   ```bash
   aws rds describe-db-instances --query "DBInstances[*].{DBIdentifier:DBInstanceIdentifier,Encrypted:StorageEncrypted,KmsKeyId:KmsKeyId,Public:PubliclyAccessible}" > audit_evidence/04_aws_cloud_infrastructure/rds_kms_encryption_status.json
   ```
5. `backup_restore_verification_log.md`: Documented evidence of a successful snapshot restore into an isolated staging RDS instance within the last 30 days.
6. `gitleaks_repo_scan.log`: Verification log from running `gitleaks detect` confirming zero credentials in git history.

---

## 2. Mandatory Acceptance Criteria for Cloud Sign-Off

- **AWS Root Account MFA Enabled** and zero active root access keys.
- **No IAM User with 0.0.0.0/0 SSH (Port 22) or Database (Port 5432)** ingress.
- **Database `PubliclyAccessible: false`** in private VPC subnet.
- **All S3 / Cloudflare R2 Buckets containing KYC or sensitive records are strictly private** with presigned URL access only.
- **Production secrets are injected via environment/Secrets Manager**, not committed to git.
