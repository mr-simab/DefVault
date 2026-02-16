# Deployment Guide

Essential deployment instructions for DefVault.

## Pre-Deployment

- Node.js 18+, PostgreSQL 12+, Redis
- SSL certificates (production)
- API keys (Google OAuth, VirusTotal, etc.)
- Environment variables configured (.env.example → .env)

## Local Development

```bash
git clone https://github.com/mr-simab/DefVault.git
cd DefVault && npm install

# Setup environment
cp .env.example .env
nano .env  # Configure variables

# Start services
docker-compose up -d

# Access: Frontend http://localhost:5173, API http://localhost:3000
```

## Docker Deployment

```bash
# Build images
docker build -t defvault-backend:latest ./backend
docker build -t defvault-frontend:latest ./frontend

# Run with compose
docker-compose up -d

# Check status
docker-compose logs -f backend
```

### Docker Compose (docker-compose.yml)

Use provided `docker-compose.yml` in project root. Configure `DB_PASSWORD` and other secrets before running.

## Kubernetes Deployment

```bash
# Create namespaces
kubectl create namespace defvault

# Deploy services
kubectl apply -f infrastructure/kubernetes/

# Verify
kubectl get pods -n defvault
kubectl logs -n defvault deployment/defvault-backend
```

### Secrets & ConfigMaps

```bash
# Store sensitive data
kubectl create secret generic defvault-secrets \
  --from-literal=db-password=YOUR_PASSWORD \
  --from-literal=jwt-private-key="$(cat jwt/private.key)" \
  -n defvault

# Configuration
kubectl create configmap defvault-config \
  --from-literal=NODE_ENV=production \
  -n defvault
```

## Database Setup

### PostgreSQL (Local)

```bash
createdb defvault
psql defvault < backend/database/schema.sql
```

### Supabase (Cloud)

```bash
# Update .env with Supabase connection string
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]"
```

## Redis Configuration

### Self-Hosted

```bash
docker run -d -p 6379:6379 redis:latest
```

### Cloud URL

```bash
# Update .env
REDIS_URL="redis://:password@host:port"
```

## SSL/TLS Setup

### Self-Signed (Development)

```bash
openssl req -x509 -newkey rsa:2048 -keyout private.key -out certificate.crt -days 365 -nodes
```

### Let's Encrypt (Production)

```bash
certbot certonly --standalone -d yourdomain.com
```

## Environment Variables

See `.env.example` for all required configurations:

- `NODE_ENV` - development or production
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_PRIVATE_KEY_PATH` - RS256 private key
- `JWT_PUBLIC_KEY_PATH` - RS256 public key
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `VIRUSTOTAL_API_KEY` - Threat intelligence

## Health Check

```bash
# Backend
curl http://localhost:3000/health

# Database
curl http://localhost:3000/api/health/db

# Redis
curl http://localhost:3000/api/health/redis
```

## Troubleshooting

### Database Connection Failed

```bash
# Test connection
psql -h localhost -U defvault_user -d defvault

# Check logs
kubectl logs pod-name -n defvault
```

### Redis Connection Timeout

```bash
# Verify running
redis-cli ping

# Check connection string
echo $REDIS_URL
```

### JWT Key Issues

```bash
# Verify keys exist
ls -la jwt/

# Regenerate if needed
node backend/scripts/generateKeys.js
```

### High Memory Usage

```bash
# Check Node memory
node --max-old-space-size=4096 backend/app.js

# Scale deployment
kubectl scale deployment defvault-backend --replicas=3 -n defvault
```

## Production Checklist

- [ ] SSL certificates installed
- [ ] Environment variables secured (use secret manager)
- [ ] Database backups configured
- [ ] Monitoring enabled (Prometheus/Grafana optional)
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] API keys rotated
- [ ] Audit logs enabled
- [ ] Health checks working
- [ ] Disaster recovery plan documented

## Additional Resources

- **Kubernetes**: See `infrastructure/kubernetes/` folder
- **Docker**: Configure `docker-compose.yml` as needed
- **Optional Tools**: See `infrastructure/optional/` for Prometheus, Grafana, Nginx configs
- **Database Schema**: `backend/config/database.schema.js`
