# FOODMISSION Data Framework - Kubernetes Deployment

This directory contains Kubernetes manifests and deployment scripts for the FOODMISSION Data Framework.

## Overview

The FOODMISSION Data Framework is deployed as a scalable, highly available application on Kubernetes with the following components:

- **API Application**: NestJS-based REST API
- **Database**: PostgreSQL (external dependency)
- **Cache**: Redis (external dependency)
- **Authentication**: Keycloak integration (external dependency)
- **Monitoring**: Prometheus metrics and health checks
- **Ingress**: NGINX Ingress Controller with SSL termination

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│ Ingress (NGINX) │────│   API Pods      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │────│     Redis       │
                       └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Keycloak     │────│   Monitoring    │
                       └─────────────────┘    └─────────────────┘
```

## Files Structure

```
k8s/
├── namespace.yaml              # Kubernetes namespace
├── configmap.yaml             # Application configuration
├── secrets.yaml               # Sensitive configuration
├── rbac.yaml                  # Service account and permissions
├── deployment.yaml            # Main application deployment
├── service.yaml               # Service definitions
├── ingress.yaml               # Ingress configuration
├── hpa.yaml                   # Horizontal Pod Autoscaler
├── pdb.yaml                   # Pod Disruption Budget
├── monitoring.yaml            # Prometheus monitoring
├── network-policy.yaml        # Network security policies
├── kustomization.yaml         # Kustomize configuration
├── deploy.sh                  # Deployment script
├── patches/
│   └── production.yaml        # Production environment patches
└── README.md                  # This file
```

## Prerequisites

Before deploying, ensure you have:

1. **Kubernetes Cluster**: v1.20+ with RBAC enabled
2. **kubectl**: Configured to access your cluster
3. **kustomize**: v3.8+ for manifest management
4. **NGINX Ingress Controller**: Installed in your cluster
5. **cert-manager**: For SSL certificate management (optional)
6. **Prometheus Operator**: For monitoring (optional)

### External Dependencies

The following services must be available:

- **PostgreSQL**: Database server
- **Redis**: Cache server
- **Keycloak**: Authentication server

## Configuration

### Environment Variables

Configuration is managed through ConfigMaps and Secrets:

#### ConfigMap (`configmap.yaml`)
- Application settings
- Database connection parameters
- External service URLs
- Feature flags

#### Secrets (`secrets.yaml`)
- Database passwords
- JWT secrets
- API keys
- Encryption keys

**Important**: Update the base64-encoded values in `secrets.yaml` before deployment.

### Image Configuration

Update the image reference in `kustomization.yaml`:

```yaml
images:
- name: foodmission/data-framework
  newTag: v1.0.0  # Update to your desired version
```

### Ingress Configuration

Update the hostname in `ingress.yaml`:

```yaml
rules:
- host: api.your-domain.com  # Update to your domain
```

## Deployment

### Quick Deployment

```bash
# Deploy with default settings
./deploy.sh

# Deploy with specific image tag
IMAGE_TAG=v1.0.0 ./deploy.sh

# Deploy to specific environment
ENVIRONMENT=staging ./deploy.sh
```

### Manual Deployment

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Apply secrets (update values first!)
kubectl apply -f secrets.yaml

# Deploy using kustomize
kustomize build . | kubectl apply -f -

# Wait for deployment
kubectl rollout status deployment/foodmission-api -n foodmission
```

### Deployment Script Options

```bash
./deploy.sh deploy    # Deploy application (default)
./deploy.sh rollback  # Rollback to previous version
./deploy.sh cleanup   # Remove all resources
./deploy.sh status    # Show deployment status
```

## Scaling

### Horizontal Pod Autoscaler (HPA)

The application automatically scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Custom metrics (requests per second)

Configuration:
- **Min replicas**: 3
- **Max replicas**: 10
- **Scale down**: Conservative (5 minutes stabilization)
- **Scale up**: Aggressive (1 minute stabilization)

### Manual Scaling

```bash
# Scale to specific number of replicas
kubectl scale deployment foodmission-api --replicas=5 -n foodmission

# Update HPA settings
kubectl patch hpa foodmission-api-hpa -n foodmission -p '{"spec":{"maxReplicas":20}}'
```

## Monitoring

### Health Checks

The application provides three health check endpoints:

- `/health` - Overall health status
- `/health/ready` - Readiness probe (database connectivity)
- `/health/live` - Liveness probe (application status)

### Prometheus Metrics

Metrics are exposed at `/metrics` endpoint and include:
- HTTP request metrics
- Database connection metrics
- Custom business metrics
- Node.js runtime metrics

### Alerts

Prometheus alerts are configured for:
- High error rates (>10% 5xx responses)
- High latency (>1s 95th percentile)
- Application downtime
- High resource usage

## Security

### Network Policies

Network policies restrict traffic to:
- **Ingress**: Only from ingress controller and monitoring
- **Egress**: Only to required services (database, cache, external APIs)

### RBAC

Service account with minimal permissions:
- Read ConfigMaps and Secrets
- Read Pods for health checks
- Read Services for service discovery

### Pod Security

- Non-root user execution
- Read-only root filesystem
- No privilege escalation
- Dropped capabilities

## Troubleshooting

### Common Issues

#### Pods not starting
```bash
# Check pod status
kubectl get pods -n foodmission

# Check pod logs
kubectl logs -f deployment/foodmission-api -n foodmission

# Describe pod for events
kubectl describe pod <pod-name> -n foodmission
```

#### Database connection issues
```bash
# Check database connectivity
kubectl exec -it deployment/foodmission-api -n foodmission -- nc -zv postgres-service 5432

# Check database credentials
kubectl get secret foodmission-secrets -n foodmission -o yaml
```

#### Ingress not working
```bash
# Check ingress status
kubectl get ingress -n foodmission

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Debugging Commands

```bash
# Port forward to local machine
kubectl port-forward service/foodmission-api-service 8080:80 -n foodmission

# Execute shell in pod
kubectl exec -it deployment/foodmission-api -n foodmission -- /bin/sh

# Check resource usage
kubectl top pods -n foodmission

# View events
kubectl get events -n foodmission --sort-by='.lastTimestamp'
```

## Maintenance

### Updates

1. Build and push new Docker image
2. Update image tag in `kustomization.yaml`
3. Deploy using the deployment script
4. Monitor rollout status

### Backup

Ensure regular backups of:
- Database (PostgreSQL)
- Configuration (ConfigMaps and Secrets)
- Persistent volumes (if any)

### Monitoring

Regular monitoring should include:
- Application metrics and alerts
- Resource usage trends
- Error rates and latency
- Security audit logs

## Environment-Specific Configurations

### Development
- Single replica
- Relaxed resource limits
- Debug logging enabled
- Development ingress hostname

### Staging
- 2 replicas
- Production-like resources
- Staging database
- Staging ingress hostname

### Production
- 3+ replicas with HPA
- Strict resource limits
- Production database
- Production ingress hostname
- Enhanced monitoring and alerting

## Support

For issues and questions:
1. Check application logs
2. Review Kubernetes events
3. Consult monitoring dashboards
4. Contact the development team

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Kustomize Documentation](https://kustomize.io/)