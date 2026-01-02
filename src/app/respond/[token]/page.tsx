'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { validateMagicToken, submitResponse, uploadImage } from './actions';

interface Issue {
  id: string;
  status: 'collecting' | 'sent';
  deadline: string;
  questions: string[];
  created_at: string;
}

interface Subscriber {
  id: string;
  name: string;
  email: string;
}

interface UploadedImage {
  file: File;
  preview: string;
  url?: string;
  uploading: boolean;
  error?: string;
}

const MAX_IMAGES = 3;
const MIN_LENGTH = 50; // ~2 sentences
const MAX_LENGTH = 500; // ~5 sentences

export default function RespondPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const issueId = searchParams.get('issueId') || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!token || !issueId) {
        setError('Invalid link. Missing required parameters.');
        setLoading(false);
        return;
      }

      const result = await validateMagicToken(token, issueId);

      if (!result.valid) {
        setError(result.error || 'Invalid link');
      } else {
        setSubscriber(result.subscriber || null);
        setIssue(result.issue || null);
        setAlreadySubmitted(result.alreadySubmitted || false);

        // Check if deadline passed
        if (result.issue && new Date(result.issue.deadline) < new Date()) {
          setDeadlinePassed(true);
        }

        // Initialize answers array with empty strings for each question
        if (result.issue) {
          setAnswers(new Array(result.issue.questions.length).fill(''));
        }
      }

      setLoading(false);
    }

    validate();
  }, [token, issueId]);

  function handleAnswerChange(index: number, value: string) {
    setAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !subscriber) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToAdd) {
      // Create preview
      const preview = URL.createObjectURL(file);
      const newImage: UploadedImage = {
        file,
        preview,
        uploading: true
      };

      setImages(prev => [...prev, newImage]);

      // Upload to Supabase
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadImage(formData, subscriber.id, issueId);

      setImages(prev => prev.map(img =>
        img.preview === preview
          ? { ...img, uploading: false, url: result.url, error: result.error }
          : img
      ));
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeImage(preview: string) {
    setImages(prev => {
      const filtered = prev.filter(img => img.preview !== preview);
      // Revoke the object URL to free memory
      URL.revokeObjectURL(preview);
      return filtered;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Collect successfully uploaded image URLs
    const imageUrls = images
      .filter(img => img.url && !img.error)
      .map(img => img.url!);

    startTransition(async () => {
      const result = await submitResponse(token, issueId, answers, imageUrls);

      if (result.success) {
        setSubmitted(true);
      }
      setSubmitMessage(result.message);
    });
  }

  function formatDeadline(deadline: string) {
    return new Date(deadline).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getCharacterCountColor(length: number) {
    if (length === 0) return 'text-gray-400';
    if (length < MIN_LENGTH) return 'text-orange-500';
    if (length > MAX_LENGTH) return 'text-red-500';
    return 'text-green-600';
  }

  function isFormValid() {
    return answers.every(answer => answer.length >= MIN_LENGTH && answer.length <= MAX_LENGTH);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Already Submitted</h1>
          <p className="text-gray-600">
            You&apos;ve already submitted your response for this issue. Thank you for participating!
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600">{submitMessage}</p>
        </div>
      </div>
    );
  }

  if (deadlinePassed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">
            🐢
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Too Late!</h1>
          <p className="text-gray-600 mb-4">
            Oh no! The deadline for this issue has already passed.
          </p>
          <p className="text-gray-500 text-sm">
            Don&apos;t worry, there&apos;s always next time! Keep an eye on your inbox for the next newsletter.
          </p>
          <div className="mt-6 text-4xl">
            💌
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold">Hey {subscriber?.name}!</h1>
            <p className="mt-2 opacity-90">
              Share your update for this week&apos;s newsletter
            </p>
            {issue && (
              <p className="mt-4 text-sm opacity-75">
                Deadline: {formatDeadline(issue.deadline)}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-8 space-y-8">
            {issue?.questions.map((question, index) => (
              <div key={index}>
                <label
                  htmlFor={`question-${index}`}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {question}
                </label>
                <textarea
                  id={`question-${index}`}
                  rows={4}
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  minLength={MIN_LENGTH}
                  maxLength={MAX_LENGTH}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                  placeholder="Share your thoughts (2-5 sentences)..."
                />
                <div className={`mt-1 text-xs ${getCharacterCountColor(answers[index]?.length || 0)}`}>
                  {answers[index]?.length || 0} / {MAX_LENGTH} characters
                  {(answers[index]?.length || 0) < MIN_LENGTH && (
                    <span className="ml-2">(minimum {MIN_LENGTH})</span>
                  )}
                </div>
              </div>
            ))}

            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Photos (optional, max {MAX_IMAGES})
              </label>

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {images.map((img) => (
                    <div key={img.preview} className="relative aspect-square">
                      <img
                        src={img.preview}
                        alt="Upload preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                      {img.error && (
                        <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center rounded-lg p-2">
                          <span className="text-white text-xs text-center">{img.error}</span>
                        </div>
                      )}
                      {!img.uploading && (
                        <button
                          type="button"
                          onClick={() => removeImage(img.preview)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-lg"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {images.length < MAX_IMAGES && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Photos
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    JPEG, PNG, GIF, or WebP. Max 5MB each.
                  </p>
                </div>
              )}
            </div>

            {submitMessage && !submitted && (
              <div className="p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
                {submitMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !isFormValid() || images.some(img => img.uploading)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Response'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
