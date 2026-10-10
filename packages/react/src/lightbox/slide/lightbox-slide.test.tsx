import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Lightbox } from "..";
import { ITEMS, openLightboxAt, TestLightbox } from "../test-utils";

describe("Lightbox.Slide", () => {
  it("renders a labelled slide and marks the active one", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const first = screen.getByTestId("slide-a");
    const second = screen.getByTestId("slide-b");

    expect(first.getAttribute("role")).toBe("group");
    expect(first.getAttribute("aria-roledescription")).toBe("slide");
    expect(first.getAttribute("aria-label")).toBe("1 of 3");
    expect(first.hasAttribute("data-active")).toBe(true);
    expect(second.hasAttribute("data-active")).toBe(false);
    expect(second.getAttribute("aria-hidden")).toBe("true");
    expect(first.hasAttribute("inert")).toBe(false);
    // Nothing in it takes focus, such as the controls of a video.
    expect(second.hasAttribute("inert")).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    });
    expect(second.hasAttribute("data-active")).toBe(true);
  });

  it("exposes data-loading, then data-error when its image fails", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 1 of 3");
    const item = screen.getByTestId("slide-a");
    expect(item.hasAttribute("data-loading")).toBe(true);
    expect(item.getAttribute("aria-busy")).toBe("true");
    expect(item.hasAttribute("data-error")).toBe(false);

    fireEvent.error(screen.getByRole("img", { name: "First" }));

    expect(item.hasAttribute("data-loading")).toBe(false);
    expect(item.hasAttribute("data-error")).toBe(true);
  });

  it("exposes the side the item shown came from", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 2 of 3");
    expect(
      screen.getByTestId("slide-b").getAttribute("data-activation-direction"),
    ).toBe("none");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    });
    expect(
      screen.getByTestId("slide-c").getAttribute("data-activation-direction"),
    ).toBe("right");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    });
    expect(
      screen.getByTestId("slide-b").getAttribute("data-activation-direction"),
    ).toBe("left");
  });

  it("mirrors the side in a right-to-left layout", async () => {
    render(
      <DirectionProvider direction="rtl">
        <TestLightbox />
      </DirectionProvider>,
    );
    await openLightboxAt("Open image 1 of 3");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    });

    expect(
      screen.getByTestId("slide-b").getAttribute("data-activation-direction"),
    ).toBe("left");
  });

  it("is described by its caption", async () => {
    render(
      <TestLightbox
        itemChildren={(item) => (
          <Lightbox.Caption>
            {item.id === "a" ? "Valley at dawn" : undefined}
          </Lightbox.Caption>
        )}
      />,
    );
    await openLightboxAt("Open image 1 of 3");
    const caption = screen.getByText("Valley at dawn");

    expect(screen.getByTestId("slide-a").getAttribute("aria-describedby")).toBe(
      caption.id,
    );
    // An item without a caption renders none, and nothing describes its slide.
    expect(screen.getByTestId("slide-b").hasAttribute("aria-describedby")).toBe(
      false,
    );
  });

  it("throws outside Lightbox.Viewport", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <Lightbox.Root items={ITEMS}>
          <Lightbox.Slide />
        </Lightbox.Root>,
      ),
    ).toThrow("Base UI: LightboxViewportContext is missing.");
    consoleError.mockRestore();
  });
});
