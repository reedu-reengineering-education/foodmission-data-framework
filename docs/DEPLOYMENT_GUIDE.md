# Deployment Guide

This guide covers deployment strategies for the FOODMISSION Data Framework across different environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Deployments](#cloud-deployments)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Observability](#monitoring-and-observability)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The FOODMISSION Data Framework supports multiple deployment strategies:

- **Docker Compose**: For development and simple production deployments
- **Kubernetes**: For scalable, production-ready deployments
- **Cloud Platforms**: AWS, GCP, Azure with managed services
- **CI/CD**: Automated deployments with GitHub Actions

## Prerequisites

### General Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local builds)
- Git

### Kubernetes Requirements

- Kubernetes 1.24+
- kubectl configured
- Helm 3.0+ (optional)

### Cloud Requirements

- Cloud CLI tools (aws-cli, gcloud, az)
- Appropriate cloud permissions
- Container registry access

## Environment Configuration

### Environment Variables

Create environment-specific configuration files:

#### Development (.env.dev)

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/foodmission_dev
DATABASE_URL_TEST=postgresql://postgres:password@localhost:5432/foodmission_test

# Redis
REDIS_URL=redis://localhost:6379

# Keycloak
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=foodmission
KEYCLOAK_CLIENT_ID=foodmission-api
KEYCLOAK_CLIENT_SECRET=dev-secret

# OpenFoodFacts
OPENFOODFACTS_API_URL=https://world.openfoodfacts.org
OPENFOODFACTS_RATE_LIMIT=100

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

#### Staging (.env.staging)

```env
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Database (use managed database service)
DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/foodmission_staging

# Redis (use managed Redis service)
REDIS_URL=redis://staging-redis.example.com:6379

# Keycloak
KEYCLOAK_BASE_URL=https://auth-staging.example.com
KEYCLOAK_REALM=foodmission
KEYCLOAK_CLIENT_ID=foodmission-api
KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}

# OpenFoodFacts
OPENFOODFACTS_API_URL=https://world.openfoodfacts.org
OPENFOODFACTS_RATE_LIMIT=1000

# Security
CORS_ORIGINS=https://app-staging.example.com

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
SENTRY_DSN=${SENTRY_DSN}
```

#### Production (.env.prod)

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database (use managed database service with connection pooling)
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/foodmission_prod

# Redis (use managed Redis cluster)
REDIS_URL=redis://prod-redis.example.com:6379

# Keycloak
KEYCLOAK_BASE_URL=https://auth.example.com
KEYCLOAK_REALM=foodmission
KEYCLOAK_CLIENT_ID=foodmission-api
KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}

# OpenFoodFacts
OPENFOODFACTS_API_URL=https://world.openfoodfacts.org
OPENFOODFACTS_RATE_LIMIT=5000

# Security
CORS_ORIGINS=https://app.example.com

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
SENTRY_DSN=${SENTRY_DSN}
NEW_RELIC_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
```

## Docker Deployment

### Single Container Deployment

#### Build and Run

```bash
# Build the application
docker build -t foodmission-data-framework:latest .

# Run with environment file
docker run -d \
  --name foodmission-api \
  --env-file .env.prod \
  -p 3000:3000 \
  foodmission-data-framework:latest
```

### Docker Compose Deployment

#### Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    env_file:
      - .env.dev
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run start:dev

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: foodmission_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: foodmission-data-framework:latest
    ports:
      - '3000:3000'
    env_file:
      - .env.prod
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/v1/health']
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### Deploy with Docker Compose

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# Scale the application
docker-compose -f docker-compose.prod.yml up -d --scale app=5
```

## Kubernetes Deployment

### Namespace and Configuration

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: foodmission
  labels:
    name: foodmission
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: foodmission-config
  namespace: foodmission
data:
  NODE_ENV: 'production'
  PORT: '3000'
  LOG_LEVEL: 'info'
  OPENFOODFACTS_API_URL: 'https://world.openfoodfacts.org'
  ENABLE_METRICS: 'true'
  METRICS_PORT: '9090'
