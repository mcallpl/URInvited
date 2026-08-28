/* ==========================================================================
   UR Invited — new event starter
   --------------------------------------------------------------------------
   Two ways to use this:

     1. Open builder.html in a browser, fill in the form, and download the
        event.js it generates. Nothing here needs editing by hand.

     2. Copy this whole folder to events/<your-slug>/ and edit the values
        below. Delete any section you do not want, or set enabled: false.

   Image paths are written relative to the site root, e.g. 'images/anna.jpg'.
   ========================================================================== */

window.URINVITED_EVENT = {
    slug: 'your-event-slug',
    title: 'Your Event Name',
    logo: 'Your Event',

    // Every colour on the page comes from these six values.
    theme: {
        primary: '#D4AF37',
        primaryLight: '#E8D5A8',
        accent: '#B8860B',
        dark: '#1a1a1a',
        dark2: '#2a2a2a',
        cream: '#F5F1E8'
    },

    confetti: true,

    meta: {
        description: 'One line that shows up when someone shares the link.',
        ogImage: 'public/og-image.png',
        themeColor: '#1a1a1a'
    },

    hero: {
        badge: '',                       // leave empty to hide the badge
        title: 'Your Event Name',
        subtitle: 'A short subtitle',
        tagline: 'A sentence or two about who this is for and why it matters.'
    },

    // A featured video at the top of the page. Drop the file in the site root.
    featuredVideo: {
        enabled: false,
        src: '',
        notice: ''
    },

    photo: {
        enabled: true,
        navLabel: 'Photos',
        title: 'Photos',
        image: '',                       // one large photo
        alt: '',
        caption: '',
        gallery: []                      // extra photos: [{ src: '...', alt: '...' }]
    },

    schedule: {
        enabled: true,
        navLabel: 'Events',
        title: 'The Schedule',
        items: [
            {
                date: 'June 5',
                time: '7:00 PM',
                title: 'Welcome Gathering',
                locationLines: ['Venue name', '123 Main St', 'Anytown, CA 90210'],
                venueId: 'venue-1'       // links this card to the venue block below
            }
        ]
    },

    // Invite guests to record a video message (Memento, Vidday, a form, etc.)
    videoTribute: {
        enabled: false,
        navLabel: '📹 Videos',
        badge: '',
        heading: '🎥 Share Your Video Message!',
        subheading: '',
        intro: '',
        buttonLabel: '▶️ CREATE YOUR VIDEO NOW',
        buttonNote: '',
        embedUrl: '',                    // the recorder URL, opened in a modal
        tipsTitle: 'Quick Tips:',
        tips: []
    },

    // Maps are generated from the address — no API key, no embed code needed.
    venues: {
        enabled: true,
        navLabel: 'Venue',
        items: [
            {
                id: 'venue-1',
                heading: 'June 5 — Welcome Gathering',
                description: 'A sentence about this stop.',
                name: 'Venue name',
                addressLines: ['123 Main St', 'Anytown, CA 90210'],
                notes: []                // [{ label: '🚗 Parking', text: '...' }]
            }
        ]
    },

    contact: {
        enabled: true,
        navLabel: 'Questions?',
        heading: 'Have Questions?',
        intro: "We'd love to hear from you!",
        phones: [],                      // [{ label: 'Contact Sam', number: '(555) 123-4567' }]
        form: {
            enabled: true,
            email: 'you@example.com',    // the form opens the guest's mail app
            subject: 'Question about the event',
            greeting: 'Hi there,'
        }
    },

    footer: {
        title: 'Your Event Name',
        subtitle: 'June 5, 2026',
        tagline: ''
    }
};
