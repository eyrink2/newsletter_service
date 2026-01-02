'use server';

import { supabaseAdmin, type Subscriber, type Issue } from '@/lib/supabase';

const BUCKET_NAME = 'newsletter-images';

interface ValidateTokenResult {
  valid: boolean;
  subscriber?: Subscriber;
  issue?: Issue;
  alreadySubmitted?: boolean;
  error?: string;
}

export async function validateMagicToken(
  token: string,
  issueId: string
): Promise<ValidateTokenResult> {
  try {
    // Find the subscriber by magic token
    const { data: subscriber, error: subscriberError } = await supabaseAdmin
      .from('subscribers')
      .select('*')
      .eq('magic_token', token)
      .single();

    if (subscriberError || !subscriber) {
      return {
        valid: false,
        error: 'Invalid or expired link. Please contact the newsletter admin.'
      };
    }

    // Find the issue
    const { data: issue, error: issueError } = await supabaseAdmin
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (issueError || !issue) {
      return {
        valid: false,
        error: 'This newsletter issue was not found.'
      };
    }

    // Check if deadline has passed
    const issueDeadline = new Date(issue.deadline);
    const now = new Date();
    if (issueDeadline < now) {
      return {
        valid: true,
        subscriber: subscriber as Subscriber,
        issue: issue as Issue,
        alreadySubmitted: false
        // Note: deadlinePassed will be checked in the UI component
      };
    }

    // Check if already submitted
    const { data: existingSubmission } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('issue_id', issueId)
      .eq('subscriber_id', subscriber.id)
      .single();

    if (existingSubmission) {
      return {
        valid: true,
        subscriber: subscriber as Subscriber,
        issue: issue as Issue,
        alreadySubmitted: true
      };
    }

    return {
      valid: true,
      subscriber: subscriber as Subscriber,
      issue: issue as Issue,
      alreadySubmitted: false
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return {
      valid: false,
      error: 'An unexpected error occurred.'
    };
  }
}

interface SubmitResponseResult {
  success: boolean;
  message: string;
}

export async function submitResponse(
  token: string,
  issueId: string,
  answers: string[],
  imageUrls: string[]
): Promise<SubmitResponseResult> {
  try {
    // Validate the token first
    const validation = await validateMagicToken(token, issueId);

    if (!validation.valid || !validation.subscriber) {
      return {
        success: false,
        message: validation.error || 'Invalid request'
      };
    }

    if (validation.alreadySubmitted) {
      return {
        success: false,
        message: 'You have already submitted your response for this issue.'
      };
    }

    // Check if deadline has passed
    if (validation.issue && new Date(validation.issue.deadline) < new Date()) {
      return {
        success: false,
        message: 'The deadline for this issue has passed.'
      };
    }

    // Create the submission
    const { error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        issue_id: issueId,
        subscriber_id: validation.subscriber.id,
        answers: answers,
        image_urls: imageUrls
      });

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return {
        success: false,
        message: 'Failed to save your response. Please try again.'
      };
    }

    return {
      success: true,
      message: 'Your response has been submitted successfully!'
    };
  } catch (error) {
    console.error('Error submitting response:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.'
    };
  }
}

interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImage(
  formData: FormData,
  subscriberId: string,
  issueId: string
): Promise<UploadImageResult> {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP.' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${issueId}/${subscriberId}/${timestamp}.${extension}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filename, uint8Array, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload image. Please try again.' };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return {
      success: true,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: 'An unexpected error occurred during upload.' };
  }
}
