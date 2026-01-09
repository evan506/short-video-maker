/**
 * RenderNotification Component
 *
 * Toast/banner notification for render completion (T066).
 * Shows success/failure notifications with auto-dismiss.
 */

import React, { useEffect, useState } from 'react';
import type { RenderJobWithSteps } from '../../../server/services/render-service';

interface RenderNotificationProps {
  /** Render job with steps */
  job: RenderJobWithSteps | null;
  /** Previous job status (to detect transitions) */
  previousStatus?: string;
  /** Auto-dismiss delay in milliseconds (default: 10000) */
  autoDismissDelay?: number;
  /** On dismiss callback */
  onDismiss?: () => void;
}

/**
 * RenderNotification Component
 *
 * Displays toast notification on job completion/failure.
 *
 * @example
 * ```tsx
 * <RenderNotification
 *   job={job}
 *   previousStatus={previousStatus}
 *   onDismiss={() => setShowNotification(false)}
 * />
 * ```
 */
export const RenderNotification: React.FC<RenderNotificationProps> = ({
  job,
  previousStatus,
  autoDismissDelay = 10000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [statusTransition, setStatusTransition] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Detect status transitions
  useEffect(() => {
    if (!job) {
      setVisible(false);
      return;
    }

    // Check if job just reached terminal state
    if (previousStatus && previousStatus !== job.status) {
      const terminalStates = ['succeeded', 'failed', 'canceled'];
      if (terminalStates.includes(job.status)) {
        setStatusTransition({ from: previousStatus, to: job.status });
        setVisible(true);

        // Auto-dismiss after delay
        const timer = setTimeout(() => {
          setVisible(false);
          onDismiss?.();
        }, autoDismissDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [job, previousStatus, autoDismissDelay, onDismiss]);

  // Don't render if no transition detected
  if (!visible || !statusTransition || !job) {
    return null;
  }

  const isSuccess = job.status === 'succeeded';
  const isFailure = job.status === 'failed';
  const isCanceled = job.status === 'canceled';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div
        className={`rounded-lg shadow-lg p-4 ${
          isSuccess
            ? 'bg-green-50 border border-green-200'
            : isFailure
            ? 'bg-red-50 border border-red-200'
            : 'bg-gray-50 border border-gray-200'
        }`}
      >
        <div className="flex">
          {/* Icon */}
          <div className="flex-shrink-0">
            {isSuccess && (
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {isFailure && (
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {isCanceled && (
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="ml-3 flex-1">
            <h3
              className={`text-sm font-semibold ${
                isSuccess
                  ? 'text-green-800'
                  : isFailure
                  ? 'text-red-800'
                  : 'text-gray-800'
              }`}
            >
              {isSuccess && 'Render Complete!'}
              {isFailure && 'Render Failed'}
              {isCanceled && 'Render Canceled'}
            </h3>
            <div
              className={`mt-1 text-sm ${
                isSuccess
                  ? 'text-green-700'
                  : isFailure
                  ? 'text-red-700'
                  : 'text-gray-700'
              }`}
            >
              {isSuccess && (
                <p>
                  Your video is ready! Download it from the exports section below.
                </p>
              )}
              {isFailure && (
                <p>
                  There was an error rendering your video. Check the error message
                  below for details and suggested actions.
                </p>
              )}
              {isCanceled && (
                <p>The render job was canceled. You can retry if needed.</p>
              )}
            </div>
          </div>

          {/* Close button */}
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={() => {
                setVisible(false);
                onDismiss?.();
              }}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSuccess
                  ? 'text-green-400 hover:bg-green-100 focus:ring-green-500'
                  : isFailure
                  ? 'text-red-400 hover:bg-red-100 focus:ring-red-500'
                  : 'text-gray-400 hover:bg-gray-100 focus:ring-gray-500'
              }`}
            >
              <span className="sr-only">Dismiss</span>
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderNotification;
