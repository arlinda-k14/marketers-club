# New Plan for Marketers Club Restructure

## Routes (client pages)
- `/` index.html - Home (hero discover top marketers, upcoming workshops, top newsletter tips, recent blog posts, call to join)
- `/hire-marketers.html` - Hire Marketers (directory, ranked, filters)
- `/marketer-profile.html` - Marketer Profile (details + inquiry form)
- `/events.html` - Events with tabs Upcoming/Past
- `/event-detail.html` - Event detail
- `/submit-event.html` - Submit Event (members)
- `/blog.html` - Blog list (filter by tags)
- `/article.html` - Article detail
- `/newsletter.html` - Newsletter feed + signup
- `/edit-profile.html` - Edit Profile
- `/saved-resources.html` - Saved Resources (articles, events)
- `/admin-dashboard.html` - Admin Dashboard
- `/admin-panel.html` - Admin Panel

## API Routes (Express)
- Auth/middleware: verify Firebase token + role claims
- `/api/users/*` - profile, roles, saved resources
- `/api/marketers/*` - directory, profiles, inquiry
- `/api/events/*` - list/create/approve
- `/api/articles/*` - blog (admin/contributor publish)
- `/api/newsletter/*` - issues + subscribers (newsletter_subsribers)
- `/api/admin/*` - moderation

## Firestore Collections
- users/{uid}: role (member|marketer|admin), emailVerified, savedArticles[], savedEvents[], etc.
- marketer_profiles/{uid or id}: fullName, avatar, bio, yearsExperience, rateMin/rateMax, rateType(hourly|monthly), specialties[], portfolioLinks[], website, linkedin, email (direct contact), verified(bool), completionScore(number), lastActivityAt, createdAt
- events/{id}: title, hostName, date, time, timezone, meetingLink, venueLocation, description, categoryTags[], capacity, status(pending|approved|rejected), submittedBy, approvedBy, recordingUrl, slidesUrl, createdAt
- articles/{id}: title, content, excerpt, authorId, authorRole, tags[], status(draft|published), publishedAt, category
- newsletter_issues/{id}: issueNumber, tips[], publishedAt, tags[]
- newsletter_subsribers/{id/email}: email, subscribedAt
- contact_inquiries/{id}: marketerId, fromUid, fromEmail, message, createdAt

## Indexes needed
- marketer_profiles: order by completionScore desc, verified desc, lastActivityAt desc + where specialties array-contains
- events: where status==approved order by date asc/desc
- articles: where status==published order by publishedAt desc, tags array-contains
- newsletter_issues: order by publishedAt desc, tags array-contains

## Seed data
- 8 mock marketer profiles (fictional, example.com)
- 6 events: 3 upcoming, 3 past (2 past with recordingUrl/slidesUrl)

## Roles
- member: default
- marketer: granted by admin approval (member requests/becomes marketer only after admin approval)
- admin: set via custom claims
