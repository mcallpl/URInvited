# CLAUDE.md — working notes for this repo

Read this before changing anything. It records the decisions behind the
current structure and the traps that are easy to fall back into.

## What this project is

Static one-page invitation sites, one folder per event. No build step, no
framework, no server-side code, no database. Plain HTML/CSS/JS served by
nginx on a Digital Ocean box at `urinvited.peoplestar.com`, from
`/var/www/urinvited`. That is the only address for this site;
`webapps.peoplestar.com/URInvited/` is retired.

It used to be a single hand-written `index.html` for Phil McAllister's 90th
with every name, date, address and colour baked into the markup. It was
restructured (Aug 2026) into a renderer plus per-event data so a new event
does not mean copying and editing 1,200 lines of HTML.

## Architecture

```
index.html                 the workspace — behind HTTP Basic auth
builder.html               builder UI — behind auth
assets/event.css           design system; every colour is a CSS variable
assets/event.js            renderer: config object -> the entire page
assets/events-index.js     the event roster — behind auth
<EventName>/index.html     15-line shell, IDENTICAL for every event
<EventName>/event.js       100% of that event's content, as data
robots.txt                 Disallow: / — invitations must not be indexed
images/ public/            photos, favicons, og-image
deploy/setup-ssl.sh        server setup: TLS, nginx vhost, workspace password
deploy/event-template/     copy-to-start folder
deploy.sh                  rsync to the DO box
```

**Event folders live at the document root, not under `events/`.** The folder
name is the public URL: `PhilMcAllister/` is served at `/PhilMcAllister/`. This
is deliberate — an nginx rewrite could map a prettier URL onto a nested folder,
but then `python3 -m http.server` would not reproduce production and local
preview would silently disagree with the live site. Plain folders behave
identically everywhere.

Because events are one level below the root, the shell sets
`URINVITED_BASE = '../'`. If that depth ever changes, the shell, the template
and `builder.html`'s `SHELL` constant all change together.

The contract between the shell and the renderer is two globals:

```js
window.URINVITED_BASE  = '../';      // path from this page back to site root
window.URINVITED_EVENT = { ... };    // the config
```

`assets/event.js` reads `URINVITED_EVENT`, builds every section, and wires up
the confetti, the video modal, lazy maps, the mailto form and smooth scroll.
`#event-root` is the mount point.

## Invariants — do not break these

1. **No event content in `assets/`.** Names, dates, addresses, copy and
   colours belong in `events/<slug>/event.js`. If you find yourself typing
   "Phil" into `assets/event.js`, stop — add a config field instead.

2. **No absolute paths starting with `/`.** Everything is relative so the same
   files work from a domain root and from any subdirectory. The pre-restructure
   page had exactly this bug in its favicon links (`/public/…`, which 404s under
   a subdirectory). Keep it relative: it costs nothing and it is what makes
   `python3 -m http.server` behave like production.

3. **Colours go through CSS variables, including the RGB triplets.**
   Translucent surfaces use `rgba(var(--primary-rgb), 0.15)`. `applyTheme()`
   derives `--primary-rgb` / `--dark-rgb` / `--cream-rgb` from the hex values.
   A hard-coded `rgba(212, 175, 55, …)` will not re-theme and is a bug.

4. **The event shell is identical for every event.** Only `event.js` differs.
   If a change needs new markup in the shell, it probably belongs in the
   renderer instead. `builder.html` emits this shell verbatim from its `SHELL`
   constant — if the shell changes, change that constant too.

5. **Config image paths are relative to the SITE ROOT, not the event folder.**
   `images/uncle-phil.jpg`, not `../../images/uncle-phil.jpg`. The `asset()`
   helper prepends `URINVITED_BASE`. Full URLs and `data:` URIs pass through
   untouched.

6. **All user-supplied strings go through `esc()`** before entering innerHTML.
   The renderer builds HTML from strings; unescaped config would break the
   page on an apostrophe and is an injection risk if a config is ever
   generated from untrusted input.

## Two audiences — do not conflate them

The workspace is private; the invitations are not. Guests must never meet a
password prompt, so nginx protects specific paths (`/`, `/index.html`,
`/builder.html`, `/assets/events-index.js`) rather than the whole site. Event
folders and the shared `assets/`, `images/` and `public/` they load stay public.

Consequences worth remembering:

