import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Lightbox } from "..";
import {
  clickButton,
  ITEMS,
  loadMedia,
  openLightboxAt,
  type TestItem,
  waitForFrames,
} from "../test-utils";

function renderWithTitle(title: React.ReactNode): void {
  render(
    <Lightbox.Root items={ITEMS} loadMedia={loadMedia}>
      <Lightbox.Trigger value="a" />
      <Lightbox.Portal>
        <Lightbox.Popup>
          {title}
          <Lightbox.Next />
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>,
  );
}

describe("Lightbox.Title", () => {
  it("names the dialog", async () => {
    renderWithTitle(<Lightbox.Title>Photos</Lightbox.Title>);
    await openLightboxAt("Open image 1 of 3");

    expect(screen.getByRole("dialog", { name: "Photos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Photos" }).tagName).toBe("H2");
  });

  it("names the item shown with a function child, animating each new one in", async () => {
    renderWithTitle(
      <Lightbox.Title>{(item: TestItem) => item.alt}</Lightbox.Title>,
    );
    await openLightboxAt("Open image 1 of 3");
    // Without media there is nothing to fly: the viewer is open after a frame.
    await waitForFrames();
    expect(
      screen
        .getByRole("heading", { name: "First" })
        .hasAttribute("data-starting-style"),
    ).toBe(false);

    await clickButton("Next image");

    const title = screen.getByRole("heading", { name: "Second" });
    expect(screen.getByRole("dialog", { name: "Second" })).toBeTruthy();
    expect(title.hasAttribute("data-starting-style")).toBe(true);
    expect(title.getAttribute("data-activation-direction")).toBe("right");
    await waitForFrames();
    expect(title.hasAttribute("data-starting-style")).toBe(false);
  });

  it("doesn't animate a title that doesn't change with the item", async () => {
    renderWithTitle(<Lightbox.Title>Photos</Lightbox.Title>);
    await openLightboxAt("Open image 1 of 3");

    await clickButton("Next image");

    const title = screen.getByRole("heading", { name: "Photos" });
    expect(title.hasAttribute("data-starting-style")).toBe(false);
    expect(title.getAttribute("data-activation-direction")).toBe("right");
  });
});
