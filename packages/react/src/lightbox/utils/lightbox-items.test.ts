import { describe, expect, it } from "vitest";
import {
  clampLightboxIndex,
  getLightboxAspectRatio,
  getLightboxNearestIndex,
  getLightboxSlideId,
} from "./lightbox-items";

describe("clampLightboxIndex", () => {
  it("keeps the index in the list", () => {
    expect(clampLightboxIndex(-1, 3)).toBe(0);
    expect(clampLightboxIndex(5, 3)).toBe(2);
    expect(clampLightboxIndex(1, 0)).toBe(0);
  });
});

describe("getLightboxAspectRatio", () => {
  const loaded = { width: 800, height: 600 };

  it.each([
    {
      name: "the given size over the loaded one",
      loaded,
      width: 9,
      height: 16,
      expected: 9 / 16,
    },
    {
      name: "the loaded size without a given one",
      loaded,
      width: undefined,
      height: undefined,
      expected: 800 / 600,
    },
    {
      name: "the loaded size with half a given one",
      loaded,
      width: 9,
      height: undefined,
      expected: 800 / 600,
    },
    {
      name: "the given size before it loads",
      loaded: undefined,
      width: 9,
      height: 16,
      expected: 9 / 16,
    },
    {
      name: "null without any size",
      loaded: undefined,
      width: undefined,
      height: undefined,
      expected: null,
    },
  ])("uses $name", ({ loaded: size, width, height, expected }) => {
    expect(getLightboxAspectRatio(size, width, height)).toBe(expected);
  });
});

describe("getLightboxNearestIndex", () => {
  const has = (indexes: number[]) => (index: number) => indexes.includes(index);

  it.each([
    { name: "the index itself", index: 2, matching: [0, 2, 4], expected: 2 },
    { name: "the nearest after", index: 2, matching: [3, 7], expected: 3 },
    { name: "the nearest before", index: 6, matching: [0, 3], expected: 3 },
    { name: "the earlier on a tie", index: 2, matching: [1, 3], expected: 1 },
    { name: "-1 when none matches", index: 1, matching: [], expected: -1 },
  ])("finds $name", ({ index, matching, expected }) => {
    expect(getLightboxNearestIndex(index, 8, has(matching))).toBe(expected);
  });

  it("only looks inside the list", () => {
    const matches = (index: number) => index < 0 || index >= 3;
    expect(getLightboxNearestIndex(1, 3, matches)).toBe(-1);
  });
});

describe("getLightboxSlideId", () => {
  it("builds a slide id from the root's", () => {
    expect(getLightboxSlideId("lb", 2)).toBe("lb-slide-2");
  });
});
