import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  flushCropper,
  mockCropperEnvironment,
  TestCropper,
} from "../test-utils";

describe("Cropper.Preview", () => {
  beforeEach(() => {
    mockCropperEnvironment();
  });

  it("renders a clipping div with the image of the crop", async () => {
    render(<TestCropper />);
    const preview = screen.getByTestId("preview");
    expect(preview.tagName).toBe("DIV");
    expect(preview.style.overflow).toBe("hidden");
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.hasAttribute("data-loading")).toBe(true);

    await flushCropper();

    const image = preview.querySelector("img");
    expect(image?.getAttribute("src")).toBe("/photo.jpg");
    expect(image?.style.transform).toContain("translate3d");
    expect(preview.hasAttribute("data-loaded")).toBe(true);
  });

  it("follows the crop", async () => {
    render(<TestCropper />);
    await flushCropper();
    const image = screen.getByTestId("preview").querySelector("img")!;
    const before = image.style.transform;
    screen.getByRole("button", { name: "Zoom in" }).click();
    await flushCropper();
    expect(image.style.transform).not.toBe(before);
  });
});
