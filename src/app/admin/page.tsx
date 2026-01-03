'use client';

import { useState, useEffect, useTransition } from 'react';
import { startNewIssue, getIssues, getSubscriberCount, compileNewsletter, deleteIssue, finalizeAndSendNewsletter, getIssueResponseStatus } from './actions';

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
  const [compilingIssueId, setCompilingIssueId] = useState<string | null>(null);
  const [compileResult, setCompileResult] = useState<{
    intro?: string;
    outro?: string;
    originalSubmissions?: Array<{ name: string; answers: string[]; image_urls: string[] }>;
    error?: string;
  } | null>(null);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [responseStatuses, setResponseStatuses] = useState<Record<string, {
    responded: Array<{ id: string; name: string; email: string; submitted_at: string }>;
    notResponded: Array<{ id: string; name: string; email: string }>;
    totalSubscribers: number;
    responseCount: number;
  } | null>>({});

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

  async function loadResponseStatus(issueId: string) {
    const status = await getIssueResponseStatus(issueId);
    setResponseStatuses(prev => ({
      ...prev,
      [issueId]: status
    }));
  }

  function toggleIssueExpansion(issueId: string) {
    if (expandedIssueId === issueId) {
      setExpandedIssueId(null);
    } else {
      setExpandedIssueId(issueId);
      if (!responseStatuses[issueId]) {
        loadResponseStatus(issueId);
      }
    }
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

  async function handleCompileNewsletter(issueId: string) {
    setCompilingIssueId(issueId);
    setCompileResult(null);
    setMessage(null);
    
    startTransition(async () => {
      const result = await compileNewsletter(issueId);
      
      if (result.success) {
        setCompileResult({
          intro: result.intro,
          outro: result.outro,
          originalSubmissions: result.originalSubmissions
        });
        setMessage({
          type: 'success',
          text: 'Newsletter compiled successfully!'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to compile newsletter'
        });
      }
      
      setCompilingIssueId(null);
    });
  }

  async function handleDeleteIssue(issueId: string) {
    if (!confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await deleteIssue(issueId);
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
      if (result.success) {
        await loadData();
      }
    });
  }

  async function handleFinalizeAndSend(issueId: string) {
    if (!confirm('Are you sure you want to finalize and send this newsletter? This will send it to all subscribers and mark the issue as sent.')) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await finalizeAndSendNewsletter(issueId);
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
      if (result.success) {
        await loadData();
        setCompileResult(null);
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
        <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
          Sent
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
          Deadline Passed
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#dbeafe', color: '#5d888e' }}>
        Collecting
      </span>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF1', fontFamily: 'Georgia, serif' }}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1a1a1a' }}>Creator Dashboard</h1>
          <p className="mt-2" style={{ color: '#666666' }}>
            Manage your group newsletter issues
          </p>
        </div>

        {/* Stats */}
        <div className="rounded-lg shadow p-6 mb-8" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#666666' }}>Total Subscribers</p>
              <p className="mt-1 text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{subscriberCount}</p>
            </div>
            <button
              onClick={handleStartNewIssue}
              disabled={isPending}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#5d888e' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a6d72'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5d888e'}
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
            className="mb-6 p-4 rounded-md"
            style={{
              backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              borderColor: message.type === 'success' ? '#a7f3d0' : '#fecaca',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            {message.text}
          </div>
        )}

        {/* Issues List */}
        <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: '#E5E5E5' }}>
            <h2 className="text-lg font-medium" style={{ color: '#1a1a1a' }}>Issues</h2>
          </div>

          {issues.length === 0 ? (
            <div className="px-6 py-12 text-center" style={{ color: '#666666' }}>
              No issues yet. Click &quot;Start New Issue&quot; to create your first newsletter!
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#E5E5E5' }}>
              {issues.map((issue) => (
                <li key={issue.id} className="px-6 py-4" style={{ transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                        Issue created {formatDate(issue.created_at)}
                      </p>
                      <p className="text-sm" style={{ color: '#666666' }}>
                        Deadline: {formatDate(issue.deadline)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(issue.status, issue.deadline)}
                      {issue.status === 'collecting' && (
                        <>
                      <button
                        onClick={() => handleCompileNewsletter(issue.id)}
                        disabled={compilingIssueId === issue.id || isPending}
                        className="inline-flex items-center px-3 py-1.5 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderColor: '#E5E5E5', color: '#1a1a1a', backgroundColor: '#FFFFFF' }}
                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                        onFocus={(e) => e.currentTarget.style.outlineColor = '#5d888e'}
                      >
                            {compilingIssueId === issue.id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Compiling...
                              </>
                            ) : (
                              'Compile Newsletter'
                            )}
                          </button>
                          <button
                            onClick={() => handleFinalizeAndSend(issue.id)}
                            disabled={isPending}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#10b981' }}
                            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#059669')}
                            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#10b981')}
                          >
                            Finalize and Send
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteIssue(issue.id)}
                        disabled={isPending}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs" style={{ color: '#999999' }}>ID: {issue.id}</p>
                    <button
                      onClick={() => toggleIssueExpansion(issue.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: '#5d888e', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {expandedIssueId === issue.id ? 'Hide Responses' : 'View Responses'}
                    </button>
                  </div>
                  {expandedIssueId === issue.id && responseStatuses[issue.id] && (
                    <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: '#FAFAFA', borderRadius: '8px' }}>
                      <div className="mb-4">
                        <p className="text-sm font-semibold mb-2" style={{ color: '#1a1a1a' }}>
                          Response Status: {responseStatuses[issue.id]!.responseCount} / {responseStatuses[issue.id]!.totalSubscribers}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(responseStatuses[issue.id]!.responseCount / responseStatuses[issue.id]!.totalSubscribers) * 100}%`,
                              backgroundColor: '#5d888e'
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      {responseStatuses[issue.id]!.responded.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold mb-2" style={{ color: '#10b981' }}>
                            Responded ({responseStatuses[issue.id]!.responded.length}):
                          </p>
                          <ul className="space-y-1">
                            {responseStatuses[issue.id]!.responded.map((sub) => (
                              <li key={sub.id} className="text-xs" style={{ color: '#1a1a1a' }}>
                                ✓ {sub.name} ({sub.email})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {responseStatuses[issue.id]!.notResponded.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: '#dc2626' }}>
                            Not Responded ({responseStatuses[issue.id]!.notResponded.length}):
                          </p>
                          <ul className="space-y-1">
                            {responseStatuses[issue.id]!.notResponded.map((sub) => (
                              <li key={sub.id} className="text-xs" style={{ color: '#666666' }}>
                                ○ {sub.name} ({sub.email})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {compileResult && compilingIssueId === null && (
                    <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: '#FAFAFA', borderRadius: '8px' }}>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: '#1a1a1a' }}>Compiled Newsletter:</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Intro:</p>
                          <p className="text-sm" style={{ color: '#1a1a1a' }}>{compileResult.intro}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Outro:</p>
                          <p className="text-sm" style={{ color: '#1a1a1a' }}>{compileResult.outro}</p>
                        </div>
                        {compileResult.originalSubmissions && (
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>
                              Submissions ({compileResult.originalSubmissions.length}):
                            </p>
                            <ul className="text-xs space-y-1" style={{ color: '#666666' }}>
                              {compileResult.originalSubmissions.map((sub, idx) => (
                                <li key={idx}>• {sub.name}: {sub.answers.length} answers</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="mt-4 text-xs italic" style={{ color: '#999999' }}>
                        Note that the intro and outro were auto-generated by Claude
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
