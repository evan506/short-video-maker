import React from 'react';
import type { SubtitlePreset } from '../../../components/subtitles/types';

interface SubtitlePresetSelectorProps {
  /** Current selected preset */
  currentPreset: SubtitlePreset;
  /** On preset change callback */
  onPresetChange: (preset: SubtitlePreset) => void;
  /** Whether to show the "Apply to all" button */
  showApplyToAll?: boolean;
  /** On apply to all callback */
  onApplyToAll?: () => void;
  /** Is applying to all in progress */
  isApplyingToAll?: boolean;
}

const PRESET_LABELS: Record<SubtitlePreset, string> = {
  minimal: 'Minimal',
  highlight: 'Highlight',
  karaoke: 'Karaoke',
};

const PRESET_DESCRIPTIONS: Record<SubtitlePreset, string> = {
  minimal: 'Clean white text at bottom',
  highlight: 'Text with semi-transparent background',
  karaoke: 'Word-by-word highlighting',
};

/**
 * SubtitlePresetSelector Component
 *
 * Dropdown selector for choosing subtitle presets.
 * Optionally includes an "Apply to all scenes" button for bulk updates.
 */
export const SubtitlePresetSelector: React.FC<SubtitlePresetSelectorProps> = ({
  currentPreset,
  onPresetChange,
  showApplyToAll = false,
  onApplyToAll,
  isApplyingToAll = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="subtitle-preset" className="text-sm font-medium text-gray-700">
        Subtitle Style:
      </label>
      <select
        id="subtitle-preset"
        value={currentPreset}
        onChange={(e) => onPresetChange(e.target.value as SubtitlePreset)}
        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
      >
        <option value="minimal">{PRESET_LABELS.minimal}</option>
        <option value="highlight">{PRESET_LABELS.highlight}</option>
        <option value="karaoke">{PRESET_LABELS.karaoke}</option>
      </select>

      {showApplyToAll && onApplyToAll && (
        <button
          onClick={onApplyToAll}
          disabled={isApplyingToAll}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplyingToAll ? (
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
              Applying...
            </>
          ) : (
            'Apply to all scenes'
          )}
        </button>
      )}

      <div className="ml-2 text-xs text-gray-500">
        {PRESET_DESCRIPTIONS[currentPreset]}
      </div>
    </div>
  );
};

export default SubtitlePresetSelector;
