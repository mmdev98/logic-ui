import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Lightbox } from "..";
import { ITEMS } from "../test-utils";

describe("Lightbox.ZoomValue", () => {
  it("shows the scale as a percentage", () => {
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.ZoomValue />
      </Lightbox.Root>,
    );
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("formats the scale with a function child", () => {
    render(
      <Lightbox.Root items={ITEMS}>
        <Lightbox.ZoomValue>{(state) => `×${state.scale}`}</Lightbox.ZoomValue>
      </Lightbox.Root>,
    );
    expect(screen.getByText("×1")).toBeTruthy();
  });
});
