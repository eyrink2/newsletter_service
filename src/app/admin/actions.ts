'use server';

import { supabaseAdmin, type Issue, type Subscriber } from '@/lib/supabase';
import { resend } from '@/lib/resend';

// Pre-determined questions for each newsletter issue
const DEFAULT_QUESTIONS = [
  "the most beautiful mundate thing to happen to you recently?",
  "what are you currently reading, watching, or listening to?",
  "what should we be more grateful for? and more hateful of?",
  "any upcoming plans or events you'd like to share?"
];

interface StartNewIssueResult {
  success: boolean;
  message: string;
  issueId?: string;
  emailsSent?: number;
}

export async function startNewIssue(): Promise<StartNewIssueResult> {
  try {
    // Calculate deadline (48 hours from now)
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);

    // Create a new issue
    const { data: issue, error: issueError } = await supabaseAdmin
      .from('issues')
      .insert({
        status: 'collecting',
        deadline: deadline.toISOString(),
        questions: DEFAULT_QUESTIONS
      })
      .select()
      .single();

    if (issueError) {
      console.error('Error creating issue:', issueError);
      return {
        success: false,
        message: `Failed to create issue: ${issueError.message}`
      };
    }

    const newIssue = issue as Issue;

    // Fetch all subscribers
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from('subscribers')
      .select('*');

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return {
        success: false,
        message: `Failed to fetch subscribers: ${subscribersError.message}`
      };
    }

    const subscriberList = subscribers as Subscriber[];

    if (subscriberList.length === 0) {
      return {
        success: true,
        message: 'Issue created but no subscribers to notify.',
        issueId: newIssue.id,
        emailsSent: 0
      };
    }

    // Get the app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Send emails to all subscribers
    let emailsSent = 0;
    const emailErrors: string[] = [];

    for (const subscriber of subscriberList) {
      const magicLink = `${appUrl}/respond/${subscriber.magic_token}?issueId=${newIssue.id}`;

      try {
        await resend.emails.send({
          from: 'Newsletter <onboarding@resend.dev>',
          to: subscriber.email,
          subject: "It's time to share your update!",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Hey ${subscriber.name}!</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                It's time for our group newsletter! We'd love to hear what's been happening in your life.
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                <strong>Deadline:</strong> ${deadline.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <a href="${magicLink}"
                 style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                Submit Your Update
              </a>
              <p style="color: #999; font-size: 14px; margin-top: 24px;">
                This link is unique to you - don't share it with others.
              </p>
            </div>
          `
        });
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${subscriber.email}:`, emailError);
        emailErrors.push(subscriber.email);
      }
    }

    if (emailErrors.length > 0) {
      return {
        success: true,
        message: `Issue created. Sent ${emailsSent}/${subscriberList.length} emails. Failed: ${emailErrors.join(', ')}`,
        issueId: newIssue.id,
        emailsSent
      };
    }

    return {
      success: true,
      message: `Issue created successfully! Sent ${emailsSent} invitation emails.`,
      issueId: newIssue.id,
      emailsSent
    };
  } catch (error) {
    console.error('Unexpected error in startNewIssue:', error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function getIssues() {
  const { data: issues, error } = await supabaseAdmin
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching issues:', error);
    return [];
  }

  return issues as Issue[];
}

export async function getSubscriberCount() {
  const { count, error } = await supabaseAdmin
    .from('subscribers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting subscribers:', error);
    return 0;
  }

  return count || 0;
}
