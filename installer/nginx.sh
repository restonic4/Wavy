#!/bin/bash

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo "Nginx not found. Installing..."
    sudo apt install -y nginx
    
    # Ensure Nginx starts and stays on after reboot
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "Nginx installed and started."
else
    echo "Nginx is already installed: $(nginx -v 2>&1)"
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot and Nginx plugin..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Get User Input
echo
echo "Please enter your domain name (e.g., wavy.example.com):"
printf "> "
read DOMAIN < /dev/tty

if [ -z "$DOMAIN" ]; then
    echo "Domain cannot be empty. Exiting Nginx setup."
    exit 1
fi

echo
echo "Please enter your email address (used by Let's Encrypt for urgent renewal notices):"
printf "> "
read EMAIL < /dev/tty

# DNS Warning
echo
echo "IMPORTANT: Before we continue, ensure you have an 'A Record' in your DNS"
echo "pointing $DOMAIN to this server's IP address: $(curl -s ifconfig.me)"
echo "If the DNS hasn't propagated, Certbot will fail."
echo
echo "If you added the A record, wait until it propagates, you can use a tool like https://dnschecker.org/ to check its status. Check if the ip matches on the list. Otherwise wait."
echo
printf "Press ENTER when you are ready to proceed..."
read _ < /dev/tty

# Create the Nginx Configuration (HTTP ONLY FIRST)
# We create it listening on 80 first so Nginx starts successfully.
# Certbot will upgrade this to 443/SSL automatically later.

CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"

echo "Creating Nginx configuration at $CONFIG_FILE..."

cat > "$CONFIG_FILE" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 100M;

    # Rust Backend (API)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the Site
echo "Enabling site..."
ln -sf "$CONFIG_FILE" /etc/nginx/sites-enabled/

# Remove default nginx site if it exists to avoid conflicts
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "Disabling default Nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test and Reload Nginx
echo "Testing Nginx configuration..."
if ! nginx -t; then
    echo "Error: Nginx configuration test failed. Please check the config file."
    exit 1
fi

systemctl reload nginx
echo "Nginx reloaded with basic HTTP config."

# Run Certbot
echo
echo "Requesting SSL Certificate via Certbot..."
echo "This will automatically modify your Nginx config to add the SSL lines."

# --nginx: Use the nginx plugin
# --non-interactive: Don't ask questions (we provided flags)
# --agree-tos: Agree to terms
# --no-eff-email: Don't sign up for the newsletter
# --redirect: Automatically set up the 301 redirect from HTTP to HTTPS
# -d: The domain
# -m: The email
certbot --nginx --non-interactive --agree-tos --no-eff-email --redirect -d "$DOMAIN" -m "$EMAIL"

if [ $? -eq 0 ]; then
    echo
    echo "----------------------------------------------------------------"
    echo "SUCCESS! Your site should now be live at https://$DOMAIN"
    echo "Certbot has updated your Nginx config with the SSL keys."
    echo "----------------------------------------------------------------"
else
    echo
    echo "----------------------------------------------------------------"
    echo "Certbot failed. This is usually because DNS hasn't propagated yet."
    echo "Check that $DOMAIN points to this server IP and try running:"
    echo "sudo certbot --nginx -d $DOMAIN"
    echo "----------------------------------------------------------------"
fi