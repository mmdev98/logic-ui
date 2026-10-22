import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Cropper } from "..";
import {
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.Image", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("renders the image once it is on screen, placed by transform", async () => {
    render(<TestCropper />);
    expect(screen.queryByTestId("image")).toBeNull();
    await flushCropper();
    const image = screen.getByTestId("image") as HTMLImageElement;
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("src")).toBe("/photo.jpg");
    expect(image.getAttribute("alt")).toBe("");
    expect(image.getAttribute("crossorigin")).toBe("anonymous");
    expect(image.style.transform).toContain("scaleX");
    expect(image.style.pointerEvents).toBe("none");
  });

  it("takes the caller's alt and crossOrigin from the root", async () => {
    render(
      <Cropper.Root src="/photo.jpg" crossOrigin={null}>
        <Cropper.Viewport>
          <Cropper.Image alt="Your photo" />
        </Cropper.Viewport>
      </Cropper.Root>,
    );
    await flushCropper();
    const image = screen.getByAltText("Your photo");
    expect(image.hasAttribute("crossorigin")).toBe(false);
  });

  it("has data-transitioning while a change animates", async () => {
    render(<TestCropper />);
    await flushCropper();
    const image = screen.getByTestId("image");
    expect(image.hasAttribute("data-transitioning")).toBe(false);
    screen.getByRole("button", { name: "Rotate clockwise" }).click();
    await flushCropper();
    expect(image.hasAttribute("data-transitioning")).toBe(true);
  });
});
