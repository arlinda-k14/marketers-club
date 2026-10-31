# Marketers Club content calendar: 2 Nov to 15 Nov 2026

Status: **all drafts**. Nothing here is scheduled or published. Each piece needs Arlinda's approval on its own.

- Brand: `marketers-club` (social-post skill). Audience: working marketers who want career growth, templates and community.
- Voice: Arlinda, first person on LinkedIn. Instagram is written for the Marketers Club account `[Confirm handle]`.
- Language: English for every piece (the site is English). No piece mixes languages. Albanian versions can be written as separate pieces.
- Cadence: LinkedIn 3 per week (Tue to Thu, 09:00), Instagram 2 per week. Timezone Europe/Prishtina.
- Links: kept out of LinkedIn copy (first comment) and Instagram copy (link in bio).
- CSV for Notion import (same columns as the site's calendar template): [2026-11-02-two-week-calendar.csv](2026-11-02-two-week-calendar.csv)

## Before anything posts

1. **Check what is live on marketers-club.web.app.** `seed/mock-data.json` is fictional (marketers, events, articles, newsletter issues). If `npm run seed:live` put it on the live site, the directory and events pages show people who do not exist. None of these posts link to those pages, but the site itself is the destination. Clear or replace the mock content first.
2. Confirm you are happy to share two build details from post 1: the Kosovo billing reason and the 66 rule tests.
3. Confirm whether the free stop-rule worksheet needs a signed-in account to download (posts 2 and 10 depend on the wording).
4. AI Growth Tools are off on the live site, so no post mentions them.

## Pillars (proposed for Marketers Club)

The Hubsy playbook pillars are written for Creative Hub. These are adapted to what Marketers Club actually offers today.

| Pillar | Share | Pieces |
| --- | ---: | --- |
| Career growth | 30% | 3, 4, 7 |
| Templates and playbooks | 20% | 2, 9 |
| Practical AI for marketers | 20% | 6, 8 |
| Building in public | 20% | 1, 5 |
| Join the club | 10% | 10 |

## Calendar

| # | Date | Time | Channel | Format | Pillar | Hook | CTA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Tue 3 Nov | 09:00 | LinkedIn | Text + 1 image | Building in public | I built Marketers Club on Firebase's free plan for a boring reason: Google Cloud billing doesn't list Kosovo. | Create a free account (first comment) |
| 2 | Wed 4 Nov | 09:00 | LinkedIn | Text + document | Templates | Before a campaign spends anything, I write one sentence: the metric, the threshold and the date we check it. | Download the free worksheet (first comment) |
| 3 | Wed 4 Nov | 19:30 | Instagram | Carousel, 8 slides | Career growth | Your marketer profile, checked before anyone hires you | Save this |
| 4 | Thu 5 Nov | 09:00 | LinkedIn | Text | Career growth | Most of the "marketing problems" I get asked to fix turn out to be follow-through problems. | Reply: where does follow-through break on your team? |
| 5 | Sat 7 Nov | 10:00 | Instagram | Reel, 25 to 35s | Building in public | I'm a marketer. I built this site anyway. | Link in bio to make a profile |
| 6 | Tue 10 Nov | 09:00 | LinkedIn | Text | Practical AI | My AI drafting setup has one rule it isn't allowed to break: it never invents a number. | Reply: what rule would you hard-code? |
| 7 | Wed 11 Nov | 09:00 | LinkedIn | Text | Career growth | If your best campaign is under NDA, your portfolio can still show how you made the calls. | Add the case study to your profile (first comment) |
| 8 | Wed 11 Nov | 12:30 | Instagram | Carousel, 6 slides | Practical AI | 4 checks before you post anything AI drafted | Save this |
| 9 | Thu 12 Nov | 09:00 | LinkedIn | Text + image of the calendar | Templates | Two columns in my content calendar do most of the work: language and CTA. | Save this |
| 10 | Sat 14 Nov | 10:00 | Instagram | Carousel, 6 slides | Join the club | What a free Marketers Club account gets you | Link in bio |

---

## Drafts

### 1. Tue 3 Nov, LinkedIn: why it runs on a free plan

- Pillar: building in public. Format: text + one screenshot of the home page.
- Score: hook 4, educational 2, CTA 3 = **9/10**

**Post**

I built Marketers Club on Firebase's free plan for a boring reason: Google Cloud billing doesn't list Kosovo.

So there is no server. Every page talks to the database straight from the browser, and the security rules are the only thing between a visitor and someone else's data. I wrote 66 tests for those rules before letting anyone in.

I'm a marketer. I came up through agency social media and ads, and I build with plain HTML, Firebase and a lot of written-down rules. Marketers Club is the place I wanted when I was starting out: working marketers build a profile, save the articles and events worth coming back to, submit their own events and get in touch with each other.

It's early and small. I'm inviting people one post at a time, starting with marketers who want somewhere to show their work.

If that's you, the free account is open. Link in the first comment.

#Marketing #BuildInPublic #Firebase #MarketersClub

**First comment:** https://marketers-club.web.app

**Asset notes:** one clean screenshot of the live home page at desktop width. Take it after the mock content is cleared.

**Review:** facts from project memory (Spark plan, Kosovo billing, 66 rule tests) and `context.json` (agency background). Single CTA. No em dashes. `[Confirm OK to share billing and test details]`

---

### 2. Wed 4 Nov, LinkedIn: the stop-rule sentence

- Pillar: templates. Format: text + the worksheet as a PDF document post.
- Score: hook 4, educational 3, CTA 3 = **10/10**

**Post**

Before a campaign spends anything, I write one sentence: the metric, the threshold and the date we check it.

"We pause this campaign if cost per lead is above [X] on [date]."

That sentence settles the argument before anyone has a reason to defend the spend. When the check date arrives, the decision is already made, and the meeting is about what we learned.

When a test misses, we pause and rewrite the hook before we touch the budget. Putting more money behind a weak hook buys a more expensive version of the same result.

I turned this into a one-page worksheet: the campaign and its owner, the stop rule, what happens when it triggers, and review notes. It takes about ten minutes to fill in. Fill it in with whoever controls the budget, so the rule belongs to both of you.

It's free in the Marketers Club resource library. Link in the first comment.

#PerformanceMarketing #PaidSocial #MarketingOps #MarketersClub

**First comment:** https://marketers-club.web.app/resources.html

**Asset notes:** export `public/assets/resources/campaign-stop-rule-worksheet.md` as a 2-page PDF in the site's type and colours for the document post.

**Review:** method is Arlinda's own (seeded forum comment and worksheet). `[Confirm: download needs sign-in?]` If it does, change the last line to "Free with a Marketers Club account."

---

### 3. Wed 4 Nov, Instagram carousel: profile check

- Pillar: career growth. Format: 8-slide carousel, 1080x1350.
- Score: hook 3, educational 3, CTA 3 = **9/10**

**Slides**

1. Your marketer profile, checked before anyone hires you
2. Lead with what you do in one line. "I run paid social for B2B software" tells a client more than "passionate storyteller".
3. Pick three specialties at most. A list of twelve reads like you're still deciding.
4. Link work people can open. One live case study beats a PDF they have to request.
5. Show a rate range, or say how you price.
6. Say what you're looking for: freelance work, a full-time role or collaborators.
7. Update it when you ship something. A profile untouched for a year looks closed.
8. Save this for your next profile update.

**Caption**

Profiles tend to get written once and left alone. Here is the checklist we'd run before sending yours to anyone who might hire you.

The two people skip are rates and what you're looking for. Both feel awkward to write. Both save a client a message they might not bother sending.

Go through it slide by slide and fix one thing at a time. Most of these take five minutes. The specialties slide usually takes longest, because it means deciding what you want to be hired for.

Save this for the next time you update your profile.

#MarketingCareers #FreelanceMarketing #PersonalBrand #MarketersClub

**Asset notes:** text-only slides in the site's type and accent colour. No stock photos.

**Review:** advice only, no claims. Single CTA.

---

### 4. Thu 5 Nov, LinkedIn: follow-through as a career skill

- Pillar: career growth. Format: text only.
- Score: hook 4, educational 3, CTA 2 = **9/10**

**Post**

Most of the "marketing problems" I get asked to fix turn out to be follow-through problems.

The campaign launched and nobody owned the replies. The content calendar existed and nobody owned the week it slipped. A lead came in and nobody knew whose it was.

I've found that gap is useful for your career. The marketer who owns what happens after launch (the routing, the follow-up, the playbook written down so it runs while they're on holiday) is usually the one trusted with the next budget.

