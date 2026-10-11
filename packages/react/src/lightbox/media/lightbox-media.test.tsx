import { act, fireEvent, render, screen } from "@testing-library/react";
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
  firePointer,
  ITEMS,
  openLightboxAt,
  pressTrigger,
  TestLightbox,
  type TestItem,
} from "../test-utils";

function renderWithMedia(media: (item: TestItem) => React.ReactNode): void {
  render(
    <Lightbox.Root items={ITEMS}>
      <Lightbox.Trigger value="a" />
      <Lightbox.Portal>
        <Lightbox.Popup data-testid="popup">
          <Lightbox.Viewport data-testid="viewport">
            {(item: TestItem) => (
              <Lightbox.Slide data-testid={`slide-${item.id}`}>
                {media(item)}
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.ZoomIn />
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>,
  );
}

function wait(ms: number) {
  return act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }),
  );
}

describe("Lightbox.Media", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a box that its image fills, not draggable", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const media = screen.getByTestId("media-a");
    const image = screen.getByRole("img", { name: "First" });

    expect(media.tagName).toBe("DIV");
    expect(media.hasAttribute("data-active")).toBe(true);
    expect(image.parentElement).toBe(media);
    expect(image.style.width).toBe("100%");
    expect(image.style.height).toBe("100%");
    expect(image.getAttribute("draggable")).toBe("false");
  });

  it("exposes data-loading until its image loads", async () => {
    render(<TestLightbox />);
    await pressTrigger("Open image 1 of 3");
    const media = screen.getByTestId("media-a");
    expect(media.hasAttribute("data-loading")).toBe(true);

    fireEvent.load(screen.getByRole("img", { name: "First" }));

    expect(media.hasAttribute("data-loading")).toBe(false);
    expect(media.hasAttribute("data-error")).toBe(false);
  });

  it("exposes data-error when its image fails", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const media = screen.getByTestId("media-a");
    expect(media.hasAttribute("data-error")).toBe(false);

    fireEvent.error(screen.getByRole("img", { name: "First" }));

    expect(media.hasAttribute("data-error")).toBe(true);
    expect(screen.getByTestId("slide-a").hasAttribute("data-error")).toBe(true);
  });

  it("loads again when the image's src changes", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const media = screen.getByTestId("media-a");
    const image = screen.getByRole("img", { name: "First" });
    fireEvent.load(image);
    expect(media.hasAttribute("data-loading")).toBe(false);

    await act(async () => {
      image.setAttribute("src", "/a-large.jpg");
    });

    expect(media.hasAttribute("data-loading")).toBe(true);
  });

  it("ignores the load events of images nested in its other content", async () => {
    render(
      <TestLightbox
        mediaChildren={() => (
          <p>
            <img alt="Broken" /> Can't load this photo
          </p>
        )}
      />,
    );
    await pressTrigger("Open image 1 of 3");
    const media = screen.getByTestId("media-a");

    fireEvent.load(screen.getByRole("img", { name: "Broken" }));

    expect(media.hasAttribute("data-loading")).toBe(true);
  });

  it("counts content without a media element as loaded", async () => {
    renderWithMedia((item) => (
      <Lightbox.Media data-testid={`media-${item.id}`}>
        <div>3D model</div>
      </Lightbox.Media>
    ));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });
    const media = await screen.findByTestId("media-a");

    expect(media.hasAttribute("data-loading")).toBe(false);
    expect(media.hasAttribute("data-error")).toBe(false);
  });

  it("pauses a video when its slide is no longer shown", async () => {
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => {});
    renderWithMedia((item) => (
      <Lightbox.Media>
        <video data-testid={`video-${item.id}`} src={`/${item.id}.mp4`} />
      </Lightbox.Media>
    ));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });
    const first = await screen.findByTestId("video-a");
    expect(pause.mock.contexts).not.toContain(first);

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    });

    expect(pause.mock.contexts).toContain(first);
  });

  it("loads a video until it has data, and doesn't zoom it", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    renderWithMedia((item) => (
      <Lightbox.Media data-testid={`media-${item.id}`}>
        <video data-testid={`video-${item.id}`} src={`/${item.id}.mp4`} />
      </Lightbox.Media>
    ));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });
    const media = await screen.findByTestId("media-a");
    expect(media.hasAttribute("data-loading")).toBe(true);

    fireEvent(screen.getByTestId("video-a"), new Event("loadeddata"));

    expect(media.hasAttribute("data-loading")).toBe(false);
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    expect(zoomIn).toHaveProperty("disabled", true);
  });

  it("keeps its size and position over the caller's style", async () => {
    renderWithMedia((item) => (
      <Lightbox.Media
        data-testid={`media-${item.id}`}
        width={800}
        height={600}
        style={{ position: "static", transition: "opacity 1s" }}
      >
        <img src={item.src} alt={item.alt} />
      </Lightbox.Media>
    ));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Open image 1 of 3" }),
      );
    });
    const media = await screen.findByTestId("media-a");

    expect(media.style.position).toBe("absolute");
    expect(media.style.transition).toBe("opacity 1s");
  });

  it("throws outside Lightbox.Slide", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <Lightbox.Root items={ITEMS}>
          <Lightbox.Media />
        </Lightbox.Root>,
      ),
    ).toThrow("Base UI: LightboxSlideContext is missing.");
    consoleError.mockRestore();
  });
});

