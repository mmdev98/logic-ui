import { act, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { Lightbox } from "..";
import {
  clickButton,
  ITEMS,
  openLightboxAt,
  TestLightbox,
  type TestItem,
} from "../test-utils";

const LIST_LEFT = 100;
const THUMBNAIL_WIDTH = 60;
const GAP = 8;

/**
 * jsdom has no layout: the list starts 100 px from the page's left, and its
 * thumbnails sit in a row in it.
 */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.getAttribute("role") === "tablist") {
        return DOMRect.fromRect({ x: LIST_LEFT, y: 0, width: 300, height: 40 });
      }
      const index = ITEMS.findIndex(
        (item) => this.dataset.testid === `thumbnail-${item.id}`,
      );
      if (index === -1) return DOMRect.fromRect();
      return DOMRect.fromRect({
        x: LIST_LEFT + index * (THUMBNAIL_WIDTH + GAP),
        y: 0,
        width: THUMBNAIL_WIDTH,
        height: 40,
      });
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A variable's value at rest: the start of the `calc()` that follows the swipe. */
function rest(element: HTMLElement, name: string): string {
  const value = element.style.getPropertyValue(name);
  return /^(?:calc\()?(-?[\d.]+px)/.exec(value)?.[1] ?? value;
}

function renderWithIndicator(): void {
  render(
    <TestLightbox
      popupChildren={
        <Lightbox.ThumbnailList>
          {(item: TestItem) => (
            <Lightbox.Thumbnail data-testid={`thumbnail-${item.id}`} />
          )}
          <Lightbox.ThumbnailIndicator data-testid="indicator" />
        </Lightbox.ThumbnailList>
      }
    />,
  );
}

describe("Lightbox.ThumbnailIndicator", () => {
  it("gets the active thumbnail's box in the list, hidden from screen readers", async () => {
    renderWithIndicator();
    await openLightboxAt("Open image 2 of 3");
    const indicator = screen.getByTestId("indicator");

    expect(indicator.tagName).toBe("SPAN");
    expect(indicator.parentElement?.getAttribute("role")).toBe("tablist");
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    expect(rest(indicator, "--active-thumbnail-left")).toBe(
      `${THUMBNAIL_WIDTH + GAP}px`,
    );
    expect(rest(indicator, "--active-thumbnail-width")).toBe(
      `${THUMBNAIL_WIDTH}px`,
    );
  });

  it("moves to the next thumbnail, with the side it moved to", async () => {
    renderWithIndicator();
    await openLightboxAt("Open image 1 of 3");
    const indicator = screen.getByTestId("indicator");
    expect(rest(indicator, "--active-thumbnail-left")).toBe("0px");

    await clickButton("Next image");

    expect(rest(indicator, "--active-thumbnail-left")).toBe(
      `${THUMBNAIL_WIDTH + GAP}px`,
    );
    expect(indicator.getAttribute("data-activation-direction")).toBe("right");
  });

  it("measures in the list's content, so it scrolls with the list", async () => {
    renderWithIndicator();
    await openLightboxAt("Open image 1 of 3");
    const strip = screen.getByRole("tablist", { name: "Thumbnails" });
    strip.scrollLeft = 50;

    await clickButton("Next image");

    expect(
      rest(screen.getByTestId("indicator"), "--active-thumbnail-left"),
    ).toBe(`${THUMBNAIL_WIDTH + GAP + 50}px`);
  });

  it("moves towards a neighbour with the swipe progress", async () => {
    renderWithIndicator();
    await openLightboxAt("Open image 2 of 3");
    const left = screen
      .getByTestId("indicator")
      .style.getPropertyValue("--active-thumbnail-left");

    // The slides move left to bring the next thumbnail in, right for the previous.
    expect(left).toBe(
      `calc(${THUMBNAIL_WIDTH + GAP}px + min(1, max(0, 1 * var(--lightbox-swipe-progress, 0))) * -${THUMBNAIL_WIDTH + GAP}px + min(1, max(0, -1 * var(--lightbox-swipe-progress, 0))) * ${THUMBNAIL_WIDTH + GAP}px)`,
    );
  });

  it("measures again when a thumbnail changes size", async () => {
    const observed: Element[] = [];
    let notify = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {}
      },
    );
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    renderWithIndicator();
    await openLightboxAt("Open image 1 of 3");
    const first = screen.getByTestId("thumbnail-a");
    const indicator = screen.getByTestId("indicator");
    expect(observed).toContain(first);
    expect(rest(indicator, "--active-thumbnail-width")).toBe(
      `${THUMBNAIL_WIDTH}px`,
    );

    // A CSS transition widens the active thumbnail.
    const rect = first.getBoundingClientRect();
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: rect.x, y: 0, width: 80, height: 40 }),
    );
    await act(async () => notify());

    expect(rest(indicator, "--active-thumbnail-width")).toBe("80px");
  });

  it("throws outside Lightbox.ThumbnailList", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <Lightbox.Root items={ITEMS}>
          <Lightbox.ThumbnailIndicator />
        </Lightbox.Root>,
      ),
    ).toThrow("Base UI: LightboxThumbnailListContext is missing.");
    consoleError.mockRestore();
  });
});
