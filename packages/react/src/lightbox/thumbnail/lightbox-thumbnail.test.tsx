import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lightbox } from "..";
import {
  ITEMS,
  openLightboxAt,
  TestLightbox,
  type TestItem,
} from "../test-utils";

function renderWithThumbnails(
  thumbnail: (item: TestItem) => React.ReactNode,
  onValueChange?: () => void,
): void {
  render(
    <TestLightbox
      onValueChange={onValueChange}
      popupChildren={
        <Lightbox.ThumbnailList>{thumbnail}</Lightbox.ThumbnailList>
      }
    />,
  );
}

describe("Lightbox.Thumbnail", () => {
  it("is a tab, selected and controlling the slide while its item is shown", async () => {
    renderWithThumbnails(() => <Lightbox.Thumbnail />);
    await openLightboxAt("Open image 1 of 3");
    const first = screen.getByRole("tab", { name: "Show image 1 of 3" });
    const second = screen.getByRole("tab", { name: "Show image 2 of 3" });

    expect(first).toHaveProperty("type", "button");
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.hasAttribute("data-active")).toBe(true);
    const controls = first.getAttribute("aria-controls");
    expect(controls).toBe(screen.getByTestId("slide-a").id);
    expect(second.getAttribute("aria-selected")).toBe("false");
    expect(second.hasAttribute("aria-controls")).toBe(false);
  });

  it("shows its item when clicked", async () => {
    renderWithThumbnails(() => <Lightbox.Thumbnail />);
    await openLightboxAt("Open image 1 of 3");
    const third = screen.getByRole("tab", { name: "Show image 3 of 3" });
    expect(third.hasAttribute("data-active")).toBe(false);

    await act(async () => fireEvent.click(third));

    expect(screen.getByTestId("counter").textContent).toBe("3 / 3");
    expect(third.hasAttribute("data-active")).toBe(true);
  });

  it("reports a thumbnail press as the reason", async () => {
    const onValueChange = vi.fn();
    renderWithThumbnails(() => <Lightbox.Thumbnail />, onValueChange);
    await openLightboxAt("Open image 1 of 3");
    const third = screen.getByRole("tab", { name: "Show image 3 of 3" });

    await act(async () => fireEvent.click(third));

    expect(onValueChange).toHaveBeenLastCalledWith(
      "c",
      expect.objectContaining({
        reason: "thumbnail-press",
        trigger: third,
      }),
    );
  });

  it("keeps the caller's label and onClick", async () => {
    const onClick = vi.fn();
    renderWithThumbnails((item) => (
      <Lightbox.Thumbnail aria-label={item.alt} onClick={onClick} />
    ));
    await openLightboxAt("Open image 1 of 3");

    await act(async () =>
      fireEvent.click(screen.getByRole("tab", { name: "Second" })),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("counter").textContent).toBe("2 / 3");
  });

  it("throws outside Lightbox.ThumbnailList", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <Lightbox.Root items={ITEMS}>
          <Lightbox.Thumbnail />
        </Lightbox.Root>,
      ),
    ).toThrow("Base UI: LightboxThumbnailListContext is missing.");
    consoleError.mockRestore();
  });
});
