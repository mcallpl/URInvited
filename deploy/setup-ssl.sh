#!/usr/bin/env bash
#
# Set up https://urinvited.peoplestar.com on the Digital Ocean box:
# TLS certificate, nginx vhost, and the password on the private workspace.
#
# Run this ON THE SERVER as root:
#     scp -r deploy root@64.227.108.128:/tmp/urinvited-deploy
#     ssh -t root@64.227.108.128 'bash /tmp/urinvited-deploy/setup-ssl.sh'
#
# It prompts for the workspace password. No password is stored in this
# repository — only a bcrypt hash on the server, in /etc/nginx/.htpasswd-urinvited.
#
# Environment overrides:
#     URINVITED_USER      workspace username           (default: mcallpl)
#     URINVITED_PASSWORD  skip the prompt (careful: this lands in shell history)
#     CERTBOT_EMAIL       address for expiry warnings
#     DOCROOT             document root, if auto-detection picks wrong
#     RESET_PASSWORD=1    overwrite an existing password file
#
# Idempotent: safe to re-run. It re-uses an existing certificate and password
# file, never reloads nginx without `nginx -t` passing, and restores the
# previous config if anything fails.

set -euo pipefail

DOMAIN="urinvited.peoplestar.com"
WORKSPACE_USER="${URINVITED_USER:-mcallpl}"
EMAIL="${CERTBOT_EMAIL:-}"
WEBROOT="/var/www/certbot"
HTPASSWD="/etc/nginx/.htpasswd-urinvited"
SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"
SNIPPETS="/etc/nginx/snippets"
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
    echo "    using DOCROOT from the environment"
else
    # deploy.sh uses the lowercase path; the old GitHub workflow used the
    # capitalised one. Whichever actually holds the site wins.
    CANDIDATES=(/var/www/html/urinvited /var/www/html/URInvited)
    DOCROOT=""
    for d in "${CANDIDATES[@]}"; do
        if [ -f "$d/index.html" ]; then
            DOCROOT="$d"; echo "    found the site at: $d"; break
        elif [ -d "$d" ]; then
            echo "    exists but has no index.html: $d"
        fi
    done
    [ -n "$DOCROOT" ] || die "no site found in ${CANDIDATES[*]} — deploy first, or set DOCROOT="
fi
echo "    document root: $DOCROOT"
if [ ! -d "$DOCROOT/PhilMcAllister" ]; then
    warn "no event folders found at the top level of $DOCROOT."
    warn "deploy the current site, or the workspace will list events that 404."
fi

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
NEEDED=()
command -v certbot  >/dev/null || NEEDED+=(certbot)
command -v htpasswd >/dev/null || NEEDED+=(apache2-utils)
if [ ${#NEEDED[@]} -gt 0 ]; then
    echo "    installing: ${NEEDED[*]}"
    apt-get update -qq
    apt-get install -y -qq "${NEEDED[@]}"
fi
nginx -v 2>&1 | sed 's/^/    /'
certbot --version 2>&1 | sed 's/^/    /'

say "Backing up the current nginx config to $BACKUP"
mkdir -p "$BACKUP"
cp -a /etc/nginx "$BACKUP/" 2>/dev/null || true

# ---------------------------------------------------------------- password

say "Workspace password"
if [ -f "$HTPASSWD" ] && [ "${RESET_PASSWORD:-0}" != "1" ]; then
    echo "    $HTPASSWD already exists — keeping it"
    echo "    (re-run with RESET_PASSWORD=1 to change the password)"
else
    PASSWORD="${URINVITED_PASSWORD:-}"
    if [ -z "$PASSWORD" ]; then
        if [ -t 0 ]; then
            printf '    password for user "%s": ' "$WORKSPACE_USER"
            read -rs PASSWORD; printf '\n'
            printf '    confirm: '
            read -rs CONFIRM; printf '\n'
            [ "$PASSWORD" = "$CONFIRM" ] || die "passwords did not match"
        else
            die "no terminal for the prompt — set URINVITED_PASSWORD, or run ssh with -t"
        fi
    fi
    [ -n "$PASSWORD" ] || die "password must not be empty"
    # -B is bcrypt; -i reads the password from stdin so it never appears in
    # the process list.
    printf '%s' "$PASSWORD" | htpasswd -c -i -B "$HTPASSWD" "$WORKSPACE_USER"
    unset PASSWORD CONFIRM
    chown root:www-data "$HTPASSWD" 2>/dev/null || true
    chmod 640 "$HTPASSWD"
    echo "    wrote $HTPASSWD for user \"$WORKSPACE_USER\""
fi

# ---------------------------------------------------------------- vhost

mkdir -p "$SNIPPETS"
install -m 644 "$HERE/nginx/snippets/urinvited-headers.conf" "$SNIPPETS/urinvited-headers.conf"

install_vhost() {
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

    # Prove the challenge path is reachable before burning a rate limit.
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
        certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
            --agree-tos --register-unsafely-without-email --non-interactive
        warn "registered without an email, so no expiry warnings will be sent."
        warn "re-run with CERTBOT_EMAIL=you@example.com to add one."
    fi
fi

say "Installing the HTTPS vhost"
install_vhost "$HERE/nginx/$DOMAIN.conf" "TLS vhost"

say "Checking automatic renewal"
if systemctl list-timers 2>/dev/null | grep -q certbot; then
    echo "    certbot renewal timer is active"
else
    warn "no certbot timer found; check 'systemctl status certbot.timer'"
fi
certbot renew --dry-run 2>&1 | tail -5 | sed 's/^/    /' \
    || warn "renewal dry-run reported a problem — investigate before the cert expires"

# ---------------------------------------------------------------- verify

say "Verifying"
sleep 2
probe() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@" || echo 000; }

code_redirect="$(probe "http://$DOMAIN/")"
code_workspace_anon="$(probe "https://$DOMAIN/")"
code_event_anon="$(probe "https://$DOMAIN/PhilMcAllister/")"
code_roster_anon="$(probe "https://$DOMAIN/assets/events-index.js")"
code_css_anon="$(probe "https://$DOMAIN/assets/event.css")"

printf '    %-46s %s  (expect 301)\n' "http://$DOMAIN/"                  "$code_redirect"
printf '    %-46s %s  (expect 401)\n' "https://$DOMAIN/  [no password]"  "$code_workspace_anon"
printf '    %-46s %s  (expect 401)\n' "  /assets/events-index.js"        "$code_roster_anon"
printf '    %-46s %s  (expect 200)\n' "  /PhilMcAllister/  [guest]"      "$code_event_anon"
printf '    %-46s %s  (expect 200)\n' "  /assets/event.css [guest]"      "$code_css_anon"

FAILED=0
[ "$code_workspace_anon" = "401" ] || { warn "the workspace is NOT password protected"; FAILED=1; }
[ "$code_roster_anon"    = "401" ] || { warn "the event roster is NOT protected"; FAILED=1; }
[ "$code_event_anon"     = "200" ] || { warn "guests cannot reach /PhilMcAllister/ — they must not need a password"; FAILED=1; }
[ "$code_css_anon"       = "200" ] || { warn "guests cannot load the stylesheet; event pages will be unstyled"; FAILED=1; }

if [ "$FAILED" -eq 0 ]; then
    say "Done"
    echo "    Workspace : https://$DOMAIN/            (user: $WORKSPACE_USER)"
    echo "    An event  : https://$DOMAIN/PhilMcAllister/   (public)"
    echo "    Still live: https://webapps.peoplestar.com/URInvited/"
    echo "    Config backup: $BACKUP"
else
    die "one or more checks failed — see the warnings above; backup at $BACKUP"
fi
