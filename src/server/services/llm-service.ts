/**
 * LLM Service - OpenRouter API Integration
 *
 * Provides LLM capabilities for script generation and editing using OpenRouter API.
 * Implements retry logic, timeout handling, and user-friendly error messages.
 */

interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LLMError {
  message: string;
  retryable: boolean;
  code?: string;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a script from topic using LLM
 */
export async function generateScript(params: {
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  targetDuration: 15 | 30 | 60;
  videoType: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
}): Promise<LLMResponse> {
  const prompt = buildGenerateScriptPrompt(params);

  return callLLM_API(prompt, 'generateScript');
}

/**
 * Shorten a script to ~70% of original length
 */
export async function shortenScript(script: string): Promise<LLMResponse> {
  const prompt = `Condense this script to 70% of its original length while preserving key points and main ideas. Keep the most important information.

Script: ${script}

Return the condensed script as plain text without markdown formatting.`;

  return callLLM_API(prompt, 'shortenScript');
}

/**
 * Lengthen a script to ~130% of original length
 */
export async function lengthenScript(script: string): Promise<LLMResponse> {
  const prompt = `Expand this script to 130% of its original length by adding more detail, examples, and elaboration. Maintain the original structure.

Script: ${script}

Return the expanded script as plain text without markdown formatting.`;

  return callLLM_API(prompt, 'lengthenScript');
}

/**
 * Rephrase script in more natural language
 */
export async function rephraseScript(script: string): Promise<LLMResponse> {
  const prompt = `Rewrite this script in more natural, conversational language while keeping the same meaning and key points.

Script: ${script}

Return the rephrased script as plain text without markdown formatting.`;

  return callLLM_API(prompt, 'rephraseScript');
}

/**
 * Change tone of script
 */
export async function changeTone(script: string, tone: 'Casual' | 'Professional' | 'Funny' | 'Inspirational'): Promise<LLMResponse> {
  const toneInstructions = {
    Casual: 'Use informal language, slang, conversational tone, and relatable expressions.',
    Professional: 'Use formal language, business terminology, and a serious, authoritative tone.',
    Funny: 'Use humor, jokes, witty remarks, and lighthearted language throughout.',
    Inspirational: 'Use motivational language, uplifting words, and encouraging expressions.'
  };

  const prompt = `Rewrite this script in a ${tone} style. ${toneInstructions[tone]}

Script: ${script}

Return the rewritten script as plain text without markdown formatting.`;

  return callLLM_API(prompt, 'changeTone');
}

/**
 * Extract keywords for multiple scenes using LLM
 *
 * Analyzes each scene's narration text to extract meaningful keywords
 * that represent the core subject, action, or theme.
 *
 * @param scenes - Array of scene objects with narration_text
 * @returns Array of keywords in the same order as input scenes
 */
export async function extractKeywordsForScenes(scenes: Array<{ narration_text: string }>): Promise<string[]> {
  if (!scenes || scenes.length === 0) {
    return [];
  }

  // Build prompt with all scenes
  const scenesText = scenes.map((scene, index) => {
    return `${index + 1}. "${scene.narration_text}"`;
  }).join('\n');

  const prompt = `Analyze the following video scene narrations and extract a meaningful primary keyword for each scene.

${scenesText}

For each scene, identify:
- The main subject, object, action, or theme
- Use 1-3 words that best represent what the scene is about
- Focus on visual elements or key concepts (not connecting words like "the", "a", "want", "let", etc.)

Example:
- "Want a perfectly cooked steak quickly" → "perfectly cooked steak"
- "Let it rest to redistribute the juices" → "rest steak" or "redistribute juices"
- "Heat a skillet on high and add high-smoke-point oil" → "heat skillet" or "hot pan"

Return ONLY a comma-separated list of keywords, one per scene, in the same order as the scenes above.
Format: keyword1, keyword2, keyword3, ...`;

  try {
    const response = await callLLM_API(prompt, 'extractKeywordsForScenes');

    // Parse the response (comma-separated keywords)
    const keywordsText = response.content.trim();
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);

    // Ensure we have the same number of keywords as scenes
    if (keywords.length !== scenes.length) {
      console.warn(`[LLM Service] Expected ${scenes.length} keywords, got ${keywords.length}. Using fallback.`);
      return scenes.map(scene => extractFallbackKeyword(scene.narration_text));
    }

    return keywords;
  } catch (error) {
    console.error('[LLM Service] Failed to extract keywords, using fallback:', error);
    return scenes.map(scene => extractFallbackKeyword(scene.narration_text));
  }
}

