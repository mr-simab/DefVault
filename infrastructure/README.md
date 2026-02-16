# Infrastructure

Kubernetes and Docker configuration for DefVault deployment.

## Quick Start

### Docker Compose (Local Development)

```bash
docker-compose up -d
```

Services: PostgreSQL, Redis, Backend, Frontend

### Kubernetes (Production)

```bash
# Create namespaces
kubectl apply -f kubernetes/namespaces.yaml

# Deploy services
kubectl apply -f kubernetes/*.yaml
```

## Files

- `kubernetes/namespaces.yaml` - Namespace definitions (defvault-core, defvault-enterprise, defvault-personal)
- `kubernetes/backend-deployment.yaml` - Backend service deployment with health probes
- `kubernetes/frontend-deployment.yaml` - Frontend service with readiness probe
- `kubernetes/ingress.yaml` - Ingress routing configuration
- `optional/` - Monitoring, Grafana dashboards, Prometheus config, Nginx reverse proxy

## Configuration

See `.env.example` in project root for required environment variables.

Database, Redis, JWT keys, and API credentials must be configured before deployment.

## Documentation

For detailed deployment instructions, see [../docs/DEPLOYMENT-GUIDE.md](../docs/DEPLOYMENT-GUIDE.md)

