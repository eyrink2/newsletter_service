# Cron Job Setup Guide


## Step 2: Configure Cron Job in Vercel

### Option A: Using vercel.json (Already Created)

The `vercel.json` file has been created with the cron job configuration. After you deploy, Vercel will automatically set up the cron job.

**Schedule:** `0 */6 * * *` (runs every 6 hours)

### Option B: Manual Setup in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs**
3. Click **Add Cron Job**
4. Fill in the details:
   - **Path:** `/api/cron/check-deadline`
   - **Schedule:** `0 */6 * * *` (every 6 hours)
     - Or use `0 * * * *` for every hour
     - Or `0 0 * * *` for once daily at midnight
5. Click **Create**

## Step 3: Deploy

After adding the environment variable and deploying, the cron job will be active.

## Testing the Cron Job

### Test Locally

```bash
# Start your dev server
npm run dev

# In another terminal, test the endpoint:
curl -H "Authorization: Bearer GWzOCqfMWrj460YQmNgTU3Z/ol6GQyoO9VL3+xR5khs=" \
  http://localhost:3000/api/cron/check-deadline
```

### Test in Production

After deployment, you can test it manually:

```bash
curl -H "Authorization: Bearer GWzOCqfMWrj460YQmNgTU3Z/ol6GQyoO9VL3+xR5khs=" \
  https://your-domain.vercel.app/api/cron/check-deadline
```

## What the Cron Job Does

1. Finds all issues where:
   - `deadline` has passed (deadline < now)
   - `status` is still `'collecting'`
2. For each expired issue:
   - Compiles the newsletter using AI
   - Renders the newsletter template to HTML
   - Sends email to all subscribers via Resend
   - Updates issue status to `'sent'`
3. Returns a summary of processed issues

## Schedule Options

- `0 */6 * * *` - Every 6 hours (recommended)
- `0 * * * *` - Every hour
- `0 0 * * *` - Once daily at midnight
- `*/30 * * * *` - Every 30 minutes (for testing)

## Security Note

The `CRON_SECRET` prevents unauthorized access to your cron endpoint. Keep it secure and never commit it to version control (it's already in `.gitignore`).

