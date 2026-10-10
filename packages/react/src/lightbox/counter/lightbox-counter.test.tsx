import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Lightbox } from "..";
import {
  clickButton,
  ITEMS,
  openLightboxAt,
  TestLightbox,
  waitForFrames,
} from "../test-utils";

describe("Lightbox.Counter", () => {
  it("shows the position of the active item and announces it", () => {
    render(
      <Lightbox.Root items={ITEMS} defaultValue="b">
        <Lightbox.Counter />
      </Lightbox.Root>,
    );
    const value = screen.getByText("2 / 3");
    expect(value.getAttribute("aria-live")).toBe("polite");
  });

  it("formats the position with a function child", () => {
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.Counter>
          {(state) => `${state.index + 1} of ${state.count}`}
        </Lightbox.Counter>
      </Lightbox.Root>,
    );
    expect(screen.getByText("1 of 3")).toBeTruthy();
  });

  it("has data-starting-style for a frame when the item changes", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 2 of 3");
    const counter = screen.getByTestId("counter");
    expect(counter.hasAttribute("data-starting-style")).toBe(false);
    expect(counter.getAttribute("data-activation-direction")).toBe("none");

    await clickButton("Previous image");

    expect(counter.textContent).toBe("1 / 3");
    expect(counter.hasAttribute("data-starting-style")).toBe(true);
    expect(counter.getAttribute("data-activation-direction")).toBe("left");
    await waitForFrames();
    expect(counter.hasAttribute("data-starting-style")).toBe(false);
  });
});