```

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: foodmission-secrets
  namespace: foodmission
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  KEYCLOAK_CLIENT_SECRET: <base64-encoded-keycloak-secret>
```

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: foodmission-api
  namespace: foodmission
  labels:
    app: foodmission-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: foodmission-api
  template:
    metadata:
      labels:
        app: foodmission-api
    spec:
      containers:
        - name: api
          image: foodmission-data-framework:latest
          ports:
            - containerPort: 3000
            - containerPort: 9090
          envFrom:
            - configMapRef:
                name: foodmission-config
            - secretRef:
                name: foodmission-secrets
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/v1/health/liveness
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health/readiness
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
```

### Service and Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: foodmission-api-service
  namespace: foodmission
  labels:
    app: foodmission-api
spec:
  selector:
    app: foodmission-api
  ports:
    - name: http
      port: 80
      targetPort: 3000
    - name: metrics
      port: 9090
      targetPort: 9090
  type: ClusterIP
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: foodmission-api-ingress
  namespace: foodmission
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: '100'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: foodmission-api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: foodmission-api-service
                port:
                  number: 80
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: foodmission-api-hpa
  namespace: foodmission
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: foodmission-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or use the deployment script
./k8s/deploy.sh

# Check deployment status
kubectl get pods -n foodmission
kubectl get services -n foodmission
kubectl get ingress -n foodmission

# View logs
kubectl logs -f deployment/foodmission-api -n foodmission

# Scale deployment
kubectl scale deployment foodmission-api --replicas=5 -n foodmission
```

## Cloud Deployments

### AWS Deployment

#### ECS with Fargate

```json
{
  "family": "foodmission-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "foodmission-api",
      "image": "account.dkr.ecr.region.amazonaws.com/foodmission-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:foodmission/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/foodmission-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/v1/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### EKS Deployment

```bash
# Create EKS cluster
eksctl create cluster --name foodmission-cluster --region us-east-1

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name foodmission-cluster

# Deploy application
kubectl apply -f k8s/

# Set up ALB Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.4.4/docs/install/iam_policy.json
```

### Google Cloud Platform

#### Cloud Run Deployment

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: foodmission-api
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '10'
        run.googleapis.com/cpu-throttling: 'false'
    spec:
      containerConcurrency: 100
      containers:
        - image: gcr.io/project-id/foodmission-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-url
                  key: url
          resources:
            limits:
              cpu: 1000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /api/v1/health/liveness
              port: 3000
            initialDelaySeconds: 30
```

```bash
# Deploy to Cloud Run
gcloud run services replace cloudrun.yaml --region=us-central1

# Set up custom domain
gcloud run domain-mappings create --service=foodmission-api --domain=api.example.com
```

#### GKE Deployment

```bash
# Create GKE cluster
gcloud container clusters create foodmission-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# Get credentials
gcloud container clusters get-credentials foodmission-cluster --zone=us-central1-a

# Deploy application
kubectl apply -f k8s/
```

### Azure Deployment

#### Container Instances

```bash
# Create resource group
az group create --name foodmission-rg --location eastus

# Create container instance
az container create \
  --resource-group foodmission-rg \
  --name foodmission-api \
  --image foodmission-data-framework:latest \
  --dns-name-label foodmission-api \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables DATABASE_URL=$DATABASE_URL \
  --cpu 1 \
  --memory 2
```

#### AKS Deployment

```bash
# Create AKS cluster
az aks create \
  --resource-group foodmission-rg \
  --name foodmission-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group foodmission-rg --name foodmission-cluster

# Deploy application
kubectl apply -f k8s/
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:all
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}

    steps:
      - uses: actions/checkout@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Output image
        id: image
        run: echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          # Update Kubernetes deployment
          kubectl set image deployment/foodmission-api api=${{ needs.build.outputs.image }} -n foodmission-staging
          kubectl rollout status deployment/foodmission-api -n foodmission-staging

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          # Update Kubernetes deployment
          kubectl set image deployment/foodmission-api api=${{ needs.build.outputs.image }} -n foodmission-prod
          kubectl rollout status deployment/foodmission-api -n foodmission-prod
```

### Deployment Scripts

