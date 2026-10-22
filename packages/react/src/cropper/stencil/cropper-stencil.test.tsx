import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cropper, type CropperRootActions } from "..";
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
    stencil: screen.getByRole("group", { name: "Crop area" }),
    onCoordinatesChange,
    onCoordinatesCommitted,
  };
}

describe("Cropper.Stencil", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("renders nothing until the image is on screen", async () => {
    render(<TestCropper />);
    expect(screen.queryByTestId("stencil")).toBeNull();
    await flushCropper();
    expect(screen.getByTestId("stencil")).toBeTruthy();
  });

  it("is a focusable group placed over the crop", async () => {
    const { stencil } = await setup();
    expect(stencil.tagName).toBe("DIV");
    expect(stencil.tabIndex).toBe(0);
    // The crop is 800 × 400 at (100, 50) on the image: 2.5 image px per px.
    expect(stencil.style.width).toBe("320px");
    expect(stencil.style.height).toBe("160px");
    expect(stencil.style.transform).toBe("translate3d(40px, 20px, 0px)");
    expect(stencil.hasAttribute("data-movable")).toBe(true);
  });

  it("moves the crop when dragged, and commits at the end", async () => {
    const { actions, stencil, onCoordinatesCommitted } = await setup();
    onCoordinatesCommitted.mockClear();

    act(() => {
      firePointer("pointerDown", stencil, 100, 50);
      firePointer("pointerMove", stencil, 120, 50);
    });
    expect(stencil.hasAttribute("data-moving")).toBe(true);
    expect(actions().getCoordinates()?.left).toBe(150);
    expect(onCoordinatesCommitted).not.toHaveBeenCalled();

    act(() => firePointer("pointerUp", stencil, 120, 50));
    expect(stencil.hasAttribute("data-moving")).toBe(false);
    expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
      { left: 150, top: 50, width: 800, height: 400 },
      expect.objectContaining({ reason: "stencil-drag" }),
    );
  });

  it("waits for a finger to travel before moving the crop", async () => {
    const { actions, stencil } = await setup();
    act(() => {
      firePointer("pointerDown", stencil, 100, 50, { pointerType: "touch" });
      firePointer("pointerMove", stencil, 110, 50, { pointerType: "touch" });
    });
    expect(actions().getCoordinates()?.left).toBe(100);
    act(() => {
      firePointer("pointerMove", stencil, 140, 50, { pointerType: "touch" });
      firePointer("pointerUp", stencil, 140, 50, { pointerType: "touch" });
    });
    expect(actions().getCoordinates()?.left).toBeGreaterThan(100);
  });

  it("moves the crop with the arrow keys, more with Shift", async () => {
    const { actions, stencil, onCoordinatesCommitted } = await setup();
    fireEvent.keyDown(stencil, { key: "ArrowRight" });
    expect(actions().getCoordinates()?.left).toBe(125);
    fireEvent.keyDown(stencil, { key: "ArrowLeft", shiftKey: true });
    expect(actions().getCoordinates()?.left).toBe(0);
    expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: "keyboard" }),
    );
  });

  it("zooms with + and -", async () => {
    const { actions, stencil } = await setup();
    const before = actions().getState()!.visibleArea!.width;
    fireEvent.keyDown(stencil, { key: "+" });
    expect(actions().getState()!.visibleArea!.width).toBeLessThan(before);
  });

  it("can't be moved with movable={false}: a drag moves the image", async () => {
    render(
      <Cropper.Root src="/photo.jpg">
        <Cropper.Viewport>
          <Cropper.Stencil movable={false} data-testid="stencil" />
        </Cropper.Viewport>
      </Cropper.Root>,
    );
    await flushCropper();
    const stencil = screen.getByTestId("stencil");
    expect(stencil.hasAttribute("data-movable")).toBe(false);
    act(() => drag(stencil, { x: 100, y: 50 }, { x: 150, y: 50 }));
    expect(stencil.style.transform).toBe("translate3d(40px, 20px, 0px)");
  });

  it("can't be moved with stencilSize", async () => {
    const { stencil } = await setup({
      stencilSize: { width: 100, height: 100 },
    });
    expect(stencil.hasAttribute("data-movable")).toBe(false);
    expect(stencil.style.width).toBe("100px");
  });

  it("isn't focusable when disabled", async () => {
    const { stencil } = await setup({ disabled: true });
    expect(stencil.tabIndex).toBe(-1);
    expect(stencil.hasAttribute("data-disabled")).toBe(true);
  });

  it("keeps the caller's handlers and label", async () => {
    const onKeyDown = vi.fn();
    render(
      <Cropper.Root src="/photo.jpg">
        <Cropper.Viewport>
          <Cropper.Stencil aria-label="Avatar crop" onKeyDown={onKeyDown} />
        </Cropper.Viewport>
      </Cropper.Root>,
    );
    await flushCropper();
    const stencil = screen.getByRole("group", { name: "Avatar crop" });
    fireEvent.keyDown(stencil, { key: "ArrowRight" });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("throws outside Cropper.Viewport", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <Cropper.Root>
          <Cropper.Stencil />
        </Cropper.Root>,
      ),
    ).toThrow("Base UI: CropperViewportContext is missing.");
  });
});
