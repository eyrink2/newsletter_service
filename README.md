# Group Newsletter Service - Development Log

## Session Changes

### Part 1: Project Initialization & Schema

**Created:**
- Initialized Next.js 14+ project with App Router, TypeScript, Tailwind CSS
- Installed dependencies: `@supabase/supabase-js`, `resend`

**Files Created:**
- `src/lib/supabase.ts` - Supabase client with service role key + TypeScript types for Subscriber, Issue, Submission
- `src/lib/resend.ts` - Resend email client
- `.env.local.example` - Environment variables template
- `supabase/migrations/001_initial_schema.sql` - Database schema with:
  - `subscribers` table (id, name, email, magic_token)
  - `issues` table (id, status enum, deadline, questions jsonb, created_at)
  - `submissions` table (id, issue_id, subscriber_id, answers jsonb, image_urls jsonb, submitted_at)
  - Indexes and RLS policies

---

### Part 2: Manual Trigger & Magic Links

**Created:**
- `src/app/admin/page.tsx` - Creator Dashboard with:
  - Subscriber count display
  - "Start New Issue" button
  - Issues list with status badges (Collecting, Deadline Passed, Sent)

- `src/app/admin/actions.ts` - Server Actions:
  - `startNewIssue()` - Creates issue with 48-hour deadline, fetches subscribers, sends magic link emails via Resend
  - `getIssues()` - Fetches all issues ordered by created_at
  - `getSubscriberCount()` - Returns total subscriber count

- `src/app/page.tsx` - Updated landing page with link to admin dashboard

**Email Template:**
- Sends personalized email with subscriber name
- Includes deadline date/time
- Magic link format: `{APP_URL}/respond/{magic_token}?issueId={issue_id}`

---

### Part 3: Response Form (Magic Page)

**Created/Updated:**
- `src/app/respond/[token]/page.tsx` - Subscriber response form with:
  - Token + issue validation on load
  - Cute "Too Late!" page with turtle emoji when deadline passed
  - "Already Submitted" state handling
  - Questions mapped from issue with textareas
  - Character validation (50-500 chars) with color-coded counter
  - Multi-file image upload (max 3) with:
    - Live preview thumbnails
    - Upload progress spinner
    - Remove button
    - Error overlay display
  - Submit button disabled until form valid and uploads complete

- `src/app/respond/[token]/actions.ts` - Server Actions:
  - `validateMagicToken(token, issueId)` - Validates subscriber token, checks issue exists, checks if already submitted
  - `submitResponse(token, issueId, answers, imageUrls)` - Saves submission to database
  - `uploadImage(formData, subscriberId, issueId)` - Uploads to Supabase Storage bucket `newsletter-images`, returns public URL

---

## Setup Required

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase Setup
1. Run SQL migration in SQL Editor (paste contents of `supabase/migrations/001_initial_schema.sql`)
2. Create Storage bucket named `newsletter-images` (set as Public)
3. Add subscribers to `subscribers` table

### Run
```bash
npm run dev
```

---

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx          # Creator Dashboard
│   │   └── actions.ts        # startNewIssue, getIssues, getSubscriberCount
│   ├── respond/[token]/
│   │   ├── page.tsx          # Response form with image upload
│   │   └── actions.ts        # validateMagicToken, submitResponse, uploadImage
│   ├── layout.tsx
│   └── page.tsx              # Landing page
└── lib/
    ├── supabase.ts           # Client + types
    └── resend.ts             # Email client

supabase/
└── migrations/
    └── 001_initial_schema.sql
```