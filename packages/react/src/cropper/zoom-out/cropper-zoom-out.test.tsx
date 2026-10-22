import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import type { CropperRootActions } from "..";
import {
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.ZoomOut", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("is disabled at the widest view", async () => {
    render(<TestCropper />);
    await flushCropper();
    expect(screen.getByRole("button", { name: "Zoom out" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("zooms out a step", async () => {
    const actionsRef = React.createRef<CropperRootActions>();
    render(<TestCropper actionsRef={actionsRef} />);
    await flushCropper();
    act(() => actionsRef.current?.zoom(2));
    const before = actionsRef.current!.getState()!.visibleArea!.width;

    act(() => screen.getByRole("button", { name: "Zoom out" }).click());

    expect(actionsRef.current!.getState()!.visibleArea!.width).toBeCloseTo(
      before * 1.25,
    );
  });
});
