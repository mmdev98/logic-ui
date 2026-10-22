import { describe, expect, it } from "vitest";
import { drawCropperCanvas, getCropperCanvasSize } from "./cropper-canvas";

const CROP = { width: 800, height: 400 };

describe("getCropperCanvasSize", () => {
  it("is the crop's size by default", () => {
    expect(getCropperCanvasSize(CROP, {})).toEqual({ width: 800, height: 400 });
  });

  it("sets the width and follows the crop's ratio", () => {
    expect(getCropperCanvasSize(CROP, { width: 200 })).toEqual({
      width: 200,
      height: 100,
    });
  });

  it("keeps the largest size and area", () => {
    expect(getCropperCanvasSize(CROP, { maxHeight: 100 })).toEqual({
      width: 200,
      height: 100,
    });
    expect(getCropperCanvasSize(CROP, { maxArea: 20_000 })).toEqual({
      width: 200,
      height: 100,
    });
  });
});

describe("drawCropperCanvas", () => {
  it("returns null before the image is on screen", () => {
    expect(drawCropperCanvas(null, document.createElement("img"))).toBeNull();
  });
});

describe("getCropperCanvasSize rounding", () => {
  it("rounds a fractional crop to whole pixels, as getCoordinates() does", () => {
    expect(getCropperCanvasSize({ width: 853.6, height: 853.6 }, {})).toEqual({
      width: 854,
      height: 854,
    });
  });
});
