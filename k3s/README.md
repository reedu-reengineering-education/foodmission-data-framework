## FOODMISSION k3s

__Export your Hetzner Token__
```
export HCLOUD_TOKEN=<your_hetzner_token>
```

__setup cluster__
```
hetzner-k3s create --config cluster.yaml
helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx --namespace ingress-nginx --create-namespace -f nginx-values.yaml
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.19.2/cert-manager.yaml
kubectl apply -f ./foodmission-keycloak.yaml
```

__delete cluster__
```
hetzner-k3s delete --config cluster.yaml
```

__database migration__
```
kubectl apply -f foodmission-db-migrate.yaml -n foodmission
kubectl wait --for=condition=complete job/prisma-migrate -n foodmission
```

__pull and restart__
```
kubectl rollout restart deployment/api -n foodmission
```