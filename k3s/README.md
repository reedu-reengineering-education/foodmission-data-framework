# FoodMission K3s Deployment

Simple Helm-based deployment for FoodMission on k3s with CloudNativePG.

## Quick Deploy

```bash
# Deploy to production
helm upgrade --install foodmission ./k3s \
  -f ./k3s/environments/prod/values.yaml \
  --namespace foodmission-prod --create-namespace

# Deploy to staging
helm upgrade --install foodmission ./k3s \
  -f ./k3s/environments/staging/values.yaml \
  --namespace foodmission-staging --create-namespace
```

## Structure

```
k3s/
├── infra/          # Database (CNPG), backups, certificates
├── app/            # API, Keycloak, ingress
├── observability/  # Standalone chart - deploy once per cluster
└── environments/   # Environment configs (test, staging, prod)
```

Observability is NOT part of the main deployment. It's a separate chart deployed once to monitor all environments.

## Prerequisites

1. **CNPG operator** (required for database):
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.24/releases/cnpg-1.24.0.yaml
   ```

2. **CNPG kubectl plugin** (optional, for easier management):
   ```bash
   # Install via krew
   kubectl krew install cnpg
   
   # Or download directly
   curl -sSfL https://github.com/cloudnative-pg/cloudnative-pg/raw/main/hack/install-cnpg-plugin.sh | sh -s -- -b /usr/local/bin
   ```

3. **cert-manager** (optional, for TLS):
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.19.2/cert-manager.yaml
   ```

## Deploy Observability (Once Per Cluster)

Observability runs in its own namespace and monitors all environments:

```bash
helm dependency update ./k3s/observability
helm upgrade --install observability ./k3s/observability \
  --namespace observability --create-namespace
```

Access Grafana:
```bash
kubectl port-forward -n observability svc/observability-grafana 3000:80
# Open http://localhost:3000 (admin/prom-operator)
```

## Common Commands

```bash
# Preview changes before deploying
helm template foodmission ./k3s -f ./k3s/environments/prod/values.yaml

# Check deployment status
kubectl get pods -n foodmission-prod

# Check database status (with plugin)
kubectl cnpg status foodmission-pg -n foodmission-prod

# Check database status (without plugin)
kubectl get cluster -n foodmission-prod
kubectl get pods -n foodmission-prod -l cnpg.io/cluster=foodmission-pg

# Create manual backup (with plugin)
kubectl cnpg backup foodmission-pg -n foodmission-prod

# Create manual backup (without plugin)
kubectl create -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: backup-$(date +%Y%m%d-%H%M%S)
  namespace: foodmission-prod
spec:
  cluster:
    name: foodmission-pg
EOF

# View logs
kubectl logs -n foodmission-prod -l app=api --tail=100 -f

# Uninstall
helm uninstall foodmission -n foodmission-prod
```

## Configuration

Edit environment-specific values in `environments/{test,staging,prod}/values.yaml`:

- Database passwords and credentials
- Domain names and TLS settings
- Resource limits and replica counts
- Backup configuration (S3 credentials)

## Backup & Restore

Backups are configured in `infra/values.yaml` and use S3-compatible storage:

```bash
# List backups
kubectl get backup -n foodmission-prod

# Restore from backup (see infra/templates/cnpg-cluster.yaml)
# Set bootstrap.recovery.source in values file
```

## Troubleshooting

```bash
# Check all resources
kubectl get all -n foodmission-prod

# Database issues
kubectl get cluster -n foodmission-prod
kubectl describe cluster foodmission-pg -n foodmission-prod
kubectl logs -n foodmission-prod foodmission-pg-1

# API issues
kubectl describe pod -n foodmission-prod -l app=api
kubectl logs -n foodmission-prod -l app=api

# Ingress issues
kubectl describe ingress -n foodmission-prod
```

## Security

- Never commit real secrets to git
- Use `CHANGEME` placeholders in example files
- Store production secrets in CI/CD or external secret management
- Enable TLS for production
- Rotate database passwords regularly
