# FoodMission Helm Chart

This folder is now a Helm chart for deploying FoodMission services.

## Structure
- `Chart.yaml`: Helm chart metadata
- `values.yaml`: Central config for all services and secrets
- `templates/`: All Kubernetes manifests as Helm templates

## Notes
- Do NOT store real secrets in `values.yaml` if checked into git. Use CI/CD or Helm secrets for production.
- Example secrets and config are provided in `values.yaml`.

## Ingress-NGINX and Cert-Manager Setup (Only Needed on a Fresh Cluster)

If your cluster does not already have ingress-nginx and cert-manager installed, run:

```sh
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  -f nginx-values.yaml

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.19.2/cert-manager.yaml
```

Example `nginx-values.yaml` for Hetzner Cloud load balancer:

```yaml
controller:
  service:
    annotations:
      # Tell Hetzner where to create the LB
      load-balancer.hetzner.cloud/location: fsn1
      # Use the private network for communication between LB and nodes
      load-balancer.hetzner.cloud/use-private-ip: "true"
      # Optional: Name your LB in the Hetzner console
      load-balancer.hetzner.cloud/name: "k3s-nginx-lb"
```

## Environment-Specific Configuration

For different environments (test, staging, prod), use separate values files:

- `values.test.yaml`
- `values.staging.yaml`
- `values.prod.yaml`

Each file should contain the configuration and secrets for its environment. Do NOT commit real secrets to git—use example or placeholder values in files you share.

To deploy with a specific environment file:

```sh
helm upgrade --install foodmission . -f values.staging.yaml
```

This approach keeps your environments isolated, reproducible, and easy to manage.

## Environment Isolation with Namespaces

For strong isolation between test, staging, and production, use a separate Kubernetes namespace for each environment. Set the `namespace` value in each environment's values file:

- `values.test.yaml`: `namespace: foodmission-test`
- `values.staging.yaml`: `namespace: foodmission-staging`
- `values.prod.yaml`: `namespace: foodmission-prod`

Deploy with:

```sh
helm upgrade --install foodmission-test . -f values.test.yaml
helm upgrade --install foodmission-staging . -f values.staging.yaml
helm upgrade --install foodmission-prod . -f values.prod.yaml
```

This ensures resources for each environment are fully separated and managed independently.

### Namespace Creation

By default, the chart assumes the namespace already exists. There are two ways to handle namespace creation:

**Option 1: Use `--create-namespace` flag (recommended for new deployments)**

```sh
helm upgrade --install foodmission-prod . -f values.prod.yaml --create-namespace --namespace foodmission-prod
```

This tells Helm to create the namespace before running any hooks or deploying resources.

**Option 2: Enable namespace creation in values**

Set `createNamespace: true` in your values file to have the chart create the namespace:

```yaml
createNamespace: true
namespace: foodmission-prod
```

> **Note:** If the namespace already exists and wasn't created by Helm, you'll get an ownership error. In that case, either delete the namespace first, add the required Helm labels manually, or use the default behavior (don't create the namespace in the chart).