import { describe, expect, it } from "vitest";
import { clampLightboxIndex, getLightboxSlideId } from "./lightbox-items";

describe("clampLightboxIndex", () => {
  it("keeps the index in the list", () => {
    expect(clampLightboxIndex(-1, 3)).toBe(0);
    expect(clampLightboxIndex(5, 3)).toBe(2);
    expect(clampLightboxIndex(1, 0)).toBe(0);
  });
});

describe("getLightboxSlideId", () => {
  it("builds a slide id from the root's", () => {
    expect(getLightboxSlideId("lb", 2)).toBe("lb-slide-2");
  });
});
