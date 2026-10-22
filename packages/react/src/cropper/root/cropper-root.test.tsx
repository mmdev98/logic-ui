import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Cropper,
  type CropperRootActions,
  type CropperRootChangeEventDetails,
} from "..";
import {
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.Root", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("renders a div that shows the image's status", async () => {
    render(<TestCropper />);
    const root = screen.getByTestId("root");
    expect(root.tagName).toBe("DIV");
    expect(root.hasAttribute("data-loading")).toBe(true);
    expect(root.hasAttribute("data-loaded")).toBe(false);

    await flushCropper();

    expect(root.hasAttribute("data-loaded")).toBe(true);
    expect(root.hasAttribute("data-loading")).toBe(false);
  });

  it("has no status attribute without a src", () => {
    render(<TestCropper src={null} />);
    const root = screen.getByTestId("root");
    expect(root.hasAttribute("data-loading")).toBe(false);
    expect(root.hasAttribute("data-loaded")).toBe(false);
  });

  it("shows a failed image with data-error and reports it", async () => {
    const onStatusChange = vi.fn();
    render(<TestCropper src="/broken.jpg" onStatusChange={onStatusChange} />);
    await flushCropper();
    expect(screen.getByTestId("root").hasAttribute("data-error")).toBe(true);
    expect(onStatusChange).toHaveBeenLastCalledWith("error");
    expect(screen.queryByTestId("stencil")).toBeNull();
  });

  it("reports the status as the image loads and shows", async () => {
    const onStatusChange = vi.fn();
    render(<TestCropper onStatusChange={onStatusChange} />);
    expect(onStatusChange).not.toHaveBeenCalled();
    await flushCropper();
    expect(onStatusChange).toHaveBeenLastCalledWith("loaded");
  });

  it("reports the first crop with the reason image-load", async () => {
    const onCoordinatesChange = vi.fn();
    render(<TestCropper onCoordinatesChange={onCoordinatesChange} />);
    expect(onCoordinatesChange).not.toHaveBeenCalled();
    await flushCropper();
    expect(onCoordinatesChange).toHaveBeenCalledWith(
      { left: 100, top: 50, width: 800, height: 400 },
      expect.objectContaining({ reason: "image-load" }),
    );
  });

  it("sets the CSS variables of the image and crop ratios", async () => {
    render(<TestCropper aspectRatio={1} transitionDuration={200} />);
    const root = screen.getByTestId("root");
    expect(root.style.getPropertyValue("--cropper-transition-duration")).toBe(
      "200ms",
    );
    await flushCropper();
    expect(root.style.getPropertyValue("--cropper-image-aspect-ratio")).toBe(
      "2",
    );
    expect(root.style.getPropertyValue("--cropper-aspect-ratio")).toBe("1");
  });

  it("fits the crop to a new aspect ratio", async () => {
    const onCoordinatesChange = vi.fn();
    const { rerender } = render(
      <TestCropper onCoordinatesChange={onCoordinatesChange} />,
    );
    await flushCropper();
    rerender(
      <TestCropper aspectRatio={1} onCoordinatesChange={onCoordinatesChange} />,
    );
    await flushCropper();
    const [coordinates, details] = onCoordinatesChange.mock.lastCall as [
      { width: number; height: number },
      CropperRootChangeEventDetails,
    ];
    expect(coordinates.width).toBe(coordinates.height);
    expect(details.reason).toBe("settings-change");
  });

  it("starts from defaultCoordinates", async () => {
    const actionsRef = React.createRef<CropperRootActions>();
    render(
      <TestCropper
        actionsRef={actionsRef}
        defaultCoordinates={{ left: 0, top: 0, width: 200, height: 100 }}
      />,
    );
    await flushCropper();
    expect(actionsRef.current?.getCoordinates()).toEqual({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
    });
  });

  it("keeps the crop within minWidth and maxWidth", async () => {
    const actionsRef = React.createRef<CropperRootActions>();
    render(<TestCropper actionsRef={actionsRef} maxWidth={300} />);
    await flushCropper();
    expect(actionsRef.current?.getCoordinates()?.width).toBe(300);
  });

  describe("actionsRef", () => {
    it("changes the crop and reports it as imperative-action", async () => {
      const actionsRef = React.createRef<CropperRootActions>();
      const onCoordinatesCommitted = vi.fn();
      render(
        <TestCropper
          actionsRef={actionsRef}
          onCoordinatesCommitted={onCoordinatesCommitted}
        />,
      );
      await flushCropper();

      act(() =>
        actionsRef.current?.setCoordinates({ width: 400, height: 200 }),
      );
      await flushCropper();

      // A size alone stays centered.
      expect(actionsRef.current?.getCoordinates()).toEqual({
        left: 300,
        top: 150,
        width: 400,
        height: 200,
      });
      expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
        { left: 300, top: 150, width: 400, height: 200 },
        expect.objectContaining({ reason: "imperative-action" }),
      );
    });

    it("rotates, flips and resets", async () => {
      const actionsRef = React.createRef<CropperRootActions>();
      render(<TestCropper actionsRef={actionsRef} />);
      await flushCropper();

      act(() => actionsRef.current?.rotate(90));
      expect(actionsRef.current?.getState()?.transforms.rotate).toBe(90);
      act(() => actionsRef.current?.flip(true));
      expect(actionsRef.current?.getState()?.transforms.flip.vertical).toBe(
        true,
      );

      act(() => actionsRef.current?.reset());
      expect(actionsRef.current?.getState()?.transforms).toEqual({
        rotate: 0,
        flip: { horizontal: false, vertical: false },
      });
    });

    it("zooms to a value from 0 to 1", async () => {
      const actionsRef = React.createRef<CropperRootActions>();
      render(<TestCropper actionsRef={actionsRef} />);
      await flushCropper();
      const before = actionsRef.current!.getState()!.visibleArea!.width;
      act(() => actionsRef.current?.setZoom(0.5));
      expect(actionsRef.current!.getState()!.visibleArea!.width).toBeLessThan(
        before,
      );
    });

    it("draws nothing before the image is on screen", () => {
      const actionsRef = React.createRef<CropperRootActions>();
      render(<TestCropper actionsRef={actionsRef} />);
      expect(actionsRef.current?.getCanvas()).toBeNull();
    });
  });

  it("throws when a part is outside Cropper.Root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Cropper.Viewport />)).toThrow(
      "Base UI: CropperRootContext is missing.",
    );
  });

  it("takes a render prop", async () => {
    render(
      <Cropper.Root src="/photo.jpg" render={<section data-testid="section" />}>
        <Cropper.Viewport />
      </Cropper.Root>,
    );
    expect(screen.getByTestId("section").tagName).toBe("SECTION");
  });
});
