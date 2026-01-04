/**
 * Scene Utilities - Scene splitting, merging, and keyword extraction
 *
 * These utilities handle the transformation of script text into storyboard scenes
 * with proper duration calculation, keyword extraction, and auto-merge logic.
 */

/**
 * Sentence tokenization using regex-based sentence boundary detection
 *
 * Splits text into sentences using common sentence-ending punctuation marks.
 * This is a lightweight approach suitable for video script content.
 */
export function tokenizeIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split on sentence-ending punctuation followed by whitespace or end of string
  // Pattern: . ! ? followed by space or newline, or at end of string
  const sentenceRegex = /[.!?]+\s+|[.!?]+$/g;

  const sentences = text
    .split(sentenceRegex)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Estimate duration in seconds based on word count
 *
 * Uses average speaking rate of 2.5 words per second for normal speech.
 */
export function estimateDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round((wordCount / 2.5) * 10) / 10; // Round to 1 decimal place
}

/**
 * Extract primary keyword from text
 *
 * Strategy: Extract the first noun phrase (sequence of capitalized words
 * or the first meaningful phrase). Falls back to first few words if
 * no clear noun phrase found.
 */
export function extractKeyword(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'scene';
  }

  const words = text.trim().split(/\s+/);

  // Try to find the first capitalized word (potential proper noun)
  const capitalizedWords = words.filter(word =>
    /^[A-Z][a-z]/.test(word) && word.length > 2
  );

  if (capitalizedWords.length > 0) {
    // Return first few capitalized words as keyword
    return capitalizedWords.slice(0, 3).join(' ');
  }

  // Fallback: return first 2-3 meaningful words
  const meaningfulWords = words.filter(word => word.length > 2);
  if (meaningfulWords.length > 0) {
    return meaningfulWords.slice(0, 3).join(' ');
  }

  // Last resort: return first word
  return words[0] || 'scene';
}

/**
 * Scene data structure
 */
export interface SceneDraft {
  narration_text: string;
  duration_sec_draft: number;
  primary_keyword: string;
}

/**
 * Split script into scenes with target duration of 2-6 seconds
 *
 * Algorithm:
 * 1. Tokenize script into sentences
 * 2. Group sentences into scenes with target duration of 2-6 seconds
 * 3. Calculate duration based on word count (2.5 words/second)
 * 4. Extract primary keyword from narration
 */
export function splitIntoScenes(
  script: string,
  targetDurationMin: number = 2,
  targetDurationMax: number = 6
): SceneDraft[] {
  const sentences = tokenizeIntoSentences(script);

  if (sentences.length === 0) {
    return [];
  }

  const scenes: SceneDraft[] = [];
  let currentSceneSentences: string[] = [];
  let currentDuration = 0;

  for (const sentence of sentences) {
    const sentenceDuration = estimateDuration(sentence);

    // If adding this sentence would exceed max duration,
    // and we already have some content, save current scene
    if (currentDuration + sentenceDuration > targetDurationMax &&
        currentSceneSentences.length > 0) {
      // Save current scene
      const narration = currentSceneSentences.join(' ').trim();
      scenes.push({
        narration_text: narration,
        duration_sec_draft: Math.max(Math.round(currentDuration), 1),
        primary_keyword: extractKeyword(narration)
      });

      // Start new scene
      currentSceneSentences = [sentence];
      currentDuration = sentenceDuration;
    } else {
      // Add sentence to current scene
      currentSceneSentences.push(sentence);
      currentDuration += sentenceDuration;
    }
  }

  // Don't forget the last scene
  if (currentSceneSentences.length > 0) {
    const narration = currentSceneSentences.join(' ').trim();
    scenes.push({
      narration_text: narration,
      duration_sec_draft: Math.max(Math.round(currentDuration), 1),
      primary_keyword: extractKeyword(narration)
    });
  }

  return scenes;
}

/**
 * Merge scenes greedily to reduce count to target maximum
 *
 * Algorithm:
 * 1. If scene count <= max, return as-is
 * 2. Find adjacent pair with minimum combined duration
 * 3. Merge them (combine narration, sum durations, keep first keyword)
 * 4. Repeat until scene count <= max
 */
export function mergeScenes(
  scenes: SceneDraft[],
  maxScenes: number = 20,
  minSceneDuration: number = 2
): SceneDraft[] {
  // If we're already at or below target, return as-is
  if (scenes.length <= maxScenes) {
    return scenes;
  }

  let workingScenes = [...scenes];

  while (workingScenes.length > maxScenes) {
    // Find adjacent pair with minimum combined duration
    let minPairIndex = 0;
    let minCombinedDuration = Infinity;

    for (let i = 0; i < workingScenes.length - 1; i++) {
      const combinedDuration =
        workingScenes[i].duration_sec_draft +
        workingScenes[i + 1].duration_sec_draft;

      if (combinedDuration < minCombinedDuration) {
        minCombinedDuration = combinedDuration;
        minPairIndex = i;
      }
    }

    // Merge the pair at minPairIndex and minPairIndex + 1
    const scene1 = workingScenes[minPairIndex];
    const scene2 = workingScenes[minPairIndex + 1];

    const mergedScene: SceneDraft = {
      narration_text: `${scene1.narration_text} ${scene2.narration_text}`.trim(),
      duration_sec_draft: scene1.duration_sec_draft + scene2.duration_sec_draft,
      primary_keyword: scene1.primary_keyword // Keep first scene's keyword
    };

    // Replace the two scenes with the merged one
    workingScenes = [
      ...workingScenes.slice(0, minPairIndex),
      mergedScene,
      ...workingScenes.slice(minPairIndex + 2)
    ];
  }

  return workingScenes;
}

/**
 * Complete scene generation pipeline
 *
 * Combines splitting and merging into a single operation.
 */
export function generateScenes(
  script: string,
  maxScenes: number = 20
): SceneDraft[] {
  // Step 1: Split into scenes
  let scenes = splitIntoScenes(script);

  // Step 2: Merge if too many scenes
  scenes = mergeScenes(scenes, maxScenes);

  // Step 3: Assign order indices (will be added when saving to DB)
  return scenes;
}
