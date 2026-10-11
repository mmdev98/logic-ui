import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Lightbox } from "..";
import {
  clickButton,
  pressButton,
  ITEMS,
  openLightboxAt,
  TestLightbox,
  waitForFrames,
} from "../test-utils";

describe("Lightbox.Description", () => {
  it("shows the active item's caption and describes the dialog", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const caption = screen.getByText("Caption A");

    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBe(
      caption.id,
    );
  });

  it("renders nothing for an item without a caption", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    expect(screen.getByText("Caption A")).toBeTruthy();

    await clickButton("Next image");

    expect(screen.queryByText("Caption A")).toBeNull();
  });

  it("has data-starting-style for a frame when its item changes", async () => {
    render(
      <TestLightbox
        items={ITEMS.map((item) => ({ ...item, caption: `About ${item.alt}` }))}
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    expect(
      screen.getByText("About First").hasAttribute("data-starting-style"),
    ).toBe(false);

    pressButton("Next image");

    const caption = screen.getByText("About Second");
    expect(caption.hasAttribute("data-starting-style")).toBe(true);
    expect(caption.getAttribute("data-activation-direction")).toBe("right");
    await waitForFrames();
    expect(caption.hasAttribute("data-starting-style")).toBe(false);
  });

  it("passes the lightbox state to its className function", async () => {
    render(
      <TestLightbox
        popupChildren={
          <Lightbox.Description
            className={(state) => `direction-${state.activationDirection}`}
          >
            Static
          </Lightbox.Description>
        }
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    expect(screen.getByText("Static").className).toBe("direction-none");

    await clickButton("Next image");

    expect(screen.getByText("Static").className).toBe("direction-right");
  });
});
