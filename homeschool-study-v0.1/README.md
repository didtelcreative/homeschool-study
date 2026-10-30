# Homeschool Study App V0.1

Browser-based voice proof of concept.

## Current slice
- Shared private passcode gate
- Signed HTTP-only session cookie
- One hard-coded science question
- Browser microphone capture
- Server-side OpenAI transcription
- Deterministic key-concept grading for solid / liquid / gas
- Immediate feedback
- Simple 0-5 mastery display
- No database and no child audio storage

## Run locally
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Set `APP_PASSCODE`, `SESSION_SECRET`, and `OPENAI_API_KEY`.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open http://localhost:3000.

## Vercel
Import this folder/repository into Vercel and add the same three environment variables in Project Settings > Environment Variables.

## Important V0.1 limitations
The passcode is deliberately a lightweight prototype gate, not production authentication. The answer grader is deterministic for the first question so we can isolate transcription quality before adding semantic AI grading. The next slice should add server-side rate limiting and structured AI grading while keeping the API key server-only.