- Never move a file an event page needs behind auth. If `assets/event.css` or
  `assets/event.js` were protected, every guest would get an unstyled or blank
  page — and you would only notice while logged in, because your own browser
  still sends credentials.
- Verify auth changes from a **credential-free** browser context, not just by
  reloading your own tab.
- The password lives only as a bcrypt hash in `/etc/nginx/.htpasswd-urinvited`,
  written by `deploy/setup-ssl.sh`. Never commit a password or a hash. To
  rotate: `RESET_PASSWORD=1 bash setup-ssl.sh`.

## Traps that already bit us

- **Never put a render-blocking webfont in the builder's preview document.**
  A browser will not run a script until preceding stylesheets resolve. The
  preview rebuilds on every keystroke, and a slow/blocked `fonts.googleapis.com`
  request left it permanently blank (`readyState` stuck at `loading`, zero
  content rendered). The preview now loads no webfont; published event pages
  still load Poppins. See the comment above `buildPreview()`.

- **`chip-video.mp4` is in `.gitignore` but exists on the server.** rsync does
  not honour `.gitignore`, so it deployed and stayed there. A 404 for it when
  testing locally is expected, not a regression.

- **`file://` does not work for testing.** The pages load config via
  `<script src>`; browsers block that on `file://`. Always serve over HTTP.

- **The old maps embeds were placeholder junk.** They contained fake IDs like
  `0x1234567890abcdef` and likely never resolved. Maps are now generated from
  the address via the keyless `maps.google.com/maps?q=…&output=embed` form. A
  venue's `mapEmbed` overrides this if a specific embed is ever needed.

## Verifying a change

Do not eyeball it — render it. Chromium and Playwright are available.

```sh
python3 -m http.server 8765          # serve the repo root
# then drive http://127.0.0.1:8765/ with playwright
```

Playwright lives at `/opt/node22/lib/node_modules/playwright`; the browser is
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (note the version suffix —
the bare `/opt/pw-browsers/chromium/…` path does not exist).

Worth asserting after any renderer change, on `PhilMcAllister/`:
7 `<section>`s, 3 `.event-card`s, 3 `.venue-content`s, 5 nav links,
`--primary` = `#D4AF37`, and no page errors. For builder changes, also check
the preview iframe reaches `readyState: complete` with a non-empty
`#event-root` **without** stubbing the font request.

Outbound network in this container is proxied and blocks Google Fonts and
Google Maps, so those will fail locally. That is the sandbox, not the code —
stub or ignore them, and never "fix" it by removing them from real pages.

## Deploying

`./deploy.sh` rsyncs to `root@64.227.108.128:/var/www/urinvited` and chowns to
`www-data`. Live at `https://urinvited.peoplestar.com/`.

**This cannot be run from a Claude Code remote container, and no credential
fixes it.** Outbound TCP 22 is blocked wholesale — `github.com:22` times out
just like the DO box — because the container's only egress is an HTTP CONNECT
proxy on `127.0.0.1:34825` that speaks HTTPS, not SSH. `ssh`/`rsync` are also
absent (installable via apt, but that does not help: the socket still cannot
open). So an SSH key in the container accomplishes nothing; do not go hunting
for one, and do not claim a deploy happened. Hand the command back to the user.

Two paths that do work:

1. The user runs `./deploy.sh` from a machine holding the key.
2. CI. `.github/workflows/deploy.yml` runs on push to `main` and on manual
   dispatch, using `easingthemes/ssh-deploy@v5.1.0` and the repo secret
   `DO_SSH_PRIVATE_KEY`. GitHub's runners have SSH and network access, so
   push-to-deploy works without any key touching a Claude container.

   It was deleted in July 2026 as "app is no longer deployed" and restored in
   August. **The original could never have worked:** it passed the key as
   `sshPrivateKey`, but the action's input is `SSH_PRIVATE_KEY` (verified
   against its `action.yml`), and Actions matches input names exactly rather
   than fuzzily. That is the likely reason CI deploys appeared broken and the
   workflow got dropped in favour of `deploy.sh`.

### The document root, and why it moved

The site deploys to `/var/www/urinvited`, its own directory, served only by the
`urinvited.peoplestar.com` vhost. It used to live under `/var/www/html`, in one
of two directories nobody could confirm between (`urinvited` and `URInvited` —
different paths on Linux).

