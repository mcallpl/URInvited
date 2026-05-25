#!/bin/bash
# URInvited — Deploy to Digital Ocean
# Usage: ./deploy.sh

SERVER="root@64.227.108.128"
REMOTE_DIR="/var/www/html/urinvited"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  URInvited — Deploying to Digital Ocean"
echo "═══════════════════════════════════════════════════"
echo ""

rsync -avz \
    --exclude='.git' \
    --exclude='.claude' \
    --exclude='.DS_Store' \
    --exclude='.gitignore' \
    --exclude='deploy.sh' \
    ./ "${SERVER}:${REMOTE_DIR}/"

ssh "${SERVER}" "chown -R www-data:www-data ${REMOTE_DIR}"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy complete!"
echo "  Live at: https://webapps.peoplestar.com/URInvited/"
echo "═══════════════════════════════════════════════════"
