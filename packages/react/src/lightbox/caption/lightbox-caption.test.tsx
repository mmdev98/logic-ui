import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox } from "..";
import {
  pressButton,
  ITEMS,
  openLightboxAt,
  TestLightbox,
  waitForFrames,
} from "../test-utils";

function renderWithCaptions(): void {
  render(
    <TestLightbox
      itemChildren={(item) => (
        <Lightbox.Caption data-testid={`caption-${item.id}`}>
          {item.alt} caption
        </Lightbox.Caption>
      )}
    />,
  );
}

describe("Lightbox.Caption", () => {
  it("renders its slide's text, marked while the slide is shown", async () => {
    renderWithCaptions();
    await openLightboxAt("Open image 1 of 3");
    const first = screen.getByTestId("caption-a");

    expect(first.tagName).toBe("DIV");
    expect(first.textContent).toBe("First caption");
    expect(first.hasAttribute("data-active")).toBe(true);
    expect(screen.getByTestId("caption-b").hasAttribute("data-active")).toBe(
      false,
    );
  });

  it("has data-starting-style for a frame when its slide becomes the one shown", async () => {
    renderWithCaptions();
    await openLightboxAt("Open image 1 of 3");
    const second = screen.getByTestId("caption-b");
    // Opening on a slide isn't a change of slide.
    expect(
      screen.getByTestId("caption-a").hasAttribute("data-starting-style"),
    ).toBe(false);

    pressButton("Next image");

    expect(second.hasAttribute("data-starting-style")).toBe(true);
    expect(second.getAttribute("data-activation-direction")).toBe("right");
    await waitForFrames();
    expect(second.hasAttribute("data-starting-style")).toBe(false);
  });

  it("renders nothing when its content is empty", async () => {
    render(
      <TestLightbox
        itemChildren={(item) => (
          <Lightbox.Caption data-testid={`caption-${item.id}`}>
            {item.caption}
          </Lightbox.Caption>
        )}
      />,
    );
    await openLightboxAt("Open image 1 of 3");

    expect(screen.getByTestId("caption-a")).toBeTruthy();
    expect(screen.queryByTestId("caption-b")).toBeNull();
  });

  it("throws outside Lightbox.Slide", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <Lightbox.Root items={ITEMS}>
          <Lightbox.Caption>Text</Lightbox.Caption>
        </Lightbox.Root>,
      ),
    ).toThrow("Base UI: LightboxSlideContext is missing.");
    consoleError.mockRestore();
  });
});
