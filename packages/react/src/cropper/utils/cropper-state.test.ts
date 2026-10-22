import { describe, expect, it } from "vitest";
import { IMAGE_SIZE, VIEWPORT_SIZE } from "../test-utils";
import type { CropperState } from "../types";
import { createCropperSettings } from "./cropper-settings";
import { isCropperStateConsistent } from "./cropper-restrictions";
import {
  createCropperState,
  moveCropperCoordinates,
  reconcileCropperState,
  resizeCropperCoordinatesInState,
  setCropperBoundary,
  setCropperCoordinates,
} from "./cropper-state";

function create(
  options: Parameters<typeof createCropperSettings>[0] = {},
): CropperState {
  return createCropperState(
    { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
    createCropperSettings(options),
  );
}

describe("createCropperState", () => {
  it("shows the whole image with a centered crop of 80%", () => {
    const state = create();
    expect(state.visibleArea).toEqual({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
    });
    expect(state.coordinates).toEqual({
      left: 100,
      top: 50,
      width: 800,
      height: 400,
    });
  });

  it("keeps the aspect ratio", () => {
    const state = create({ aspectRatio: 1 });
    expect(state.coordinates?.width).toBeCloseTo(400);
    expect(state.coordinates?.height).toBeCloseTo(400);
    expect(state.coordinates?.left).toBeCloseTo(300);
  });

  it("centers a default size without a position", () => {
    const state = create({ defaultCoordinates: { width: 200, height: 100 } });
    expect(state.coordinates).toEqual({
      left: 400,
      top: 200,
      width: 200,
      height: 100,
    });
  });

  it("starts from the default transforms", () => {
    const state = create({ defaultTransforms: { rotate: 90 } });
    expect(state.transforms.rotate).toBe(90);
  });

  it("starts from the default visible area", () => {
    const state = create({
      defaultVisibleArea: { left: 100, top: 50, width: 500, height: 250 },
    });
    expect(state.visibleArea).toEqual({
      left: 100,
      top: 50,
      width: 500,
      height: 250,
    });
    // The crop stays within it.
    expect(state.coordinates!.left).toBeGreaterThanOrEqual(100);
    expect(state.coordinates!.width).toBeLessThanOrEqual(500);
  });
});

describe("moveCropperCoordinates", () => {
  it("moves the crop and stops it at the image's edge", () => {
    const settings = createCropperSettings({});
    const state = create();
    const moved = moveCropperCoordinates(state, settings, { left: 50, top: 0 });
    expect(moved.coordinates?.left).toBe(150);
    const stopped = moveCropperCoordinates(state, settings, {
      left: 500,
      top: 500,
    });
    expect(stopped.coordinates).toMatchObject({ left: 200, top: 100 });
  });
});

describe("resizeCropperCoordinatesInState", () => {
  it("resizes from a handle and keeps the opposite side in place", () => {
    const settings = createCropperSettings({});
    const state = create();
    const resized = resizeCropperCoordinatesInState(
      state,
      settings,
      "right",
      { left: 50, top: 0 },
      {},
    );
    expect(resized.coordinates).toEqual({
      left: 100,
      top: 50,
      width: 850,
      height: 400,
    });
  });
});

describe("setCropperCoordinates", () => {
  it("applies a size and a position within the restrictions", () => {
    const settings = createCropperSettings({ maxWidth: 300 });
    const state = setCropperCoordinates(create(), settings, {
      left: 10,
      top: 20,
      width: 600,
      height: 100,
    });
    expect(state.coordinates).toEqual({
      left: 10,
      top: 20,
      width: 300,
      height: 100,
    });
  });
});

describe("reconcileCropperState", () => {
  it("fits the crop to a new aspect ratio around its center", () => {
    const state = create();
    const settings = createCropperSettings({ aspectRatio: 1 });
    expect(isCropperStateConsistent(state, settings)).toBe(false);
    const reconciled = reconcileCropperState(state, settings);
    expect(isCropperStateConsistent(reconciled, settings)).toBe(true);
    expect(reconciled.coordinates!.width).toBeCloseTo(
      reconciled.coordinates!.height,
    );
  });
});

describe("setCropperBoundary", () => {
  it("keeps the crop where it is on the image", () => {
    const settings = createCropperSettings({});
    const state = create();
    const resized = setCropperBoundary(state, settings, {
      width: 800,
      height: 400,
    });
    expect(resized.boundary).toEqual({ width: 800, height: 400 });
    expect(resized.coordinates).toEqual(state.coordinates);
  });
});
