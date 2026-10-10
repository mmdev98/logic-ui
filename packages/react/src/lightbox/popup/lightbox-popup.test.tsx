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
  loadMedia,
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
      <Lightbox.Root items={ITEMS} loadMedia={loadMedia}>
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