/**
 * Fallback keyword extraction (rule-based)
 *
 * Used when LLM fails or is unavailable.
 * Extracts meaningful nouns from the text.
 */
function extractFallbackKeyword(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'scene';
  }

  const words = text.trim().split(/\s+/);

  // Try to find the first word that's likely a noun (length > 3, not a common stop word)
  const stopWords = new Set(['want', 'let', 'get', 'make', 'take', 'this', 'that', 'with', 'from', 'have', 'will']);

  const meaningfulWords = words.filter(word =>
    word.length > 3 && !stopWords.has(word.toLowerCase())
  );

  if (meaningfulWords.length > 0) {
    // Return first 2 meaningful words
    return meaningfulWords.slice(0, 2).join(' ');
  }

  // Last resort: return first word if it's > 2 chars
  return words[0].length > 2 ? words[0] : 'scene';
}

/**
 * Build prompt for script generation from topic
 */
function buildGenerateScriptPrompt(params: {
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  targetDuration: 15 | 30 | 60;
  videoType: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
}): string {
  const { topic, platform, targetDuration, videoType } = params;

  // Estimate word count: ~2.5 words per second
  const targetWordCount = Math.round(targetDuration * 2.5);

  let videoTypeContext = '';
  switch (videoType) {
    case 'Explainer':
      videoTypeContext = 'This should clearly explain a concept, product, or idea in simple terms.';
      break;
    case 'Marketing':
      videoTypeContext = 'This should promote a product, service, or brand with persuasive language.';
      break;
    case 'Tutorial':
      videoTypeContext = 'This should provide step-by-step instructions or teach a specific skill.';
      break;
    case 'Recipe':
      videoTypeContext = 'This should present a recipe with ingredients and cooking steps.';
      break;
    case 'Story':
      videoTypeContext = 'This should tell a compelling narrative with a beginning, middle, and end.';
      break;
  }

  return `Generate a narration script for a ${targetDuration}-second ${videoType} video for ${platform}.

Topic: ${topic}

${videoTypeContext}

Target length: Approximately ${targetWordCount} words (${targetDuration} seconds at 2.5 words/second).

Requirements:
- Engaging and concise
- Optimized for ${platform} (short-form content, quick hooks)
- Natural spoken language (not written prose)
- No markdown formatting or section headers
- Return ONLY the script text, no introduction or conclusion`;
}

/**
 * Call OpenRouter API with retry logic and timeout
 */
async function callLLM_API(prompt: string, operation: string, maxRetries = 3): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const model = process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4-turbo';
  const baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  let lastError: LLMError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await callWithTimeout(
        fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
            'X-Title': 'AutoShorts Video Editor'
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        }),
        60000 // 60 second timeout
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error?.message || `API returned ${response.status}: ${response.statusText}`,
          retryable: response.status >= 500 || response.status === 429,
          code: response.status.toString()
        } as LLMError;
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw {
          message: 'Invalid API response format',
          retryable: true
        } as LLMError;
      }

      const content = data.choices[0].message.content?.trim();

      if (!content || content.length < 50) {
        throw {
          message: 'Generated content was incomplete or too short. Please try again.',
          retryable: true
        } as LLMError;
      }

      // Log token usage for cost monitoring
      if (data.usage) {
        console.log(`[LLM Service] ${operation} - Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
      }

      return {
        content,
        model: data.model,
        usage: data.usage
      };

    } catch (error: any) {
      lastError = error as LLMError;

      // Don't retry if error is not retryable or this was the last attempt
      if (!lastError.retryable || attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`[LLM Service] ${operation} failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`, lastError.message);
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  if (lastError?.code === 'TIMEOUT') {
    throw new Error('Generation timed out. Please retry or try a shorter topic.');
  }

  throw new Error(lastError?.message || 'Failed to generate script. Please try again.');
}

/**
 * Wrap a promise with timeout
 */
function callWithTimeout(promise: Promise<Response>, timeoutMs: number): Promise<Response> {
  return Promise.race([
    promise,
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject({
        message: 'Request timeout',
        retryable: true,
        code: 'TIMEOUT'
      } as LLMError), timeoutMs)
    )
  ]);
}
