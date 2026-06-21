# HallPass

Classroom sign-out app with shared Firebase/Firestore data.

## Deploy

This is a static web app. Deploy the project root to Vercel.

Required files:

- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`
- `vercel.json`

## Firebase

Firestore data is stored at:

```txt
schools/default-school/apps/hallpass-state
```

Teacher access code:

```txt
6767
```

## Current Features

- Shared Firestore roster and trip history
- Teacher code lock
- Data Center with date, destination, class, student, chart, and CSV export filters
- Bulk roster import and roster CSV download
- Optional teacher notes on sign-outs
- Doctor's note exemptions
- Student privacy mode for the public display
- In-app long absence alerts after the configured minute limit

## Important

Text/email alerts require a backend service such as Firebase Functions plus SendGrid/Twilio. The app now stores the alert settings and shows in-app long absence warnings, but the browser-only Vercel app should not hold private text/email service keys.
