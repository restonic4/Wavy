#!/bin/bash

INSTALL_DIR="/var/www/Wavy"
BACKEND_SVC="wavy-backend.service"
FRONTEND_SVC="wavy-frontend.service"
SERVICES=("$BACKEND_SVC" "$FRONTEND_SVC")

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "======================================================="
echo "               WAVY UNINSTALLER"
echo "======================================================="
echo "WARNING: You are about to uninstall Wavy."
echo
echo "This action will:"
echo "  1. Stop and disable Wavy Backend and Frontend services."
echo "  2. Remove service configuration files from /etc/systemd/system/."
echo "  3. PERMANENTLY DELETE directory: $INSTALL_DIR"
echo "     (This will delete all data, logs, and databases stored inside that folder)."
echo "  4. (Optional) Remove Nginx website config and SSL certificates."
echo
echo "Note: Global dependencies (Node.js, Rust, SQLite, Git, Certbot) will NOT be removed."
echo "======================================================="

# Ask for confirmation
printf "Are you sure you want to proceed? (y/n): "
read answer < /dev/tty

case "$answer" in
  y|Y|yes|YES)
    echo "Proceeding with uninstallation..."
    ;;
  *)
    echo "Uninstallation aborted."
    exit 0
    ;;
esac

# Stop and Disable Services
echo "-------------------------------------------------------"
for SVC in "${SERVICES[@]}"; do
    echo "Processing $SVC..."

    # Check if systemctl exists (skip if docker/minimal env)
    if command -v systemctl &> /dev/null; then
        # Check if service is loaded
        if systemctl list-unit-files "$SVC" | grep -q "$SVC"; then
            # Stop if running
            if systemctl is-active --quiet "$SVC"; then
                echo "  Stopping $SVC..."
                systemctl stop "$SVC"
            fi
            # Disable to remove symlinks
            echo "  Disabling $SVC..."
            systemctl disable "$SVC" 2>/dev/null
        else
            echo "  $SVC is not loaded."
        fi
    else
        echo "  systemctl not found. Skipping service management."
    fi
done

# Remove Service Files
echo "-------------------------------------------------------"
for SVC in "${SERVICES[@]}"; do
    SVC_PATH="/etc/systemd/system/$SVC"
    if [ -f "$SVC_PATH" ]; then
        echo "Removing service file: $SVC_PATH"
        rm -f "$SVC_PATH"
    else
        echo "Service file $SVC_PATH not found (already removed?)."
    fi
done

# Reload Systemd
if command -v systemctl &> /dev/null; then
    echo "Reloading systemd daemon..."
    systemctl daemon-reload
    systemctl reset-failed
fi

# Remove Installation Directory
echo "-------------------------------------------------------"
if [ -d "$INSTALL_DIR" ]; then
    echo "Removing installation directory: $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
    echo "Directory removed."
else
    echo "Directory $INSTALL_DIR not found."
fi

# Nginx & Certbot Cleanup
echo "-------------------------------------------------------"
echo "               NGINX & SSL CLEANUP"
echo "-------------------------------------------------------"
printf "Do you want to remove the Nginx site configuration and SSL certificate? (y/n): "
read nginx_answer < /dev/tty

case "$nginx_answer" in
  y|Y|yes|YES)
    # We need the domain to find the specific files
    echo
    echo "Please enter the domain name you used for Wavy (e.g. wavy.example.com):"
    printf "> "
    read DOMAIN < /dev/tty

    if [ -z "$DOMAIN" ]; then
        echo "No domain entered. Skipping Nginx cleanup."
    else
        # Remove SSL Certificate (This stops the renewal cronjob for this specific site)
        if command -v certbot &> /dev/null; then
            echo "Removing SSL Certificate for $DOMAIN..."
            # --cert-name is generally the domain name. 
            # We use delete to remove it from Certbot's management/renewal list.
            certbot delete --cert-name "$DOMAIN" --non-interactive
        else
            echo "Certbot not found. Skipping SSL removal."
        fi

        # Remove Nginx Config Files
        SITE_AVAIL="/etc/nginx/sites-available/$DOMAIN"
        SITE_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
        FOUND_CONF=false

        if [ -f "$SITE_ENABLED" ]; then
            echo "Removing enabled site symlink: $SITE_ENABLED"
            rm -f "$SITE_ENABLED"
            FOUND_CONF=true
        fi

        if [ -f "$SITE_AVAIL" ]; then
            echo "Removing configuration file: $SITE_AVAIL"
            rm -f "$SITE_AVAIL"
            FOUND_CONF=true
        fi

        if [ "$FOUND_CONF" = true ]; then
             # Reload Nginx to apply changes
             if command -v systemctl &> /dev/null && systemctl is-active --quiet nginx; then
                echo "Reloading Nginx to apply changes..."
                systemctl reload nginx
             fi
             echo "Nginx configuration removed."
        else
             echo "No Nginx configuration files found for '$DOMAIN'."
        fi
    fi
    ;;
  *)
    echo "Skipping Nginx cleanup."
    ;;
esac

echo "-------------------------------------------------------"
echo "Uninstallation Complete."