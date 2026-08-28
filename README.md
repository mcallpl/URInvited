# UR Invited

One-page invitation sites, one folder per event. No build step, no framework,
no database — a browser and a text editor are the whole toolchain.

```
index.html                  home page, lists every event
builder.html                form UI that creates a new event
assets/
  event.css                 the design system (every colour is a CSS variable)
  event.js                  the renderer — turns a config object into the page
  events-index.js           which events appear on the home page
events/
  phil-mcallister-90th/     Phil's 90th, June 5–7 2026 — the first event
    index.html              15-line shell, identical for every event
    event.js                all of the content, as data
  _template/                copy this folder to start a new event by hand
images/  public/            photos, favicons, social image
deploy.sh                   rsync to the Digital Ocean box
```

## Making a new event

**The quick way.** Open `builder.html` in a browser and fill in the form. The
preview updates as you type. Press **Download event files** and you get an
`index.html` and an `event.js`.

1. Make a folder: `events/your-event-name/`
2. Put both downloaded files in it.
3. Paste the line the builder prints into `assets/events-index.js` so the event
   shows up on the home page.
4. Run `./deploy.sh`.

Photos picked in the builder are resized and embedded directly in `event.js`,
so there is no separate upload step. If you would rather keep a photo as a
file, drop it in `images/` and type the path (`images/anna.jpg`) instead.

**By hand.** Copy `events/_template/` to `events/your-event-name/` and edit
`event.js`. The template has a comment on every field. The builder can also
load an existing `event.js` back in for editing — use **Import event.js**.

## What is configurable

Everything on the page comes from `event.js`. Nothing is hard-coded in the
renderer or the stylesheet.

| Key | What it controls |
| --- | --- |
| `title`, `logo`, `slug` | Browser tab, header text, folder name |
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
adjusts itself to whatever is left.

### A few details worth knowing

- **Maps need no API key.** Give a venue an address and both the embedded map
  and the *Get Directions* button are generated from it. Set `mapEmbed` on a
  venue to override with a specific embed URL.
- **Event cards link to venues.** Give a schedule item a `venueId` matching a
  venue's `id` and the card becomes a link down to that venue block.
- **The contact form opens the guest's mail app** — it is a `mailto:` link, so
  there is no server to run. Set `contact.form.email` to the address replies
  should go to.
- **Image paths are relative to the site root** (`images/anna.jpg`), not to the
  event folder. Full URLs and embedded `data:` images work too.
- **Maps and the video recorder load only when needed** — maps when they scroll
  into view, the recorder when someone opens it — so the page stays quick.
- **Reduced motion is respected**: confetti and animations switch off for
  visitors who ask their system for less movement.

## Editing an existing event

Change its `event.js` and run `./deploy.sh`. Changing the look of *every* event
at once means editing `assets/event.css` or `assets/event.js`.

## Local preview

The pages load their config with `<script src>`, which browsers block on
`file://`, so serve the folder rather than double-clicking the file:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Deploying

`./deploy.sh` rsyncs the folder to the Digital Ocean host and fixes ownership.
It needs SSH access to that box. The site is served under a subdirectory, so
all paths in this project are relative — avoid introducing absolute ones
starting with `/`.
