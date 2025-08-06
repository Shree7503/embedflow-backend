# 🚀 EmbedFlow Setup Guide

## 📋 Prerequisites
- Docker and Docker Compose installed
- Node.js (for running services locally)
- Git

## 🔧 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/embedflow.git
cd embedflow
```

### 2. Start the Services

#### Option A: Full Docker Setup (Recommended for Production)
```bash
# Start all services with Docker
docker-compose up --build -d
```

#### Option B: Hybrid Setup (Development)
```bash
# Start only NGINX reverse proxy
docker-compose up nginx -d

# Run services locally (in separate terminals)
npm start --prefix ./user-service    # Runs on localhost:3001
npm start --prefix ./auth-service    # Runs on localhost:3002
```

### 3. Verify Setup
Check that all services are running:
```bash
# Check Docker containers
docker-compose ps

# Test the endpoints
curl localhost:8000/api/v1/users
curl localhost:8000/api/v1/auth
```

## 🌐 API Endpoints

| Service | Local Development | Through NGINX Proxy |
|---------|------------------|---------------------|
| User Service | `localhost:3001` | `localhost:8000/api/v1/users` |
| Auth Service | `localhost:3002` | `localhost:8000/api/v1/auth` |

## 🔍 Troubleshooting

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs nginx
docker-compose logs user-service
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart nginx
```

### Stop Services
```bash
docker-compose down
```

## 📁 Project Structure
```
embedflow/
├── gateway/
    ├── nginx.conf
    ├── Dockerfile
├── docker-compose.yml
├── user-service/
├── auth-service/
└── README.md
```

## ⚙️ Configuration
- **NGINX**: Runs on port 8000, proxies to backend services
- **Services**: Run on ports 3001 (users) and 3002 (auth)
- **Hot Reload**: Update `nginx.conf` and run `docker-compose restart nginx`
