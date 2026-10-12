import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Lightbox } from "..";
import {
  changeDetails,
  clickButton,
  firePointer,
  ITEMS,
  loadImages,
  openLightboxAt,
  TestLightbox,
} from "../test-utils";

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
  vi.unstubAllGlobals();
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

/** The track's horizontal position, in px. */
function getTrackX() {
  return parseFloat(getTrack().style.transform.replace("translate3d(", ""));
}

describe("Lightbox.Viewport", () => {
  it("undoes a scroll, which would move the slides off their places", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    viewport.scrollLeft = 400;
    expect(viewport.scrollLeft).toBe(400);

    fireEvent.scroll(viewport);

    expect(viewport.scrollLeft).toBe(0);
  });

  it("writes the swipe on the popup while the slides move", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 2 of 3");
    const popup = screen.getByTestId("popup");
    const viewport = screen.getByTestId("viewport");
    expect(popup.style.getPropertyValue("--lightbox-swipe-progress")).toBe("0");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 150);
      firePointer("pointerMove", viewport, 250, 150);
      firePointer("pointerMove", viewport, 200, 150);
    });

    expect(popup.style.getPropertyValue("--lightbox-swipe-movement-x")).toBe(
      "-100px",
    );
    expect(popup.style.getPropertyValue("--lightbox-swipe-progress")).toBe(
      `${-100 / ITEM_WIDTH}`,
    );
  });

  it("writes the strength of a flick, and settles faster for it", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByTestId("popup");
    const viewport = screen.getByTestId("viewport");

    // A flick: the events come back to back, so the release is fast.
    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 100, 200);
      firePointer("pointerUp", viewport, 100, 200);
    });

    expect(
      Number(popup.style.getPropertyValue("--lightbox-swipe-strength")),
    ).toBeLessThan(1);
    await wait(150);
    expect(getTrack().style.transform).toBe(
      `translate3d(${-ITEM_WIDTH}px, 0px, 0px)`,
    );
    // Back to 1 once the track has settled.
    expect(popup.style.getPropertyValue("--lightbox-swipe-strength")).toBe("1");
  });

  it("springs back at its own pace after a flick past the first item", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByTestId("popup");
    const viewport = screen.getByTestId("viewport");
    const rest = "translate3d(0px, 0px, 0px)";

    // A fast flick right, where there is no previous item.
    await act(async () => {
      firePointer("pointerDown", viewport, 100, 200);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 300, 200);
      firePointer("pointerUp", viewport, 300, 200);
    });

    expect(popup.style.getPropertyValue("--lightbox-swipe-strength")).toBe("1");
    expect(getTrack().style.transform).not.toBe(rest);
    // Still on its way back: the flick doesn't hurry it.
    await wait(100);
    expect(getTrack().style.transform).not.toBe(rest);
    await wait(400);
    expect(getTrack().style.transform).toBe(rest);
  });

  /**
   * Zooms the first image in, then stubs where it and the viewport are, as
   * jsdom has no layout. `setInSight(false)` moves the image out of sight.
   */
  async function zoomFirstImage() {
    await openLightboxAt("Open image 1 of 3");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" });
    await wait(400);
    const image = screen.getByRole("img", { name: "First" });
    const rect = (left: number) => new DOMRect(left, 0, ITEM_WIDTH, 300);
    let inSight = true;
    vi.spyOn(
      screen.getByTestId("viewport"),
      "getBoundingClientRect",
    ).mockReturnValue(rect(0));
    vi.spyOn(image, "getBoundingClientRect").mockImplementation(() =>
      rect(inSight ? -100 : -ITEM_WIDTH - 10),
    );
    return {
      image,
      setInSight: (value: boolean) => {
        inSight = value;
      },
    };
  }

  it("keeps a zoomed image zoomed until it has left the viewport", async () => {
    render(<TestLightbox />);
    const { image, setInSight } = await zoomFirstImage();
    expect(image.style.transform).toContain("scale(1.5)");

    await clickButton("Next image");
    await wait(50);

    // The next image starts at rest; the first slides out as it was.
    expect(screen.getByTestId("zoom-value").textContent).toBe("100%");
    expect(image.style.transform).toContain("scale(1.5)");

    setInSight(false);
    await wait(50);
    expect(image.style.transform).toBe("translate3d(0px, 0px, 0px) scale(1)");
  });

  it("zooms an image still in sight back to rest once the track settles", async () => {
    render(<TestLightbox />);
    const { image } = await zoomFirstImage();

    await clickButton("Next image");
    await wait(50);
    expect(image.style.transform).toContain("scale(1.5)");

    await wait(800);
    expect(image.style.transform).toBe("translate3d(0px, 0px, 0px) scale(1)");
  });

  it("leaves a press on a control inside a slide to that control", async () => {
    const onClick = vi.fn();
    render(
      <TestLightbox
        itemChildren={() => (
          <button type="button" onClick={onClick}>
            Like
          </button>
        )}
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const like = screen.getAllByRole("button", {
      name: "Like",
    })[0] as HTMLElement;

    await act(async () => {
      firePointer("pointerDown", like, 300, 200);
      firePointer("pointerMove", like, 100, 200);
      firePointer("pointerUp", like, 100, 200);
    });
    fireEvent.click(like);

    // No swipe started: the press was the button's.
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
    expect(getTrack().style.transform).toBe("translate3d(0px, 0px, 0px)");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: "all drags", value: "", swipes: false, pulls: false },
    { name: "horizontal drags with x", value: "x", swipes: false, pulls: true },
    { name: "vertical drags with y", value: "y", swipes: true, pulls: false },
  ])(
    "leaves $name to content with data-base-ui-swipe-ignore",
    async ({ value, swipes, pulls }) => {
      render(
        <TestLightbox
          itemChildren={(item) => (
            <div
              data-testid={`model-${item.id}`}
              data-base-ui-swipe-ignore={value}
            />
          )}
        />,
      );
      await openLightboxAt("Open image 1 of 3");
      const model = screen.getByTestId("model-a");
      const popup = screen.getByTestId("popup");

      // A sideways drag on the content.
      await act(async () => {
        firePointer("pointerDown", model, 300, 200);
        firePointer("pointerMove", model, 250, 202);
        firePointer("pointerMove", model, 200, 204);
      });
      expect(getTrack().style.transform !== "translate3d(0px, 0px, 0px)").toBe(
        swipes,
      );
      await act(async () => {
        firePointer("pointerUp", model, 200, 204);
      });
      await wait(500);

      // A downward drag on the content.
      await act(async () => {
        firePointer("pointerDown", model, 300, 100);
        firePointer("pointerMove", model, 302, 150);
        firePointer("pointerMove", model, 304, 200);
      });
      expect(popup.hasAttribute("data-swiping")).toBe(pulls);
    },
  );

  it("gives each slide its distance from the centre, following the swipe", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    const second = screen.getByTestId("slide-b");
    // The slide adds its place to how far the track moved.
    expect(second.style.getPropertyValue("--lightbox-slide-progress")).toBe(
      "calc(1 + var(--lightbox-track-progress, 0))",
    );
    expect(getTrack().style.getPropertyValue("--lightbox-track-progress")).toBe(
      "0",
    );
    // Its `transform` is free for a custom transition.
    expect(second.style.transform).toBe("");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 250, 200);
      firePointer("pointerMove", viewport, 200, 200);
    });

    // A quarter of a slide to the left: the second slide is 0.75 from the centre.
    expect(getTrack().style.getPropertyValue("--lightbox-track-progress")).toBe(
      `${-100 / ITEM_WIDTH}`,
    );
  });

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

  it("moves the slides further per px of finger travel with --lightbox-swipe-distance", async () => {
    // The probe that measures `--lightbox-swipe-distance` resolves it to 100 px
    // (jsdom can't): a quarter of the viewport.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const width = this.style.width.includes("--lightbox-swipe-distance")
          ? 100
          : ITEM_WIDTH;
        return DOMRect.fromRect({ x: 0, y: 0, width, height: 300 });
      },
    );
    render(
      <Lightbox.Root items={ITEMS} defaultValue="a" defaultOpen>
        <Lightbox.Portal>
          <Lightbox.Popup>
            <Lightbox.Viewport
              data-testid="viewport"
              style={{ ["--lightbox-swipe-distance" as string]: "100px" }}
            >
              {(item: { id: string }) => (
                <Lightbox.Slide data-testid={`slide-${item.id}`} />
              )}
            </Lightbox.Viewport>
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>,
    );
    await screen.findByRole("dialog");
    await loadImages();
    // Open: the viewer takes gestures once it has finished opening.
    await wait(100);
    const viewport = screen.getByTestId("viewport");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 275, 200);
      firePointer("pointerMove", viewport, 250, 200);
    });

    // 50 px of finger travel, four times over: half a slide.
    expect(getTrack().style.transform).toBe("translate3d(-200px, 0px, 0px)");
  });

  it("renders more neighbours with neighbors", async () => {
    const items = ["a", "b", "c", "d", "e"].map((id) => ({
      id,
      src: `/${id}.jpg`,
      alt: id,
    }));
    render(
      <Lightbox.Root items={items} defaultValue="c" defaultOpen>
        <Lightbox.Portal>
          <Lightbox.Popup>
            <Lightbox.Viewport neighbors={2}>
              {(item: { id: string }) => (
                <Lightbox.Slide data-testid={`slide-${item.id}`} />
              )}
            </Lightbox.Viewport>
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>,
    );
    await screen.findByRole("dialog");
    await loadImages();

    for (const id of ["a", "b", "c", "d", "e"])
      expect(screen.getByTestId(`slide-${id}`)).toBeTruthy();
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
    const slot = `${3 * ITEM_WIDTH}px 0px`;
    expect(screen.getByTestId("slide-a")).toBe(first);
    expect(first.style.translate).toBe(slot);
    expect(screen.queryByTestId("slide-d")).toBeNull();
    expect(getTrack().style.transform).toBe(
      `translate3d(${-3 * ITEM_WIDTH}px, 0px, 0px)`,
    );

    await wait(500);

    expect(getTrack().style.transform).toBe(
      `translate3d(${-4 * ITEM_WIDTH}px, 0px, 0px)`,
    );
    expect(screen.queryByTestId("slide-a")).toBeNull();
    expect(screen.getByTestId("slide-d").style.translate).toBe(slot);
  });

  it("goes to the next item after a swipe", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 205);
      expect(viewport.hasAttribute("data-swiping")).toBe(true);
      firePointer("pointerMove", viewport, 100, 205);
      firePointer("pointerUp", viewport, 100, 205);
    });

    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
    expect(viewport.hasAttribute("data-swiping")).toBe(false);
  });

  it("reports a swipe as the reason", async () => {
    const onValueChange = vi.fn();
    render(<TestLightbox onValueChange={onValueChange} />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 205);
      firePointer("pointerMove", viewport, 100, 205);
      firePointer("pointerUp", viewport, 100, 205);
    });

    expect(onValueChange).toHaveBeenLastCalledWith("b", changeDetails("swipe"));
  });

  it.each([
    { start: 0, step: 2, pointerType: "touch" },
    { start: 4, step: -2, pointerType: "mouse" },
    { start: 0, step: 3, pointerType: "mouse" },
  ])(
    "settles a $pointerType drag from $start by $step slides without jumping on release",
    async ({ start, step, pointerType }) => {
      const items = ["a", "b", "c", "d", "e"].map((id) => ({
        id,
        src: `/${id}.jpg`,
        alt: id,
      }));
      const onValueChange = vi.fn();
      render(<TestLightbox items={items} onValueChange={onValueChange} />);
      await openLightboxAt(`Open image ${start + 1} of 5`);
      const viewport = screen.getByTestId("viewport");
      const offset = -(step - Math.sign(step) * 0.4) * ITEM_WIDTH;
      expect(screen.getByTestId("counter").textContent).toBe(
        `${start + 1} / 5`,
      );
      onValueChange.mockClear();

      await act(async () => {
        firePointer("pointerDown", viewport, 300, 150, pointerType);
        firePointer("pointerMove", viewport, 300 + offset, 150, pointerType);
      });
      const draggedTransform = getTrack().style.transform;
      expect(draggedTransform).toBe(
        `translate3d(${-start * ITEM_WIDTH + offset}px, 0px, 0px)`,
      );
      await wait(150);
      await act(async () => {
        firePointer("pointerUp", viewport, 300 + offset, 150, pointerType);
      });

      expect(screen.getByTestId("counter").textContent).toBe(
        `${start + step + 1} / 5`,
      );
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
        items[start + step]!.id,
        changeDetails("swipe"),
      );
      expect(getTrack().style.transform).toBe(draggedTransform);
      const reached = screen.getByTestId(`slide-${items[start + step]!.id}`);
      expect(reached.style.translate).toBe(
        `${(start + step) * ITEM_WIDTH}px 0px`,
      );
      await wait(500);
      expect(getTrack().style.transform).toBe(
        `translate3d(${-(start + step) * ITEM_WIDTH}px, 0px, 0px)`,
      );
      expect(
        screen
          .getByTestId("popup")
          .style.getPropertyValue("--lightbox-swipe-progress"),
      ).toBe("0");
    },
  );

  it("renders the slides reached during a long drag before changing value", async () => {
    const items = ["a", "b", "c", "d", "e", "f"].map((id) => ({
      id,
      src: `/${id}.jpg`,
      alt: id,
    }));
    render(<TestLightbox items={items} />);
    await openLightboxAt("Open image 1 of 6");
    const viewport = screen.getByTestId("viewport");
    expect(screen.queryByTestId("slide-c")).toBeNull();

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 150);
      firePointer("pointerMove", viewport, 300 - 1.6 * ITEM_WIDTH, 150);
    });
    expect(screen.getByTestId("slide-b").style.translate).toBe(
      `${ITEM_WIDTH}px 0px`,
    );
    expect(screen.getByTestId("slide-c").style.translate).toBe(
      `${2 * ITEM_WIDTH}px 0px`,
    );
    expect(screen.getByTestId("slide-d")).toBeTruthy();
    expect(screen.queryByTestId("slide-f")).toBeNull();
    expect(screen.getByTestId("counter").textContent).toBe("1 / 6");

    await act(async () => {
      firePointer("pointerMove", viewport, 300 - 3.6 * ITEM_WIDTH, 150);
    });
    expect(screen.getByTestId("slide-d")).toBeTruthy();
    expect(screen.getByTestId("slide-e")).toBeTruthy();
    expect(screen.getByTestId("slide-f")).toBeTruthy();
    expect(screen.getByTestId("counter").textContent).toBe("1 / 6");
  });

  it.each([
    { offset: -5 * ITEM_WIDTH, target: 2 },
    { offset: 5 * ITEM_WIDTH, target: 0 },
  ])(
    "rubberbands at the gallery edge and settles on item $target",
    async ({ offset, target }) => {
      const onValueChange = vi.fn();
      render(<TestLightbox onValueChange={onValueChange} />);
      await openLightboxAt("Open image 2 of 3");
      const viewport = screen.getByTestId("viewport");
      const popup = screen.getByTestId("popup");
      expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
      onValueChange.mockClear();

      await act(async () => {
        firePointer("pointerDown", viewport, 200, 150);
        firePointer("pointerMove", viewport, 200 + offset, 150);
      });
      const movement = parseFloat(
        popup.style.getPropertyValue("--lightbox-swipe-movement-x"),
      );
      expect(Math.sign(movement)).toBe(Math.sign(offset));
      expect(Math.abs(movement)).toBeGreaterThan(ITEM_WIDTH);
      expect(Math.abs(movement)).toBeLessThan(2 * ITEM_WIDTH);
      await act(async () => {
        firePointer("pointerUp", viewport, 200 + offset, 150);
      });
      expect(screen.getByTestId("counter").textContent).toBe(
        `${target + 1} / 3`,
      );
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
        ITEMS[target]!.id,
        changeDetails("swipe"),
      );
      await wait(500);
      expect(getTrack().style.transform).toBe(
        `translate3d(${-target * ITEM_WIDTH}px, 0px, 0px)`,
      );

      onValueChange.mockClear();
      await act(async () => {
        firePointer("pointerDown", viewport, 200, 150);
        firePointer("pointerMove", viewport, 200 + offset, 150);
        firePointer("pointerUp", viewport, 200 + offset, 150);
      });
      await wait(500);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByTestId("counter").textContent).toBe(
        `${target + 1} / 3`,
      );
      expect(getTrack().style.transform).toBe(
        `translate3d(${-target * ITEM_WIDTH}px, 0px, 0px)`,
      );
    },
  );

  it.each([false, true])(
    "springs back through intermediate slides after cancelling a long swipe (controlled: %s)",
    async (controlled) => {
      const onValueChange = vi.fn();
      render(
        <TestLightbox
          defaultValue="a"
          defaultOpen
          value={controlled ? "a" : undefined}
          onValueChange={(value, details) => {
            onValueChange(value, details);
            details.cancel();
          }}
        />,
      );
      await screen.findByRole("dialog");
      await loadImages();
      await wait(100);
      const viewport = screen.getByTestId("viewport");
      expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
      expect(screen.queryByTestId("slide-c")).toBeNull();

      await act(async () => {
        firePointer("pointerDown", viewport, 300, 150);
        firePointer("pointerMove", viewport, 300 - 1.6 * ITEM_WIDTH, 150);
      });
      expect(screen.getByTestId("slide-c")).toBeTruthy();
      await wait(150);
      await act(async () => {
        firePointer("pointerUp", viewport, 300 - 1.6 * ITEM_WIDTH, 150);
      });
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
        "c",
        changeDetails("swipe"),
      );
      expect(getTrack().style.transform).toBe("translate3d(-640px, 0px, 0px)");
      expect(screen.getByTestId("slide-b").style.translate).toBe("400px 0px");
      expect(screen.getByTestId("slide-c").style.translate).toBe("800px 0px");
      await wait(500);
      expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
      expect(getTrack().style.transform).toBe("translate3d(0px, 0px, 0px)");
      expect(screen.queryByTestId("slide-c")).toBeNull();
    },
  );

  it.each([0, 100, null])(
    "keeps controlled value authoritative when the app accepts after %s ms",
    async (delay) => {
      const onValueChange = vi.fn();
      const { rerender } = render(
        <TestLightbox value="a" defaultOpen onValueChange={onValueChange} />,
      );
      await screen.findByRole("dialog");
      await loadImages();
      await wait(100);
      const viewport = screen.getByTestId("viewport");
      expect(screen.getByTestId("counter").textContent).toBe("1 / 3");

      await act(async () => {
        firePointer("pointerDown", viewport, 300, 150);
        firePointer("pointerMove", viewport, 300 - 1.6 * ITEM_WIDTH, 150);
      });
      await wait(150);
      await act(async () => {
        firePointer("pointerUp", viewport, 300 - 1.6 * ITEM_WIDTH, 150);
      });
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
        "c",
        changeDetails("swipe"),
      );
      expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
      if (delay !== null) {
        if (delay > 0) await wait(delay);
        const x = getTrackX();
        rerender(
          <TestLightbox value="c" defaultOpen onValueChange={onValueChange} />,
        );
        expect(screen.getByTestId("counter").textContent).toBe("3 / 3");
        // Moving the offset onto the new item may round the last digit.
        expect(getTrackX()).toBeCloseTo(x, 6);
      }
      await wait(500);
      expect(screen.getByTestId("counter").textContent).toBe(
        delay === null ? "1 / 3" : "3 / 3",
      );
      expect(getTrack().style.transform).toBe(
        `translate3d(${delay === null ? 0 : -800}px, 0px, 0px)`,
      );
    },
  );

  it.each(["ltr", "rtl"])(
    "uses the whole stride, including gaps, in %s with no pre-rendered neighbors",
    async (direction) => {
      const onValueChange = vi.fn();
      render(
        <Lightbox.Root
          items={ITEMS}
          defaultValue="a"
          defaultOpen
          onValueChange={onValueChange}
        >
          <Lightbox.Portal>
            <Lightbox.Popup>
              <Lightbox.Title>Photos</Lightbox.Title>
              <Lightbox.Viewport
                data-testid="viewport"
                neighbors={0}
                style={{ direction: direction as "ltr" | "rtl", columnGap: 40 }}
              >
                {(item: { id: string }) => (
                  <Lightbox.Slide data-testid={`slide-${item.id}`} />
                )}
              </Lightbox.Viewport>
            </Lightbox.Popup>
          </Lightbox.Portal>
        </Lightbox.Root>,
      );
      await screen.findByRole("dialog");
      await loadImages();
      await wait(100);
      const viewport = screen.getByTestId("viewport");
      const sign = direction === "rtl" ? -1 : 1;
      const stride = ITEM_WIDTH + 40;
      expect(screen.getByTestId("slide-a").hasAttribute("data-active")).toBe(
        true,
      );
      expect(screen.queryByTestId("slide-b")).toBeNull();
      expect(screen.queryByTestId("slide-c")).toBeNull();

      await act(async () => {
        firePointer("pointerDown", viewport, 200, 150);
        firePointer("pointerMove", viewport, 200 - 1.6 * stride * sign, 150);
      });
      expect(screen.getByTestId("slide-b").style.translate).toBe(
        `${stride * sign}px 0px`,
      );
      expect(screen.getByTestId("slide-c").style.translate).toBe(
        `${2 * stride * sign}px 0px`,
      );
      await wait(150);
      await act(async () => {
        firePointer("pointerUp", viewport, 200 - 1.6 * stride * sign, 150);
      });
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(
        "c",
        changeDetails("swipe"),
      );
      expect(getTrack().style.transform).toBe(
        `translate3d(${-1.6 * stride * sign}px, 0px, 0px)`,
      );
      await wait(500);
      expect(screen.getByTestId("slide-c").hasAttribute("data-active")).toBe(
        true,
      );
      expect(getTrack().style.transform).toBe(
        `translate3d(${-2 * stride * sign}px, 0px, 0px)`,
      );
      expect(screen.queryByTestId("slide-a")).toBeNull();
      expect(screen.queryByTestId("slide-b")).toBeNull();
    },
  );

  it("settles a multi-slide drag without a tween under reduced motion", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
    await act(async () => {
      firePointer("pointerDown", viewport, 300, 150);
      firePointer("pointerMove", viewport, -340, 150);
    });
    await wait(150);
    await act(async () => {
      firePointer("pointerUp", viewport, -340, 150);
    });
    expect(screen.getByTestId("counter").textContent).toBe("3 / 3");
    await wait(50);
    expect(getTrack().style.transform).toBe("translate3d(-800px, 0px, 0px)");
  });

  it("springs back when the app cancels a swipe", async () => {
    render(
      <TestLightbox
        onValueChange={(value, eventDetails) => {
          if (eventDetails.reason === "swipe") eventDetails.cancel();
        }}
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 205);
      firePointer("pointerMove", viewport, 100, 205);
    });
    expect(getTrack().style.transform).toBe("translate3d(-200px, 0px, 0px)");

    await act(async () => {
      firePointer("pointerUp", viewport, 100, 205);
    });
    await wait(500);
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
    expect(getTrack().style.transform).toBe("translate3d(0px, 0px, 0px)");
  });

  it("slides to an item the app shows by changing value", async () => {
    const { rerender } = render(<TestLightbox value="a" defaultOpen />);
    await screen.findByRole("dialog");
    await loadImages();
    await wait(100);
    expect(getTrack().style.transform).toBe("translate3d(0px, 0px, 0px)");

    rerender(<TestLightbox value="b" defaultOpen />);

    // Starts where the first item was, then slides to the second.
    expect(getTrack().style.transform).toBe("translate3d(0px, 0px, 0px)");
    await wait(500);
    expect(getTrack().style.transform).toBe(
      `translate3d(${-ITEM_WIDTH}px, 0px, 0px)`,
    );
  });

  it("doesn't slide when items are added before the item shown", async () => {
    const { rerender } = render(<TestLightbox value="a" defaultOpen />);
    await screen.findByRole("dialog");
    await loadImages();
    await wait(100);

    const added = { id: "z", src: "/z.jpg", alt: "New" };
    rerender(<TestLightbox value="a" defaultOpen items={[added, ...ITEMS]} />);

    expect(getTrack().style.transform).toBe(
      `translate3d(${-ITEM_WIDTH}px, 0px, 0px)`,
    );
  });

  it("settles on an item when a press interrupts the swipe animation", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    // A slow release: the pointer rests first, so the track settles at full length.
    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 100, 200);
    });
    await wait(150);
    await act(async () => {
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

    // A slow release: the pointer rests first, so the track settles at full length.
    await act(async () => {
      firePointer("pointerDown", viewport, 300, 200);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 100, 200);
    });
    await wait(150);
    await act(async () => {
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

  it("sets data-swiping on the popup and backdrop until a pull to dismiss settles", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    const popup = screen.getByTestId("popup");
    const backdrop = screen.getByTestId("backdrop");
    expect(popup.hasAttribute("data-swiping")).toBe(false);

    // Down 20 px: a pull to dismiss, too short to close.
    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 200, 120);
    });
    expect(popup.hasAttribute("data-swiping")).toBe(true);
    expect(backdrop.hasAttribute("data-swiping")).toBe(true);

    await wait(200);
    await act(async () => {
      firePointer("pointerUp", viewport, 200, 120);
    });
    // Still set while the image settles back, so the backdrop keeps up.
    expect(popup.hasAttribute("data-swiping")).toBe(true);
    expect(viewport.hasAttribute("data-swiping")).toBe(false);

    await wait(500);
    expect(popup.hasAttribute("data-swiping")).toBe(false);
    expect(backdrop.hasAttribute("data-swiping")).toBe(false);
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
    const onOpenChange = vi.fn();
    render(<TestLightbox onOpenChange={onOpenChange} />);
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");

    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 205, 200);
      firePointer("pointerMove", viewport, 205, 300);
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());

    await act(async () => {
      firePointer("pointerUp", viewport, 205, 300);
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      changeDetails("swipe"),
    );
  });

  it("stays open, and the image springs back, when the app cancels a pull to dismiss", async () => {
    render(
      <TestLightbox
        onOpenChange={(open, eventDetails) => {
          if (!open) eventDetails.cancel();
        }}
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const viewport = screen.getByTestId("viewport");
    const popup = screen.getByTestId("popup");

    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 205, 200);
      firePointer("pointerMove", viewport, 205, 300);
    });
    expect(popup.hasAttribute("data-swiping")).toBe(true);

    await act(async () => {
      firePointer("pointerUp", viewport, 205, 300);
    });
    await wait(500);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(popup.style.getPropertyValue("--lightbox-dismiss-progress")).toBe(
      "0",
    );
    expect(popup.hasAttribute("data-swiping")).toBe(false);
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
