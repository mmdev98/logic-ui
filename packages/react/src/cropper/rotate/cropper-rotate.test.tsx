import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cropper, type CropperRootActions } from "..";
import { flushCropper, mockCropperEnvironment } from "../test-utils";

describe("Cropper.Rotate", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it.each([
    [undefined, "Rotate clockwise", 90],
    [-90, "Rotate counterclockwise", -90],
  ])("turns the image by %s degrees", async (angle, label, expected) => {
    const actionsRef = React.createRef<CropperRootActions>();
    render(
      <Cropper.Root src="/photo.jpg" actionsRef={actionsRef}>
        <Cropper.Viewport />
        <Cropper.Rotate angle={angle} />
      </Cropper.Root>,
    );
    await flushCropper();
    act(() => screen.getByRole("button", { name: label }).click());
    expect(actionsRef.current?.getState()?.transforms.rotate).toBe(expected);
  });

  it("keeps the caller's label and handlers, and renders as another element", async () => {
    const onClick = vi.fn();
    render(
      <Cropper.Root src="/photo.jpg">
        <Cropper.Viewport />
        <Cropper.Rotate
          aria-label="Turn"
          onClick={onClick}
          render={<span role="button" />}
        />
      </Cropper.Root>,
    );
    await flushCropper();
    const button = screen.getByRole("button", { name: "Turn" });
    expect(button.tagName).toBe("SPAN");
    act(() => button.click());
    expect(onClick).toHaveBeenCalled();
  });
});
