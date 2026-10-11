import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Lightbox } from "..";
import { ITEMS, loadMedia, openLightboxAt, TestLightbox } from "../test-utils";

afterEach(() => {
  loadMedia.mockClear();
});

describe("Lightbox.Trigger", () => {
  it("renders a labelled button per item that does not submit forms", () => {
    render(<TestLightbox />);
    const trigger = screen.getByRole("button", { name: "Open image 1 of 3" });
    expect(trigger).toHaveProperty("type", "button");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("loads the image, then opens the viewer on its item", async () => {
    const onValueChange = vi.fn();
    render(<TestLightbox onValueChange={onValueChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Open image 2 of 3" });

    await openLightboxAt("Open image 2 of 3");

    expect(loadMedia).toHaveBeenCalledWith(ITEMS[1]);

    expect(onValueChange).toHaveBeenCalledWith(
      "b",
      expect.objectContaining({
        reason: "trigger-press",
        trigger,
      }),
    );
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
    expect(screen.getByRole("img", { name: "Second" })).toBeTruthy();
  });

  it("exposes data-pending while the image loads, and disables the others", async () => {
    let resolve: (value: null) => void = () => {};
    loadMedia.mockImplementationOnce(
      () => new Promise((done) => (resolve = done)),
    );
    render(<TestLightbox />);
    const trigger = screen.getByRole("button", { name: "Open image 1 of 3" });
    const other = screen.getByRole("button", { name: "Open image 2 of 3" });
    expect(trigger.hasAttribute("data-pending")).toBe(false);

    fireEvent.click(trigger);

    await waitFor(() =>
      expect(trigger.hasAttribute("data-pending")).toBe(true),
    );
    expect(trigger.getAttribute("aria-busy")).toBe("true");
    expect(other.hasAttribute("data-disabled")).toBe(true);

    await act(async () => resolve(null));
    await screen.findByRole("dialog");
    expect(trigger.hasAttribute("data-pending")).toBe(false);
  });

  it("marks the trigger of the image the viewer shows with data-popup-open", async () => {
    render(<TestLightbox />);
    const first = screen.getByRole("button", { name: "Open image 1 of 3" });
    const second = screen.getByRole("button", { name: "Open image 2 of 3" });
    expect(second.hasAttribute("data-popup-open")).toBe(false);

    await openLightboxAt("Open image 2 of 3");
    expect(second.hasAttribute("data-popup-open")).toBe(true);
    expect(first.hasAttribute("data-popup-open")).toBe(false);

    // It follows the image as the viewer moves to another one.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    });
    expect(first.hasAttribute("data-popup-open")).toBe(true);
    expect(second.hasAttribute("data-popup-open")).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(first.hasAttribute("data-popup-open")).toBe(false);
  });

  it("renders only its children when the value has no item", () => {
    render(
      <Lightbox.Root items={[]}>
        <Lightbox.Trigger value="a">
          <span>Avatar</span>
        </Lightbox.Trigger>
      </Lightbox.Root>,
    );
    expect(screen.getByText("Avatar")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the caller's handlers with the render prop", async () => {
    const onClick = vi.fn();
    render(
      <Lightbox.Root items={ITEMS} loadMedia={loadMedia}>
        <Lightbox.Trigger value="a" render={<a href="#a" />} onClick={onClick}>
          Open
        </Lightbox.Trigger>
        <Lightbox.Portal>
          <Lightbox.Popup />
        </Lightbox.Portal>
      </Lightbox.Root>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Open"));
    });

    expect(onClick).toHaveBeenCalled();
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("renders a button that does nothing while its handle has no root", () => {
    const handle = Lightbox.createHandle();
    render(
      <Lightbox.Trigger handle={handle} value="a">
        Open
      </Lightbox.Trigger>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });

    fireEvent.click(trigger);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("throws outside Lightbox.Root without a handle", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<Lightbox.Trigger value="a" />)).toThrow(
      "Lightbox.Trigger must be placed within <Lightbox.Root>, " +
        "or be given the `handle` passed to <Lightbox.Root>.",
    );
    consoleError.mockRestore();
  });
});
