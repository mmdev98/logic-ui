import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toolbar } from "@base-ui/react/toolbar";
import { Lightbox } from "..";
import {
  clickButton,
  ITEMS,
  openLightboxAt,
  TestLightbox,
} from "../test-utils";

describe("Lightbox.Popup", () => {
  it("renders a dialog named by the title", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    expect(screen.getByRole("dialog", { name: "Photos" })).toBeTruthy();
  });

  it("closes with Escape", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it.each([
    { key: "ArrowRight", from: 0, to: "2 / 3" },
    { key: "ArrowLeft", from: 1, to: "1 / 3" },
    { key: "End", from: 0, to: "3 / 3" },
    { key: "Home", from: 2, to: "1 / 3" },
  ])("moves with $key", async ({ key, from, to }) => {
    render(<TestLightbox />);
    await openLightboxAt(`Open image ${from + 1} of 3`);
    expect(screen.getByTestId("counter").textContent).not.toBe(to);

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key });
    });

    expect(screen.getByTestId("counter").textContent).toBe(to);
  });

  it("leaves the arrow keys to a Base UI toolbar inside it", async () => {
    render(
      <TestLightbox
        popupChildren={
          <Toolbar.Root>
            <Toolbar.Button>Rotate</Toolbar.Button>
            <Toolbar.Button>Share</Toolbar.Button>
          </Toolbar.Root>
        }
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const rotate = screen.getByRole("button", { name: "Rotate" });
    act(() => rotate.focus());

    await act(async () => {
      fireEvent.keyDown(rotate, { key: "ArrowRight" });
    });

    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
  });

  it("takes focus when it opens, so the keys work with a toolbar first", async () => {
    render(
      <TestLightbox
        popupChildren={
          <Toolbar.Root>
            <Toolbar.Button>Rotate</Toolbar.Button>
          </Toolbar.Root>
        }
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(popup));

    await act(async () => {
      fireEvent.keyDown(popup, { key: "ArrowRight" });
    });

    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("focuses initialFocus instead when given", async () => {
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.Trigger value="a" />
        <Lightbox.Portal>
          <Lightbox.Popup initialFocus={true}>
            <Lightbox.Close>Close</Lightbox.Close>
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>,
    );
    await openLightboxAt("Open image 1 of 3");

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Close" }),
      ),
    );
  });

  it("leaves the arrow keys to a text field inside it", async () => {
    render(<TestLightbox popupChildren={<input aria-label="Comment" />} />);
    await openLightboxAt("Open image 1 of 3");
    const input = screen.getByRole("textbox", { name: "Comment" });
    act(() => input.focus());

    await act(async () => {
      fireEvent.keyDown(input, { key: "ArrowRight" });
    });

    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
  });

  it("leaves the arrow keys to a video player inside it", async () => {
    render(
      <TestLightbox
        popupChildren={<video data-testid="player" controls tabIndex={0} />}
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const player = screen.getByTestId("player");
    act(() => player.focus());

    await act(async () => {
      fireEvent.keyDown(player, { key: "ArrowRight" });
    });

    expect(screen.getByTestId("counter").textContent).toBe("1 / 3");
  });

  it("exposes data-zoomed and resets the zoom with 0", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByTestId("popup");
    expect(popup.hasAttribute("data-zoomed")).toBe(false);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" });
    await waitFor(() => expect(popup.hasAttribute("data-zoomed")).toBe(true));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "0" });
    await waitFor(() => expect(popup.hasAttribute("data-zoomed")).toBe(false));
  });
});

describe("Lightbox.Popup CSS variables", () => {
  it("follows the zoom with --lightbox-zoom-scale and --lightbox-zoom-progress", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByTestId("popup");
    expect(popup.style.getPropertyValue("--lightbox-zoom-scale")).toBe("1");
    expect(popup.style.getPropertyValue("--lightbox-zoom-progress")).toBe("0");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "+" });

    // One step of 0.5 towards the largest scale of 4.
    await waitFor(() =>
      expect(popup.style.getPropertyValue("--lightbox-zoom-scale")).toBe("1.5"),
    );
    expect(popup.style.getPropertyValue("--lightbox-zoom-progress")).toBe(
      "0.167",
    );
  });
});

describe("Lightbox.Popup state", () => {
  it("exposes the side the item shown came from", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByTestId("popup");
    expect(popup.getAttribute("data-activation-direction")).toBe("none");

    await clickButton("Next image");

    expect(popup.getAttribute("data-activation-direction")).toBe("right");
  });

  it("passes the lightbox state to its className and render functions", async () => {
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.Trigger value="a" />
        <Lightbox.Portal>
          <Lightbox.Popup
            className={(state) =>
              `${state.open ? "open" : "closed"} ${state.zoomed ? "zoomed" : "rest"} ${state.activationDirection}`
            }
            render={(props, state) => (
              <section
                {...props}
                data-controls={String(!state.controlsHidden)}
              />
            )}
          >
            <Lightbox.Next />
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>,
    );
    await openLightboxAt("Open image 1 of 3");
    const popup = screen.getByRole("dialog");
    expect(popup.tagName).toBe("SECTION");
    expect(popup.className).toBe("open rest none");
    expect(popup.getAttribute("data-controls")).toBe("true");

    await clickButton("Next image");

    expect(popup.className).toBe("open rest right");
  });
});
