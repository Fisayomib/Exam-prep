# Studyspace

Studyspace is a browser-based study planner deployed on Vercel, with Supabase authentication and private per-user study data.

## AI study tools

- Upload PDF, PPTX, DOCX, TXT, or Markdown materials. Text is extracted in the browser and saved with the signed-in student's subject data.
- Generate detailed, exam-ready topic guides grounded in uploaded notes, with key terms, important processes, worked examples, exam checklists, common mistakes, and self-check questions where the notes support them. Any broader explanation is separated into **Extra context**, and unsupported details are called out.
- Generate objective questions, written questions, and flashcards from topic notes. Students choose 1–20 questions for each selected type. Whole-subject practice uses the confirmed topics' materials.
- Start a fresh Active Recall session by writing everything remembered about a topic. Feedback is qualitative, based on the topic's notes and any extra context in its AI summary, and is not saved.
- Generate past-question practice from readable text extracted from uploaded past-question files.

Scanned image-only PDFs are not supported yet; use PDFs with selectable text. Uploaded file text is limited to 200,000 characters per file, and each AI request accepts up to 200,000 characters of source text.

## Deployment setup

1. Configure the Supabase project URL and publishable key in `supabase-config.js`.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. In Vercel, set `OPENAI_API_KEY` as a **Secret** environment variable for Production. Never place this key in browser code, the repository, or a chat.
4. Deploy the GitHub `main` branch to Vercel. The AI endpoint is served by the Vercel Function in `api/ai.mjs` and requires a valid Supabase sign-in.
5. For local AI development, use Vercel's local development server so the `/api/ai` function and environment variables are available. A basic static server can display the interface but cannot run the AI endpoint.

OpenAI API usage is billed separately from a ChatGPT subscription. Keep an eye on API usage and set a usage limit in the OpenAI platform.

## Data and privacy

Supabase Auth handles passwords. Row-level security limits each student to their own study-data row. Uploaded note text is stored inside that student's private `student_data.payload` record. The OpenAI API key stays server-side in Vercel; the AI function verifies the student's Supabase session before processing a request.
