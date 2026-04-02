# Observability Stack

Deploy once per cluster to monitor all environments.

## Deploy

```bash
# Update dependencies (downloads Grafana, Loki, Prometheus, Tempo charts)
helm dependency update ./k3s/observability

# Install
helm upgrade --install observability ./k3s/observability \
  --namespace observability --create-namespace
```

After deployment, configure DNS:
- Point `grafana.foodmission.eu` to your k3s cluster IP
- cert-manager will automatically provision TLS certificate (using nginx ingress)

## Access Grafana

Grafana is exposed publicly at: https://grafana.foodmission.eu

Default credentials: `admin` / `CHANGEME` (set in values.yaml)

Or access locally:
```bash
kubectl port-forward -n observability svc/observability-grafana 3000:80
# Open http://localhost:3000
```

## What's Included

- **Grafana**: Dashboards and visualization
- **Prometheus**: Metrics collection
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing
- **OpenTelemetry Collector**: Telemetry pipeline

## Configuration

Edit `values.yaml` to customize:
- Resource limits
- Retention periods (default: 7 days logs/traces, 15 days metrics)
- Storage sizes
- Datasource connections

## Uninstall

```bash
helm uninstall observability -n observability
kubectl delete namespace observability
```