Three places to start this month:

1. Pick one campaign and write down who answers each type of reply.
2. Put a check date on everything you launch.
3. Write the playbook as you go, while you still remember why you made each call.

None of these need a new tool. A shared doc and a calendar reminder will do.

Which part of follow-through breaks first on your team?

#MarketingCareers #Growth #MarketingOps #MarketersClub

**Asset notes:** none.

**Review:** positioning line from `context.json`. CTA is a genuine question, not bait. No link, so nothing goes in the first comment.

---

### 5. Sat 7 Nov, Instagram reel: a marketer built this

- Pillar: building in public. Format: 25 to 35s screen recording with voiceover, captions burned in.
- Score: hook 4, educational 2, CTA 3 = **9/10**

**Script**

| Time | On screen | Voiceover |
| --- | --- | --- |
| 0 to 3s | Home page, text overlay: "I'm a marketer. I built this site anyway." | I'm a marketer. I built this site anyway. |
| 3 to 12s | Scroll through the code editor, then the Firebase console | Plain HTML, CSS and JavaScript. Firebase for sign-in and data. |
| 12 to 22s | Terminal: rule tests passing | The free plan meant no server, so I wrote tests for every database rule before opening it up. |
| 22 to 30s | Profile page being filled in | It's called Marketers Club. Working marketers make a profile, save what's worth rereading and find each other. |
| 30 to 33s | Text: "Link in bio" | The link's in the bio if you want a profile on it. |

