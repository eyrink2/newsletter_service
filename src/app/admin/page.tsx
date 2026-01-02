'use client';

import { useState, useEffect, useTransition } from 'react';
import { startNewIssue, getIssues, getSubscriberCount } from './actions';

interface Issue {
  id: string;
  status: 'collecting' | 'sent';
  deadline: string;
  questions: string[];
  created_at: string;
}

export default function AdminDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [issuesData, count] = await Promise.all([
      getIssues(),
      getSubscriberCount()
    ]);
    setIssues(issuesData);
    setSubscriberCount(count);
  }

  async function handleStartNewIssue() {
    setMessage(null);
    startTransition(async () => {
      const result = await startNewIssue();
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
      if (result.success) {
        await loadData();
      }
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string, deadline: string) {
    const isExpired = new Date(deadline) < new Date();

    if (status === 'sent') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Sent
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          Deadline Passed
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
        Collecting
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your group newsletter issues
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Subscribers</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{subscriberCount}</p>
            </div>
            <button
              onClick={handleStartNewIssue}
              disabled={isPending}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                'Start New Issue'
              )}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Issues List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Issues</h2>
          </div>

          {issues.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No issues yet. Click &quot;Start New Issue&quot; to create your first newsletter!
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {issues.map((issue) => (
                <li key={issue.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Issue created {formatDate(issue.created_at)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Deadline: {formatDate(issue.deadline)}
                      </p>
                    </div>
                    {getStatusBadge(issue.status, issue.deadline)}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">ID: {issue.id}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