#### Kubernetes Deployment Script

```bash
#!/bin/bash
# k8s/deploy.sh

set -e

NAMESPACE=${1:-foodmission}
ENVIRONMENT=${2:-production}
IMAGE_TAG=${3:-latest}

echo "Deploying to $ENVIRONMENT environment in namespace $NAMESPACE"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap-$ENVIRONMENT.yaml
kubectl apply -f secrets-$ENVIRONMENT.yaml

# Update deployment with new image
kubectl set image deployment/foodmission-api api=foodmission-data-framework:$IMAGE_TAG -n $NAMESPACE

# Apply other resources
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress-$ENVIRONMENT.yaml
kubectl apply -f hpa.yaml

# Wait for rollout to complete
kubectl rollout status deployment/foodmission-api -n $NAMESPACE

echo "Deployment completed successfully!"

# Show status
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE
```

#### Docker Deployment Script

```bash
#!/bin/bash
# scripts/deploy-docker.sh

set -e

ENVIRONMENT=${1:-production}
IMAGE_TAG=${2:-latest}

echo "Deploying Docker containers for $ENVIRONMENT environment"

# Pull latest images
docker-compose -f docker-compose.$ENVIRONMENT.yml pull

# Stop existing containers
docker-compose -f docker-compose.$ENVIRONMENT.yml down

# Start new containers
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# Wait for health checks
echo "Waiting for application to be healthy..."
timeout 60 bash -c 'until curl -f http://localhost:3000/api/v1/health; do sleep 2; done'

echo "Deployment completed successfully!"

# Show status
docker-compose -f docker-compose.$ENVIRONMENT.yml ps
```

## Monitoring and Observability

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'foodmission-api'
    static_configs:
      - targets: ['foodmission-api-service:9090']
    metrics_path: /api/v1/metrics
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "FOODMISSION API Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

### Logging Configuration

```yaml
# logging/fluentd.conf
<source>
@type forward
port 24224
bind 0.0.0.0
</source>

<match foodmission.**>
@type elasticsearch
host elasticsearch
port 9200
index_name foodmission
type_name _doc
</match>
```

## Security Considerations

### Network Security

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: foodmission-api-netpol
  namespace: foodmission
spec:
  podSelector:
    matchLabels:
      app: foodmission-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to: []
      ports:
        - protocol: TCP
          port: 5432 # PostgreSQL
        - protocol: TCP
          port: 6379 # Redis
        - protocol: TCP
          port: 443 # HTTPS
```

### Pod Security Policy

```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: foodmission-api-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it deployment/foodmission-api -n foodmission -- npm run db:migrate:status

# Check database logs
kubectl logs -f deployment/postgres -n foodmission

# Test database connection
kubectl exec -it deployment/foodmission-api -n foodmission -- psql $DATABASE_URL -c "SELECT 1"
```

#### Memory Issues

```bash
# Check memory usage
kubectl top pods -n foodmission

# Increase memory limits
kubectl patch deployment foodmission-api -n foodmission -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
```

#### Performance Issues

```bash
# Check metrics
curl http://localhost:9090/api/v1/metrics

# Check slow queries
kubectl logs -f deployment/foodmission-api -n foodmission | grep "slow query"

# Scale up deployment
kubectl scale deployment foodmission-api --replicas=5 -n foodmission
```

### Health Check Endpoints

```bash
# Application health
curl http://localhost:3000/api/v1/health

# Readiness check
curl http://localhost:3000/api/v1/health/readiness

# Liveness check
curl http://localhost:3000/api/v1/health/liveness

# Metrics
curl http://localhost:3000/api/v1/metrics
```

### Log Analysis

```bash
# View application logs
kubectl logs -f deployment/foodmission-api -n foodmission

# Search for errors
kubectl logs deployment/foodmission-api -n foodmission | grep ERROR

# Follow logs with timestamps
kubectl logs -f deployment/foodmission-api -n foodmission --timestamps=true
```

This deployment guide provides comprehensive instructions for deploying the FOODMISSION Data Framework across different environments and platforms, ensuring scalability, security, and reliability.
