/**
 * ExportDownload Component
 *
 * Download button and video player modal for completed renders (T067-T068).
 * Displays:
 * - Download button with signed URL
 * - Video player modal for preview
 * - Handles expired download links
 */

import React, { useState } from 'react';
import type { RenderJobWithSteps } from '../../../server/services/render-service';

interface ExportDownloadProps {
  /** Render job with steps */
  job: RenderJobWithSteps;
  /** Export video URL (signed URL) */
  videoUrl: string | null;
  /** On regenerate URL callback (for expired links) */
  onRegenerateUrl?: () => Promise<string>;
}

/**
 * ExportDownload Component
 *
 * Displays download button and video player modal.
 *
 * @example
 * ```tsx
 * <ExportDownload
 *   job={job}
 *   videoUrl={videoUrl}
 *   onRegenerateUrl={handleRegenerateUrl}
 * />
 * ```
 */
export const ExportDownload: React.FC<ExportDownloadProps> = ({
  job,
  videoUrl,
  onRegenerateUrl,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /**
   * Handle download button click
   */
  const handleDownload = async () => {
    if (!videoUrl) {
      setDownloadError('Download URL not available');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      // Trigger browser download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-${job.id.slice(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('[ExportDownload] Download failed:', err);
      setDownloadError(err.message || 'Failed to download video');

      // If URL expired, try to regenerate
      if (err.message?.includes('expired') && onRegenerateUrl) {
        try {
          const newUrl = await onRegenerateUrl();
          // Retry download with new URL
          const link = document.createElement('a');
          link.href = newUrl;
          link.download = `video-${job.id.slice(0, 8)}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setDownloadError(null);
        } catch (regenErr: any) {
          setDownloadError(`Failed to regenerate download URL: ${regenErr.message}`);
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Open video player modal
   */
  const openModal = () => {
    setShowModal(true);
  };

  /**
   * Close video player modal
   */
  const closeModal = () => {
    setShowModal(false);
  };

  // Don't show if job hasn't succeeded yet
  if (job.status !== 'succeeded') {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Your Video is Ready!</h3>
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Your video has been successfully rendered and is ready for download.
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={!videoUrl || isDownloading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
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
                Downloading...
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Video
              </>
            )}
          </button>

          {/* Preview button */}
          <button
            onClick={openModal}
            disabled={!videoUrl}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Preview
          </button>
        </div>

        {/* Download error */}
        {downloadError && (
          <div className="mt-3 text-sm text-red-600">
            {downloadError}
          </div>
        )}
      </div>

      {/* Video player modal (T068) */}
      {showModal && videoUrl && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={closeModal}
          ></div>

          {/* Modal panel */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-lg max-w-4xl w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Video Preview
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg
                    className="w-6 h-6"
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
                </button>
              </div>

              {/* Video player */}
              <div className="p-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg"
                  autoPlay
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportDownload;