Moving it settled that ambiguity, but the real reason is security. The
`webapps.peoplestar.com` vhost also served `/var/www/html/urinvited`, at
`/URInvited/`, and **that vhost has no `auth_basic` of its own**. `auth_basic`
is per-server-block, so the workspace protection configured on the subdomain
does not apply there: anything the webapps vhost can reach is public. Keeping
the roots separate makes exposure impossible even if that vhost is never
touched.

Two clean-up steps remain on the server, and `setup-ssl.sh` warns about both
until they are done: delete `/var/www/html/urinvited` and
`/var/www/html/URInvited`, and paste
`deploy/nginx/webapps-urinvited-redirect.conf` into the webapps server block so
stale links redirect.

`TARGET` is still overridable via the `DEPLOY_TARGET` repo variable, and `ARGS`
still carries no `--delete`; add it once a deploy to the new root is confirmed.

## nginx / TLS (urinvited.peoplestar.com)

`deploy/nginx/*.conf` plus `deploy/setup-ssl.sh` stand up the subdomain. The
vhost points at the same document root as the existing
`webapps.peoplestar.com/URInvited/` path, so both URLs serve one directory and
old guest links keep working. Nothing in the site needed changing for this —
all paths are already relative, which is why invariant 2 matters.

Things established by actually running nginx 1.24 against these files:

- **`http2 on;` does not exist before nginx 1.25.1.** Ubuntu 24.04 ships
  1.24.0, where it is an unknown directive and nginx refuses to start. Use
  `listen 443 ssl http2;`, which newer nginx still accepts.
- **No IPv6 listeners.** `urinvited.peoplestar.com` has an A record and no
  AAAA, so `listen [::]:443` would serve nobody, and nginx fails to start
  outright on a host without IPv6.
- **`add_header` in a `location` replaces the server-level set, it does not
  merge.** Every location that adds a cache header must repeat the three
  security headers or silently drop them.
- **Regex `location` blocks are tried in file order.** The deny rules must
  come before the caching rules, or `.aios_relay/…json` matches the `json$`
  cache rule and gets served. This was a real bug, caught by requesting the
  file through a running nginx.
- **Do not use `expires` together with `add_header Cache-Control`** — both
  emit the header and the response carries it twice.

Verify config changes by running them, not by reading them: `nginx -t` with a
self-signed cert at the expected path catches syntax, and serving the repo on
a high port catches header and ordering mistakes.

### Serving layout

`deploy/nginx/urinvited.peoplestar.com.conf` is the vhost;
`deploy/nginx/snippets/urinvited-headers.conf` holds the shared response
headers and is included in every location that sets a header of its own,
because nginx's `add_header` replaces the inherited set rather than merging.

Auth is applied with exact (`=`) locations, which outrank the regex blocks, so
each of them repeats the shared headers and its own `Cache-Control`.

Verified behaviour, worth re-checking after any vhost edit — anonymously and
then authenticated:

```
anonymous:  /  /index.html  /builder.html  /assets/events-index.js   -> 401
            /PhilMcAllister/  /assets/event.css  /images/*  /robots.txt -> 200
            /deploy/*  /CLAUDE.md  /README.md  dotfiles              -> 403
mcallpl:    /  /index.html  /builder.html  /assets/events-index.js   -> 200
            /PhilMcAllister (no slash)                     -> 301 to the slash
```

That trailing-slash 301 matters: without it the browser resolves `event.js`
against the site root instead of the event folder, and the page breaks.

## Open decisions

- **Phil's copy is deliberately stale.** The June 5–7 2026 weekend has passed,
  but the page still says "SHHHHH... IT'S A SURPRISE!" and "PLEASE SUBMIT BY
  WEDNESDAY, JUNE 3, 2026". Content was ported verbatim during the
  restructure; rewriting it as a past-tense recap is a pending decision for
  the owner, and is now a `event.js` edit rather than HTML surgery.

- **The old URL is retired but may not be cleaned up yet.** Until the old
  directories under `/var/www/html` are deleted, `webapps.peoplestar.com`
  keeps serving a stale copy — and, because that vhost has no auth, serves the
  workspace publicly. Deploys no longer write there, so it only goes stale, but
  it must still be removed. Hand out
  `https://urinvited.peoplestar.com/PhilMcAllister/` for invitations.

- **Slugs are case-sensitive.** `/PhilMcAllister/` works; `/philmcallister/`
  is a 404. If mistyped URLs become a nuisance, a case-insensitive redirect
  map in nginx is the place to fix it, not a rename.
