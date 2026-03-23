# Digital Ocean Droplet Deployment Guide

## 1. Create a Droplet

1. Go to Digital Ocean and create a new Droplet
2. Choose:
   - **Image**: Ubuntu 24.04 LTS (or latest LTS)
   - **Size**: Start with $6/month (1GB RAM, 25GB SSD) — upgrade if needed
   - **Region**: Choose closest to your users
   - **Authentication**: Add your SSH key

## 2. Initial Droplet Setup (SSH into the Droplet)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Add current user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Create app directory
sudo mkdir -p /var/www/para-app
cd /var/www/para-app
```

## 3. Clone and Setup the App

```bash
# Clone your repo (or upload files)
git clone <your-repo-url> .
# Or if private, use SSH key:
# git clone git@github.com:yourusername/para-app.git .

# Create .env.prod with your environment variables
sudo nano .env.prod
```

### Required `.env.prod` variables:

```env
# Database (will be set via docker-compose env variables)
DATABASE_URL=postgresql://para:your-strong-password@postgres:5432/para

# Clerk (get from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Add any other environment variables your app needs
```

### Set file permissions:

```bash
sudo chown -R $USER:$USER /var/www/para-app
chmod 600 .env.prod
```

## 4. Update docker-compose.prod.yml for Your Database

Edit `docker-compose.prod.yml` environment variables or set them in shell:

```bash
export DB_USER=para
export DB_PASSWORD=your-strong-password-here
export DB_NAME=para
```

Or edit the file directly:

```yaml
postgres:
  environment:
    POSTGRES_USER: para
    POSTGRES_PASSWORD: your-strong-password-here
    POSTGRES_DB: para
```

## 5. Run Migrations and Start the App

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Run Prisma migrations
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# Start the app
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f app
```

## 6. Setup a Reverse Proxy (Nginx)

Install and configure Nginx to forward traffic to your app:

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/default
```

Replace the content with:

```nginx
upstream para_app {
    server localhost:3000;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://para_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 7. Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

# Replace your-domain.com with your actual domain
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## 8. Setup Auto-Restart on Reboot

Docker containers will auto-restart with the `restart: always` policy in docker-compose.prod.yml, but to ensure the services start when the Droplet restarts:

```bash
# Add to crontab
crontab -e
```

Add:

```
@reboot cd /var/www/para-app && docker compose -f docker-compose.prod.yml up -d
```

## 9. Monitoring and Maintenance

### Check app status:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

### Backup database:
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U para para > backup-$(date +%Y%m%d).sql
```

### Update app:
```bash
cd /var/www/para-app
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Run migrations after update:
```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

## 10. Troubleshooting

### App won't start:
```bash
docker compose -f docker-compose.prod.yml logs app
```

### Database connection issues:
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U para -d para
```

### Clear docker build cache:
```bash
docker system prune -a
```

## 11. DNS Setup

Point your domain to your Droplet's IP address:

1. Go to your domain registrar
2. Update A record to your Droplet's IP (find in Digital Ocean dashboard)
3. Wait for DNS to propagate (up to 48 hours, usually minutes)

---

**Cost estimation:**
- $6/month Droplet (1GB RAM) — fine for testing/small apps
- $12-24/month for production (2-4GB RAM)
- Database backups are included
