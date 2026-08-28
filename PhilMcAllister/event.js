/* ==========================================================================
   Phil McAllister — 90th Birthday Celebration (June 5–7, 2026)
   The first UR Invited event. Everything on the page comes from this file;
   assets/event.js turns it into HTML. Copy this file to start a new event.
   ========================================================================== */

window.URINVITED_EVENT = {
    slug: 'PhilMcAllister',
    title: "Phil's 90th Birthday Celebration",
    logo: "Phil McAllister's 90th",

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
        description: 'Join us to celebrate ninety wonderful years.',
        ogImage: 'public/og-image.png',
        themeColor: '#1a1a1a'
    },

    hero: {
        badge: "🎉 SHHHHH... IT'S A SURPRISE! 🎉",
        title: "Phil's 90th Birthday",
        subtitle: 'A Celebration of Nine Decades',
        tagline: "Join us for a special weekend celebrating Phil McAllister's incredible " +
                 'life and legacy. This milestone birthday brings the entire McAllister ' +
                 'family together for celebration, laughter, love, and reconnection with ' +
                 'generations of family.'
    },

    featuredVideo: {
        enabled: true,
        src: 'chip-video.mp4',
        notice: '⏰ PLEASE SUBMIT BY WEDNESDAY, JUNE 3, 2026'
    },

    photo: {
        enabled: true,
        navLabel: 'Photos',
        title: "Phil's 90th",
        image: 'images/uncle-phil.jpg',
        alt: 'Phil McAllister 90th Birthday',
        gallery: []
    },

    schedule: {
        enabled: true,
        navLabel: 'Events',
        title: 'Celebration Weekend',
        items: [
            {
                date: 'June 5',
                time: '7:00 PM',
                title: 'Family & Friends Gathering',
                locationLines: ["Dave and Buster's", '2075 Diamond Blvd, Unit H180', 'Concord, CA 94520'],
                venueId: 'dave-busters-venue'
            },
            {
                date: 'June 6',
                time: '3:00 PM',
                title: 'Family Backyard BBQ',
                locationLines: ["Aunt Marilyn's House", '4406 Black Walnut Ct', 'Concord, CA 94591'],
                venueId: 'bbq-venue'
            },
            {
                date: 'June 7',
                time: '12:00 PM',
                title: "🎉 Uncle Phil's 90th Birthday",
                locationLines: ['Acalanes Lodge', '925 Moraga Rd', 'Lafayette, CA 94549'],
                venueId: 'birthday-venue'
            }
        ]
    },

    videoTribute: {
        enabled: true,
        navLabel: '📹 Videos',
        badge: '🙏 PLEASE: SUBMIT BY WED, JUNE 3',
        heading: '🎥 Share Your Video Message!',
        subheading: 'Submit Your Video Tribute for Phil',
        intro: "We're creating a special video tribute for Phil! Record a short message " +
               'with your birthday wishes, favorite memories, or well-wishes.',
        buttonLabel: '▶️ CREATE YOUR VIDEO NOW',
        buttonNote: "Click above to record and upload directly. It's fast, easy, and seamless!",
        embedUrl: 'https://app.memento.com/phillip-mcallisters-90th-birthday/JYl8N7dLVr/record',
        tipsTitle: 'Quick Tips:',
        tips: [
            'Record a short video message (30 seconds to 2 minutes is perfect)',
            'Say your name and your relationship to Phil',
            'Share your birthday wishes, favorite memories, or well-wishes'
        ]
    },

    venues: {
        enabled: true,
        navLabel: 'Venue',
        items: [
            {
                id: 'dave-busters-venue',
                heading: 'June 5 — Family & Friends Gathering',
                description: 'Kick off the celebration weekend with family and friends at ' +
                             "Dave and Buster's in Concord. An evening of games, food, and fun!",
                name: "Dave and Buster's",
                addressLines: ['2075 Diamond Blvd, Unit H180', 'Concord, CA 94520']
            },
            {
                id: 'bbq-venue',
                heading: 'June 6 — Family & Friends Backyard BBQ',
                description: 'Join us for a casual afternoon of food, fun, and family and ' +
                             "friends bonding at Aunt Marilyn's house in Concord. This is the " +
                             'perfect way to kick off the celebration weekend!',
                addressLines: ['4406 Black Walnut Ct', 'Concord, CA 94591']
            },
            {
                id: 'birthday-venue',
                heading: "June 7 — Uncle Phil's 90th Birthday",
                description: "Join us for Phil's special milestone birthday celebration at the " +
                             'beautiful Acalanes Lodge in Lafayette. This is a surprise party ' +
                             'celebrating a life well-lived with family and friends!',
                name: 'Acalanes Lodge',
                addressLines: ['925 Moraga Rd', 'Lafayette, CA 94549'],
                notes: [
                    {
                        label: '🚗 Parking Note',
                        text: 'Parking is limited at the building. Please plan to park on the ' +
                              'street and walk, or at the school across the street if the gates are open.'
                    }
                ]
            }
        ]
    },

    contact: {
        enabled: true,
        navLabel: 'Questions?',
        heading: 'Have Questions?',
        intro: "We'd love to hear from you! Reach out with any questions about the weekend celebration.",
        phones: [
            { label: 'Contact Chip', number: '(949) 735-9415' },
            { label: 'Contact Nicole', number: '(916) 539-7161' }
        ],
        form: {
            enabled: true,
            email: 'Chip@ChipAndKim.com',
            subject: "Question about Phil's 90th Birthday Celebration",
            greeting: 'Hi Chip or Nicole,'
        }
    },

    footer: {
        title: "Phil's 90th Birthday",
        subtitle: 'June 5-7, 2026',
        tagline: 'Celebrating 90 Years of an Incredible Life'
    }
};
