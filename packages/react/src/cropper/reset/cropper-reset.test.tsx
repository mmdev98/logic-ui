import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CropperRootActions } from "..";
import {
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.Reset", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("starts over with the default crop, rotation and view", async () => {
    const actionsRef = React.createRef<CropperRootActions>();
    const onCoordinatesCommitted = vi.fn();
    render(
      <TestCropper
        actionsRef={actionsRef}
        onCoordinatesCommitted={onCoordinatesCommitted}
      />,
    );
    await flushCropper();
    const initial = actionsRef.current!.getState();
    act(() => {
      actionsRef.current?.rotate(90);
      actionsRef.current?.setCoordinates({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      });
    });
    expect(actionsRef.current!.getState()).not.toEqual(initial);

    act(() => screen.getByRole("button", { name: "Reset" }).click());

    expect(actionsRef.current!.getState()).toEqual(initial);
    expect(onCoordinatesCommitted).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: "reset-press" }),
    );
  });
});
