import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Cropper } from "..";
import {
  firePointer,
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.Grid", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("renders rows × columns cells, hidden from assistive technology", async () => {
    render(
      <Cropper.Root src="/photo.jpg">
        <Cropper.Viewport>
          <Cropper.Stencil>
            <Cropper.Grid data-testid="grid" rows={2} columns={4} />
          </Cropper.Stencil>
        </Cropper.Viewport>
      </Cropper.Root>,
    );
    await flushCropper();
    const grid = screen.getByTestId("grid");
    expect(grid.getAttribute("aria-hidden")).toBe("true");
    expect(grid.children).toHaveLength(8);
    expect(grid.lastElementChild?.getAttribute("data-row")).toBe("1");
    expect(grid.lastElementChild?.getAttribute("data-column")).toBe("3");
    expect(grid.style.getPropertyValue("--cropper-grid-columns")).toBe("4");
  });

  it("has data-interacting during a drag", async () => {
    render(<TestCropper />);
    await flushCropper();
    const grid = screen.getByTestId("grid");
    const stencil = screen.getByTestId("stencil");
    expect(grid.hasAttribute("data-interacting")).toBe(false);
    act(() => firePointer("pointerDown", stencil, 100, 50));
    act(() => firePointer("pointerMove", stencil, 110, 50));
    expect(grid.hasAttribute("data-interacting")).toBe(true);
    act(() => firePointer("pointerUp", stencil, 110, 50));
    expect(grid.hasAttribute("data-interacting")).toBe(false);
  });
});
