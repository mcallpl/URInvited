# CLAUDE.md — working notes for this repo

Read this before changing anything. It records the decisions behind the
current structure and the traps that are easy to fall back into.

## What this project is

Static one-page invitation sites, one folder per event. No build step, no
framework, no server-side code, no database. Plain HTML/CSS/JS served by
nginx on a Digital Ocean box, at both a subdomain root
(`urinvited.peoplestar.com`) and a subdirectory
(`webapps.peoplestar.com/URInvited/`) out of one document root.

It used to be a single hand-written `index.html` for Phil McAllister's 90th
with every name, date, address and colour baked into the markup. It was
restructured (Aug 2026) into a renderer plus per-event data so a new event
does not mean copying and editing 1,200 lines of HTML.

## Architecture

```
index.html                 hub — lists events from assets/events-index.js
builder.html               form UI that generates a new event's two files
assets/event.css           design system; every colour is a CSS variable
assets/event.js            renderer: config object -> the entire page
assets/events-index.js     which events the hub shows
events/<slug>/index.html   15-line shell, IDENTICAL for every event
events/<slug>/event.js     100% of that event's content, as data
events/_template/          copy-to-start folder
images/ public/            photos, favicons, og-image
deploy.sh                  rsync to the DO box
```

The contract between the shell and the renderer is two globals:

```js
window.URINVITED_BASE  = '../../';   // path from this page back to site root
window.URINVITED_EVENT = { ... };    // the config
```

`assets/event.js` reads `URINVITED_EVENT`, builds every section, and wires up
the confetti, the video modal, lazy maps, the mailto form and smooth scroll.
`#event-root` is the mount point.

## Invariants — do not break these

1. **No event content in `assets/`.** Names, dates, addresses, copy and
   colours belong in `events/<slug>/event.js`. If you find yourself typing
   "Phil" into `assets/event.js`, stop — add a config field instead.

2. **No absolute paths starting with `/`.** The same files are served from a
   subdirectory (`https://webapps.peoplestar.com/URInvited/`) as well as a
   domain root, so `/public/…` resolves to the domain root and 404s under the
   subdirectory URL. The pre-restructure page had exactly this bug in its
   favicon links. Everything is relative; keep it that way, or the subdirectory
   URL guests already hold silently breaks.

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

Worth asserting after any renderer change, on `events/phil-mcallister-90th/`:
7 `<section>`s, 3 `.event-card`s, 3 `.venue-content`s, 5 nav links,
`--primary` = `#D4AF37`, and no page errors. For builder changes, also check
the preview iframe reaches `readyState: complete` with a non-empty
`#event-root` **without** stubbing the font request.

Outbound network in this container is proxied and blocks Google Fonts and
Google Maps, so those will fail locally. That is the sandbox, not the code —
stub or ignore them, and never "fix" it by removing them from real pages.

## Deploying

`./deploy.sh` rsyncs to `root@64.227.108.128:/var/www/html/urinvited` and
chowns to `www-data`. Live at `https://webapps.peoplestar.com/URInvited/`.

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

### The unconfirmed target directory

The old workflow targeted `/var/www/html/URInvited/`; `deploy.sh` targets
`/var/www/html/urinvited`. On Linux those are different directories and nobody
has confirmed which nginx serves. Until that is settled the workflow:

- reads `TARGET` from the repo variable `DEPLOY_TARGET`, defaulting to the
  lowercase path, so it is fixable without a code change;
- keeps `ARGS` at the action's default (`-rlgoDzvc -i`), which has **no**
  `--delete`, so a wrong path is useless rather than destructive;
- runs a `SCRIPT_BEFORE` that lists `/var/www/html` and greps the nginx config
  for `urinvited`, so the job log names the real directory.

Read that log after a run, set `DEPLOY_TARGET`, and only then consider adding
`--delete` so repo deletions propagate.

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

## Open decisions

- **Phil's copy is deliberately stale.** The June 5–7 2026 weekend has passed,
  but the page still says "SHHHHH... IT'S A SURPRISE!" and "PLEASE SUBMIT BY
  WEDNESDAY, JUNE 3, 2026". Content was ported verbatim during the
  restructure; rewriting it as a past-tense recap is a pending decision for
  the owner, and is now a `event.js` edit rather than HTML surgery.

- **The root URL changed meaning.** It used to serve Phil's invitation
  directly; it now serves the hub, with Phil's at
  `events/phil-mcallister-90th/`. Guests holding the old link land one click
  away. If that turns out to matter, redirect root rather than reverting the
  structure.