**Caption**

Marketing background, plain HTML and Firebase, and a test for every database rule before anyone could sign up.

I build my own tools because it's the fastest way I know to understand what a marketing team needs from them. Everything in the video is the real build: the code, the console and the tests.

Marketers Club is small and new. It's built for working marketers who want somewhere to show their work, save what's useful and find each other. A free account takes a few minutes to set up.

Link in bio if you want a profile on it.

#BuildInPublic #MarketingCareers #WebDev #MarketersClub

**Asset notes:** record at 1080x1920. Blur any API keys, project IDs or emails in the console and terminal.

**Review:** same facts as post 1. Single CTA. Caption under 150 words.

---

### 6. Tue 10 Nov, LinkedIn: the no-invented-numbers rule

- Pillar: practical AI. Format: text only.
- Score: hook 4, educational 3, CTA 2 = **9/10**

**Post**

My AI drafting setup has one rule it isn't allowed to break: it never invents a number.

When a draft needs a metric it doesn't have, it writes [Confirm metric] and keeps going. I fill the gap or cut the sentence before anything goes out.

Language models are good at sentences that sound measured. They will happily produce a tidy percentage with nothing behind it, and in marketing copy that becomes a claim your brand has to stand behind, often in front of a client who will ask where it came from.

The same file holds the rest of my rules: one language per post, one call to action, no salary or results promises, and no testimonials from people who don't exist. They take an afternoon to write, and they turn review into an edit instead of a fact-check.

If you use AI for drafts, start with the number rule.

What rule would you hard-code into yours?

#AIForMarketers #ContentMarketing #MarketingOps #MarketersClub

**Asset notes:** none.

**Review:** rules are the real Hubsy guardrails. "Start with the number rule" is advice, the closing question is the CTA. Single CTA.

---

### 7. Wed 11 Nov, LinkedIn: case studies under NDA

- Pillar: career growth. Format: text + an image of the four-part outline.
- Score: hook 4, educational 3, CTA 3 = **10/10**

**Post**

If your best campaign is under NDA, your portfolio can still show how you made the calls.

A good case study shows judgement, and you can show judgement without the client's name or numbers. Write it in four parts:

1. The situation, anonymised. "B2B software company, two-person marketing team, paid social had stalled."
2. The decision you made and what you ruled out.
3. The stop rule you set: the metric, the threshold and the date you checked it.
4. What changed, in whatever terms the client has approved. Get that approval in writing.

Keep each part to a short paragraph. A hiring manager should be able to read the whole case study in two minutes.

One case study written like this tells a hiring manager how you work, which a row of brand logos can't.

If you write one this week, add it to your Marketers Club profile. Link in the first comment.

#MarketingCareers #Portfolio #CaseStudy #MarketersClub

**First comment:** https://marketers-club.web.app

**Asset notes:** one 1200x1500 image listing the four parts. Site type and accent colour.

**Review:** the example in point 1 is clearly hypothetical. No outcome claims. Single CTA.

---

