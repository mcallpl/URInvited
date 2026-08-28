/* ==========================================================================
   UR Invited — shared event page renderer
   --------------------------------------------------------------------------
   An event page is a shell that sets two globals and loads this file:

       window.URINVITED_BASE  = '../../';   // path back to the site root
       window.URINVITED_EVENT = { ... };    // the event config (event.js)

   Everything visible on the page is built from that config. To create a new
   event you write a new config — you never edit this file or the stylesheet.
   See README.md for the full field reference.
   ========================================================================== */

(function () {
    'use strict';

    var CFG = window.URINVITED_EVENT;
    var BASE = window.URINVITED_BASE || './';

    if (!CFG) {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.innerHTML =
                '<div style="padding:4rem 2rem;text-align:center;font-family:Arial,sans-serif">' +
                '<h1>No event configured</h1>' +
                '<p>This page loaded <code>assets/event.js</code> but no ' +
                '<code>window.URINVITED_EVENT</code> was defined. Check that ' +
                '<code>event.js</code> is loaded before it.</p></div>';
        });
        return;
    }

    /* ---------- small helpers ---------- */

    function esc(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Config paths are written relative to the site root ("images/phil.jpg").
    // Absolute URLs and data: URIs are passed through untouched.
    function asset(path) {
        if (!path) return '';
        if (/^(https?:)?\/\//i.test(path) || /^data:/i.test(path) || path.charAt(0) === '/') {
            return path;
        }
        return BASE + path.replace(/^\.\//, '');
    }

    function lines(value) {
        if (!value) return [];
        return Array.isArray(value) ? value.filter(Boolean) : [value];
    }

    function list(section, key) {
        var items = section && section[key];
        return Array.isArray(items) ? items : [];
    }

    function enabled(section) {
        return !!(section && section.enabled !== false);
    }

    function hexToRgb(hex) {
        if (typeof hex !== 'string') return null;
        var value = hex.trim().replace(/^#/, '');
        if (value.length === 3) {
            value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
        }
        if (!/^[0-9a-f]{6}$/i.test(value)) return null;
        return [
            parseInt(value.slice(0, 2), 16),
            parseInt(value.slice(2, 4), 16),
            parseInt(value.slice(4, 6), 16)
        ].join(', ');
    }

    function mapsQueryFor(venue) {
        if (venue.mapsQuery) return venue.mapsQuery;
        var parts = lines(venue.addressLines);
        if (venue.name) parts = [venue.name].concat(parts);
        return parts.join(', ');
    }

    function directionsUrl(venue) {
        var query = mapsQueryFor(venue);
        return query ? 'https://maps.google.com/?q=' + encodeURIComponent(query) : '';
    }

    // A keyless Google Maps embed, generated straight from the address, so a
    // new event gets a working map without anyone hunting for an embed code.
    function mapEmbedUrl(venue) {
        if (venue.mapEmbed) return venue.mapEmbed;
        var query = mapsQueryFor(venue);
        if (!query) return '';
        return 'https://maps.google.com/maps?q=' + encodeURIComponent(query) +
               '&t=&z=15&ie=UTF8&iwloc=&output=embed';
    }

    /* ---------- theme ---------- */

    function applyTheme() {
        var theme = CFG.theme || {};
        var root = document.documentElement;
        var map = {
            primary: '--primary',
            primaryLight: '--primary-light',
            accent: '--accent',
            dark: '--dark',
            dark2: '--dark-2',
            cream: '--cream',
            fontBody: '--font-body',
            fontHeading: '--font-heading',
            fontUI: '--font-ui'
        };

        Object.keys(map).forEach(function (key) {
            if (theme[key]) root.style.setProperty(map[key], theme[key]);
        });

        // Translucent surfaces are built with rgba(var(--x-rgb), a), so the
        // channel triplets have to travel with the hex values.
        [['primary', '--primary-rgb'], ['dark', '--dark-rgb'], ['cream', '--cream-rgb']]
            .forEach(function (pair) {
                var rgb = hexToRgb(theme[pair[0]]);
                if (rgb) root.style.setProperty(pair[1], rgb);
            });
    }

    /* ---------- document head ---------- */

    function applyHead() {
        var meta = CFG.meta || {};
        var title = CFG.title || (CFG.hero && CFG.hero.title) || 'UR Invited';
        document.title = title;

        function setMeta(selector, attr, name, content) {
            if (!content) return;
            var tag = document.head.querySelector(selector);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute(attr, name);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
        }

        var description = meta.description || (CFG.hero && CFG.hero.tagline) || '';
        var image = meta.ogImage ? asset(meta.ogImage) : '';

        setMeta('meta[name="description"]', 'name', 'description', description);
        setMeta('meta[name="theme-color"]', 'name', 'theme-color',
                meta.themeColor || (CFG.theme && CFG.theme.dark) || '#1a1a1a');
        setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
        setMeta('meta[property="og:title"]', 'property', 'og:title', title);
        setMeta('meta[property="og:description"]', 'property', 'og:description', description);
        setMeta('meta[property="og:image"]', 'property', 'og:image', image);
        setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
        setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
        setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
        setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

        [['icon', 'public/favicon.ico', null],
         ['icon', 'public/favicon.svg', 'image/svg+xml'],
         ['apple-touch-icon', 'public/apple-touch-icon.png', null]
        ].forEach(function (icon) {
            var link = document.createElement('link');
            link.rel = icon[0];
            link.href = asset(icon[1]);
            if (icon[2]) link.type = icon[2];
            document.head.appendChild(link);
        });
    }

    /* ---------- sections ---------- */

    function navLinks() {
        var links = [];
        if (enabled(CFG.photo) && (CFG.photo.image || list(CFG.photo, 'gallery').length)) {
            links.push({ href: '#photos', label: CFG.photo.navLabel || 'Photos' });
        }
        if (enabled(CFG.schedule) && list(CFG.schedule, 'items').length) {
            links.push({ href: '#events', label: CFG.schedule.navLabel || 'Events' });
        }
        if (enabled(CFG.videoTribute)) {
            links.push({ href: '#videos', label: CFG.videoTribute.navLabel || '📹 Videos' });
        }
        if (enabled(CFG.venues) && list(CFG.venues, 'items').length) {
            links.push({ href: '#venue', label: CFG.venues.navLabel || 'Venue' });
        }
        if (enabled(CFG.contact)) {
            links.push({ href: '#contact', label: CFG.contact.navLabel || 'Questions?' });
        }
        return links;
    }

    function renderHeader() {
        var logo = CFG.logo || CFG.title || '';
        if (!logo && !navLinks().length) return '';
        var nav = navLinks().map(function (link) {
            return '<a href="' + esc(link.href) + '">' + esc(link.label) + '</a>';
        }).join('');
        return '<header>' +
                   '<div class="logo">' + esc(logo) + '</div>' +
                   (nav ? '<nav>' + nav + '</nav>' : '') +
               '</header>';
    }

    function renderHero() {
        var hero = CFG.hero || {};
        if (!hero.title && !hero.subtitle && !hero.tagline) return '';
        return '<section class="hero">' +
                   '<div class="hero-content">' +
                       (hero.badge ? '<span class="hero-badge">' + esc(hero.badge) + '</span>' : '') +
                       (hero.title ? '<h1>' + esc(hero.title) + '</h1>' : '') +
                       (hero.subtitle ? '<p class="subtitle">' + esc(hero.subtitle) + '</p>' : '') +
                       (hero.tagline ? '<p class="tagline">' + esc(hero.tagline) + '</p>' : '') +
                   '</div>' +
               '</section>';
    }

    function renderFeaturedVideo() {
        var video = CFG.featuredVideo;
        if (!enabled(video) || !video.src) return '';
        return '<section class="video-message-section">' +
                   '<div class="video-container">' +
                       '<video controls width="100%"' +
                           (video.poster ? ' poster="' + esc(asset(video.poster)) + '"' : '') + '>' +
                           '<source src="' + esc(asset(video.src)) + '" type="' + esc(video.type || 'video/mp4') + '">' +
                           'Your browser does not support the video tag.' +
                       '</video>' +
                       (video.notice ? '<div class="deadline-alert">' + esc(video.notice) + '</div>' : '') +
                   '</div>' +
               '</section>';
    }

    function renderPhotos() {
        var photo = CFG.photo;
        if (!enabled(photo)) return '';
        var gallery = list(photo, 'gallery');
        if (!photo.image && !gallery.length) return '';

        var body = '';
        if (photo.image) {
            body += '<div class="feature-photo">' +
                        '<img src="' + esc(asset(photo.image)) + '" alt="' + esc(photo.alt || photo.title || '') + '">' +
                    '</div>' +
                    (photo.caption ? '<p class="feature-photo-caption">' + esc(photo.caption) + '</p>' : '');
        }
        if (gallery.length) {
            body += '<div class="gallery-grid"' + (photo.image ? ' style="margin-top:3rem"' : '') + '>' +
                gallery.map(function (item, index) {
                    var src = typeof item === 'string' ? item : item.src;
                    var alt = typeof item === 'string' ? '' : (item.alt || '');
                    return '<div class="gallery-item" style="animation-delay:' + (0.1 * (index + 1)).toFixed(1) + 's">' +
                               '<img src="' + esc(asset(src)) + '" alt="' + esc(alt) + '" loading="lazy">' +
                           '</div>';
                }).join('') +
            '</div>';
        }

        return '<section class="photo-gallery" id="photos">' +
                   (photo.title ? '<h2 class="gallery-title">' + esc(photo.title) + '</h2>' : '') +
                   body +
               '</section>';
    }

    function renderSchedule() {
        var schedule = CFG.schedule;
        if (!enabled(schedule)) return '';
        var items = list(schedule, 'items');
        if (!items.length) return '';

        var cards = items.map(function (item, index) {
            var card = '<div class="event-card" style="animation-delay:' + (0.2 * (index + 1)).toFixed(1) + 's">' +
                           '<div class="event-content">' +
                               (item.date ? '<div class="event-date">' + esc(item.date) + '</div>' : '') +
                               (item.time ? '<div class="event-time">' + esc(item.time) + '</div>' : '') +
                               (item.title ? '<h3 class="event-title">' + esc(item.title) + '</h3>' : '') +
                               (lines(item.locationLines).length
                                   ? '<p class="event-location">' + lines(item.locationLines).map(esc).join('<br>') + '</p>'
                                   : '') +
                           '</div>' +
                       '</div>';
            // Cards link down to their matching venue block when one exists.
            return item.venueId
                ? '<a class="event-card-link" href="#' + esc(item.venueId) + '">' + card + '</a>'
                : card;
        }).join('');

        return '<section class="events" id="events">' +
                   '<h2 class="section-title">' + esc(schedule.title || 'Events') + '</h2>' +
                   '<div class="events-grid">' + cards + '</div>' +
               '</section>';
    }

    function renderVideoTribute() {
        var tribute = CFG.videoTribute;
        if (!enabled(tribute)) return '';
        var tips = list(tribute, 'tips');

        return '<section class="video-section" id="videos">' +
                   '<div class="video-alert">' +
                       (tribute.badge ? '<span class="alert-badge">' + esc(tribute.badge) + '</span>' : '') +
                       (tribute.heading ? '<h3>' + esc(tribute.heading) + '</h3>' : '') +
                       (tribute.subheading ? '<p class="deadline">' + esc(tribute.subheading) + '</p>' : '') +
                       (tribute.intro ? '<p class="video-intro">' + esc(tribute.intro) + '</p>' : '') +
                       (tribute.embedUrl
                           ? '<div class="video-cta">' +
                                 '<button type="button" class="btn-video-create" data-open-video-modal>' +
                                     esc(tribute.buttonLabel || '▶️ Create your video now') +
                                 '</button>' +
                                 (tribute.buttonNote ? '<p class="video-cta-note">' + esc(tribute.buttonNote) + '</p>' : '') +
                             '</div>'
                           : '') +
                       (tips.length
                           ? '<div class="video-instructions">' +
                                 '<strong>' + esc(tribute.tipsTitle || 'Quick tips:') + '</strong>' +
                                 '<ol>' + tips.map(function (tip) {
                                     return '<li>' + esc(tip) + '</li>';
                                 }).join('') + '</ol>' +
                             '</div>'
                           : '') +
                   '</div>' +
               '</section>';
    }

    function renderVideoModal() {
        var tribute = CFG.videoTribute;
        if (!enabled(tribute) || !tribute.embedUrl) return '';
        return '<div id="videoModal" class="video-modal">' +
                   '<div class="modal-content">' +
                       '<button class="modal-close" type="button" aria-label="Close">✕</button>' +
                       '<iframe class="modal-iframe" title="Record your video message" ' +
                           'data-src="' + esc(tribute.embedUrl) + '" ' +
                           'allow="camera; microphone; autoplay; fullscreen"></iframe>' +
                   '</div>' +
               '</div>';
    }

    function renderVenues() {
        var venues = CFG.venues;
        if (!enabled(venues)) return '';
        var items = list(venues, 'items');
        if (!items.length) return '';

        var blocks = items.map(function (venue) {
            var address = lines(venue.addressLines);
            var notes = list(venue, 'notes');
            var embed = mapEmbedUrl(venue);
            var directions = directionsUrl(venue);

            var details = '';
            if (address.length) {
                details += '<strong>' + esc(venue.addressLabel || '📍 Address') + '</strong><br>' +
                           (venue.name ? esc(venue.name) + '<br>' : '') +
                           address.map(esc).join('<br>');
            }
            notes.forEach(function (note) {
                details += (details ? '<br><br>' : '') +
                           '<strong>' + esc(note.label) + '</strong><br>' + esc(note.text);
            });

            return '<div class="venue-content' + (embed ? '' : ' no-map') + '" id="' + esc(venue.id || '') + '">' +
                       '<div class="venue-info">' +
                           (venue.heading ? '<h3>' + esc(venue.heading) + '</h3>' : '') +
                           (venue.description ? '<p>' + esc(venue.description) + '</p>' : '') +
                           (details ? '<div class="venue-details">' + details + '</div>' : '') +
                           (directions
                               ? '<a href="' + esc(directions) + '" target="_blank" rel="noopener" ' +
                                 'class="btn-directions">' + esc(venue.directionsLabel || 'Get Directions') + '</a>'
                               : '') +
                       '</div>' +
                       (embed
                           ? '<div class="venue-map">' +
                                 '<iframe src="" data-src="' + esc(embed) + '" title="Map of ' +
                                 esc(venue.heading || venue.name || 'the venue') +
                                 '" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
                             '</div>'
                           : '') +
                   '</div>';
        }).join('<hr class="venue-divider">');

        return '<section class="venue" id="venue">' + blocks + '</section>';
    }

    function renderContact() {
        var contact = CFG.contact;
        if (!enabled(contact)) return '';
        var phones = list(contact, 'phones');
        var form = contact.form || {};

        var phoneBlock = phones.length
            ? '<div class="phone-info">' + phones.map(function (phone) {
                  var digits = String(phone.number || '').replace(/[^0-9+]/g, '');
                  return '<p>' +
                             '<span class="phone-label">' + esc(phone.label) + '</span><br>' +
                             (digits
                                 ? '<a class="phone-number" href="tel:' + esc(digits) + '">' + esc(phone.number) + '</a>'
                                 : '<span class="phone-number">' + esc(phone.number) + '</span>') +
                         '</p>';
              }).join('') + '</div>'
            : '';

        var formBlock = (form.enabled !== false && form.email)
            ? '<form id="contactForm">' +
                  '<div class="form-group">' +
                      '<label for="contact-name">Your Name</label>' +
                      '<input type="text" id="contact-name" name="name" required placeholder="' +
                          esc(form.namePlaceholder || 'How should we know you?') + '">' +
                  '</div>' +
                  '<div class="form-group">' +
                      '<label for="contact-email">Email Address</label>' +
                      '<input type="email" id="contact-email" name="email" required placeholder="your@email.com">' +
                  '</div>' +
                  '<div class="form-group">' +
                      '<label for="contact-message">Your Question or Message</label>' +
                      '<textarea id="contact-message" name="message" required placeholder="' +
                          esc(form.messagePlaceholder || 'Tell us how we can help...') + '"></textarea>' +
                  '</div>' +
                  '<button type="submit" class="submit-btn">' + esc(form.buttonLabel || 'Send Message') + '</button>' +
              '</form>'
            : '';

        return '<section class="contact" id="contact">' +
                   '<div class="contact-container">' +
                       '<h2>' + esc(contact.heading || 'Have Questions?') + '</h2>' +
                       (contact.intro ? '<p class="contact-intro">' + esc(contact.intro) + '</p>' : '') +
                       phoneBlock +
                       formBlock +
                   '</div>' +
               '</section>';
    }

    function renderFooter() {
        var footer = CFG.footer || {};
        if (!footer.title && !footer.subtitle && !footer.tagline) return '';
        return '<footer><div class="footer-content">' +
                   (footer.title ? '<h3>' + esc(footer.title) + '</h3>' : '') +
                   (footer.subtitle ? '<p>' + esc(footer.subtitle) + '</p>' : '') +
                   (footer.tagline ? '<p class="footer-tagline">' + esc(footer.tagline) + '</p>' : '') +
               '</div></footer>';
    }

    /* ---------- behaviour ---------- */

    function wireVideoModal(root) {
        var modal = root.querySelector('#videoModal');
        if (!modal) return;
        var iframe = modal.querySelector('.modal-iframe');

        function open() {
            // The recorder asks for camera access, so it is only loaded once
            // someone actually opens the modal.
            if (iframe && !iframe.src) iframe.src = iframe.getAttribute('data-src');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            if (iframe) iframe.src = '';
        }

        root.querySelectorAll('[data-open-video-modal]').forEach(function (button) {
            button.addEventListener('click', open);
        });
        modal.querySelector('.modal-close').addEventListener('click', close);
        modal.addEventListener('click', function (event) {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modal.classList.contains('active')) close();
        });
    }

    function wireLazyMaps(root) {
        var frames = Array.prototype.slice.call(root.querySelectorAll('.venue-map iframe[data-src]'));
        if (!frames.length) return;

        function load(frame) {
            if (!frame.src) frame.src = frame.getAttribute('data-src');
        }

        if (!('IntersectionObserver' in window)) {
            frames.forEach(load);
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    load(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' });
        frames.forEach(function (frame) { observer.observe(frame); });
    }

    function wireContactForm(root) {
        var form = root.querySelector('#contactForm');
        if (!form) return;
        var settings = (CFG.contact && CFG.contact.form) || {};

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var name = form.querySelector('#contact-name').value;
            var email = form.querySelector('#contact-email').value;
            var message = form.querySelector('#contact-message').value;

            var subject = settings.subject || ('Question about ' + (CFG.title || 'your event'));
            var body = (settings.greeting || 'Hello,') + '\n\n' +
                       'My name is ' + name + '.\n\n' +
                       message + '\n\n' +
                       'You can reach me at: ' + email + '\n\nThanks!';

            window.location.href = 'mailto:' + settings.email +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);
            form.reset();
        });
    }

    function wireSmoothScroll(root) {
        root.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (event) {
                var target = document.querySelector(this.getAttribute('href'));
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function wireConfetti() {
        if (CFG.confetti === false) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var palette = ['primary', 'cream', 'dark'];

        function burst() {
            for (var i = 0; i < 50; i++) {
                var piece = document.createElement('div');
                piece.className = 'confetti ' + palette[Math.floor(Math.random() * palette.length)];
                piece.style.left = (Math.random() * window.innerWidth) + 'px';
                piece.style.top = '-10px';
                piece.style.animationDuration = (Math.random() * 2 + 3) + 's';
                piece.style.animationDelay = (Math.random() * 0.5) + 's';
                document.body.appendChild(piece);
                setTimeout(function (node) {
                    return function () { node.remove(); };
                }(piece), 5000);
            }
        }

        window.addEventListener('load', burst);

        var last = 0;
        window.addEventListener('scroll', function () {
            var now = Date.now();
            if (now - last > 3000 && Math.random() < 0.3) {
                burst();
                last = now;
            }
        });
    }

    /* ---------- boot ---------- */

    function render() {
        var root = document.getElementById('event-root') || document.body;
        root.innerHTML = [
            renderHeader(),
            renderHero(),
            renderFeaturedVideo(),
            renderPhotos(),
            renderSchedule(),
            renderVideoTribute(),
            renderVideoModal(),
            renderVenues(),
            renderContact(),
            renderFooter()
        ].join('');

        wireVideoModal(root);
        wireLazyMaps(root);
        wireContactForm(root);
        wireSmoothScroll(root);
        wireConfetti();
    }

    applyTheme();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            applyHead();
            render();
        });
    } else {
        applyHead();
        render();
    }
})();
