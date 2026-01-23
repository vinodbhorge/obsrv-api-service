# ECR Deployment Setup

## AWS Configuration

### 1. Create OIDC Provider

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. Create IAM Role

Create `trust-policy.json` (replace YOUR_GITHUB_ORG/YOUR_REPO):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::522814700227:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
```

```bash
aws iam create-role --role-name GitHubActionsECRRole --assume-role-policy-document file://trust-policy.json
```

### 3. Attach ECR Policy

```bash
aws iam attach-role-policy \
  --role-name GitHubActionsECRRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
```

## GitHub Secrets

Add in Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::522814700227:role/GitHubActionsECRRole` |

## ECR Repository

**URL:** `522814700227.dkr.ecr.us-east-1.amazonaws.com/obsrv_services_lms_sb_obsrv_api_service`

**Region:** `us-east-1`

## Verify

```bash
aws ecr describe-images --repository-name obsrv_services_lms_sb_obsrv_api_service --region us-east-1
```
