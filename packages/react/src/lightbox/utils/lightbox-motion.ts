import { AnimationFrame } from "@base-ui/utils/useAnimationFrame";
import { LightboxActivationDirection } from "../types";

export interface LightboxSwipeRelease {
  /** Where the track is now, in px from the active item. */
  offset: number;
  /** Where the track was when the gesture started; not 0 when it caught a moving track. */
  startOffset: number;
  /** Speed at release (px/ms). */
  velocity: number;
  /** Width of an item plus the gap after it (px). */
  stride: number;
  /** Share of an item a slow drag must cross to move on. */
  minDistance: number;
  /** Speed above which a release counts as a flick (px/ms). */
  minVelocity: number;
}

/**
 * Item a released swipe settles on, relative to the active one: `1` the next
 * item, `-1` the previous one, `0` the active one. Offsets and velocity follow
 * the reading direction, so a swipe towards the end is negative.
 *
 * It looks at where the track is, not how far this gesture moved it, so a
 * swipe that catches the track mid-animation settles where it should:
 * - a flick moves to the next item edge in its direction;
 * - a slow release snaps to the nearest item, moving on once the drag
 *   crosses `minDistance` of an item.
 */
export function getLightboxSwipeStep(
  release: LightboxSwipeRelease,
): -1 | 0 | 1 {
  const { offset, startOffset, velocity, stride, minDistance, minVelocity } =
    release;
  if (stride <= 0) return 0;
  // Position in items: 0 is the active item, 1 the next one.
  const position = -offset / stride;
  const startPosition = -startOffset / stride;

  let target: number;
  if (Math.abs(velocity) > minVelocity) {
    target = velocity < 0 ? Math.floor(position) + 1 : Math.ceil(position) - 1;
  } else {
    const direction = Math.sign(position - startPosition);
    target = Math.round(position + direction * (0.5 - minDistance));
  }
  if (target >= 1) return 1;
  if (target <= -1) return -1;
  return 0;
}

export function easeOutLightbox(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * Animates `progress` from 0 to 1 over `duration` ms with an ease-out curve.
 * Returns a function that stops it without calling `onComplete`.
 */
export function tweenLightbox(
  duration: number,
  onUpdate: (progress: number) => void,
  onComplete?: () => void,
): () => void {
  let frame = 0;
  let start: number | null = null;
  const step = (time: number) => {
    start ??= time;
    const progress = duration > 0 ? Math.min(1, (time - start) / duration) : 1;
    onUpdate(easeOutLightbox(progress));
    if (progress < 1) frame = AnimationFrame.request(step);
    else onComplete?.();
  };
  frame = AnimationFrame.request(step);
  return () => AnimationFrame.cancel(frame);
}

/**
 * Side of the previous item the item shown came from, on screen, after the
 * index moved by `step`: forward is to the right in a left-to-right layout.
 */
export function getLightboxActivationDirection(
  step: number,
  direction: "ltr" | "rtl",
): LightboxActivationDirection {
  if (step === 0) return LightboxActivationDirection.None;
  const forward = step > 0;
  const towardsRight = direction === "rtl" ? !forward : forward;
  return towardsRight
    ? LightboxActivationDirection.Right
    : LightboxActivationDirection.Left;
}
