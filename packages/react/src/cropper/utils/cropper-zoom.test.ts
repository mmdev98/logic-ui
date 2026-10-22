import { describe, expect, it } from "vitest";
import { IMAGE_SIZE, VIEWPORT_SIZE } from "../test-utils";
import { createCropperSettings } from "./cropper-settings";
import { createCropperState } from "./cropper-state";
import { applyCropperImageTransform } from "./cropper-transform";
import { getCropperZoom, getCropperZoomFactor } from "./cropper-zoom";

const settings = createCropperSettings({});
const state = createCropperState(
  { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
  settings,
);

describe("getCropperZoom", () => {
  it("is 0 at the widest view", () => {
    expect(getCropperZoom(state, settings)).toBe(0);
  });

  it("is 0 without an image", () => {
    expect(getCropperZoom(null, settings)).toBe(0);
  });

  it("grows when zooming in", () => {
    const zoomed = applyCropperImageTransform(state, settings, { scale: 2 });
    const zoom = getCropperZoom(zoomed, settings);
    expect(zoom).toBeGreaterThan(0);
    expect(zoom).toBeLessThanOrEqual(1);
  });
});

describe("getCropperZoomFactor", () => {
  it("brings the zoom to the requested value", () => {
    const factor = getCropperZoomFactor(state, settings, 0.5);
    expect(factor).toBeGreaterThan(1);
    const zoomed = applyCropperImageTransform(state, settings, {
      scale: factor,
    });
    expect(getCropperZoom(zoomed, settings)).toBeCloseTo(0.5, 2);
  });
});
