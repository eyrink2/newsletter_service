'use server';

import { supabaseAdmin, type Issue, type Subscriber, type Submission } from '@/lib/supabase';
import { resend } from '@/lib/resend';
import { anthropic } from '@/lib/anthropic';
import { render } from '@react-email/render';
import React from 'react';
import { NewsletterTemplate } from '@/components/NewsletterTemplate';

// Pre-determined questions for each newsletter issue
const DEFAULT_QUESTIONS = [
  "the most beautiful mundane thing to happen to you recently?",
  "what are you currently reading, watching, or listening to?",
  "what should we be more grateful for? and more hateful of?",
  "one convo you’ve had recently that pissed u off"
];

interface StartNewIssueResult {
  success: boolean;
  message: string;
  issueId?: string;
  emailsSent?: number;
}

export async function startNewIssue(): Promise<StartNewIssueResult> {
  try {
    // Calculate deadline: midnight Pacific Time, 2 days from today
    const now = new Date();
    
    // Get current date in Pacific Time
    const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    
    // Add 2 days
    const twoDaysLater = new Date(pacificNow);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    
    // Set to midnight (00:00:00) Pacific Time
    twoDaysLater.setHours(0, 0, 0, 0);
    
    // Get date components (year, month, day) in Pacific Time
    const year = twoDaysLater.getFullYear();
    const month = twoDaysLater.getMonth() + 1; // 1-12
    const day = twoDaysLater.getDate();
    
    // Determine if DST (Daylight Saving Time) - roughly March to November
    // DST in US typically: 2nd Sunday in March to 1st Sunday in November
    // For simplicity, we'll use March-November as DST period
    const isDST = month >= 3 && month <= 11;
    const ptOffsetHours = isDST ? 7 : 8; // PDT is UTC-7, PST is UTC-8 (offset from UTC)
    
    // Create deadline at midnight PT, converted to UTC
    // If it's midnight PT (00:00), in UTC it's 08:00 (PST) or 07:00 (PDT) the same day
    // So we add the offset hours to get UTC time
    const deadline = new Date(Date.UTC(year, month - 1, day, ptOffsetHours, 0, 0));

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
        const emailResult = await resend.emails.send({
          from: 'Newsletter <updates@newsletter.eyrinkim.com>',
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
        
        if (emailResult.error) {
          console.error(`Resend API error for ${subscriber.email}:`, emailResult.error);
          emailErrors.push(`${subscriber.email}: ${emailResult.error.message || 'Unknown error'}`);
        } else {
          console.log(`Email sent successfully to ${subscriber.email}, ID: ${emailResult.data?.id}`);
          emailsSent++;
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`Failed to send email to ${subscriber.email}:`, errorMessage);
        emailErrors.push(`${subscriber.email}: ${errorMessage}`);
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

interface DeleteIssueResult {
  success: boolean;
  message: string;
}

export async function deleteIssue(issueId: string): Promise<DeleteIssueResult> {
  try {
    // Delete the issue (cascade will handle submissions)
    const { error } = await supabaseAdmin
      .from('issues')
      .delete()
      .eq('id', issueId);

    if (error) {
      console.error('Error deleting issue:', error);
      return {
        success: false,
        message: `Failed to delete issue: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Issue deleted successfully.'
    };
  } catch (error) {
    console.error('Unexpected error in deleteIssue:', error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

interface SubmissionWithName {
  name: string;
  answers: string[];
  image_urls: string[];
}

interface CompileNewsletterResult {
  success: boolean;
  intro?: string;
  outro?: string;
  originalSubmissions?: SubmissionWithName[];
  error?: string;
}

export async function compileNewsletter(issueId: string): Promise<CompileNewsletterResult> {
  try {
    // Fetch all submissions for this issue
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('submissions')
      .select('answers, image_urls, subscriber_id')
      .eq('issue_id', issueId);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return {
        success: false,
        error: `Failed to fetch submissions: ${submissionsError.message}`
      };
    }

    if (!submissions || submissions.length === 0) {
      return {
        success: false,
        error: 'No submissions found for this issue.'
      };
    }

    // Fetch subscriber names for all subscriber IDs
    const subscriberIds = submissions.map((sub: any) => sub.subscriber_id);
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from('subscribers')
      .select('id, name')
      .in('id', subscriberIds);

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return {
        success: false,
        error: `Failed to fetch subscriber names: ${subscribersError.message}`
      };
    }

    // Create a map of subscriber ID to name
    const subscriberMap = new Map(
      (subscribers || []).map((sub: any) => [sub.id, sub.name])
    );

    // Format submissions with names
    const originalSubmissions: SubmissionWithName[] = submissions.map((sub: any) => ({
      name: subscriberMap.get(sub.subscriber_id) || 'Unknown',
      answers: sub.answers,
      image_urls: sub.image_urls
    }));

    // Format the data as JSON for the prompt
    const submissionsJson = JSON.stringify(originalSubmissions, null, 2);
    const numPeople = originalSubmissions.length;

    // Create the prompt with exact wording from requirements
    const prompt = `I am creating a group newsletter. Here are the updates from ${numPeople} people: ${submissionsJson}

Please write a witty, sharp, funny 2-3 sentence intro and a 1-sentence warm outro based on the content on the response from the collection. Write it the way a columnist from Sex and the City would write - kind and warm but humorous and sharp. Do not edit the original responses.

Format your response as JSON with the following structure:
{
  "intro": "your intro text here",
  "outro": "your outro text here"
}`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the text content
    const content = message.content[0];
    if (content.type !== 'text') {
      return {
        success: false,
        error: 'Unexpected response format from Claude API'
      };
    }

    // Parse the JSON response
    let intro = '';
    let outro = '';

    try {
      const text = content.text.trim();
      
      // Try to extract JSON from the response (handle code blocks)
      let jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        jsonMatch = text.match(/```\s*(\{[\s\S]*?\})\s*```/);
      }
      if (!jsonMatch) {
        jsonMatch = text.match(/\{[\s\S]*\}/);
      }
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        intro = parsed.intro?.trim() || '';
        outro = parsed.outro?.trim() || '';
      } else {
        // Fallback: try to extract from structured text
        const introMatch = text.match(/(?:intro|Intro)[:\s]*["']?([^"'\n]+(?:\n[^"'\n]+){0,2})["']?/i);
        const outroMatch = text.match(/(?:outro|Outro)[:\s]*["']?([^"'\n]+)["']?/i);
        
        if (introMatch) intro = introMatch[1].trim();
        if (outroMatch) outro = outroMatch[1].trim();
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Response text:', content.text);
      return {
        success: false,
        error: 'Failed to parse response from Claude API'
      };
    }

    if (!intro || !outro) {
      return {
        success: false,
        error: 'Could not extract intro and outro from Claude response'
      };
    }

    return {
      success: true,
      intro,
      outro,
      originalSubmissions
    };
  } catch (error) {
    console.error('Unexpected error in compileNewsletter:', error);
    return {
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

interface FinalizeAndSendResult {
  success: boolean;
  message: string;
  emailsSent?: number;
}

export async function finalizeAndSendNewsletter(issueId: string): Promise<FinalizeAndSendResult> {
  try {
    // 1. Get the issue to access questions and created_at
    const { data: issue, error: issueError } = await supabaseAdmin
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (issueError || !issue) {
      return {
        success: false,
        message: `Failed to fetch issue: ${issueError?.message || 'Issue not found'}`
      };
    }

    // 2. Trigger compileNewsletter action
    const compileResult = await compileNewsletter(issueId);

    if (!compileResult.success || !compileResult.intro || !compileResult.outro) {
      return {
        success: false,
        message: compileResult.error || 'Failed to compile newsletter'
      };
    }

    // 3. Render NewsletterTemplate to HTML
    const issueDate = new Date(issue.created_at);
    const month = issueDate.getMonth() + 1; // getMonth() returns 0-11
    const day = issueDate.getDate();
    const formattedDate = `${month}/${day}`;

    const html = await render(
      React.createElement(NewsletterTemplate, {
        date: formattedDate,
        intro: compileResult.intro,
        outro: compileResult.outro,
        submissions: compileResult.originalSubmissions || [],
        questions: issue.questions,
      })
    );

    // 4. Fetch all subscribers
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from('subscribers')
      .select('*');

    if (subscribersError) {
      return {
        success: false,
        message: `Failed to fetch subscribers: ${subscribersError.message}`
      };
    }

    const subscriberList = subscribers as Subscriber[];

    if (subscriberList.length === 0) {
      return {
        success: false,
        message: 'No subscribers found to send newsletter to.'
      };
    }

    // 5. Send email to all subscribers via Resend
    let emailsSent = 0;
    const emailErrors: string[] = [];

    for (const subscriber of subscriberList) {
      try {
        const emailResult = await resend.emails.send({
          from: 'Newsletter <updates@newsletter.eyrinkim.com>',
          to: subscriber.email,
          subject: `Newsletter Update ${formattedDate} 💌`,
          html: html,
        });

        if (emailResult.error) {
          console.error(`Resend API error for ${subscriber.email}:`, emailResult.error);
          emailErrors.push(`${subscriber.email}: ${emailResult.error.message || 'Unknown error'}`);
        } else {
          console.log(`Newsletter sent successfully to ${subscriber.email}, ID: ${emailResult.data?.id}`);
          emailsSent++;
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`Failed to send newsletter to ${subscriber.email}:`, errorMessage);
        emailErrors.push(`${subscriber.email}: ${errorMessage}`);
      }
    }

    // 6. Update issue.status to 'sent'
    const { error: updateError } = await supabaseAdmin
      .from('issues')
      .update({ status: 'sent' })
      .eq('id', issueId);

    if (updateError) {
      console.error('Error updating issue status:', updateError);
      return {
        success: true,
        message: `Newsletter sent to ${emailsSent}/${subscriberList.length} subscribers, but failed to update status: ${updateError.message}`,
        emailsSent
      };
    }

    if (emailErrors.length > 0) {
      return {
        success: true,
        message: `Newsletter sent to ${emailsSent}/${subscriberList.length} subscribers. Failed: ${emailErrors.join(', ')}`,
        emailsSent
      };
    }

    return {
      success: true,
      message: `Newsletter finalized and sent successfully to ${emailsSent} subscribers!`,
      emailsSent
    };
  } catch (error) {
    console.error('Unexpected error in finalizeAndSendNewsletter:', error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
