# Studyspace prototype

A clickable, responsive browser prototype for the exam-preparation app. Open `index.html` in a modern browser.

## Included in this first pass

- Create subjects and set or defer the general exam date.
- Add multiple note files and review, rename, or remove proposed topics before confirming them.
- Read a topic summary, with a print-to-PDF action.
- Create tests with their own date and choose topics already confirmed for the subject. Edit the topic selection later.
- Mark topics complete, then access topic practice and whole-subject practice.
- Use a separate My subjects page and a separate Study calendar page from the left navigation.
- Work through real flashcard-style front and back cards. A student must type an answer before revealing each back.
- Choose from ten appearance palettes in light or dark mode, preview choices, and keep both preferences saved in this browser.
- Upload past questions separately and open a separate past-question practice mode.
- Save prototype state in this browser using local storage.
- Create a student account with a unique username, email, and password; sign in and out with Supabase Auth.
- Sync subjects and study progress to a private per-user database row protected by row-level security.

## Prototype limits

This remains a front-end prototype, not a connected AI product. After Supabase is configured, authentication and account-scoped subject data use the connected service. It does not upload or store file contents, read documents or handwriting, generate real topic suggestions, summarize notes, or generate questions. The upload review uses file names as visible placeholder suggestions. The summary and practice screens show sample content. The PDF button opens the browser's print dialog, where a student can choose Save as PDF.

The dashboard previously used sample subjects in local storage. Authenticated accounts start with their own empty subject list. Clear the site's local storage to reset appearance preferences and any old demo state.

## Connect authentication and account storage

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase-schema.sql`.
3. Copy the project URL and its publishable/anon client key into `supabase-config.js`. Never put a `service_role` key in the browser.
4. In Supabase Auth settings, enable email/password, configure the site URL and redirect URLs for the app's hosted address, and keep email confirmation enabled for launch.
5. Serve the prototype from an HTTP(S) origin for email confirmation links; opening the HTML directly as a `file:` URL is not suitable for the redirect flow.

The app stays behind the sign-in screen until the project URL and client key are configured. Passwords are handled by Supabase Auth. The SQL enables row-level security for profiles and study data; each student can read or change only their own study-data row. The prototype currently stores notes as filenames only, not uploaded file contents.

