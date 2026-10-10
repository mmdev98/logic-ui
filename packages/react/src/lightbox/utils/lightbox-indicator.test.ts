import { describe, expect, it } from "vitest";
import { formatLightboxSwipeFollow } from "./lightbox-indicator";

describe("formatLightboxSwipeFollow", () => {
  it("is the resting length without neighbours to move to", () => {
    expect(formatLightboxSwipeFollow(68, null, null, 1)).toBe("68px");
    expect(formatLightboxSwipeFollow(68, 68, 68, 1)).toBe("68px");
  });

  it("moves to the next item as the slides move left", () => {
    expect(formatLightboxSwipeFollow(0, null, 68, 1)).toBe(
      "calc(0px + min(1, max(0, -1 * var(--lightbox-swipe-progress, 0))) * 68px)",
    );
  });

  it("moves to the previous item as the slides move right", () => {
    expect(formatLightboxSwipeFollow(68, 0, null, 1)).toBe(
      "calc(68px + min(1, max(0, 1 * var(--lightbox-swipe-progress, 0))) * -68px)",
    );
  });

  it("mirrors the directions in a right-to-left layout", () => {
    expect(formatLightboxSwipeFollow(0, null, 68, -1)).toBe(
      "calc(0px + min(1, max(0, 1 * var(--lightbox-swipe-progress, 0))) * 68px)",
    );
  });
});
