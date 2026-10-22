import { describe, expect, it } from "vitest";
import { IMAGE_SIZE, VIEWPORT_SIZE } from "../test-utils";
import {
  getCropperBackgroundStyle,
  getCropperPreviewStyle,
} from "./cropper-image-style";
import { createCropperSettings } from "./cropper-settings";
import { createCropperState } from "./cropper-state";

const state = createCropperState(
  { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
  createCropperSettings({}),
);

describe("getCropperBackgroundStyle", () => {
  it("lays the image out at most 512 px wide and scales it to the view", () => {
    const style = getCropperBackgroundStyle(IMAGE_SIZE, state);
    expect(style).toMatchObject({ width: 512, height: 256, maxWidth: "none" });
    // 1000 image px over 400 screen px, laid out at 512 px.
    expect(style?.transform).toContain(`scaleX(${(1 / 2.5) * (1000 / 512)})`);
  });

  it("mirrors the image", () => {
    const flipped = {
      ...state,
      transforms: { rotate: 0, flip: { horizontal: true, vertical: false } },
    };
    expect(getCropperBackgroundStyle(IMAGE_SIZE, flipped)?.transform).toMatch(
      /scaleX\(-/,
    );
  });

  it("is null before the image is on screen", () => {
    expect(getCropperBackgroundStyle(IMAGE_SIZE, null)).toBeNull();
  });
});

describe("getCropperPreviewStyle", () => {
  it("is null for a box without size", () => {
    expect(
      getCropperPreviewStyle(IMAGE_SIZE, state, { width: 0, height: 0 }),
    ).toBeNull();
  });

  it("scales the crop to the box", () => {
    // The crop is 800 × 400: 4 image px per px of a 200 × 100 box.
    const style = getCropperPreviewStyle(IMAGE_SIZE, state, {
      width: 200,
      height: 100,
    });
    expect(style?.transform).toContain(`scaleX(${(1 / 4) * (1000 / 512)})`);
  });
});
