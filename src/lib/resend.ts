import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error('Missing env.RESEND_API_KEY');
}

export const resend = new Resend(resendApiKey);
