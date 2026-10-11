import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import {
  Lightbox,
  type LightboxRootChangeEventDetails,
  useLightboxRootContext,
} from "..";
import { LIGHTBOX_FLIGHT_DURATION, LIGHTBOX_FLIGHT_EASING } from "../constants";
import { LIGHTBOX_FLIGHT_FRAMES } from "../utils/lightbox-flight";
import {
  changeDetails,
  firePointer,
  ITEMS,
  loadMedia,
  openLightboxAt,
  TestLightbox,
  waitForFrames,
} from "../test-utils";

describe("Lightbox.Root", () => {
  it("returns focus to the trigger when the viewer closes", async () => {
    const onValueChange = vi.fn();
    render(<TestLightbox onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: "Open image 1 of 3" });
    await openLightboxAt("Open image 1 of 3");
    expect(document.activeElement).not.toBe(trigger);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onValueChange).toHaveBeenLastCalledWith(
      null,
      changeDetails("close-press"),
    );
    expect(document.activeElement).toBe(trigger);
  });

  it("opens on defaultValue", async () => {
    render(<TestLightbox defaultValue="b" />);
    await screen.findByRole("dialog");
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("can control the value", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <TestLightbox value={null} onValueChange={onValueChange} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<TestLightbox value="c" onValueChange={onValueChange} />);
    await screen.findByRole("dialog");
    expect(screen.getByTestId("counter").textContent).toBe("3 / 3");

    // A controlled value only changes through the prop.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    });
    expect(onValueChange).toHaveBeenLastCalledWith(
      "b",
      changeDetails("previous-press"),
    );
    expect(screen.getByTestId("counter").textContent).toBe("3 / 3");

    // Closing only reports `null`.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(onValueChange).toHaveBeenLastCalledWith(
      null,
      changeDetails("close-press"),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("keeps the open item when items are added before it", async () => {
    const { rerender } = render(<TestLightbox />);
    await openLightboxAt("Open image 2 of 3");
    expect(screen.getByRole("img", { name: "Second" })).toBeTruthy();

    const added = { id: "z", src: "/z.jpg", alt: "New" };
    rerender(<TestLightbox items={[added, ...ITEMS]} />);

    expect(screen.getByTestId("counter").textContent).toBe("3 / 4");
    expect(screen.getByRole("img", { name: "Second" })).toBeTruthy();
  });

  it("moves to the neighbour when the open item is removed", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<TestLightbox onValueChange={onValueChange} />);
    await openLightboxAt("Open image 2 of 3");

    rerender(
      <TestLightbox
        items={ITEMS.filter((item) => item.id !== "b")}
        onValueChange={onValueChange}
      />,
    );

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        "c",
        changeDetails("missing"),
      ),
    );
    expect(screen.getByTestId("counter").textContent).toBe("2 / 2");
  });

  it("closes when the last item is removed", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <TestLightbox items={ITEMS.slice(0, 1)} onValueChange={onValueChange} />,
    );
    await openLightboxAt("Open image 1 of 1");

    rerender(<TestLightbox items={[]} onValueChange={onValueChange} />);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onValueChange).toHaveBeenLastCalledWith(
      null,
      changeDetails("missing"),
    );
  });

  it("reads values with itemToValue", async () => {
    const onValueChange = vi.fn();
    const photos = [
      { key: 10, src: "/a.jpg", alt: "First" },
      { key: 20, src: "/b.jpg", alt: "Second" },
    ];
    render(
      <Lightbox.Root
        items={photos}
        itemToValue={(photo) => photo.key}
        loadMedia={() => Promise.resolve(null)}
        onValueChange={onValueChange}
      >
        <Lightbox.Trigger value={20} />
        <Lightbox.Portal>
          <Lightbox.Popup />
        </Lightbox.Portal>
      </Lightbox.Root>,
    );

    await openLightboxAt("Open image 2 of 2");
    expect(onValueChange).toHaveBeenCalledWith(
      20,
      changeDetails("trigger-press"),
    );
  });

  it("throws when an item has no id and there is no itemToValue", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<Lightbox.Root items={[{ src: "/a.jpg" }]} />)).toThrow(
      "Base UI: Lightbox item has no value.",
    );
    consoleError.mockRestore();
  });

  it("throws when a part is used outside Lightbox.Root", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    function Reader() {
      useLightboxRootContext();
      return null;
    }

    expect(() => render(<Reader />)).toThrow(
      "Base UI: LightboxRootContext is missing.",
    );
    expect(() => render(<Lightbox.Next />)).toThrow(
      "Lightbox parts must be placed within <Lightbox.Root>.",
    );
    consoleError.mockRestore();
  });
});

