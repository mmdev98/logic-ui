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
  loadImages,
  openLightboxAt,
  TestLightbox,
  type TestItem,
  waitForFrames,
} from "../test-utils";

describe("Lightbox.Root", () => {
  it("returns focus to the trigger when the viewer closes", async () => {
    const onOpenChange = vi.fn();
    render(<TestLightbox onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Open image 1 of 3" });
    await openLightboxAt("Open image 1 of 3");
    expect(document.activeElement).not.toBe(trigger);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      changeDetails("close-press"),
    );
    expect(document.activeElement).toBe(trigger);
  });

  it("opens with defaultOpen on defaultValue", async () => {
    render(<TestLightbox defaultOpen defaultValue="b" />);
    await screen.findByRole("dialog");
    await loadImages();
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
    expect(screen.getByTestId("popup").style.opacity).toBe("");
  });

  it("shows the first item until a value is set", async () => {
    render(<TestLightbox defaultOpen />);
    await screen.findByRole("dialog");
    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
  });

  it("can control open", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <TestLightbox open={false} onOpenChange={onOpenChange} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<TestLightbox open onOpenChange={onOpenChange} />);
    await screen.findByRole("dialog");
    await loadImages();
    expect(screen.getByTestId("popup").style.opacity).toBe("");

    // A controlled viewer only closes through the prop.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitForFrames();
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      changeDetails("close-press"),
    );
    expect(screen.getByTestId("popup").hasAttribute("data-ending-style")).toBe(
      false,
    );

    rerender(<TestLightbox open={false} onOpenChange={onOpenChange} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("can control the value", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <TestLightbox value="c" onValueChange={onValueChange} />,
    );
    await openLightboxAt("Open image 3 of 3");
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

    rerender(<TestLightbox value="b" onValueChange={onValueChange} />);
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("keeps the value on the last item after closing", async () => {
    const onValueChange = vi.fn();
    render(<TestLightbox onValueChange={onValueChange} />);
    await openLightboxAt("Open image 2 of 3");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(
      "b",
      changeDetails("trigger-press"),
    );
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
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <TestLightbox items={ITEMS.slice(0, 1)} onOpenChange={onOpenChange} />,
    );
    await openLightboxAt("Open image 1 of 1");

    rerender(<TestLightbox items={[]} onOpenChange={onOpenChange} />);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
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
    const onOpenChange = vi.fn();
    render(
      <div>
        <Lightbox.Trigger handle={handle} value="b" />
        <Lightbox.Root
          handle={handle}
          items={ITEMS}
          onValueChange={onValueChange}
          onOpenChange={onOpenChange}
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
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
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
    expect(onOpenChange).toHaveBeenLastCalledWith(
      true,
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

  it("keeps the viewer closed when the app cancels the item it opens on", async () => {
    const onValueChange = vi.fn(
      (value: unknown, eventDetails: LightboxRootChangeEventDetails) => {
        eventDetails.cancel();
      },
    );
    const onOpenChange = vi.fn();
    render(
      <TestLightbox
        onValueChange={onValueChange}
        onOpenChange={onOpenChange}
      />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 2 of 3" }),
      );
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Lightbox.Root onOpenChange", () => {
  it("reports escape-key as the reason", async () => {
    const onOpenChange = vi.fn();
    render(<TestLightbox onOpenChange={onOpenChange} />);
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });

    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      changeDetails("escape-key"),
    );
  });

  it("keeps the viewer closed when the app cancels the opening", async () => {
    const onOpenChange = vi.fn(
      (open: boolean, eventDetails: LightboxRootChangeEventDetails) => {
        eventDetails.cancel();
      },
    );
    render(<TestLightbox onOpenChange={onOpenChange} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays open when the app cancels Escape", async () => {
    render(
      <TestLightbox
        onOpenChange={(open, eventDetails) => {
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
    expect(screen.getByTestId("popup").hasAttribute("data-ending-style")).toBe(
      false,
    );
  });

  it("waits for the Promise it returns before opening", async () => {
    let resolve: () => void = () => {};
    const onOpenChangeComplete = vi.fn();
    render(
      <TestLightbox
        onOpenChange={() =>
          new Promise<void>((done) => {
            resolve = done;
          })
        }
        onOpenChangeComplete={onOpenChangeComplete}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Open image 1 of 3" });

    await openLightboxAt("Open image 1 of 3");
    // Loaded, but still waiting on the app.
    expect(trigger.hasAttribute("data-pending")).toBe(true);
    expect(screen.getByTestId("popup").style.opacity).toBe("0");

    await act(async () => resolve());
    await waitForFrames();

    expect(trigger.hasAttribute("data-pending")).toBe(false);
    expect(screen.getByTestId("popup").style.opacity).toBe("");
    expect(onOpenChangeComplete).toHaveBeenLastCalledWith(true);
  });

  it("waits for the Promise it returns before closing", async () => {
    let resolve: () => void = () => {};
    render(
      <TestLightbox
        onOpenChange={(open) =>
          open
            ? undefined
            : new Promise<void>((done) => {
                resolve = done;
              })
        }
      />,
    );
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitForFrames();
    expect(screen.getByTestId("popup").hasAttribute("data-ending-style")).toBe(
      false,
    );

    await act(async () => resolve());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("drops an opening the app cancels after an await", async () => {
    let finish: () => void = () => {};
    const onOpenChangeComplete = vi.fn();
    render(
      <TestLightbox
        onOpenChange={async (open, eventDetails) => {
          await new Promise<void>((done) => {
            finish = done;
          });
          eventDetails.cancel();
        }}
        onOpenChangeComplete={onOpenChangeComplete}
      />,
    );

    await openLightboxAt("Open image 1 of 3");
    expect(screen.getByRole("dialog")).toBeTruthy();

    await act(async () => finish());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChangeComplete).not.toHaveBeenCalled();
  });

  it("keeps the viewer open when the app cancels a close after an await", async () => {
    let finish: () => void = () => {};
    const onOpenChange = vi.fn(
      async (open: boolean, eventDetails: LightboxRootChangeEventDetails) => {
        if (open) return;
        await new Promise<void>((done) => {
          finish = done;
        });
        eventDetails.cancel();
      },
    );
    render(<TestLightbox onOpenChange={onOpenChange} />);
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await act(async () => finish());
    await waitForFrames();

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("popup").hasAttribute("data-ending-style")).toBe(
      false,
    );
    // It never closed, so nothing reopens it.
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("closes after the time limit when the Promise doesn't settle, and ignores a later cancel", async () => {
    let details: LightboxRootChangeEventDetails | null = null;
    render(
      <TestLightbox
        onOpenChange={(open, eventDetails) => {
          if (open) return undefined;
          details = eventDetails;
          return new Promise<void>(() => {});
        }}
      />,
    );
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    act(() => details?.cancel());
    await waitForFrames();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens after the time limit when the image never loads", async () => {
    render(<TestLightbox />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });
    expect(screen.getByTestId("popup").style.opacity).toBe("0");

    await waitFor(
      () => expect(screen.getByTestId("popup").style.opacity).toBe(""),
      { timeout: 4000 },
    );
  }, 8000);

  it("logs a rejected Promise and opens anyway", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const error = new Error("Not ready");
    render(<TestLightbox onOpenChange={() => Promise.reject(error)} />);

    await openLightboxAt("Open image 1 of 3");
    await waitForFrames();

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(screen.getByTestId("popup").style.opacity).toBe("");
  });

  it("replaces an opening still waiting with a close", async () => {
    const onOpenChange = vi.fn((open: boolean) =>
      open ? new Promise<void>(() => {}) : undefined,
    );
    const onOpenChangeComplete = vi.fn();
    render(
      <TestLightbox
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      />,
    );
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });

    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      changeDetails("escape-key"),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChangeComplete).not.toHaveBeenCalled();
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

  it("writes where the image flies, for content that goes with it", async () => {
    mockLayout();
    const animations = mockAnimate();
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    await finish(animations.at(-1));
    const popup = screen.getByTestId("popup");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    // The 100 px trigger, a quarter of the 400 px image at rest.
    expect(popup.style.getPropertyValue("--lightbox-flight-scale")).toBe(
      "0.25",
    );
    expect(
      popup.style.getPropertyValue("--lightbox-flight-movement-x"),
    ).toMatch(/^-?\d+px$/);
    expect(
      popup.style.getPropertyValue("--lightbox-flight-movement-y"),
    ).toMatch(/^-?\d+px$/);
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

describe("Lightbox.Root with a portal that stays mounted", () => {
  it("opens and closes with a portal that stays mounted", async () => {
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.Trigger value="a" />
        <Lightbox.Portal keepMounted>
          <Lightbox.Popup data-testid="popup">
            <Lightbox.Viewport>
              {(item: TestItem) => (
                <Lightbox.Slide>
                  <Lightbox.Media>
                    <img src={item.src} alt={item.alt} />
                  </Lightbox.Media>
                </Lightbox.Slide>
              )}
            </Lightbox.Viewport>
            <Lightbox.Close>Close</Lightbox.Close>
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>,
    );
    const popup = screen.getByTestId("popup");
    const image = popup.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("First");
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });
    await screen.findByRole("dialog");
    expect(screen.getByTestId("popup")).toBe(popup);
    expect(popup.querySelector("img")).toBe(image);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByTestId("popup", { hidden: true } as never)).toBe(popup);
  });
});

describe("Lightbox.Root opening a viewer kept mounted while closed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flies the media from its trigger, not from where it was measured hidden", async () => {
    // Hidden, everything is zero; shown, the slide is 400 × 300. The trigger
    // is a 100 px square.
    const hidden = (element: Element) => element.closest("[hidden]") !== null;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return hidden(this) ? 0 : 400;
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return hidden(this) ? 0 : 300;
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.tagName === "BUTTON")
          return DOMRect.fromRect({ x: 10, y: 10, width: 100, height: 100 });
        const size = hidden(this) ? 0 : 1;
        return DOMRect.fromRect({
          x: 0,
          y: 0,
          width: 400 * size,
          height: 300 * size,
        });
      },
    );
    const animate = vi.fn(
      (keyframes: Keyframe[]) =>
        ({
          keyframes,
          finished: new Promise(() => {}),
          cancel: () => {},
        }) as unknown as Animation,
    );
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    onTestFinished(() => {
      delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    });
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.Trigger value="a" />
        <Lightbox.Portal keepMounted>
          <Lightbox.Popup>
            <Lightbox.Viewport>
              {(item: TestItem) => (
                <Lightbox.Slide>
                  <Lightbox.Media>
                    <img src={item.src} alt={item.alt} />
                  </Lightbox.Media>
                </Lightbox.Slide>
              )}
            </Lightbox.Viewport>
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>,
    );

    await openLightboxAt("Open image 1 of 3");
    // It waits for the popup to be shown, then measured.
    await waitFor(() => expect(animate).toHaveBeenCalled());

    // The flight starts on the trigger: scaled down to it, not at full size.
    const [keyframes] = animate.mock.calls[0] ?? [];
    const scale = Number(
      /scale\(([\d.]+)\)/.exec(String(keyframes?.[0]?.transform))?.[1],
    );
    expect(scale).toBeLessThan(1);
  });
});
