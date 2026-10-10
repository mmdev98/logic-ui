import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toolbar } from "@base-ui/react/toolbar";
import { Lightbox } from "..";
import { ITEMS, openLightboxAt, TestLightbox } from "../test-utils";

describe("Lightbox.Next", () => {
  it("shows the next item and is disabled on the last one", async () => {
    render(<TestLightbox />);
    await openLightboxAt("Open image 2 of 3");
    const next = screen.getByRole("button", { name: "Next image" });
    expect(next).toHaveProperty("disabled", false);
    expect(next.getAttribute("aria-keyshortcuts")).toBe("ArrowRight");

    await act(async () => fireEvent.click(next));

    expect(screen.getByTestId("counter").textContent).toBe("3 / 3");
    expect(next).toHaveProperty("disabled", true);
    expect(next.hasAttribute("data-disabled")).toBe(true);
  });

  it("renders as a Base UI toolbar button that stays focusable while disabled", async () => {
    render(
      <TestLightbox
        popupChildren={
          <Toolbar.Root>
            <Lightbox.Next
              render={<Toolbar.Button />}
              data-testid="toolbar-next"
            />
          </Toolbar.Root>
        }
      />,
    );
    await openLightboxAt("Open image 3 of 3");
    const next = screen.getByTestId("toolbar-next");

    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(next.hasAttribute("data-disabled")).toBe(true);
    expect(next.hasAttribute("disabled")).toBe(false);
  });

  it("keeps the caller's onClick", () => {
    const onClick = vi.fn();
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.Next onClick={onClick} />
        <Lightbox.Counter />
      </Lightbox.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2 / 3")).toBeTruthy();
  });
});
