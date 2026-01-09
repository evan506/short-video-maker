/**
 * JobStatusCard Component
 *
 * Job status card with retry/cancel buttons (T064).
 * Displays:
 * - Current job status
 * - Error messages with actionable text
 * - Retry button (for failed jobs)
 * - Cancel button (for running/queued jobs)
 */

import React, { useState, useMemo } from 'react';
import type { RenderJobWithSteps } from '../../../server/services/render-service';
import { getErrorMessage } from '../../../server/services/render-service';
import { JOB_STATUS_LABELS } from './types';

interface JobStatusCardProps {
  /** Render job with steps */
  job: RenderJobWithSteps;
  /** On retry callback */
  onRetry?: () => Promise<void>;
  /** On cancel callback */
  onCancel?: () => Promise<void>;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * JobStatusCard Component
 *
 * Displays job status with action buttons.
 *
 * @example
 * ```tsx
 * <JobStatusCard
 *   job={job}
 *   onRetry={handleRetry}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export const JobStatusCard: React.FC<JobStatusCardProps> = ({
  job,
  onRetry,
  onCancel,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!onRetry || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await onRetry();
    } catch (err: any) {
      setError(err.message || 'Failed to retry job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await onCancel();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel job');
    } finally {
      setIsLoading(false);
    }
  };

  // Get error message if job failed (T069)
  const showError = job.status === 'failed' && job.error_code;
  const errorInfo = showError ? getErrorMessage(job.error_code) : null;

  // Determine status badge color
  const statusBadgeColor = useMemo(() => {
    switch (job.status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }, [job.status]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header with status badge */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Render Job Status</h3>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadgeColor}`}
        >
          {JOB_STATUS_LABELS[job.status] || job.status}
        </span>
      </div>

      {/* Job details */}
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center justify-between">
          <span>Job ID:</span>
          <span className="font-mono text-xs">{job.id.slice(0, 8)}...</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Progress:</span>
          <span className="font-semibold">{job.progress}%</span>
        </div>
        {job.retry_count > 0 && (
          <div className="flex items-center justify-between">
            <span>Retry count:</span>
            <span>{job.retry_count}</span>
          </div>
        )}
        {job.started_at && (
          <div className="flex items-center justify-between">
            <span>Started:</span>
            <span>{new Date(job.started_at).toLocaleString()}</span>
          </div>
        )}
        {job.completed_at && (
          <div className="flex items-center justify-between">
            <span>Completed:</span>
            <span>{new Date(job.completed_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Error message with actionable text (T069) */}
      {errorInfo && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Render Failed</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{errorInfo.message}</p>
                <p className="mt-1 font-medium">Suggested action: {errorInfo.action}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Retry button (for failed jobs) */}
        {job.status === 'failed' && onRetry && (
          <button
            onClick={handleRetry}
            disabled={disabled || isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Retrying...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry from Failed Step
              </>
            )}
          </button>
        )}

        {/* Cancel button (for running/queued jobs) */}
        {(job.status === 'running' || job.status === 'queued') && onCancel && (
          <button
            onClick={handleCancel}
            disabled={disabled || isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Canceling...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel Render
              </>
            )}
          </button>
        )}

        {/* Action error message */}
        {error && (
          <div className="flex-1 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobStatusCard;
