# SplitWatt — Fair Energy Split for Shared Housing

Split electricity bills fairly based on actual usage, or investigate why your units ran out faster than expected.

## Features
- **Split Mode** — Each roommate describes their usage in plain language. AI estimates each person's kWh consumption and calculates a fair split.
- **Investigate Mode** — Loaded electricity and it ran out fast? Describe your own usage and get a verdict on how much is unaccounted for.

## Tech Stack
- Frontend: Vanilla HTML/CSS/JS (single page, mobile-first)
- Backend: Node.js + Express
- AI: Vultr Serverless Inference (LLaMA)
- Hosting: Vultr Cloud Compute (Ubuntu 22.04, nginx reverse proxy)

## Setup

### Prerequisites
- Node.js 18+
- A Vultr account with Serverless Inference enabled

### Local Development
```bash
git clone https://github.com/YOURUSERNAME/splitwatt.git
cd splitwatt
npm install
cp .env.example .env
# Add your Vultr inference key to .env
npm start
```

### Environment Variables
Create a `.env` file:
```
VULTR_API_KEY=your_vultr_inference_key_here
LLM_BASE_URL=https://api.vultrinference.com/v1
PORT=3000
```

### Deploy to Vultr
```bash
# SSH into your Vultr instance
ssh root@YOUR_VULTR_IP

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
sudo apt install nginx -y

# Clone repo
git clone https://github.com/YOURUSERNAME/splitwatt.git
cd splitwatt
npm install

# Create .env with your key
nano .env

# Start app
npm start

# Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/splitwatt
```

Nginx config:
```nginx
server {
    listen 80;
    server_name YOUR_VULTR_IP;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/splitwatt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## How Vultr is Used
- **Cloud Compute**: Ubuntu 22.04 instance serving the Node.js backend via nginx
- **Serverless Inference**: LLaMA model processes natural language usage descriptions and returns kWh estimates + investigation verdicts

## License
MIT
