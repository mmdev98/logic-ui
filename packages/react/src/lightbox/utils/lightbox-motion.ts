import { AnimationFrame } from "@base-ui/utils/useAnimationFrame";
import { LIGHTBOX_SWIPE_STRENGTH } from "../constants";
import { type LightboxActivationDirection } from "../types";
import { clampLightboxValue } from "./lightbox-geometry";

/**
 * Strength of a released swipe, 0.1 to 1: how long the slides take to cover
 * the `remaining` distance (px) at the release `velocity` (px/ms), scaled
 * between the fastest and slowest settle. A slow release is `1`. Multiply a
 * duration by it so the motion keeps the swipe's speed, as Base UI's drawer does.
 */
export function getLightboxSwipeStrength(
  remaining: number,
  velocity: number,
): number {
  const { minVelocity, maxVelocity, minDuration, maxDuration, min } =
    LIGHTBOX_SWIPE_STRENGTH;
  const speed = Math.abs(velocity);
  if (remaining <= 0 || speed <= minVelocity) return 1;
  const duration = clampLightboxValue(
    remaining / clampLightboxValue(speed, minVelocity, maxVelocity),
    minDuration,
    maxDuration,
  );
  const strength =
    min + ((duration - minDuration) / (maxDuration - minDuration)) * (1 - min);
  return Math.round(strength * 1000) / 1000;
}

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
 * item, `-1` the previous one, `0` the active one. Longer drags can cross
 * several items. Offsets and velocity follow the reading direction, so a
 * swipe towards the end is negative.
 *
 * It looks at where the track is, not how far this gesture moved it, so a
 * swipe that catches the track mid-animation settles where it should:
 * - a flick moves to the next item edge in its direction;
 * - a slow release snaps to the nearest item, moving on once the drag
 *   crosses `minDistance` of an item.
 */
export function getLightboxSwipeStep(release: LightboxSwipeRelease): number {
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
  return target || 0;
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
  if (step === 0) return "none";
  const forward = step > 0;
  const towardsRight = direction === "rtl" ? !forward : forward;
  return towardsRight ? "right" : "left";
}