### 8. Wed 11 Nov, Instagram carousel: four checks for AI drafts

- Pillar: practical AI. Format: 6-slide carousel, 1080x1350.
- Score: hook 3, educational 3, CTA 3 = **9/10**

**Slides**

1. 4 checks before you post anything AI drafted
2. Every number has a source you can open. If it doesn't, cut it.
3. One language from the first word to the last.
4. One call to action. Pick the one you want and delete the rest.
5. Read it out loud. If you wouldn't say it to a colleague, rewrite it.
6. Save this for your next draft.

**Caption**

AI writes a usable first draft fast. These four checks are what we run before one goes out. The first one matters most: a confident number with no source is easy to miss and hard to take back once it's posted.

Slide 4 is the one people resist. A draft often ends with three asks: follow, comment and click. Choose the one that matters for this post and leave the others for another day. Slide 5 catches most of the phrasing that makes copy sound generated. If a sentence would feel odd said across a desk, it will read oddly in a feed too.

Save this for your next draft.

#AIForMarketers #ContentMarketing #CopywritingTips #MarketersClub

**Asset notes:** text-only slides, one check per slide, large type.

**Review:** checks come from the Hubsy guardrails and humanizer. Single CTA.

---

### 9. Thu 12 Nov, LinkedIn: language and CTA columns

- Pillar: templates. Format: text + screenshot of a filled calendar row.
- Score: hook 4, educational 3, CTA 2 = **9/10**

**Post**

Two columns in my content calendar do most of the work: language and CTA.

I plan in Albanian and English. Each post gets one language, set in the calendar before anyone drafts it, so nobody writes a half-and-half caption to cover both audiences.

The CTA works the same way. One per post, chosen in the row: save, reply, sign up or book a call. Once the CTA is fixed, the caption gets written toward it.

The rest of the row is date, time and timezone, channel, format, pillar, the hook written out in full, a one-line summary, asset notes for whoever designs it, sources and status. Every row starts as a draft.

Two habits keep it honest. Each pillar gets a share of the month, so promotion can't quietly take over the feed. And the hook is a full sentence from day one, because a topic label like "stop-rule post" is too vague to brief a designer.

Save this for your next planning session.

#ContentStrategy #ContentMarketing #MarketingOps #MarketersClub

**Asset notes:** screenshot of this calendar's CSV opened in Notion, one row visible, cropped tight.

**Review:** columns match `public/assets/resources/content-calendar-template.csv`. That template is Pro tier, so the post doesn't promote it. Single CTA.

---

### 10. Sat 14 Nov, Instagram carousel: what a free account gets you

- Pillar: join the club. Format: 6-slide carousel, 1080x1350, each slide a phone screenshot.
- Score: hook 3, educational 2, CTA 3 = **8/10**

**Slides**

1. What a free Marketers Club account gets you
2. A profile that shows your specialties, your work and how you price.
3. Save articles and events to come back to.
4. Submit your own event for the calendar.
5. Contact other marketers directly.
6. Free resources, starting with the campaign stop-rule worksheet. Link in bio.

**Caption**

Marketers Club is a small, career-first community for working marketers. A free account lets you build a profile, save what's worth rereading, submit events and get in touch with other members.

The resource library starts with a campaign stop-rule worksheet: one page to agree the metric, threshold and check date before a campaign spends anything.

The directory ranks complete profiles higher, so fill in your specialties, work links and rate range when you have ten minutes to do it properly. Swipe through to see each part first.

Link in bio to make yours.

#MarketingCommunity #MarketingCareers #FreelanceMarketing #MarketersClub

**Asset notes:** real screenshots from the live site at 375px width, after mock content is cleared. No fictional profiles in frame.

**Review:** features from the home page copy; ranking by profile completeness is in `NEW_PLAN.md`. `[Confirm all four work on the live site]`, especially contacting marketers, which only makes sense once real profiles exist. Single CTA.

---

## Review checks (all 10)

- [x] Single language (English) in every piece
- [x] One CTA per piece
- [x] No em dashes or en dashes in copy
- [x] No salary, placement or results promises
- [x] No invented people, testimonials or metrics; open facts marked `[Confirm ...]`
- [x] No links in LinkedIn or Instagram copy
- [x] Every piece scores 8/10 or higher on the CMO rubric
- [ ] Live site checked for mock content (Arlinda)
- [ ] Each piece approved one at a time (Arlinda)
