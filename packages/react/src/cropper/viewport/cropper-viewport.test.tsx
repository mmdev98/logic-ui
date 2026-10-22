import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CropperRootActions } from "..";
import {
  drag,
  firePointer,
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

async function setup(props: React.ComponentProps<typeof TestCropper> = {}) {
  const actionsRef = React.createRef<CropperRootActions>();
  const onCoordinatesChange = vi.fn();
  const onCoordinatesCommitted = vi.fn();
  render(
    <TestCropper
      actionsRef={actionsRef}
      onCoordinatesChange={onCoordinatesChange}
      onCoordinatesCommitted={onCoordinatesCommitted}
      {...props}
    />,
  );
  await flushCropper();
  return {
    actions: () => actionsRef.current!,
    viewport: screen.getByTestId("viewport"),
    onCoordinatesChange,
    onCoordinatesCommitted,
  };
}

describe("Cropper.Viewport", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a div that clips the image and handles touch itself", async () => {
    const { viewport } = await setup();
    expect(viewport.tagName).toBe("DIV");
    expect(viewport.style.overflow).toBe("hidden");
    expect(viewport.style.touchAction).toBe("none");
    expect(viewport.hasAttribute("data-loaded")).toBe(true);
  });

  it("keeps the crop and the fitted image out of its padding", async () => {
    const { actions } = await setup({
      viewportProps: { style: { padding: "10px 20px 30px" } },
    });
    // 400 × 200 minus the padding: 360 × 160.
    expect(actions().getState()?.boundary).toEqual({ width: 360, height: 160 });
    const stencil = screen.getByTestId("stencil");
    expect(stencil.style.left).toBe("20px");
    expect(stencil.style.top).toBe("10px");
    expect(screen.getByTestId("image").style.left).toBe("20px");
  });

  it("waits for a size before showing the crop", async () => {
    mockCropperEnvironment(undefined, { width: 0, height: 0 });
    render(<TestCropper />);
    await flushCropper();
    expect(screen.getByTestId("root").hasAttribute("data-loading")).toBe(true);
    expect(screen.queryByTestId("stencil")).toBeNull();
  });

  it("zooms in with the wheel, and commits after the wheel stops", async () => {
    vi.useFakeTimers();
    const { actions, viewport, onCoordinatesCommitted } = await setup();
    const before = actions().getState()!.visibleArea!.width;
    onCoordinatesCommitted.mockClear();

    act(() => {
      fireEvent.wheel(viewport, { deltaY: -100, clientX: 200, clientY: 100 });
    });
    expect(actions().getState()!.visibleArea!.width).toBeLessThan(before);
    expect(screen.getByTestId("root").hasAttribute("data-interacting")).toBe(
      true,
    );
    expect(onCoordinatesCommitted).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("root").hasAttribute("data-interacting")).toBe(
      false,
    );
    expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: "wheel" }),
    );
  });

  it("ignores the wheel with zoomOnWheel={false}", async () => {
    const { actions, viewport } = await setup({
      viewportProps: { zoomOnWheel: false },
    });
    const before = actions().getState();
    act(() => {
      fireEvent.wheel(viewport, { deltaY: -100 });
    });
    expect(actions().getState()).toEqual(before);
  });

  it("moves the image when it is dragged", async () => {
    const { actions, viewport, onCoordinatesChange } = await setup();
    act(() => actions().zoom(2));
    // Let the zoom's transition end before dragging.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    const before = actions().getState()!.visibleArea!.left;

    act(() => drag(viewport, { x: 10, y: 10 }, { x: 30, y: 10 }));

    expect(actions().getState()!.visibleArea!.left).toBeLessThan(before);
    expect(onCoordinatesChange).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: "image-drag" }),
    );
  });

  it("doesn't move the image with panOnDrag={false}", async () => {
    const { actions, viewport } = await setup({
      viewportProps: { panOnDrag: false },
    });
    act(() => actions().zoom(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    const before = actions().getState();
    act(() => drag(viewport, { x: 10, y: 10 }, { x: 30, y: 10 }));
    expect(actions().getState()).toEqual(before);
  });

  it("pinches with two fingers to zoom", async () => {
    const { actions, viewport } = await setup();
    const before = actions().getState()!.visibleArea!.width;
    act(() => {
      firePointer("pointerDown", viewport, 150, 100, {
        pointerType: "touch",
        pointerId: 1,
      });
      firePointer("pointerDown", viewport, 250, 100, {
        pointerType: "touch",
        pointerId: 2,
      });
      firePointer("pointerMove", viewport, 100, 100, {
        pointerType: "touch",
        pointerId: 1,
      });
      firePointer("pointerMove", viewport, 300, 100, {
        pointerType: "touch",
        pointerId: 2,
      });
      firePointer("pointerUp", viewport, 100, 100, {
        pointerType: "touch",
        pointerId: 1,
      });
      firePointer("pointerUp", viewport, 300, 100, {
        pointerType: "touch",
        pointerId: 2,
      });
    });
    expect(actions().getState()!.visibleArea!.width).toBeLessThan(before);
  });

  it("ignores presses when the root is disabled", async () => {
    const { actions, viewport } = await setup({ disabled: true });
    expect(viewport.hasAttribute("data-disabled")).toBe(true);
    const before = actions().getState();
    act(() => {
      fireEvent.wheel(viewport, { deltaY: -100 });
      drag(screen.getByTestId("stencil"), { x: 100, y: 50 }, { x: 150, y: 50 });
    });
    expect(actions().getState()).toEqual(before);
  });

  it("keeps the caller's handlers", async () => {
    const onPointerDown = vi.fn();
    const { viewport } = await setup({ viewportProps: { onPointerDown } });
    firePointer("pointerDown", viewport, 10, 10);
    expect(onPointerDown).toHaveBeenCalled();
  });
});
