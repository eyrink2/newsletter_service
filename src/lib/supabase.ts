import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role key (full access)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Types for our database schema
export type IssueStatus = 'collecting' | 'sent';

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  magic_token: string;
}

export interface Issue {
  id: string;
  status: IssueStatus;
  deadline: string;
  questions: string[];
  created_at: string;
}

export interface Submission {
  id: string;
  issue_id: string;
  subscriber_id: string;
  answers: string[];
  image_urls: string[];
  submitted_at: string;
}
