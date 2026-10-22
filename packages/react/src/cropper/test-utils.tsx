import { act, fireEvent } from "@testing-library/react";
import * as React from "react";
import { vi } from "vitest";
import {
  Cropper,
  type CropperHandlePosition,
  type CropperRootProps,
  type CropperSize,
  type CropperViewportProps,
} from ".";
import { createCropperSettings } from "./utils/cropper-settings";
import type { CropperSettingsOptions } from "./utils/cropper-settings";

/** Natural size of the test image: 2:1. */
export const IMAGE_SIZE: CropperSize = { width: 1000, height: 500 };

/** Size of `Cropper.Viewport` in the tests: 2:1, 2.5 image pixels per screen pixel. */
export const VIEWPORT_SIZE: CropperSize = { width: 400, height: 200 };

export const HANDLE_POSITIONS: CropperHandlePosition[] = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
];

/**
 * jsdom loads no image and lays nothing out. Images get `IMAGE_SIZE` and
 * fire `load` once their `src` is set (`error` for a `src` with "broken"),
 * and every element measures `VIEWPORT_SIZE`. Call in `beforeEach`.
 */
export function mockCropperEnvironment(
  imageSize: CropperSize = IMAGE_SIZE,
  viewportSize: CropperSize = VIEWPORT_SIZE,
): void {
  vi.restoreAllMocks();
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
    imageSize.width,
  );
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(
    imageSize.height,
  );
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  );
  vi.spyOn(HTMLImageElement.prototype, "src", "set").mockImplementation(
    function (this: HTMLImageElement, value: string) {
      descriptor?.set?.call(this, value);
      queueMicrotask(() => {
        this.dispatchEvent(
          new Event(value.includes("broken") ? "error" : "load"),
        );
      });
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
    viewportSize.width,
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
    viewportSize.height,
  );
}

/** Lets the image load and the cropper show it. */
export async function flushCropper(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

export type TestCropperProps = Partial<CropperRootProps> & {
  viewportProps?: Partial<CropperViewportProps> | undefined;
  children?: React.ReactNode;
};

/** A cropper with every part. */
export function TestCropper(props: TestCropperProps): React.ReactElement {
  const { viewportProps, children, ...rootProps } = props;
  return (
    <Cropper.Root src="/photo.jpg" data-testid="root" {...rootProps}>
      <Cropper.Viewport data-testid="viewport" {...viewportProps}>
        <Cropper.Image data-testid="image" />
        <Cropper.Stencil data-testid="stencil">
          <Cropper.Grid data-testid="grid" />
          {HANDLE_POSITIONS.map((position) => (
            <Cropper.Handle key={position} position={position} />
          ))}
        </Cropper.Stencil>
      </Cropper.Viewport>
      <Cropper.Preview data-testid="preview" />
      <Cropper.ZoomIn />
      <Cropper.ZoomOut />
      <Cropper.Rotate />
      <Cropper.Flip />
      <Cropper.Reset />
      {children}
    </Cropper.Root>
  );
}

/** Fires a pointer event with a position, by default from a mouse. */
export function firePointer(
  type: "pointerDown" | "pointerMove" | "pointerUp",
  element: Element,
  x: number,
  y: number,
  options: {
    pointerType?: string;
    pointerId?: number;
    shiftKey?: boolean;
  } = {},
): void {
  const { pointerType = "mouse", pointerId = 1, shiftKey = false } = options;
  fireEvent[type](element, {
    pointerId,
    pointerType,
    button: 0,
    clientX: x,
    clientY: y,
    shiftKey,
  });
}

/** Drags from one point to another in a few moves. */
export function drag(
  element: Element,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: { pointerType?: string; shiftKey?: boolean } = {},
): void {
  firePointer("pointerDown", element, from.x, from.y, options);
  const steps = 4;
  for (let step = 1; step <= steps; step += 1) {
    firePointer(
      "pointerMove",
      element,
      from.x + ((to.x - from.x) * step) / steps,
      from.y + ((to.y - from.y) * step) / steps,
      options,
    );
  }
  firePointer("pointerUp", element, to.x, to.y, options);
}

/** Settings as `Cropper.Root` builds them, for the tests of the algorithms. */
export function createTestSettings(
  options: CropperSettingsOptions = {},
): ReturnType<typeof createCropperSettings> {
  return createCropperSettings(options);
}
