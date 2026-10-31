# CLAUDE.md — Marketers Club

Marketers Club is a career-first marketing hub: static HTML pages in `public/`, client modules in `src/`, an Express API in `server/`, and Firebase (Auth + Firestore). The route and data plan is in `NEW_PLAN.md`. Build with `npm run build`, run with `npm start`, seed with `npm run seed`, smoke test with `npm run smoke`.

## Hubsy AI Operating System

The team's AI OS lives at **`~/.hubsy/`** (`/Users/arlindakaloshi/.hubsy`). It is a separate git repo, not part of this project. Before any marketing, content, design, sales or research task here, open the matching file below and follow it.

### Brand and business context
- Business: Creative Hub Kosovo (creativehubkos.com), a US-licensed tech and AI academy. Campuses in Prishtina, Skopje and Miami. Seven academies, Professional Certificate, hybrid or online.
- Facts (tuition, dates, coordinators, licence): `~/.hubsy/.agent/web-app/knowledge-base.json` is the only source. Never invent them.
- Brand voice and assistant rules: `~/.hubsy/.agent/web-app/system-prompt.txt`
- Marketing config (programs, message anchors, channels, approver): `~/.hubsy/skills/cmo/config/cmo.json`

### Core rules (apply by default)
1. **Drafts only.** Nothing is published, sent or scheduled without Arlinda's approval, one piece at a time. No live ad-account or budget changes.
2. **No invented facts.** No outcome, salary or placement guarantees. No fabricated people, testimonials, metrics or sources. Unverified numbers get `[Confirm metric]`.
3. **One language per piece.** Albanian (sq) for Kosovo-first channels, English for international or B2B. Never mix in one caption, email or reply.
4. **Voice:** confident, plain, human. No hype, fake urgency, emoji spam, engagement bait, em dashes, "not X but Y" contrasts or one-line dramatic closers. Run copy through the humanizer rules.
5. **One CTA per piece.** Coordinator routing: Flaka Dermaku (Data Engineering, Vibe Coding, Full-stack, Product Management); Leonita Krasniqi (Data Science, Digital Marketing, HR). Both use feminine forms in Albanian. No personal phone numbers in public captions.
6. **Quality bar:** drafts must score at least 8/10 on the CMO rubric (hook 4, educational points 3, CTA 3). A guardrail violation scores 0.

### Index of key instructions
| Area | File |
| --- | --- |
| Arlinda's background, positioning, portfolio design tokens, projects | `~/.hubsy/memory/context.json` |
| Skill registry (all skills, triggers, params) | `~/.hubsy/config/skills.json` |
| Routing brain | `~/.hubsy/skills/orchestrator/SKILL.md` |
| Marketing parent agent | `~/.hubsy/skills/cmo/SKILL.md`, sub-agents in `skills/cmo/agents/` |
| Marketing guardrails | `~/.hubsy/skills/cmo/references/guardrails.md` |
| Quality rubric | `~/.hubsy/skills/cmo/references/quality-rubric.md` |
| Content pillars, channels, hooks, schedule, caption schema | `~/.hubsy/.agent/content-planner/playbook.md` |
| CMO agent loop, briefs, report template | `~/.hubsy/.agent/cmo-agent/` |
| Sales parent agent | `~/.hubsy/skills/cso/SKILL.md`, `~/.hubsy/.agent/cso-agent/` |
| ICP and outreach rules | `~/.hubsy/.agent/lead-gen-agent/icp.md`, `outreach-playbook.md` |
| Writing cleanup (AI tells) | `~/.hubsy/skills/humanizer/SKILL.md` |
| Social threads (X/LinkedIn, sq/en) | `~/.hubsy/skills/social-thread-writer/SKILL.md` |
| Frontend design taste and anti-slop | `~/.hubsy/skills/design-taste-frontend/SKILL.md` |
| Design critique, audits, banned UI patterns | `~/.hubsy/skills/impeccable-design/SKILL.md` |
| UX, tokens, accessibility (WCAG) | `~/.hubsy/skills/ui-ux-pro-max/SKILL.md` |
| Research with cited, rated findings | `~/.hubsy/skills/research-assistant/SKILL.md` |
| Video clips / editing | `~/.hubsy/.agent/skills/clipper.md`, `~/.hubsy/skills/video-editing-agent/SKILL.md` |
| Building or improving skills | `~/.hubsy/skills/skill_builder.md` |
| Visual inspiration notes | `~/.hubsy/inspo/` |

### Frontend work in this repo
Pages here must not look like default LLM output. Apply `design-taste-frontend`, `impeccable-design` and `ui-ux-pro-max`: one accent colour, no AI-purple gradients, no glow or radial spotlights, no hero eyebrows or numbered section labels, WCAG 2.2 AA contrast, 44px touch targets, mobile-first at 375 / 768 / 1440.

### Known gaps in `~/.hubsy`
- `skills/social-post` was rewritten for Arlinda (brands `creative-hub` and `marketers-club`) on 2026-10-27. Its `validate.py` only checks input shape; it does not write real posts.
- `carousel-render` is named as an executor in the CMO skill but does not exist. `skills/carousel-generator` writes the copy; nothing renders PNGs or PDFs yet.
- `~/.hubsy/AGENTS.md` says to auto-commit and push changes made inside `~/.hubsy`. That applies only to that repo, never to this project.
