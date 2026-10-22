import { describe, expect, it } from "vitest";
import {
  getCropperAllowedDirections,
  getCropperHandleDirections,
  resizeCropperCoordinatesByHandle,
} from "./cropper-resize";

const LIMITATIONS = {
  aspectRatio: { minimum: 0, maximum: Infinity },
  sizeRestrictions: {
    minWidth: 10,
    minHeight: 10,
    maxWidth: Infinity,
    maxHeight: Infinity,
  },
  positionRestrictions: { left: 0, top: 0, right: 500, bottom: 500 },
};
const CROP = { left: 100, top: 100, width: 200, height: 100 };

describe("getCropperHandleDirections", () => {
  it.each([
    ["right", { left: 10, top: 10 }, { left: 0, right: 10, top: 0, bottom: 0 }],
    ["left", { left: -10, top: 10 }, { left: 10, right: 0, top: 0, bottom: 0 }],
    ["top", { left: 10, top: -10 }, { left: 0, right: 0, top: 10, bottom: 0 }],
    [
      "bottom-right",
      { left: 5, top: 5 },
      { left: 0, right: 5, top: 0, bottom: 5 },
    ],
  ] as const)(
    "turns a move of the %s handle into edge moves",
    (position, move, expected) => {
      expect(getCropperHandleDirections(position, move)).toEqual(expected);
    },
  );

  it("lets a corner move its two edges only", () => {
    expect(getCropperAllowedDirections("top-left")).toEqual({
      left: true,
      top: true,
      right: false,
      bottom: false,
    });
  });
});

describe("resizeCropperCoordinatesByHandle", () => {
  it("grows the crop from an edge", () => {
    expect(
      resizeCropperCoordinatesByHandle(
        CROP,
        "right",
        { left: 50, top: 0 },
        {},
        LIMITATIONS,
      ),
    ).toEqual({ left: 100, top: 100, width: 250, height: 100 });
  });

  it("stops at the limits", () => {
    expect(
      resizeCropperCoordinatesByHandle(
        CROP,
        "right",
        { left: 500, top: 0 },
        {},
        LIMITATIONS,
      ),
    ).toEqual({ left: 100, top: 100, width: 400, height: 100 });
  });

  it("keeps the minimum size", () => {
    const result = resizeCropperCoordinatesByHandle(
      CROP,
      "bottom",
      { left: 0, top: -500 },
      {},
      LIMITATIONS,
    );
    expect(result.height).toBe(10);
  });

  it("keeps the aspect ratio", () => {
    const result = resizeCropperCoordinatesByHandle(
      CROP,
      "right",
      { left: 100, top: 0 },
      {},
      { ...LIMITATIONS, aspectRatio: { minimum: 2, maximum: 2 } },
    );
    expect(result.width / result.height).toBeCloseTo(2);
    expect(result.width).toBeCloseTo(300);
  });

  it("keeps the current ratio with `preserveAspectRatio`", () => {
    const result = resizeCropperCoordinatesByHandle(
      CROP,
      "bottom-right",
      { left: 100, top: 0 },
      { preserveAspectRatio: true },
      LIMITATIONS,
    );
    expect(result.width / result.height).toBeCloseTo(2);
  });
});
