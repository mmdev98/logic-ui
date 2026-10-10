import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { Lightbox, type LightboxThumbnailListProps } from "..";
import { openLightboxAt, TestLightbox, type TestItem } from "../test-utils";

type ThumbnailsOptions = Omit<LightboxThumbnailListProps, "children">;

function renderWithThumbnails(options: ThumbnailsOptions = {}): void {
  render(
    <TestLightbox
      popupChildren={
        <Lightbox.ThumbnailList data-testid="strip" {...options}>
          {(item: TestItem) => (
            <Lightbox.Thumbnail data-testid={`thumbnail-${item.id}`} />
          )}
        </Lightbox.ThumbnailList>
      }
    />,
  );
}

/** jsdom has no layout: gives the strip a scrollable size. */
function makeScrollable(strip: HTMLElement, scrollLeft: number): void {
  Object.defineProperty(strip, "scrollWidth", {
    configurable: true,
    value: 600,
  });
  Object.defineProperty(strip, "clientWidth", {
    configurable: true,
    value: 200,
  });
  strip.scrollLeft = scrollLeft;
}

function firePointer(
  type: "pointerDown" | "pointerMove" | "pointerUp",
  element: Element,
  x: number,
): void {
  fireEvent[type](element, {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: x,
    clientY: 0,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Lightbox.ThumbnailList", () => {
  it("renders a labelled tab list with a tab per item", async () => {
    renderWithThumbnails();
    await openLightboxAt("Open image 1 of 3");
    const list = screen.getByRole("tablist", { name: "Thumbnails" });

    expect(list.getAttribute("aria-orientation")).toBe("horizontal");
    expect(list.getAttribute("data-orientation")).toBe("horizontal");
    expect(screen.getByRole("tab", { name: "Show image 3 of 3" })).toBeTruthy();
  });

  it("throws without a function child", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <Lightbox.Root items={[]}>
          <Lightbox.ThumbnailList>{[]}</Lightbox.ThumbnailList>
        </Lightbox.Root>,
      ),
    ).toThrow("Base UI: Lightbox.ThumbnailList has no function child.");
    consoleError.mockRestore();
  });

  it("makes the slides its tab panels", async () => {
    renderWithThumbnails();
    await openLightboxAt("Open image 1 of 3");

    expect(screen.getByTestId("slide-a").getAttribute("role")).toBe("tabpanel");
  });

  it("is a single tab stop on the active thumbnail", async () => {
    renderWithThumbnails();
    await openLightboxAt("Open image 2 of 3");

    expect(screen.getByTestId("thumbnail-a").tabIndex).toBe(-1);
    expect(screen.getByTestId("thumbnail-b").tabIndex).toBe(0);
    expect(screen.getByTestId("thumbnail-c").tabIndex).toBe(-1);
  });

  it.each([
    { key: "ArrowRight", to: "c", value: "3 / 3" },
    { key: "ArrowLeft", to: "a", value: "1 / 3" },
    { key: "Home", to: "a", value: "1 / 3" },
    { key: "End", to: "c", value: "3 / 3" },
  ])("moves focus and shows the item with $key", async ({ key, to, value }) => {
    renderWithThumbnails();
    await openLightboxAt("Open image 2 of 3");
    const from = screen.getByTestId("thumbnail-b");
    act(() => from.focus());

    await act(async () => {
      fireEvent.keyDown(from, { key });
    });

    const target = screen.getByTestId(`thumbnail-${to}`);
    expect(document.activeElement).toBe(target);
    expect(target.tabIndex).toBe(0);
    expect(screen.getByTestId("counter").textContent).toBe(value);
  });

  it("only moves focus with activateOnFocus={false}", async () => {
    renderWithThumbnails({ activateOnFocus: false });
    await openLightboxAt("Open image 2 of 3");
    const from = screen.getByTestId("thumbnail-b");
    act(() => from.focus());

    fireEvent.keyDown(from, { key: "ArrowRight" });

    expect(document.activeElement).toBe(screen.getByTestId("thumbnail-c"));
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("uses the up and down arrows when vertical", async () => {
    renderWithThumbnails({ orientation: "vertical" });
    await openLightboxAt("Open image 1 of 3");
    const first = screen.getByTestId("thumbnail-a");
    act(() => first.focus());

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(first);

    await act(async () => {
      fireEvent.keyDown(first, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(screen.getByTestId("thumbnail-b"));
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("scrolls the active thumbnail to the centre when the item changes", async () => {
    // jsdom has no `scrollBy`.
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
    onTestFinished(() => {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollBy;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        // The strip is 200px wide; each thumbnail 50px, side by side.
        const id = this.dataset.testid ?? "";
        const left = id === "strip" ? 0 : "abc".indexOf(id.slice(-1)) * 50;
        const width = id === "strip" ? 200 : 50;
        return DOMRect.fromRect({ x: left, y: 0, width, height: 50 });
      },
    );
    renderWithThumbnails();
    await openLightboxAt("Open image 1 of 3");
    scrollBy.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    });

    // Thumbnail b's centre (75px) moves to the strip's centre (100px).
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: -25 }),
    );
  });

  it("exposes data-overflow-start and data-overflow-end", async () => {
    renderWithThumbnails();
    await openLightboxAt("Open image 1 of 3");
    const strip = screen.getByTestId("strip");
    expect(strip.hasAttribute("data-overflow-end")).toBe(false);

    makeScrollable(strip, 0);
    fireEvent.scroll(strip);
    expect(strip.hasAttribute("data-overflow-start")).toBe(false);
    expect(strip.hasAttribute("data-overflow-end")).toBe(true);

    makeScrollable(strip, 400);
    fireEvent.scroll(strip);
    expect(strip.hasAttribute("data-overflow-start")).toBe(true);
    expect(strip.hasAttribute("data-overflow-end")).toBe(false);
  });

  it("scrolls with a mouse drag, which doesn't click the thumbnail", async () => {
    renderWithThumbnails();
    await openLightboxAt("Open image 1 of 3");
    const strip = screen.getByTestId("strip");
    const third = screen.getByTestId("thumbnail-c");
    makeScrollable(strip, 100);

    firePointer("pointerDown", third, 300);
    firePointer("pointerMove", third, 260);
    expect(strip.hasAttribute("data-dragging")).toBe(true);
    expect(strip.scrollLeft).toBe(140);
    firePointer("pointerUp", third, 260);
    await act(async () => {
      fireEvent.click(third);
    });

    expect(strip.hasAttribute("data-dragging")).toBe(false);
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
  });

  it("turns the vertical wheel into horizontal scrolling", async () => {
    renderWithThumbnails();
    await openLightboxAt("Open image 1 of 3");
    const strip = screen.getByTestId("strip");
    makeScrollable(strip, 0);

    const event = new WheelEvent("wheel", {
      deltaY: 80,
      bubbles: true,
      cancelable: true,
    });
    strip.dispatchEvent(event);

    expect(strip.scrollLeft).toBe(80);
    expect(event.defaultPrevented).toBe(true);
  });
});
