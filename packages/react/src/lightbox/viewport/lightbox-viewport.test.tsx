import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firePointer, openLightboxAt, TestLightbox } from "../test-utils";

/** Every element is 400 × 300: jsdom has no layout, and swipes are measured in items. */
const ITEM_WIDTH = 400;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
    ITEM_WIDTH,
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function wait(ms: number) {
  return act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }),
  );
}

function getTrack() {
  return screen.getByTestId("viewport").firstElementChild as HTMLElement;
}

describe("Lightbox.Viewport", () => {
  it("is a labelled carousel region", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByRole("region", { name: "Gallery" });

    expect(viewport).toBe(screen.getByTestId("viewport"));
    expect(viewport.getAttribute("aria-roledescription")).toBe("carousel");
  });

  it("renders only the active item and its neighbours", async () => {
    const items = ["a", "b", "c", "d", "e"].map((id) => ({
      id,
      src: `/${id}.jpg`,
      alt: id,
    }));
    render(<TestLightbox items={items} />);
    await openLightboxAt("Open image 1 of 5");

    expect(screen.getByTestId("slide-a")).toBeTruthy();
    expect(screen.getByTestId("slide-b")).toBeTruthy();
    expect(screen.queryByTestId("slide-c")).toBeNull();
  });

  it("slides a jump of several items like a step to a neighbour", async () => {
    const items = ["a", "b", "c", "d", "e"].map((id) => ({
      id,
      src: `/${id}.jpg`,
      alt: id,
    }));
    render(<TestLightbox items={items} />);
    await openLightboxAt("Open image 1 of 5");
    const first = screen.getByTestId("slide-a");

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "End" });
    });

    // The item it left is drawn next to the new one, in the neighbour's slot,
    // and the track starts one item away from the new one.
    const slot = `translate3d(${3 * ITEM_WIDTH}px, 0px, 0px)`;
    expect(screen.getByTestId("slide-a")).toBe(first);
    expect(first.style.transform).toBe(slot);
    expect(screen.queryByTestId("slide-d")).toBeNull();
    expect(getTrack().style.transform).toBe(
      `translate3d(${-3 * ITEM_WIDTH}px, 0px, 0px)`,
    );

    await wait(500);

    expect(getTrack().style.transform).toBe(
      `translate3d(${-4 * ITEM_WIDTH}px, 0px, 0px)`,
    );
    expect(screen.queryByTestId("slide-a")).toBeNull();
    expect(screen.getByTestId("slide-d").style.transform).toBe(slot);
  });

  it("goes to the next item after a swipe", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 205);
      expect(viewport.hasAttribute("data-dragging")).toBe(true);
      firePointer("pointerMove", viewport, 100, 205);
      firePointer("pointerUp", viewport, 100, 205);
    });

    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
    expect(viewport.hasAttribute("data-dragging")).toBe(false);
  });

  it("settles on an item when a press interrupts the swipe animation", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 100, 200);
      firePointer("pointerUp", viewport, 100, 200);
    });
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");

    // A click while the track still slides to the second item.
    await wait(50);
    expect(getTrack().style.transform).not.toBe(
      `translate3d(${-ITEM_WIDTH}px, 0px, 0px)`,
    );
    await act(async () => {
      firePointer("pointerDown", viewport, 200, 200, "mouse");
      firePointer("pointerUp", viewport, 200, 200, "mouse");
    });

    await wait(500);
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
    expect(getTrack().style.transform).toBe(
      `translate3d(${-ITEM_WIDTH}px, 0px, 0px)`,
    );
  });

  it("keeps sliding when the next image loads during the swipe animation", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    const finalTransform = `translate3d(${-ITEM_WIDTH}px, 0px, 0px)`;

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 100, 200);
      firePointer("pointerUp", viewport, 100, 200);
    });
    await wait(50);
    expect(getTrack().style.transform).not.toBe(finalTransform);

    // The image the track slides to finishes loading mid-slide.
    const image = screen.getByRole("img", { name: "Second" });
    Object.defineProperty(image, "naturalWidth", { value: 800 });
    Object.defineProperty(image, "naturalHeight", { value: 600 });
    act(() => {
      fireEvent.load(image);
    });

    expect(getTrack().style.transform).not.toBe(finalTransform);
    await wait(500);
    expect(getTrack().style.transform).toBe(finalTransform);
  });

  it("sets data-dragging on the popup and backdrop until a drag to close settles", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    const popup = screen.getByTestId("popup");
    const backdrop = screen.getByTestId("backdrop");
    expect(popup.hasAttribute("data-dragging")).toBe(false);

    // Down 20 px: a drag to close, too short to close.
    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 200, 120);
    });
    expect(popup.hasAttribute("data-dragging")).toBe(true);
    expect(backdrop.hasAttribute("data-dragging")).toBe(true);

    await wait(200);
    await act(async () => {
      firePointer("pointerUp", viewport, 200, 120);
    });
    // Still set while the image settles back, so the backdrop keeps up.
    expect(popup.hasAttribute("data-dragging")).toBe(true);
    expect(viewport.hasAttribute("data-dragging")).toBe(false);

    await wait(500);
    expect(popup.hasAttribute("data-dragging")).toBe(false);
    expect(backdrop.hasAttribute("data-dragging")).toBe(false);
  });

  it("doesn't flick when the pointer stopped before release", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    // 50 px is short of a quarter of the item, and was moved quickly.
    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 250, 200);
    });
    await wait(200);
    await act(async () => {
      firePointer("pointerUp", viewport, 250, 200);
    });

    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
  });

  it("closes after a drag down", async () => {
    const onValueChange = vi.fn();
    render(<TestLightbox onValueChange={onValueChange} />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 205, 200);
      firePointer("pointerMove", viewport, 205, 300);
    });
    expect(onValueChange).not.toHaveBeenCalledWith(null);

    await act(async () => {
      firePointer("pointerUp", viewport, 205, 300);
    });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("zooms in on a double tap and out on the next one", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    const zoomValue = screen.getByTestId("zoom-value");
    const tap = () => {
      firePointer("pointerDown", viewport, 100, 100);
      firePointer("pointerUp", viewport, 100, 100);
    };
    expect(zoomValue.textContent).toBe("100%");

    await act(async () => {
      tap();
      tap();
    });
    await waitFor(() => expect(zoomValue.textContent).toBe("250%"));

    await act(async () => {
      tap();
      tap();
    });
    await waitFor(() => expect(zoomValue.textContent).toBe("100%"));
  });

  it("hides and shows the controls on a tap", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    vi.useFakeTimers();
    const popup = screen.getByTestId("popup");
    const viewport = screen.getByTestId("viewport");
    expect(popup.hasAttribute("data-controls-hidden")).toBe(false);

    act(() => {
      firePointer("pointerDown", viewport, 100, 100);
      firePointer("pointerUp", viewport, 100, 100);
      vi.advanceTimersByTime(400);
    });
    expect(popup.hasAttribute("data-controls-hidden")).toBe(true);

    act(() => {
      firePointer("pointerDown", viewport, 100, 100);
      firePointer("pointerUp", viewport, 100, 100);
      vi.advanceTimersByTime(400);
    });
    expect(popup.hasAttribute("data-controls-hidden")).toBe(false);
  });

  it("does not toggle the controls on a mouse click", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    vi.useFakeTimers();
    const viewport = screen.getByTestId("viewport");

    act(() => {
      firePointer("pointerDown", viewport, 100, 100, "mouse");
      firePointer("pointerUp", viewport, 100, 100, "mouse");
      vi.advanceTimersByTime(400);
    });

    expect(
      screen.getByTestId("popup").hasAttribute("data-controls-hidden"),
    ).toBe(false);
  });
});
