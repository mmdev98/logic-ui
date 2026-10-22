import { describe, expect, it } from "vitest";
import {
  applyCropperScale,
  approximateCropperSize,
  createCropperAspectRatio,
  getCropperBrokenRatio,
  getCropperIntersections,
  getCropperScaleToSizeRestrictions,
  mergeCropperPositionRestrictions,
  mergeCropperSizeRestrictions,
  moveCropperToPositionRestrictions,
  rotateCropperPoint,
  rotateCropperSize,
} from "./cropper-geometry";

const FREE = {
  minWidth: 0,
  minHeight: 0,
  maxWidth: Infinity,
  maxHeight: Infinity,
};

describe("createCropperAspectRatio", () => {
  it.each([
    [1.5, { minimum: 1.5, maximum: 1.5 }],
    [undefined, { minimum: 0, maximum: Infinity }],
    [{ minimum: 1 }, { minimum: 1, maximum: Infinity }],
    [{ maximum: 2 }, { minimum: 0, maximum: 2 }],
  ])("normalizes %j", (input, expected) => {
    expect(createCropperAspectRatio(input)).toEqual(expected);
  });
});

describe("getCropperBrokenRatio", () => {
  it("returns the bound a ratio breaks", () => {
    const range = { minimum: 1, maximum: 2 };
    expect(getCropperBrokenRatio(0.5, range)).toBe(1);
    expect(getCropperBrokenRatio(3, range)).toBe(2);
    expect(getCropperBrokenRatio(1.5, range)).toBeUndefined();
  });
});

describe("approximateCropperSize", () => {
  it("keeps a size that breaks nothing", () => {
    expect(approximateCropperSize({ width: 300, height: 200 })).toEqual({
      width: 300,
      height: 200,
    });
  });

  it("fixes the aspect ratio with the closest size", () => {
    const size = approximateCropperSize({
      width: 300,
      height: 200,
      aspectRatio: { minimum: 1, maximum: 1 },
    });
    expect(size.width).toBe(size.height);
    expect([200, 300]).toContain(size.width);
  });

  it("keeps the size restrictions and the ratio together", () => {
    const size = approximateCropperSize({
      width: 1000,
      height: 1000,
      aspectRatio: { minimum: 2, maximum: 2 },
      sizeRestrictions: { ...FREE, maxWidth: 400 },
    });
    expect(size).toEqual({ width: 400, height: 200 });
  });

  it("grows a size up to the minimum", () => {
    const size = approximateCropperSize({
      width: 10,
      height: 10,
      sizeRestrictions: { ...FREE, minWidth: 50, minHeight: 50 },
    });
    expect(size).toEqual({ width: 50, height: 50 });
  });
});

describe("getCropperScaleToSizeRestrictions", () => {
  it("scales down to the maximum and up to the minimum", () => {
    expect(
      getCropperScaleToSizeRestrictions(
        { width: 200, height: 100 },
        { ...FREE, maxWidth: 100 },
      ),
    ).toBe(0.5);
    expect(
      getCropperScaleToSizeRestrictions(
        { width: 20, height: 10 },
        { ...FREE, minHeight: 20 },
      ),
    ).toBe(2);
  });
});

describe("position restrictions", () => {
  it("merges to the tighter limit on each side", () => {
    expect(
      mergeCropperPositionRestrictions(
        { left: 0, right: 100 },
        { left: 10, right: 200, top: 5 },
      ),
    ).toEqual({ left: 10, right: 100, top: 5 });
  });

  it("measures how far a rectangle crosses the limits", () => {
    expect(
      getCropperIntersections(
        { left: -10, top: 0, width: 50, height: 120 },
        { left: 0, top: 0, right: 100, bottom: 100 },
      ),
    ).toEqual({ left: 10, top: 0, right: 0, bottom: 20 });
  });

  it("moves a rectangle back within the limits", () => {
    expect(
      moveCropperToPositionRestrictions(
        { left: 90, top: -5, width: 20, height: 20 },
        { left: 0, top: 0, right: 100, bottom: 100 },
      ),
    ).toEqual({ left: 80, top: 0, width: 20, height: 20 });
  });
});

describe("mergeCropperSizeRestrictions", () => {
  it("lowers a minimum above its maximum", () => {
    expect(
      mergeCropperSizeRestrictions(
        { ...FREE, minWidth: 300 },
        { maxWidth: 200 },
      ),
    ).toMatchObject({ minWidth: 200, maxWidth: 200 });
  });
});

describe("rotation", () => {
  it("swaps the sides of a size turned a quarter", () => {
    const size = rotateCropperSize({ width: 200, height: 100 }, 90);
    expect(size.width).toBeCloseTo(100);
    expect(size.height).toBeCloseTo(200);
  });

  it("turns a point around an anchor", () => {
    const point = rotateCropperPoint({ left: 10, top: 0 }, 90, {
      left: 0,
      top: 0,
    });
    expect(point.left).toBeCloseTo(0);
    expect(point.top).toBeCloseTo(10);
  });
});

describe("applyCropperScale", () => {
  it("scales around the center, or around a point", () => {
    const box = { left: 0, top: 0, width: 100, height: 100 };
    expect(applyCropperScale(box, 0.5)).toEqual({
      left: 25,
      top: 25,
      width: 50,
      height: 50,
    });
    expect(applyCropperScale(box, 0.5, { left: 0, top: 0 })).toEqual({
      left: 0,
      top: 0,
      width: 50,
      height: 50,
    });
  });
});
