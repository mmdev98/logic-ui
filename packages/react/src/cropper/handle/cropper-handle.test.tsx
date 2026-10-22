import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  const onCoordinatesCommitted = vi.fn();
  render(
    <TestCropper
      actionsRef={actionsRef}
      onCoordinatesCommitted={onCoordinatesCommitted}
      {...props}
    />,
  );
  await flushCropper();
  return { actions: () => actionsRef.current!, onCoordinatesCommitted };
}

describe("Cropper.Handle", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("renders a focusable button labelled by its position", async () => {
    await setup();
    const handle = screen.getByRole("button", { name: "Resize top left" });
    expect(handle.tagName).toBe("DIV");
    expect(handle.tabIndex).toBe(0);
    expect(handle.getAttribute("data-position")).toBe("top-left");
  });

  it("resizes the crop from its edge when dragged", async () => {
    const { actions, onCoordinatesCommitted } = await setup();
    const handle = screen.getByRole("button", { name: "Resize right" });

    act(() => {
      firePointer("pointerDown", handle, 360, 100);
      firePointer("pointerMove", handle, 340, 100);
    });
    expect(handle.hasAttribute("data-resizing")).toBe(true);
    expect(screen.getByTestId("stencil").hasAttribute("data-resizing")).toBe(
      true,
    );
    // 20 px on screen, 50 image px.
    expect(actions().getCoordinates()).toEqual({
      left: 100,
      top: 50,
      width: 750,
      height: 400,
    });

    act(() => firePointer("pointerUp", handle, 340, 100));
    expect(handle.hasAttribute("data-resizing")).toBe(false);
    expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: "handle-drag" }),
    );
  });

  it("keeps the aspect ratio while Shift is held", async () => {
    const { actions } = await setup();
    const handle = screen.getByRole("button", { name: "Resize bottom right" });
    act(() =>
      drag(handle, { x: 360, y: 180 }, { x: 320, y: 140 }, { shiftKey: true }),
    );
    const coordinates = actions().getCoordinates()!;
    expect(coordinates.width / coordinates.height).toBeCloseTo(2, 1);
    expect(coordinates.width).toBeLessThan(800);
  });

  it("resizes with the arrow keys", async () => {
    const { actions } = await setup();
    const handle = screen.getByRole("button", { name: "Resize left" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(actions().getCoordinates()).toEqual({
      left: 125,
      top: 50,
      width: 775,
      height: 400,
    });
    // An edge ignores the keys of the other axis.
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(actions().getCoordinates()?.height).toBe(400);
  });

  it("is disabled with stencilSize", async () => {
    const { actions } = await setup({
      stencilSize: { width: 100, height: 100 },
    });
    const handle = screen.getByRole("button", { name: "Resize right" });
    expect(handle.hasAttribute("data-disabled")).toBe(true);
    expect(handle.getAttribute("aria-disabled")).toBe("true");
    const before = actions().getCoordinates();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(actions().getCoordinates()).toEqual(before);
  });
});
