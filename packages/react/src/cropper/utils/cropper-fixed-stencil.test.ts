import { describe, expect, it } from "vitest";
import { IMAGE_SIZE, VIEWPORT_SIZE } from "../test-utils";
import { getCropperFixedStencilSize } from "./cropper-fixed-stencil";
import { getCropperStencilCoordinates } from "./cropper-restrictions";
import { createCropperSettings } from "./cropper-settings";
import { createCropperState } from "./cropper-state";
import { applyCropperImageTransform } from "./cropper-transform";

const FREE = { minimum: 0, maximum: Infinity };

describe("getCropperFixedStencilSize", () => {
  it("fits the requested size in the viewport, at its ratio", () => {
    const state = createCropperState(
      { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
      createCropperSettings({}),
    );
    expect(
      getCropperFixedStencilSize(
        state,
        () => ({ width: 800, height: 200 }),
        FREE,
      ),
    ).toEqual({ width: 400, height: 100 });
  });

  it("keeps within the aspect ratio", () => {
    const state = createCropperState(
      { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
      createCropperSettings({}),
    );
    const size = getCropperFixedStencilSize(
      state,
      () => ({ width: 100, height: 100 }),
      { minimum: 2, maximum: 2 },
    );
    expect(size.width / size.height).toBeCloseTo(2);
  });
});

describe("stencilSize", () => {
  const settings = createCropperSettings({
    stencilSize: { width: 100, height: 100 },
  });

  it("shows the crop at the stencil size, centered", () => {
    const state = settings.postProcess(
      createCropperState(
        { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
        settings,
      ),
      {
        name: "createState",
        immediately: true,
        transitions: false,
        interaction: false,
      },
    );
    const stencil = getCropperStencilCoordinates(state);
    expect(stencil.width).toBeCloseTo(100);
    expect(stencil.height).toBeCloseTo(100);
    expect(stencil.left + stencil.width / 2).toBeCloseTo(
      VIEWPORT_SIZE.width / 2,
    );
  });

  it("keeps the stencil size when zooming", () => {
    const state = settings.postProcess(
      createCropperState(
        { boundary: VIEWPORT_SIZE, imageSize: IMAGE_SIZE },
        settings,
      ),
      {
        name: "createState",
        immediately: true,
        transitions: false,
        interaction: false,
      },
    );
    const zoomed = settings.postProcess(
      applyCropperImageTransform(state, settings, { scale: 1.5 }),
      {
        name: "transformImageEnd",
        immediately: true,
        transitions: false,
        interaction: false,
      },
    );
    expect(getCropperStencilCoordinates(zoomed).width).toBeCloseTo(100);
    expect(zoomed.coordinates!.width).toBeLessThan(state.coordinates!.width);
  });
});
