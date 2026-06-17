# Feminine Fat Loss Coaching Application Page

This is a static application page for Feminine Fat Loss coaching call applications.

## Setup

1. Put your videos in `assets/`:
   - `feminine-fat-loss-horizontal.mp4`
   - `feminine-fat-loss-vertical.mp4`
   - optional poster image: `video-poster.jpg`
2. In `app.js`, confirm `CALCOM_URL` is the correct scheduling link.
3. In Vercel, add the environment variable `RESEND_API_KEY`.
4. Add `APPLICATION_TO_EMAIL` if notifications should go somewhere other than `crista.ann.braun@gmail.com`.
5. Add `APPLICATION_FROM_EMAIL` after a sending domain is verified in Resend, for example `Crista Braun <hello@cristabraun.com>`.

The Vercel route `/freecall` is configured in `vercel.json`, so the page can live at `cristabraun.com/freecall` after the domain is connected. `/application` is also kept as a backup route.

The form posts to `/api/apply`, which sends the application email through Resend.
