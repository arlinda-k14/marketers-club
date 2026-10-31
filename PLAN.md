# Plan (proposed)

## Directory tree (target)
```
marketers-club/
├── .env.example
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── package.json
├── public/                    # static assets copied/served (or dist served)
├── scripts/
│   ├── build.mjs              # Vite bundling? or esbuild; writes client to dist, server outside dist
│   ├── serve.mjs              # npm start serves dist and API
│   ├── seed.mjs               # separate, never run during build
│   └── smoke.mjs              # Playwright headless Chromium
├── server/
│   ├── app.js                 # Express app mounting modular API routes
│   ├── middleware/
│   │   └── auth.js            # verify Firebase Auth bearer token with firebase-admin
│   ├── routes/                # modular API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── resources.js
│   │   ├── forum.js
│   │   ├── mentors.js
│   │   ├── courses.js
│   │   ├── progress.js
│   │   ├── certificates.js
│   │   ├── tools.js           # jobs + worker endpoints
│   │   └── waitlist.js
│   └── workers/
│       └── toolsWorker.js     # async job processor
├── src/
│   ├── modules/               # one client controller paired with each page view (rea pattern)
│   │   ├── sign-in/
│   │   │   ├── controller.js
│   │   │   └── view.html (or view.js rendering)
│   │   ├── onboarding/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── courses/
│   │   ├── resources/
│   │   ├── forum/
│   │   ├── mentors/
│   │   └── tools/
│   ├── services/
│   │   └── firebase.js        # Firebase client service (rea pattern)
│   ├── styles/
│   │   ├── tokens.css         # Hubsy-extracted tokens
│   │   └── main.css
│   └── entries/               # Vite/entry points mapping to modules
├── storage.rules
└── vite.config.js (or esbuild config) — writes to dist, server outside dist
```

## Route list (client + API)
**Client routes/pages:**
- `/` or `/index.html` - landing/sign-in redirect logic
- `/sign-in.html` - Google OAuth + email/password, returnTo, notice about free account
- `/onboarding.html` - 8 fields as specified
- `/app.html` or `/dashboard.html` - member dashboard/profile
- `/courses.html` - course nav (5 tracks) linking to under-construction
- `/course-view.html` - under-construction with waitlist
- `/resources.html` - resource library with filters (category/type/tier)
- `/forum.html` - forum list
- `/forum-thread.html` - thread with comments (auth verified email required to post)
- `/mentors.html` - mentor directory
- `/tools.html` - 3 growth tools with async jobs

**API routes (all except static require verified token):**
- `POST /api/auth/verify` (or middleware only)
- `GET/POST /api/users/*` (profile)
- `GET /api/resources` (tier checks)
- `POST /api/resources/:id/download` (increments downloadCount after tier check)
- `GET/POST /api/forum/*` (post/comment requires verified email)
- `GET /api/mentors`
- `GET /api/courses`
- `GET/POST /api/progress` (append lesson, recalc percent)
- `GET /api/certificates`
- `POST /api/tools/jobs` (create job, returns jobId)
- `GET /api/tools/jobs/:id` (status/result)
- `POST /api/waitlist/:courseId`

## Collections (Firestore)
- `users/{uid}`: fullName,email,currentRole,yearsExperience,primaryGoal,targetSkill,portfolioUrl,referralSource,uid,displayName,membershipTier('free'|'pro'),createdAt, toolUsage{...} monthly tracking
- `courses/{id}`: id,title,category,description,modules,totalDuration
- `resources/{id}`: id,title,category('Strategy'|'Social Media'|'Content'|'SEO'),type('Sheet'|'Notion'|'PDF'),fileUrl,downloadCount,tier('free'|'pro')
- `discussions/{id}`: id,authorUid,title,content,tags,commentCount,createdAt
- `discussions/{id}/comments/{commentId}`: ...
- `mentors/{id}`: mentorName,title,company,bio,specialties,bookingUrl,avatarImagePath,availability
- `certificates/{certificateId}`: memberDisplayName,courseTitle,completionTimestamp,instructorName,certificateId
- `jobs/{jobId}`: type,status,result,error,ownerUid,createdAt,updatedAt
- `courseWaitlist/{courseId}`: emails/entries with arrayUnion of uids/emails

## Build notes
- Vite bundles frontend; `npm run build` writes client assets to `dist/` and keeps server entrypoints outside `dist/`
- Add lightweight Node.js Express server mounting modular API routes
- Express verifies Firebase Auth bearer token with firebase-admin before protected routes
- Read admin creds from `GOOGLE_APPLICATION_CREDENTIALS`
- Client Firebase config from `VITE_*` in `.env.example` with provided values
- Hubsy tokens in `src/styles/tokens.css`
- `npm run seed` separate command, never during build
