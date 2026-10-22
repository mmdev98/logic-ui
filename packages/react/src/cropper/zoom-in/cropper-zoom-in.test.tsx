import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CropperRootActions } from "..";
import {
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.ZoomIn", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("is disabled until the image is on screen", async () => {
    render(<TestCropper />);
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    expect(zoomIn).toHaveProperty("disabled", true);
    expect(zoomIn.hasAttribute("data-disabled")).toBe(true);
    await flushCropper();
    expect(zoomIn).toHaveProperty("disabled", false);
  });

  it("zooms in a step and enables zooming out", async () => {
    const actionsRef = React.createRef<CropperRootActions>();
    const onCoordinatesCommitted = vi.fn();
    render(
      <TestCropper
        actionsRef={actionsRef}
        onCoordinatesCommitted={onCoordinatesCommitted}
      />,
    );
    await flushCropper();
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    expect(zoomOut).toHaveProperty("disabled", true);
    const before = actionsRef.current!.getState()!.visibleArea!.width;

    act(() => screen.getByRole("button", { name: "Zoom in" }).click());

    expect(actionsRef.current!.getState()!.visibleArea!.width).toBeCloseTo(
      before / 1.25,
    );
    expect(zoomOut).toHaveProperty("disabled", false);
    expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: "zoom-in-press" }),
    );
  });

  it("is disabled at the closest view", async () => {
    const actionsRef = React.createRef<CropperRootActions>();
    render(<TestCropper actionsRef={actionsRef} />);
    await flushCropper();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    act(() => actionsRef.current?.setZoom(1));
    expect(zoomIn).toHaveProperty("disabled", true);
  });
});
