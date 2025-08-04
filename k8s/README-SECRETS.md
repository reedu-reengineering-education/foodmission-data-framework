# Kubernetes Secrets Management

## Security Notice

This directory contains Kubernetes secret templates. **Never commit actual secret values to Git.**

## Quick Setup (Development)

1. Copy the template:

   ```bash
   cp secrets.template.yaml secrets.yaml
   ```

2. Replace placeholders with base64-encoded values:

   ```bash
   # Example for database password
   echo -n "your_actual_password" | base64
   ```

3. Apply to cluster:
   ```bash
   kubectl apply -f secrets.yaml
   ```

## Production Setup Options

### Option 1: Sealed Secrets (Recommended for GitOps)

1. Install Sealed Secrets controller:

   ```bash
   kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
   ```

2. Install kubeseal CLI:

   ```bash
   # macOS
   brew install kubeseal

   # Linux
   wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
   tar -xvzf kubeseal-0.24.0-linux-amd64.tar.gz kubeseal
   sudo install -m 755 kubeseal /usr/local/bin/kubeseal
   ```

3. Create sealed secret:
   ```bash
   kubectl create secret generic foodmission-secrets \
     --from-literal=DATABASE_PASSWORD="your_password" \
     --from-literal=JWT_SECRET="your_jwt_secret" \
     --dry-run=client -o yaml | \
     kubeseal -o yaml > sealed-secrets.yaml
   ```

### Option 2: External Secrets Operator

1. Install External Secrets Operator:

   ```bash
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
   ```

2. Configure with your secret management system (AWS Secrets Manager, Vault, etc.)

### Option 3: Manual Secret Management

Keep secrets.yaml in .gitignore and manage manually:

```bash
# Add to .gitignore
echo "k8s/secrets.yaml" >> .gitignore

# Create secrets manually on each environment
kubectl create secret generic foodmission-secrets \
  --from-literal=DATABASE_PASSWORD="your_password" \
  --from-literal=JWT_SECRET="your_jwt_secret" \
  --from-literal=JWT_EXPIRES_IN="36h" \
  --from-literal=REDIS_PASSWORD="your_redis_password" \
  --from-literal=KEYCLOAK_CLIENT_SECRET="your_keycloak_secret" \
  --from-literal=OPENFOODFACTS_API_KEY="your_api_key" \
  --from-literal=ENCRYPTION_KEY="your_encryption_key"
```

## Environment Variables Reference

| Variable               | Description                   | Example                |
| ---------------------- | ----------------------------- | ---------------------- |
| DATABASE_PASSWORD      | PostgreSQL password           | `secure_db_password`   |
| JWT_SECRET             | JWT signing secret            | `super_secret_jwt_key` |
| JWT_EXPIRES_IN         | JWT expiration time           | `36h`                  |
| REDIS_PASSWORD         | Redis authentication password | `redis_password`       |
| KEYCLOAK_CLIENT_SECRET | Keycloak client secret        | `keycloak_secret`      |
| OPENFOODFACTS_API_KEY  | OpenFoodFacts API key         | `api_key_value`        |
| ENCRYPTION_KEY         | Application encryption key    | `encryption_key`       |
