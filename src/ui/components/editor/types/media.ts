/**
 * Media Types
 *
 * Type definitions for video media options and preview functionality.
 */

export interface MediaOption {
  id: string;
  scene_id: string;
  pexels_video_id: number;
  video_url: string;
  thumbnail_url: string;
  duration_sec: number;
  width: number;
  height: number;
  aspect_ratio: string;
  is_selected: boolean;
  created_at: string;
  expires_at: string;
}

export interface VideoThumbnailProps {
  mediaOption: MediaOption;
  isSelected?: boolean;
  onSelect?: (mediaOption: MediaOption) => void;
  onPreview?: (mediaOption: MediaOption) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export interface VideoPreviewModalProps {
  mediaOption: MediaOption | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaOption: MediaOption) => void;
  isSelecting?: boolean;
}
