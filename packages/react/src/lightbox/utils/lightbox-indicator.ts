import { swipeProgress } from "../popup/lightbox-popup-css-vars";

const PROGRESS = `var(${swipeProgress}, 0)`;

/**
 * A length at `rest` that moves towards `previous` or `next` with the swipe,
 * as a CSS value: the swipe progress is read from the popup by the browser on
 * every frame, so nothing re-renders. `previousSign` is the sign of the
 * progress that brings the previous item in: `1` in a left-to-right layout,
 * where the slides move right, `-1` in a right-to-left one.
 */
export function formatLightboxSwipeFollow(
  rest: number,
  previous: number | null,
  next: number | null,
  previousSign: 1 | -1,
): string {
  const parts = [`${rest}px`];
  const towards = (sign: number, target: number | null) => {
    if (target === null || target === rest) return;
    parts.push(`min(1, max(0, ${sign} * ${PROGRESS})) * ${target - rest}px`);
  };
  towards(previousSign, previous);
  towards(-previousSign, next);
  return parts.length === 1 ? `${rest}px` : `calc(${parts.join(" + ")})`;
}
