/**
 * RenderProgress Component
 *
 * Progress bar component for render job tracking (T061-T063).
 * Displays:
 * - Progress bar with step indicator
 * - User-friendly step names
 * - "Last updated: X seconds ago" relative time display
 */

import React, { useMemo, useEffect, useState } from 'react';
import type { RenderJobWithSteps } from '../../../server/services/render-service';
import { STEP_LABELS } from './types';

interface RenderProgressProps {
  /** Render job with steps */
  job: RenderJobWithSteps;
  /** Last updated timestamp */
  lastUpdated: Date | null;
  /** Whether actively polling */
  isPolling: boolean;
}

/**
 * Format relative time (e.g., "5 seconds ago")
 */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
}

/**
 * RenderProgress Component
 *
 * Displays a progress bar with step indicator and relative time.
 *
 * @example
 * ```tsx
 * <RenderProgress
 *   job={job}
 *   lastUpdated={lastUpdated}
 *   isPolling={true}
 * />
 * ```
 */
export const RenderProgress: React.FC<RenderProgressProps> = ({
  job,
  lastUpdated,
  isPolling,
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Update relative time every second
  useEffect(() => {
    if (!lastUpdated) {
      setRelativeTime('');
      return;
    }

    setRelativeTime(formatRelativeTime(lastUpdated));

    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastUpdated));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Calculate step index and label
  const { stepLabel, stepNumber, totalSteps } = useMemo(() => {
    const currentStepName = job.current_step;
    const stepIndex = job.job_steps.findIndex(
      (s) => s.step_name === currentStepName
    );

    return {
      stepLabel: currentStepName
        ? STEP_LABELS[currentStepName] || currentStepName
        : 'Initializing...',
      stepNumber: stepIndex >= 0 ? stepIndex + 1 : 1,
      totalSteps: job.job_steps.length,
    };
  }, [job.current_step, job.job_steps]);

  // Calculate progress bar color based on status
  const progressColor = useMemo(() => {
    switch (job.status) {
      case 'succeeded':
        return 'bg-green-600';
      case 'failed':
      case 'canceled':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  }, [job.status]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header with step indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Step {stepNumber}/{totalSteps}: {stepLabel}
          </h3>
          {isPolling && (
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500">Live</span>
            </div>
          )}
        </div>

        {/* Last updated time (T063) */}
        {lastUpdated && relativeTime && (
          <div className="text-xs text-gray-500">
            Last updated: {relativeTime}
          </div>
        )}
      </div>

      {/* Progress bar (T062) */}
      <div className="relative">
        {/* Background track */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          {/* Progress fill */}
          <div
            className={`h-full ${progressColor} transition-all duration-300 ease-out`}
            style={{ width: `${job.progress}%` }}
          />
        </div>

        {/* Progress percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700 mix-blend-multiply">
            {job.progress}%
          </span>
        </div>
      </div>

      {/* Step list */}
      <div className="mt-4 space-y-2">
        {job.job_steps.map((step, index) => {
          const isCurrentStep = step.step_name === job.current_step;
          const isDone = step.status === 'done';
          const isFailed = step.status === 'failed';

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-sm ${
                isCurrentStep ? 'font-semibold text-gray-900' : 'text-gray-600'
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isDone ? (
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isFailed ? (
                  <svg
                    className="w-5 h-5 text-red-600"
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
                ) : isCurrentStep ? (
                  <svg
                    className="w-5 h-5 text-blue-600 animate-spin"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Step name */}
              <div className="flex-1">
                {STEP_LABELS[step.step_name] || step.step_name}
              </div>

              {/* Step status */}
              <div className="text-xs text-gray-500">
                {step.status === 'done' && 'Completed'}
                {step.status === 'running' && 'In progress...'}
                {step.status === 'pending' && 'Waiting'}
                {step.status === 'failed' && 'Failed'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RenderProgress;