describe("Lightbox.createHandle", () => {
  it("links triggers outside the root, and opens and closes from code", async () => {
    const handle = Lightbox.createHandle();
    const onValueChange = vi.fn();
    render(
      <div>
        <Lightbox.Trigger handle={handle} value="b" />
        <Lightbox.Root
          handle={handle}
          items={ITEMS}
          loadMedia={loadMedia}
          onValueChange={onValueChange}
        >
          <Lightbox.Portal>
            <Lightbox.Popup />
          </Lightbox.Portal>
        </Lightbox.Root>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Open image 2 of 3" });
    expect(handle.isOpen).toBe(false);

    await openLightboxAt("Open image 2 of 3");
    expect(onValueChange).toHaveBeenLastCalledWith(
      "b",
      changeDetails("trigger-press"),
    );
    expect(trigger.hasAttribute("data-popup-open")).toBe(true);
    expect(handle.isOpen).toBe(true);

    act(() => handle.close());
    expect(onValueChange).toHaveBeenLastCalledWith(
      null,
      changeDetails("imperative-action"),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);

    await act(async () => handle.open("c"));
    await screen.findByRole("dialog");
    expect(onValueChange).toHaveBeenLastCalledWith(
      "c",
      changeDetails("imperative-action"),
    );
  });
});

describe("Lightbox.Root onValueChange", () => {
  it.each([
    {
      reason: "next-press",
      run: () =>
        fireEvent.click(screen.getByRole("button", { name: "Next image" })),
      value: "b",
    },
    {
      reason: "keyboard",
      run: () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "End" }),
      value: "c",
    },
    {
      reason: "escape-key",
      run: () =>
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }),
      value: null,
    },
  ] as const)(
    "reports $reason as the reason",
    async ({ reason, run, value }) => {
      const onValueChange = vi.fn();
      render(<TestLightbox onValueChange={onValueChange} />);
      await openLightboxAt("Open image 1 of 3");

      await act(async () => {
        run();
      });

      expect(onValueChange).toHaveBeenLastCalledWith(
        value,
        changeDetails(reason),
      );
    },
  );

  it("keeps the viewer closed when the app cancels the opening", async () => {
    const onValueChange = vi.fn(
      (value: unknown, eventDetails: LightboxRootChangeEventDetails) => {
        eventDetails.cancel();
      },
    );
    render(<TestLightbox onValueChange={onValueChange} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays open when the app cancels Escape", async () => {
    render(
      <TestLightbox
        onValueChange={(value, eventDetails) => {
          if (eventDetails.reason === "escape-key") eventDetails.cancel();
        }}
      />,
    );
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    await waitForFrames();

    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("calls onOpenChangeComplete once the viewer has opened, and once it has closed", async () => {
    const onOpenChangeComplete = vi.fn();
    render(<TestLightbox onOpenChangeComplete={onOpenChangeComplete} />);
    expect(onOpenChangeComplete).not.toHaveBeenCalled();

    await openLightboxAt("Open image 1 of 3");
    await waitFor(() =>
      expect(onOpenChangeComplete).toHaveBeenLastCalledWith(true),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitFor(() =>
      expect(onOpenChangeComplete).toHaveBeenLastCalledWith(false),
    );
    expect(onOpenChangeComplete).toHaveBeenCalledTimes(2);
  });
});

describe("Lightbox.Root closeTarget", () => {
  /** On screen: every element is a 100 px square in a 400 × 300 page. */
  function mockLayout() {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 10, y: 10, width: 100, height: 100 }),
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
  }

  type MockAnimation = {
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
    currentTime: number;
    finished: Promise<void>;
    finish: () => void;
    cancel: () => void;
  };

  /** Records each animation: jsdom has no Web Animations. Each ends on `finish()`. */
  function mockAnimate(): MockAnimation[] {
    const animations: MockAnimation[] = [];
    const animate = vi.fn(
      (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
        let finish = () => {};
        const finished = new Promise<void>((resolve) => {
          finish = resolve;
        });
        const animation: MockAnimation = {
          keyframes,
          options,
          currentTime: 0,
          finished,
          finish,
          cancel: () => {},
        };
        animations.push(animation);
        return animation as unknown as Animation;
      },
    );
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    onTestFinished(() => {
      delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    });
    return animations;
  }

  async function finish(animation: MockAnimation | undefined) {
    await act(async () => {
      animation?.finish();
    });
  }

  /**
   * Opens on the first item and lets it land, presses `key`, and closes.
   * Returns the close flight.
   */
  async function closeAfter(
    animations: MockAnimation[],
    key: "ArrowRight" | "End",
  ): Promise<MockAnimation | undefined> {
    await openLightboxAt("Open image 1 of 3");
    await finish(animations.at(-1));
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key });
    });
    const count = animations.length;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    return animations[count];
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flies back onto the trigger of the item shown, hidden while it flies", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox />);
    const second = screen.getByRole("button", { name: "Open image 2 of 3" });

    const flight = await closeAfter(animations, "ArrowRight");

    expect(flight?.keyframes).toHaveLength(LIGHTBOX_FLIGHT_FRAMES);
    // The easing is in the keyframes, sampled on screen.
    expect(flight?.options.easing).toBe("linear");
    expect(flight?.keyframes.at(-1)?.opacity).toBe(1);
    expect(second.hasAttribute("data-flying")).toBe(true);

    const count = animations.length;
    await finish(flight);
    // Its own image: no fade after landing.
    expect(animations).toHaveLength(count);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it.each([
    {
      name: "Nearest",
      props: { closeTarget: "nearest", triggerValues: ["a"] },
      key: "End",
      empty: "Open image 1 of 3",
      filled: [],
    },
    {
      name: "Opener",
      props: { closeTarget: "opener" },
      key: "ArrowRight",
      empty: "Open image 1 of 3",
      filled: ["Open image 2 of 3"],
    },
    {
      name: "Active",
      props: {},
      key: "ArrowRight",
      empty: "Open image 2 of 3",
      filled: ["Open image 1 of 3"],
    },
  ] as const)(
    "keeps the slot the image will land in empty with $name, without a drag",
    async ({ props, key, empty, filled }) => {
      render(<TestLightbox {...props} />);
      const landing = screen.getByRole("button", { name: empty });
      const others = filled.map((name) => screen.getByRole("button", { name }));
      await openLightboxAt("Open image 1 of 3");

      await act(async () => {
        fireEvent.keyDown(screen.getByRole("dialog"), { key });
      });

      expect(landing.hasAttribute("data-popup-open")).toBe(true);
      for (const other of others)
        expect(other.hasAttribute("data-popup-open")).toBe(false);
    },
  );

  it("lets go of the opening flight's last frame, so its clip can't cut off the zoom", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox />);

    await openLightboxAt("Open image 1 of 3");
    const opening = animations.at(-1);
    await finish(opening);
    const image = screen.getByRole("img", { name: "First" });
    const zoomValue = screen.getByTestId("zoom-value");
    expect(zoomValue.textContent).toBe("100%");
    expect(image.style.transform).toBe("");
    expect(opening?.options.fill).toBe("none");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    });
    await waitFor(() =>
      expect(image.style.transform).toBe(
        "translate3d(0px, 0px, 0px) scale(1.5)",
      ),
    );
    expect(zoomValue.textContent).toBe("150%");
    expect(screen.getByRole("dialog").hasAttribute("data-zoomed")).toBe(true);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "0" });
    await waitFor(() =>
      expect(image.style.transform).toBe("translate3d(0px, 0px, 0px) scale(1)"),
    );
    expect(zoomValue.textContent).toBe("100%");
    expect(screen.getByRole("dialog").hasAttribute("data-zoomed")).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    // Closing holds it until the viewer unmounts.
    expect(animations.at(-1)?.options.fill).toBe("forwards");
  });

  it("keeps the same popup while the image flies back", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    await finish(animations.at(-1));
    const popup = screen.getByRole("dialog");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    // Not closed and opened again around the flight: the flight animates
    // this popup's media.
    expect(screen.getByRole("dialog")).toBe(popup);
  });

  it("fades out where it is when the item shown has no trigger", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox triggerValues={["a"]} />);
    const first = screen.getByRole("button", { name: "Open image 1 of 3" });

    const flight = await closeAfter(animations, "ArrowRight");

    expect(flight?.keyframes.at(-1)?.opacity).toBe(0);
    expect(first.hasAttribute("data-flying")).toBe(false);
  });

  it.each([
    {
      name: "Opener",
      props: { closeTarget: "opener" },
      key: "ArrowRight" as const,
    },
    {
      name: "Nearest",
      props: { closeTarget: "nearest", triggerValues: ["a"] },
      key: "End" as const,
    },
  ] as const)(
    "turns into the trigger $name picks during the flight, and lands in its empty slot",
    async ({ props, key }) => {
      mockLayout();
      const animations = mockAnimate();
      render(<TestLightbox {...props} />);
      const first = screen.getByRole("button", { name: "Open image 1 of 3" });

      const flight = await closeAfter(animations, key);

      // The trigger shows another image: hidden while the image flies to it.
      expect(first.hasAttribute("data-flying")).toBe(true);
      expect(flight?.keyframes.at(-1)?.opacity).toBe(1);
      // A copy of it flies along on the same path and fades in over the image.
      const crossfade = animations.at(-1);
      expect(crossfade).not.toBe(flight);
      expect(crossfade?.options.duration).toBe(flight?.options.duration);
      expect(crossfade?.keyframes[0]?.opacity).toBe(0);
      expect(crossfade?.keyframes.at(-1)?.opacity).toBe(1);
      // The copy: the trigger's label, hidden from assistive technology.
      const standIn = screen
        .getByRole("dialog")
        .querySelector<HTMLElement>(
          `[aria-label="${first.getAttribute("aria-label")}"]`,
        );
      expect(standIn).not.toBe(first);
      expect(standIn?.getAttribute("aria-hidden")).toBe("true");
      expect(standIn?.hasAttribute("inert")).toBe(true);
      expect(standIn?.hasAttribute("data-flying")).toBe(false);

      await finish(flight);
      // Landed: the trigger shows again, and the copy is gone.
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(first.hasAttribute("data-flying")).toBe(false);
      expect(standIn?.isConnected).toBe(false);
    },
  );

  it("crossfades with a crossfade trigger of the item shown, both ways", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox crossfade />);
    const first = screen.getByRole("button", { name: "Open image 1 of 3" });
    expect(first.hasAttribute("data-crossfade")).toBe(true);
    const findCopy = () =>
      screen
        .queryByRole("dialog")
        ?.querySelector(`[aria-label="${first.getAttribute("aria-label")}"]`);

    // Opening: a copy of the trigger flies along and fades out.
    await openLightboxAt("Open image 1 of 3");
    const opening = animations.at(-1);
    expect(opening?.keyframes[0]?.opacity).toBe(1);
    expect(opening?.keyframes.at(-1)?.opacity).toBe(0);
    expect(findCopy()).toBeTruthy();
    await finish(animations.at(-2));
    // The image has taken its place: the copy is gone.
    expect(findCopy()).toBeFalsy();

    // Closing, on its own item: the copy fades in over the image.
    const count = animations.length;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    const closing = animations[count + 1];
    expect(closing?.keyframes[0]?.opacity).toBe(0);
    expect(closing?.keyframes.at(-1)?.opacity).toBe(1);
    expect(findCopy()).toBeTruthy();
  });

  it("doesn't crossfade with its own trigger without crossfade", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox />);

    await openLightboxAt("Open image 1 of 3");

    expect(animations).toHaveLength(1);
  });

  it.each([
    { name: "where it started", time: 0, frame: 0 },
    { name: "at rest", time: LIGHTBOX_FLIGHT_DURATION, frame: -1 },
  ])(
    "closes from where the opening flight is, $name",
    async ({ time, frame }) => {
      mockLayout();
      const animations = mockAnimate();
      render(<TestLightbox />);
      await openLightboxAt("Open image 1 of 3");
      const opening = animations.at(-1);
      if (opening) opening.currentTime = time;

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
      });

      const closing = animations.at(-1);
      expect(closing).not.toBe(opening);
      const start = opening?.keyframes.at(frame);
      expect(closing?.keyframes[0]?.transform).toBe(start?.transform);
      expect(closing?.keyframes[0]?.clipPath).toBe(start?.clipPath);
    },
  );

  it("writes the flight's length and curve on the popup and the backdrop", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");

    for (const testId of ["popup", "backdrop"]) {
      const element = screen.getByTestId(testId);
      expect(element.style.getPropertyValue("--lightbox-flight-duration")).toBe(
        `${LIGHTBOX_FLIGHT_DURATION}ms`,
      );
      expect(element.style.getPropertyValue("--lightbox-flight-easing")).toBe(
        LIGHTBOX_FLIGHT_EASING,
      );
    }
  });

  it("starts the flight back at the speed of a pull to dismiss", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    await finish(animations.at(-1));
    const viewport = screen.getByTestId("viewport");
    // Spied: jsdom's style parser drops `linear()`, which browsers keep.
    const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");

    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 200, 200);
      firePointer("pointerMove", viewport, 200, 300);
      firePointer("pointerUp", viewport, 200, 300);
    });

    // A spring that starts at the finger's speed, for transitions to follow.
    expect(setProperty).toHaveBeenCalledWith(
      "--lightbox-flight-easing",
      expect.stringMatching(/^linear\(/),
    );
  });

  it.each([
    { closeTarget: "active", focused: "Open image 2 of 3" },
    { closeTarget: "opener", focused: "Open image 1 of 3" },
  ] as const)(
    "returns focus where the image lands with $closeTarget",
    async ({ closeTarget, focused }) => {
      render(<TestLightbox closeTarget={closeTarget} />);
      const target = screen.getByRole("button", { name: focused });
      await openLightboxAt("Open image 1 of 3");
      await act(async () => {
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
      });

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(target);
    },
  );

  it("returns focus to the nearest trigger with Nearest", async () => {
    render(
      <TestLightbox
        closeTarget={"nearest"}
        items={[...ITEMS, { id: "d", src: "/d.jpg", alt: "Fourth" }]}
        triggerValues={["a", "b"]}
      />,
    );
    const second = screen.getByRole("button", { name: "Open image 2 of 4" });
    await openLightboxAt("Open image 1 of 4");
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "End" });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(second);
  });
});

describe("Lightbox.Root scrollToTrigger", () => {
  function mockScrollIntoView() {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    onTestFinished(() => {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    });
    return scrollIntoView;
  }

  it("scrolls the page to the trigger of the item shown, at once", async () => {
    const scrollIntoView = mockScrollIntoView();
    render(<TestLightbox />);
    const third = screen.getByRole("button", { name: "Open image 3 of 3" });
    await openLightboxAt("Open image 1 of 3");
    scrollIntoView.mockClear();

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "End" });
    });

    expect(scrollIntoView.mock.contexts).toEqual([third]);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  });

  it("scrolls to the trigger closeTarget picks", async () => {
    const scrollIntoView = mockScrollIntoView();
    render(<TestLightbox closeTarget={"nearest"} triggerValues={["a"]} />);
    const first = screen.getByRole("button", { name: "Open image 1 of 3" });
    await openLightboxAt("Open image 1 of 3");
    scrollIntoView.mockClear();

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "End" });
    });

    expect(scrollIntoView.mock.contexts).toEqual([first]);
  });

  it("doesn't scroll when false", async () => {
    const scrollIntoView = mockScrollIntoView();
    render(<TestLightbox scrollToTrigger={false} />);
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "End" });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
