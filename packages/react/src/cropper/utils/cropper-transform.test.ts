import { describe, expect, it } from "vitest";
import { IMAGE_SIZE, VIEWPORT_SIZE } from "../test-utils";
import { createCropperSettings } from "./cropper-settings";
import { getCropperTransformedImageSize } from "./cropper-restrictions";
import { createCropperState } from "./cropper-state";
import {
  applyCropperImageTransform,
  getCropperPointersTransform,
  getCropperWheelTransform,
  normalizeCropperFlip,
  normalizeCropperImageTransform,
} from "./cropper-transform";

const settings = createCropperSettings({});
const state = createCropperState(
  { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
  settings,
);

describe("applyCropperImageTransform", () => {
  it("zooms in by narrowing the visible area, the crop with it", () => {
    const result = applyCropperImageTransform(state, settings, { scale: 2 });
    expect(result.visibleArea!.width).toBeCloseTo(500);
    expect(result.coordinates!.width).toBeLessThan(state.coordinates!.width);
  });

  it("can't zoom out past the image with `fit-area`", () => {
    const result = applyCropperImageTransform(state, settings, { scale: 0.5 });
    expect(result.visibleArea).toEqual(state.visibleArea);
  });

  it("turns the image and keeps the crop on it", () => {
    const result = applyCropperImageTransform(state, settings, { rotate: 90 });
    expect(result.transforms.rotate).toBe(90);
    const size = getCropperTransformedImageSize(result);
    expect(size.width).toBeCloseTo(500);
    expect(
      result.coordinates!.left + result.coordinates!.width,
    ).toBeLessThanOrEqual(size.width + 1e-6);
  });

  it("mirrors the image and the crop on it", () => {
    const moved = {
      ...state,
      coordinates: { left: 0, top: 50, width: 200, height: 100 },
    };
    const result = applyCropperImageTransform(moved, settings, {
      flip: { horizontal: true },
    });
    expect(result.transforms.flip.horizontal).toBe(true);
    expect(result.coordinates!.left).toBeCloseTo(800);
  });
});

describe("normalizeCropperImageTransform", () => {
  it("turns screen pixels into image pixels", () => {
    const transform = normalizeCropperImageTransform(state, {
      move: { left: 10 },
      scale: { factor: 2, center: { left: 200, top: 100 } },
    });
    expect(transform.move).toEqual({ left: 25, top: 0 });
    expect(transform.scale).toEqual({
      factor: 2,
      center: { left: 500, top: 250 },
    });
  });
});

describe("normalizeCropperFlip", () => {
  it("swaps the axes when the image is turned sideways", () => {
    const turned = {
      ...state,
      transforms: { ...state.transforms, rotate: 90 },
    };
    expect(normalizeCropperFlip(turned, true, false)).toEqual({
      horizontal: false,
      vertical: true,
    });
    expect(normalizeCropperFlip(state, true, false)).toEqual({
      horizontal: true,
      vertical: false,
    });
  });
});

describe("getCropperPointersTransform", () => {
  const origin = { left: 0, top: 0 };
  const all = { move: true, scale: true, rotate: true };

  it("drags the image with one pointer", () => {
    expect(
      getCropperPointersTransform(
        [{ clientX: 10, clientY: 20 }],
        [{ clientX: 0, clientY: 0 }],
        origin,
        all,
      ),
    ).toEqual({ move: { left: -10, top: -20 } });
  });

  it("zooms with two pointers moving apart", () => {
    const transform = getCropperPointersTransform(
      [
        { clientX: 0, clientY: 0 },
        { clientX: 200, clientY: 0 },
      ],
      [
        { clientX: 50, clientY: 0 },
        { clientX: 150, clientY: 0 },
      ],
      origin,
      { move: false, scale: true, rotate: false },
    );
    expect(transform.scale).toEqual({
      factor: 2,
      center: { left: 100, top: 0 },
    });
  });
});

describe("getCropperWheelTransform", () => {
  it("zooms in a step when scrolling up", () => {
    const transform = getCropperWheelTransform(
      { deltaY: -100, ctrlKey: false },
      { left: 5, top: 5 },
      0.1,
    );
    expect(transform.scale).toEqual({
      factor: 1.1,
      center: { left: 5, top: 5 },
    });
  });

  it("follows the size of a trackpad pinch", () => {
    const transform = getCropperWheelTransform(
      { deltaY: -10, ctrlKey: true },
      { left: 0, top: 0 },
      0.1,
    );
    expect(transform.scale).toMatchObject({ factor: Math.exp(0.1) });
  });
});
