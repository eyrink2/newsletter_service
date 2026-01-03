import { NextResponse } from 'next/server';
import { finalizeAndSendNewsletter } from '@/app/admin/actions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all issues that have passed their deadline and are still in 'collecting' status
    const now = new Date().toISOString();
    
    const { data: expiredIssues, error } = await supabaseAdmin
      .from('issues')
      .select('id')
      .eq('status', 'collecting')
      .lt('deadline', now);

    if (error) {
      console.error('Error fetching expired issues:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expired issues', details: error.message },
        { status: 500 }
      );
    }

    if (!expiredIssues || expiredIssues.length === 0) {
      return NextResponse.json({
        message: 'No expired issues found',
        processed: 0
      });
    }

    // Process each expired issue
    const results = [];
    for (const issue of expiredIssues) {
      try {
        const result = await finalizeAndSendNewsletter(issue.id);
        results.push({
          issueId: issue.id,
          success: result.success,
          message: result.message,
          emailsSent: result.emailsSent || 0
        });
      } catch (error) {
        console.error(`Error processing issue ${issue.id}:`, error);
        results.push({
          issueId: issue.id,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          emailsSent: 0
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalEmailsSent = results.reduce((sum, r) => sum + (r.emailsSent || 0), 0);

    return NextResponse.json({
      message: `Processed ${expiredIssues.length} expired issue(s)`,
      processed: expiredIssues.length,
      successful: successCount,
      failed: expiredIssues.length - successCount,
      totalEmailsSent,
      results
    });
  } catch (error) {
    console.error('Unexpected error in check-deadline cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Example of how this function would be called:
/*
// This code would run automatically via Vercel Cron Jobs
// No manual call needed - Vercel handles the scheduling

// The cron job will:
// 1. Check for issues where deadline < now AND status = 'collecting'
// 2. For each expired issue:
//    - Call finalizeAndSendNewsletter(issueId)
//    - This will:
//      a. Compile the newsletter using AI
//      b. Render the NewsletterTemplate to HTML
//      c. Send to all subscribers via Resend
//      d. Update issue.status to 'sent'
// 3. Return a summary of processed issues

// To test locally, you can call:
// GET http://localhost:3000/api/cron/check-deadline
// With header: Authorization: Bearer YOUR_CRON_SECRET
*/

