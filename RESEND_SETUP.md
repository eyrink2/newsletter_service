# Resend Email Setup Guide

## Quick Fix: Using Resend's Test Email

The code currently uses `onboarding@resend.dev` which is Resend's test sender. This has limitations:

### Option 1: Use Test Email (Quick Setup)

1. **Verify your recipient email in Resend:**
   - Go to [Resend Dashboard](https://resend.com/emails)
   - Navigate to **Settings** → **API Keys**
   - Or go to **Emails** → **Test Emails**
   - Add your email address as a verified recipient
   - You'll receive a verification email - click the link

2. **The sender `onboarding@resend.dev` will work for:**
   - ✅ Verified recipient emails (emails you've verified in Resend dashboard)
   - ❌ Any other email addresses

**Limitation:** You can only send to emails you've verified in the Resend dashboard.

---

## Option 2: Use Your Own Domain (Recommended for Production)

### Step 1: Add Domain to Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Resend will provide DNS records to add

### Step 2: Verify DNS Records

Add these DNS records to your domain's DNS settings:

**SPF Record:**
```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:resend.com ~all
```

**DKIM Records:**
Resend will provide specific DKIM records - add them as TXT records.

**DMARC Record (Optional but recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:your-email@yourdomain.com
```

### Step 3: Wait for Verification

- Resend will verify your DNS records (usually takes a few minutes to 24 hours)
- Check status in Resend dashboard
- Status should show "Verified" ✅

### Step 4: Update Code

Once verified, update the sender email in `src/app/admin/actions.ts`:

```typescript
from: 'Newsletter <newsletter@yourdomain.com>',
```

Or use any email address from your verified domain.

---

## Troubleshooting: Why Emails Aren't Sending

### 1. Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Click **Emails** in sidebar
3. Look for your recent email attempts
4. Check the status:
   - ✅ **Sent** - Email was sent successfully
   - ❌ **Failed** - Click to see error details
   - ⏳ **Pending** - Still processing

### 2. Check API Key

1. Go to **Settings** → **API Keys**
2. Make sure you're using the correct API key
3. API key should start with `re_`
4. Copy the key and verify it matches your `.env.local`

### 3. Check Error Logs

In your Next.js terminal/console, look for error messages like:
- `Failed to send email to...`
- `Invalid API key`
- `Domain not verified`

### 4. Common Errors

**Error: "Invalid API key"**
- Solution: Regenerate API key in Resend dashboard and update `.env.local`

**Error: "Domain not verified"**
- Solution: Complete domain verification or use verified test email

**Error: "Recipient not verified"**
- Solution: Add recipient email in Resend dashboard under Test Emails

**Error: "Rate limit exceeded"**
- Solution: You've hit Resend's free tier limit (100 emails/day)
- Wait or upgrade plan

---

## Testing Email Sending

### Method 1: Check Browser Console

1. Open your app in browser
2. Open DevTools (F12)
3. Go to **Console** tab
4. Click "Start New Issue"
5. Look for any error messages

### Method 2: Check Server Logs

1. Look at your terminal where `npm run dev` is running
2. Look for error messages after clicking "Start New Issue"

### Method 3: Add Better Error Logging

The code already logs errors, but you can improve visibility by checking:
- Browser console (client-side errors)
- Terminal/console (server-side errors)
- Resend dashboard (email status)

---

## Quick Test: Send to Verified Email

1. **Add your email to Resend:**
   - Go to Resend Dashboard → Settings → Test Emails
   - Add your email address
   - Verify the email

2. **Make sure your subscriber email matches:**
   - Check Supabase `subscribers` table
   - Your `email` column should match the verified email in Resend

3. **Test again:**
   - Go to `/admin`
   - Click "Start New Issue"
   - Check your email inbox

---

## Environment Variable Check

Make sure your `.env.local` has:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
```

The key should:
- Start with `re_`
- Be from your Resend account (Settings → API Keys)
- Not have any extra spaces or quotes

---

## Free Tier Limits

Resend's free tier includes:
- 100 emails per day
- 3,000 emails per month
- Test email sending (to verified recipients)

If you hit the limit, you'll need to wait or upgrade.

---

## Next Steps

1. ✅ Verify your email in Resend dashboard (for test email)
2. ✅ Check Resend dashboard for email status
3. ✅ Check browser console and server logs for errors
4. ✅ Verify API key is correct in `.env.local`
5. ✅ For production: Add and verify your own domain

