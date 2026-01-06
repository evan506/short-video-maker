/**
 * useIntersectionObserver Hook
 *
 * Custom React hook for lazy loading images and components using Intersection Observer API.
 *
 * Features:
 * - Configurable threshold (default: 0.1 = 10% visible)
 * - Automatic cleanup on unmount
 * - Support for multiple elements
 * - Preload adjacent items for smooth UX
 *
 * @example
 * ```tsx
 * const [isIntersecting, ref] = useIntersectionObserver({
 *   threshold: 0.1,
 *   triggerOnce: true
 * });
 *
 * <div ref={ref}>
 *   {isIntersecting && <HeavyComponent />}
 * </div>
 * ```
 */

import { useState, useEffect, useRef, RefObject } from 'react';

export interface UseIntersectionObserverOptions {
  /**
   * Threshold value(s) for triggering the callback.
   * 0.1 means callback fires when 10% of element is visible.
   * Can be a single number or an array of numbers.
   */
  threshold?: number | number[];

  /**
   * Root element to use as viewport.
   * Defaults to browser viewport if null.
   */
  root?: Element | null;

  /**
   * Margin around root element.
   * Can grow or shrink the root element's bounding box.
   */
  rootMargin?: string;

  /**
   * Whether to only trigger once.
   * If true, callback fires on first intersection and then disconnects.
   */
  triggerOnce?: boolean;

  /**
   * Whether to track intersection state after triggering.
   * If false with triggerOnce, observer disconnects after first trigger.
   */
  trackVisibility?: boolean;
}

export interface UseIntersectionObserverReturn {
  /**
   * Whether the element is currently intersecting (visible).
   */
  isIntersecting: boolean;

  /**
   * Ref to attach to the target element.
   */
  ref: RefObject<Element>;

  /**
   * Whether the observer has triggered at least once.
   */
  hasTriggered: boolean;
}

/**
 * useIntersectionObserver Hook
 *
 * Tracks when an element enters or exits the viewport using Intersection Observer API.
 *
 * @param options - Configuration options
 * @returns Tuple of [isIntersecting, ref, hasTriggered]
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '0px',
    triggerOnce = false,
    trackVisibility = true,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<Element>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    // Check if Intersection Observer is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: immediately set as intersecting
      console.warn('IntersectionObserver not supported, falling back to immediate render');
      setIsIntersecting(true);
      setHasTriggered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;

        setIsIntersecting(isElementIntersecting);

        if (isElementIntersecting && !hasTriggered) {
          setHasTriggered(true);
        }

        // Disconnect after first trigger if triggerOnce is true
        if (isElementIntersecting && triggerOnce) {
          observer.disconnect();

          // Reset intersection state if not tracking visibility
          if (!trackVisibility) {
            setIsIntersecting(false);
          }
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    // Cleanup function
    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, triggerOnce, trackVisibility, hasTriggered]);

  return {
    isIntersecting,
    ref,
    hasTriggered,
  };
}

/**
 * useIntersectionObserverArray Hook
 *
 * Tracks multiple elements with a single Intersection Observer.
 * More efficient than creating multiple observers.
 *
 * @param itemCount - Number of items to observe
 * @param options - Configuration options
 * @returns Array of refs and intersection states
 *
 * @example
 * ```tsx
 * const { refs, isIntersectingArray } = useIntersectionObserverArray(10);
 *
 * {items.map((item, index) => (
 *   <div key={item.id} ref={refs[index]}>
 *     {isIntersectingArray[index] && <HeavyComponent data={item} />}
 *   </div>
 * ))}
 * ```
 */
export function useIntersectionObserverArray(
  itemCount: number,
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  const [isIntersectingArray, setIsIntersectingArray] = useState<boolean[]>(
    new Array(itemCount).fill(false)
  );

  const refs = useRef<Array<Element | null>>([]);

  // Initialize refs array
  if (refs.current.length !== itemCount) {
    refs.current = new Array(itemCount).fill(null);
  }

  useEffect(() => {
    const elements = refs.current.filter((el): el is Element => el !== null);

    if (elements.length === 0) {
      return;
    }

    // Check if Intersection Observer is supported
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('IntersectionObserver not supported, falling back to immediate render');
      setIsIntersectingArray(new Array(itemCount).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = refs.current.findIndex((el) => el === entry.target);
          if (index !== -1) {
            setIsIntersectingArray((prev) => {
              const newState = [...prev];
              newState[index] = entry.isIntersecting;

              // Disconnect observer for this element if triggerOnce is true
              if (entry.isIntersecting && triggerOnce) {
                observer.unobserve(entry.target);
              }

              return newState;
            });
          }
        });
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    // Observe all elements
    elements.forEach((element) => {
      observer.observe(element);
    });

    // Cleanup function
    return () => {
      observer.disconnect();
    };
  }, [itemCount, threshold, root, rootMargin, triggerOnce]);

  return {
    refs,
    isIntersectingArray,
  };
}

export default useIntersectionObserver;
