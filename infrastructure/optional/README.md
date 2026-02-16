# Optional Infrastructure Tools

This folder contains optional infrastructure files for monitoring, logging, and reverse proxy configuration.

## Files

- **prometheus.yml** - Prometheus scrape configuration for metrics collection
- **grafana-dashboard.json** - Pre-built Grafana dashboard for monitoring
- **nginx.conf** - Nginx reverse proxy configuration (alternative to Kubernetes Ingress)

## Usage

These files are optional and not required for a minimal DefVault deployment.

### Deploy Prometheus & Grafana

```bash
kubectl apply -f prometheus.yml
kubectl apply -f grafana-dashboard.json
```

### Use Nginx (Non-Kubernetes)

Copy `nginx.conf` to your nginx installation and restart:

```bash
cp nginx.conf /etc/nginx/sites-available/defvault
sudo systemctl restart nginx
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

See main infrastructure guide for more details: [../README.md](../README.md)
