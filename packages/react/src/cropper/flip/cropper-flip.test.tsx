import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { Cropper, type CropperRootActions } from "..";
import { flushCropper, mockCropperEnvironment } from "../test-utils";

describe("Cropper.Flip", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it.each([
    ["horizontal", "Flip horizontally", { horizontal: true, vertical: false }],
    ["vertical", "Flip vertically", { horizontal: false, vertical: true }],
  ] as const)(
    "mirrors the image %sly",
    async (orientation, label, expected) => {
      const actionsRef = React.createRef<CropperRootActions>();
      render(
        <Cropper.Root src="/photo.jpg" actionsRef={actionsRef}>
          <Cropper.Viewport />
          <Cropper.Flip orientation={orientation} />
        </Cropper.Root>,
      );
      await flushCropper();
      act(() => screen.getByRole("button", { name: label }).click());
      expect(actionsRef.current?.getState()?.transforms.flip).toEqual(expected);
    },
  );

  it("is disabled when the root is disabled", async () => {
    render(
      <Cropper.Root src="/photo.jpg" disabled>
        <Cropper.Viewport />
        <Cropper.Flip />
      </Cropper.Root>,
    );
    await flushCropper();
    expect(
      screen.getByRole("button", { name: "Flip horizontally" }),
    ).toHaveProperty("disabled", true);
  });
});