describe("Lightbox.Media gestures", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves with the pull to dismiss, with all of its content", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const media = screen.getByTestId("media-a");
    const viewport = screen.getByTestId("viewport");
    expect(media.style.translate).toBe("");

    await act(async () => {
      firePointer("pointerDown", viewport, 200, 100);
      firePointer("pointerMove", viewport, 205, 140);
      firePointer("pointerMove", viewport, 210, 160);
    });

    expect(media.style.translate).toBe("10px 60px");
    expect(Number(media.style.scale)).toBeLessThan(1);
  });

  it("zooms its image, not the box", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const image = screen.getByRole("img", { name: "First" });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" });
    await wait(400);

    expect(image.style.transform).toContain("scale(1.5)");
    expect(screen.getByTestId("media-a").style.transform).toBe("");
  });

  it("doesn't zoom a failed image", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    fireEvent.error(screen.getByRole("img", { name: "First" }));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" });
    await wait(400);

    expect(screen.getByTestId("popup").hasAttribute("data-zoomed")).toBe(false);
  });
});

describe("Lightbox.Media flight", () => {
  /** Records each flight: jsdom has no Web Animations. They never end. */
  function mockAnimate() {
    const animate = vi.fn(function (this: HTMLElement) {
      return {
        finished: new Promise(() => {}),
        cancel: () => {},
      } as unknown as Animation;
    });
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    onTestFinished(() => {
      delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    });
    return animate;
  }

  it("flies the box in, whatever it shows", async () => {
    const animate = mockAnimate();
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");

    expect(animate.mock.contexts.at(-1)).toBe(screen.getByTestId("media-a"));
  });

  it("flies back from where the drag and the zoom left it", async () => {
    // A 400 × 300 image in a 400 × 300 slide.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const animate = mockAnimate();
    // The opening flight lands at once, so the viewer is open to zoom.
    animate.mockImplementationOnce(
      () =>
        ({
          finished: Promise.resolve(),
          cancel: () => {},
        }) as unknown as Animation,
    );
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const media = screen.getByTestId("media-a");
    const image = screen.getByRole("img", { name: "First" });
    // Zoomed to 150%, then dragged down a little.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" });
    await wait(400);
    expect(image.style.transform).toContain("scale(1.5)");
    media.style.translate = "10px 60px";
    media.style.scale = "0.9";
    animate.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    expect(animate.mock.contexts[0]).toBe(media);
    const [keyframes] = animate.mock.calls[0] as unknown as [Keyframe[]];
    // The zoom inside the dragged box: moved by the drag, scaled by both.
    expect(keyframes[0]?.transform).toMatch(
      /^translate3d\(10px, 60px, 0px\) scale\(1\.35\d*\)$/,
    );
    // The flight takes the drag and the zoom over as one `transform`.
    expect(media.style.translate).toBe("");
    expect(image.style.transform).toBe("");
  });
});
