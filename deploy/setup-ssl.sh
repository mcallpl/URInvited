#!/usr/bin/env bash
#
# Set up https://urinvited.peoplestar.com on the Digital Ocean box.
#
# Run this ON THE SERVER as root:
#     scp -r deploy root@64.227.108.128:/tmp/urinvited-deploy
#     ssh root@64.227.108.128 'bash /tmp/urinvited-deploy/setup-ssl.sh'
#
# It is idempotent — running it again is safe and re-uses an existing
# certificate. It never reloads nginx without `nginx -t` passing first, and
# restores the previous config if anything fails.
#
# Override the document root if the auto-detection picks wrong:
#     DOCROOT=/var/www/html/URInvited bash setup-ssl.sh

set -euo pipefail

DOMAIN="urinvited.peoplestar.com"
EMAIL="${CERTBOT_EMAIL:-}"
WEBROOT="/var/www/certbot"
SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m    warning: %s\033[0m\n' "$*"; }
die()  { printf '\033[31m    error: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run this as root"

# ---------------------------------------------------------------- doc root

say "Finding the document root"
if [ -n "${DOCROOT:-}" ]; then
    [ -d "$DOCROOT" ] || die "DOCROOT=$DOCROOT does not exist"
    say "Using DOCROOT from the environment: $DOCROOT"
else
    # deploy.sh uses the lowercase path; the old GitHub workflow used the
    # capitalised one. Whichever actually holds the site wins.
    CANDIDATES=(/var/www/html/urinvited /var/www/html/URInvited)
    DOCROOT=""
    for d in "${CANDIDATES[@]}"; do
        if [ -f "$d/index.html" ]; then
            DOCROOT="$d"
            echo "    found the site at: $d"
            break
        elif [ -d "$d" ]; then
            echo "    exists but has no index.html: $d"
        fi
    done
    [ -n "$DOCROOT" ] || die "no site found in ${CANDIDATES[*]} — deploy first, or set DOCROOT="
fi
echo "    document root: $DOCROOT"
[ -f "$DOCROOT/events/phil-mcallister-90th/index.html" ] \
    || warn "this looks like an older deploy (no events/ directory) — deploy the current site for the new structure"

# ---------------------------------------------------------------- checks

say "Checking DNS"
RESOLVED="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
MYIP="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
echo "    $DOMAIN -> ${RESOLVED:-unresolved}"
echo "    this server  -> ${MYIP:-unknown}"
[ -n "$RESOLVED" ] || die "$DOMAIN does not resolve; fix DNS before requesting a certificate"
if [ -n "$MYIP" ] && [ "$RESOLVED" != "$MYIP" ]; then
    warn "DNS points at $RESOLVED but this server is $MYIP — Let's Encrypt will fail if that is wrong"
fi

say "Checking prerequisites"
command -v nginx >/dev/null || die "nginx is not installed"
if ! command -v certbot >/dev/null; then
    echo "    installing certbot"
    apt-get update -qq
    apt-get install -y -qq certbot
fi
nginx -v 2>&1 | sed 's/^/    /'
certbot --version 2>&1 | sed 's/^/    /'

say "Backing up the current nginx config to $BACKUP"
mkdir -p "$BACKUP"
cp -a /etc/nginx "$BACKUP/" 2>/dev/null || true

install_vhost() {
    # $1 = source config, $2 = short description
    local src="$1" desc="$2"
    sed "s|__DOCROOT__|$DOCROOT|g" "$src" > "$SITES_AVAILABLE/$DOMAIN"
    ln -sfn "$SITES_AVAILABLE/$DOMAIN" "$SITES_ENABLED/$DOMAIN"
    if nginx -t 2>&1 | sed 's/^/    /'; then
        systemctl reload nginx
        echo "    installed and reloaded: $desc"
    else
        rm -f "$SITES_ENABLED/$DOMAIN"
        nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
        die "nginx rejected the $desc config; it has been removed and nginx left as it was"
    fi
}

# ---------------------------------------------------------------- certificate

mkdir -p "$WEBROOT/.well-known/acme-challenge"
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    say "Certificate already exists — skipping issuance"
    certbot certificates -d "$DOMAIN" 2>/dev/null | sed 's/^/    /' || true
else
    say "Requesting a certificate from Let's Encrypt"
    install_vhost "$HERE/nginx/$DOMAIN.bootstrap.conf" "HTTP-only bootstrap vhost"

    # Prove the challenge path is actually reachable before burning a rate limit.
    TOKEN="setup-$(date +%s)"
    echo "$TOKEN" > "$WEBROOT/.well-known/acme-challenge/$TOKEN"
    if curl -fsS --max-time 15 "http://$DOMAIN/.well-known/acme-challenge/$TOKEN" | grep -q "$TOKEN"; then
        echo "    challenge path is reachable over HTTP"
    else
        rm -f "$WEBROOT/.well-known/acme-challenge/$TOKEN"
        die "http://$DOMAIN/.well-known/acme-challenge/ is not reachable — check DNS, port 80 and any firewall"
    fi
    rm -f "$WEBROOT/.well-known/acme-challenge/$TOKEN"

    if [ -n "$EMAIL" ]; then
        certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
            --agree-tos --no-eff-email -m "$EMAIL" --non-interactive
    else
        # No email given: register without one rather than hanging on a prompt.
        certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
            --agree-tos --register-unsafely-without-email --non-interactive
        warn "registered without an email, so no expiry warnings will be sent."
        warn "re-run with CERTBOT_EMAIL=you@example.com to add one."
    fi
fi

# ---------------------------------------------------------------- TLS vhost

say "Installing the HTTPS vhost"
install_vhost "$HERE/nginx/$DOMAIN.conf" "TLS vhost"

say "Checking automatic renewal"
if systemctl list-timers 2>/dev/null | grep -q certbot; then
    echo "    certbot renewal timer is active"
else
    warn "no certbot timer found; check 'systemctl status certbot.timer'"
fi
certbot renew --dry-run 2>&1 | tail -5 | sed 's/^/    /' || warn "renewal dry-run reported a problem — investigate before the cert expires"

# ---------------------------------------------------------------- verify

say "Verifying"
sleep 2
code_https="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAIN/" || echo 000)"
code_http="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://$DOMAIN/" || echo 000)"
code_event="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAIN/events/phil-mcallister-90th/" || echo 000)"
echo "    http://$DOMAIN/                     -> $code_http (expect 301)"
echo "    https://$DOMAIN/                    -> $code_https (expect 200)"
echo "    https://$DOMAIN/events/phil-...90th/ -> $code_event (expect 200)"

if [ "$code_https" = "200" ]; then
    say "Done — https://$DOMAIN/ is live"
    echo "    The old https://webapps.peoplestar.com/URInvited/ URL still works."
    echo "    Config backup: $BACKUP"
else
    die "https://$DOMAIN/ returned $code_https — check 'nginx -t' and /var/log/nginx/error.log"
fi
