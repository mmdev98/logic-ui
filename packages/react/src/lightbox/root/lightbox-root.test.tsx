import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox, useLightboxRootContext } from "..";
import { ITEMS, loadMedia, openLightboxAt, TestLightbox } from "../test-utils";

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
    expect(onValueChange).toHaveBeenLastCalledWith(null);
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
    expect(onValueChange).toHaveBeenLastCalledWith("b");
    expect(screen.getByTestId("counter").textContent).toBe("3 / 3");

    // Closing only reports `null`.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
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

    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("c"));
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
    expect(onValueChange).toHaveBeenLastCalledWith(null);
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
    expect(onValueChange).toHaveBeenCalledWith(20);
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
    expect(onValueChange).toHaveBeenLastCalledWith("b");
    expect(trigger.hasAttribute("data-popup-open")).toBe(true);
    expect(handle.isOpen).toBe(true);

    act(() => handle.close());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);

    await act(async () => handle.open("c"));
    await screen.findByRole("dialog");
    expect(onValueChange).toHaveBeenLastCalledWith("c");
  });
});
