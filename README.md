# Marketers Club

Career-first marketing hub combining self-paced learning, downloadable templates, community networking, and automated growth tools.

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in GOOGLE_APPLICATION_CREDENTIALS and OPENAI_API_KEY
npm run build
npm start
```

## Scripts

- `npm run build` - Build client assets to dist, server entrypoints outside dist
- `npm start` - Serve dist and API
- `npm run dev` - Build and start
- `npm run seed` - Seed database (separate command, never runs during build)
- `npm run smoke` - Run Playwright smoke tests

## Features

- Firebase Auth (Google OAuth + email/password) with indexedDB persistence
- Onboarding with 8 required fields
- Course catalog (5 tracks) with under-construction views and waitlist
- Resource library with tier-based access (pro resources locked)
- Community forum (verified email required to post)
- Mentor directory with 3 placeholder mentors
- Growth tools (headline, email brief, social post) with async jobs, rate limiting
- Certificate issuance with print support
- Hubsy design system

## Environment Variables

See `.env.example` for required variables.
