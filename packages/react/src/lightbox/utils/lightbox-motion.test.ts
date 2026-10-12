import { describe, expect, it } from "vitest";

import {
  getLightboxActivationDirection,
  getLightboxSwipeStep,
  getLightboxSwipeStrength,
} from "./lightbox-motion";

describe("getLightboxSwipeStrength", () => {
  it("is 1 for a slow release, or nothing left to cover", () => {
    expect(getLightboxSwipeStrength(300, 0.1)).toBe(1);
    expect(getLightboxSwipeStrength(0, 2)).toBe(1);
  });

  it("shrinks as the flick gets faster", () => {
    // 300 px at 1 px/ms: 300 ms, near the slowest settle.
    expect(getLightboxSwipeStrength(300, 1)).toBeCloseTo(0.807, 3);
    // 300 px at 4 px/ms: 75 ms, clamped to the fastest.
    expect(getLightboxSwipeStrength(-300, -4)).toBe(0.1);
  });

  it("is 1 for a flick away from where the track settles", () => {
    // Thrown right past the first item, the track springs back left.
    expect(getLightboxSwipeStrength(-40, 4)).toBe(1);
    expect(getLightboxSwipeStrength(40, -4)).toBe(1);
  });
});

/** Items 400 px wide, no gap; a quarter of an item moves on; 0.3 px/ms is a flick. */
const swipe = (offset: number, velocity: number, startOffset = 0) =>
  getLightboxSwipeStep({
    offset,
    startOffset,
    velocity,
    stride: 400,
    minDistance: 0.25,
    minVelocity: 0.3,
  });

describe("getLightboxSwipeStep", () => {
  it.each([
    { name: "past a quarter towards the next item", offset: -120, step: 1 },
    { name: "past a quarter towards the previous item", offset: 120, step: -1 },
    { name: "short of a quarter", offset: -80, step: 0 },
  ])("settles $name from rest", ({ offset, step }) => {
    expect(swipe(offset, 0)).toBe(step);
  });

  it("moves on after a fast flick, even a short one", () => {
    expect(swipe(-20, -0.8)).toBe(1);
    expect(swipe(20, 0.8)).toBe(-1);
  });

  it("stays after a fast flick back", () => {
    expect(swipe(-150, 0.8)).toBe(0);
  });

  it.each([
    { offset: -640, velocity: 0, step: 2 },
    { offset: 640, velocity: 0, step: -2 },
    { offset: -1240, velocity: 0, step: 3 },
    { offset: 1240, velocity: 0, step: -3 },
    { offset: -900, velocity: -2, step: 3 },
    { offset: 900, velocity: 2, step: -3 },
    { offset: -900, velocity: 2, step: 2 },
    { offset: 900, velocity: -2, step: -2 },
  ])(
    "settles offset $offset at speed $velocity on item $step",
    ({ offset, velocity, step }) => {
      expect(swipe(offset, velocity)).toBe(step);
    },
  );

  // The previous swipe left the track 280 px towards the previous item and
  // was animating to 0 when this gesture caught it.
  it("follows a drag that caught the track mid-animation", () => {
    // Dragged on towards the next item: settles on the active one, not back.
    expect(swipe(160, 0, 280)).toBe(0);
    // Dragged back towards the previous item, past a quarter of it.
    expect(swipe(320, 0, 280)).toBe(-1);
    // A flick towards the next item settles on the active one first.
    expect(swipe(240, -0.8, 280)).toBe(0);
  });

  it("does nothing without a size", () => {
    expect(swipe(-120, -1)).toBe(1);
    expect(
      getLightboxSwipeStep({
        offset: -120,
        startOffset: 0,
        velocity: -1,
        stride: 0,
        minDistance: 0.25,
        minVelocity: 0.3,
      }),
    ).toBe(0);
  });
});

describe("getLightboxActivationDirection", () => {
  it.each([
    [1, "ltr", "right"],
    [-1, "ltr", "left"],
    [3, "ltr", "right"],
    [1, "rtl", "left"],
    [-1, "rtl", "right"],
    [0, "ltr", "none"],
  ] as const)("a step of %s in %s comes from the %s", (step, dir, expected) => {
    expect(getLightboxActivationDirection(step, dir)).toBe(expected);
  });
});
