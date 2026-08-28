# UR Invited

One-page invitation sites. A private workspace for the host, a public page per
event. No build step, no framework, no database — a browser and a text editor
are the whole toolchain.

```
index.html                  the workspace — PASSWORD PROTECTED
builder.html                form UI that creates a new event — protected
robots.txt                  keeps invitations out of search results
assets/
  event.css                 the design system (every colour is a CSS variable)
  event.js                  the renderer — turns a config object into the page
  events-index.js           which events the workspace lists — protected
PhilMcAllister/             an event. The folder name IS the public URL.
  index.html                15-line shell, identical for every event
  event.js                  all of the content, as data
images/  public/            photos, favicons, social image
deploy/
  setup-ssl.sh              one-shot server setup: TLS, nginx, password
  nginx/                    the vhost it installs
  event-template/           copy this to start an event by hand
deploy.sh                   rsync to the Digital Ocean box
```

## The two audiences

| | URL | Password? |
| --- | --- | --- |
| You | `https://urinvited.peoplestar.com/` | yes |
| Guests | `https://urinvited.peoplestar.com/PhilMcAllister/` | **no** |

Guests must never hit a password prompt, so only the workspace, the builder and
the event roster are protected. Event pages and the shared assets they need are
public — anyone with the link can open an invitation.

## Making a new event

**The quick way.** Open the workspace and press **New event**. Fill in the form;
the preview updates as you type. Press **Download event files** for an
`index.html` and an `event.js`.

1. Make a folder named exactly how the URL should read: `AnnasRetirement/`
2. Put both downloaded files in it, at the top level of the site.
3. Paste the line the builder prints into `assets/events-index.js`.
4. Run `./deploy.sh`, or push to `main`.

That event is then live at `https://urinvited.peoplestar.com/AnnasRetirement/`.

Photos picked in the builder are resized and embedded directly in `event.js`,
so there is no separate upload step. To keep a photo as a file instead, drop it
in `images/` and type the path (`images/anna.jpg`).

**Folder names are URLs.** Use letters, numbers, dots, dashes and underscores,
and avoid the reserved names `assets`, `images`, `public`, `deploy`, `events`,
`index`, `builder` and `favicon`. The builder warns you. They are also
case-sensitive: `/PhilMcAllister/` works, `/philmcallister/` does not.

**By hand.** Copy `deploy/event-template/` to a new top-level folder and edit
`event.js`; every field is commented. To edit an existing event, press **Edit**
in the workspace — that opens it in the builder — or edit its `event.js`.

## What is configurable

Everything on an event page comes from its `event.js`. Nothing is hard-coded in
the renderer or the stylesheet.

| Key | What it controls |
| --- | --- |
| `title`, `logo`, `slug` | Browser tab, header text, folder name and URL |
| `theme` | Six colours that re-skin the entire page |
| `meta` | Description and image used when the link is shared |
| `hero` | Badge, headline, subtitle, opening paragraph |
| `featuredVideo` | A video you host, near the top of the page |
| `photo` | Main photo, caption, and an optional gallery grid |
| `schedule` | The event cards — date, time, what, where |
| `videoTribute` | "Record a message" call-to-action and its pop-up recorder |
| `venues` | Venue write-ups, addresses, parking notes, maps |
| `contact` | Phone numbers and a message form |
| `footer` | Closing lines |
| `confetti` | The falling confetti animation |

Any section can be switched off with `enabled: false`, and the navigation
adjusts to whatever is left.

### A few details worth knowing

- **Maps need no API key.** Give a venue an address and both the embedded map
  and the *Get Directions* button are generated from it. Set `mapEmbed` on a
  venue to override with a specific embed URL.
- **Event cards link to venues.** Give a schedule item a `venueId` matching a
  venue's `id` and the card becomes a link down to that venue block.
- **The contact form opens the guest's mail app** — a `mailto:` link, so there
  is no server to run. Set `contact.form.email` to the address replies go to.
- **Image paths are relative to the site root** (`images/anna.jpg`), not to the
  event folder. Full URLs and embedded `data:` images work too.
- **Maps and the video recorder load only when needed**, so pages stay quick.
- **Reduced motion is respected**: animations switch off for visitors who ask
  their system for less movement.

## Local preview

The pages load their config with `<script src>`, which browsers block on
`file://`, so serve the folder rather than double-clicking:

```sh
python3 -m http.server 8000
# http://localhost:8000/            the workspace (no password locally)
# http://localhost:8000/PhilMcAllister/   an event
```

Event folders sit at the top level precisely so these URLs match production
without needing nginx rewrites.

## Deploying

`./deploy.sh` rsyncs to the Digital Ocean host. Pushes to `main` also deploy via
`.github/workflows/deploy.yml`.

All paths are relative, so the same files serve correctly from a domain root and
from a subdirectory. Never introduce absolute paths starting with `/`.

## Server setup

To stand up the subdomain, TLS and the workspace password on a fresh server,
copy `deploy/` over and run it as root:

```sh
scp -r deploy root@64.227.108.128:/tmp/urinvited-deploy
ssh -t root@64.227.108.128 'CERTBOT_EMAIL=you@example.com bash /tmp/urinvited-deploy/setup-ssl.sh'
```

It finds the document root, obtains a Let's Encrypt certificate over the webroot
challenge, installs the nginx vhost, **prompts for the workspace password**, and
verifies that the workspace is protected while events are not. It is idempotent,
backs up the nginx config, and never reloads without `nginx -t` passing.

The password is never stored in this repository — only a bcrypt hash on the
server at `/etc/nginx/.htpasswd-urinvited`. To change it later:

```sh
ssh -t root@64.227.108.128 'RESET_PASSWORD=1 bash /tmp/urinvited-deploy/setup-ssl.sh'
```

HSTS and a Content-Security-Policy are present but commented out, with the
directives worked out. Read the notes in `deploy/nginx/` before enabling either.
