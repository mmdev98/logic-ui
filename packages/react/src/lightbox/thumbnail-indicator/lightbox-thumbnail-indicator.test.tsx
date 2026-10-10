import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Lightbox } from "..";
import {
  clickButton,
  ITEMS,
  openLightboxAt,
  TestLightbox,
  type TestItem,
} from "../test-utils";

const THUMBNAIL_WIDTH = 60;
const GAP = 8;

/**
 * jsdom has no layout: thumbnails sit in a row at the top of the page, and
 * every element's positioned box is the page.
 */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(
    document.body,
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const index = ITEMS.findIndex(
        (item) => this.dataset.testid === `thumbnail-${item.id}`,
      );
      const left = index === -1 ? 0 : index * (THUMBNAIL_WIDTH + GAP);
      const width = index === -1 ? 0 : THUMBNAIL_WIDTH;
      return DOMRect.fromRect({ x: left, y: 0, width, height: 40 });
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithIndicator(): void {
  render(
    <TestLightbox
      popupChildren={
        <div>
          <Lightbox.ThumbnailList>
            {(item: TestItem) => (
              <Lightbox.Thumbnail data-testid={`thumbnail-${item.id}`} />
            )}
          </Lightbox.ThumbnailList>
          <Lightbox.ThumbnailIndicator data-testid="indicator" />
        </div>
      }
    />,
  );
}

describe("Lightbox.ThumbnailIndicator", () => {
  it("gets the active thumbnail's box, hidden from screen readers", async () => {
    renderWithIndicator();
    await openLightboxAt("Open image 2 of 3");
    const indicator = screen.getByTestId("indicator");

    expect(indicator.tagName).toBe("SPAN");
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    expect(indicator.style.getPropertyValue("--active-thumbnail-left")).toBe(
      `${THUMBNAIL_WIDTH + GAP}px`,
    );
    expect(indicator.style.getPropertyValue("--active-thumbnail-width")).toBe(
      `${THUMBNAIL_WIDTH}px`,
    );
  });

  it("moves to the next thumbnail, with the side it moved to", async () => {
    renderWithIndicator();
    await openLightboxAt("Open image 1 of 3");
    const indicator = screen.getByTestId("indicator");
    expect(indicator.style.getPropertyValue("--active-thumbnail-left")).toBe(
      "0px",
    );

    await clickButton("Next image");

    expect(indicator.style.getPropertyValue("--active-thumbnail-left")).toBe(
      `${THUMBNAIL_WIDTH + GAP}px`,
    );
    expect(indicator.getAttribute("data-activation-direction")).toBe("right");
  });

  it("renders nothing without thumbnails to measure", async () => {
    render(
      <TestLightbox
        popupChildren={<Lightbox.ThumbnailIndicator data-testid="indicator" />}
      />,
    );
    await openLightboxAt("Open image 1 of 3");

    expect(screen.queryByTestId("indicator")).toBeNull();
  });
});
