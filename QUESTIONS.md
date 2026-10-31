# Open Questions (confirm before building)

## Auth / Firebase
1. **Firebase Web API key**: You provided `apiKey: <your-firebase-web-api-key>` (redacted). Firebase web keys are usually 39 chars. If auth fails with `auth/invalid-api-key`, what's the correct key? (Do not guess.)

## LLM / Growth Tools
2. **LLM provider**: Growth tools (headline generator, email brief builder, social post formatter) need an adapter reading key from env. Which provider should I use (e.g., OpenAI, Anthropic, Gemini, Groq, Together)? Also what env var name should the adapter expect (e.g., `OPENAI_API_KEY`)?
3. **FREE_TOOL_RUNS_PER_MONTH**: Not specified. If unset, I must stop and ask. What should the default/value be (integer)? Or should I require it to be set in env and fail fast if missing?

## Mentors
4. **Mentor count/details**: Seed three clearly labeled placeholder mentors (SUGGESTION). Confirm count is exactly 3, and do you want specific placeholder names/titles/companies/specialties/booking URLs/avatars/availability, or should I generate neutral placeholders and label them SUGGESTION?

## Deployment
5. **Deployment target/host**: Not specified. Build so `npm start` serves dist and the API. Which host/target should I prepare for (or just ensure it runs standalone)? Do you want any host-specific config files?

## Hubsy / rea
6. **rea layout**: I read parts of `/Users/arlindakaloshi/.hubsy/rea` but didn't see `src/modules` with client controller+view pairs in the obvious places. The requirement says "Mirror rea's layout: src/modules (one client controller paired with each page view), src/services/firebase.js, and public." Should I follow the structure as literally described regardless, or is there a specific rea pattern you want mirrored (if you can point me to a specific path/example)?

## Courses/lessons
7. **Course modules/lessons**: "Lessons are stubs, so no UI marks lessons complete yet. The smoke test calls the progress service directly with seeded lesson IDs." Do you want specific lesson IDs to seed for the 5 courses (or just ensure the structure supports them)? Any preferred structure for modules/lessons?
