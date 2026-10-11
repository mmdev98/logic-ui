import { afterEach, describe, expect, it, vi } from "vitest";
import type { LightboxMediaLayout } from "../types";
import {
  clampLightboxZoom,
  getLightboxContainedSize,
  getLightboxPanBounds,
  getLightboxRelativeRect,
  getLightboxVisibleArea,
  intersectLightboxRects,
  isLightboxRectVisible,
  rubberbandLightboxOverflow,
  zoomLightboxAroundPoint,
} from "./lightbox-geometry";

/** A 400 × 300 image centred in an 800 × 600 item. */
const LAYOUT: LightboxMediaLayout = {
  left: 200,
  top: 150,
  width: 400,
  height: 300,
  slideWidth: 800,
  slideHeight: 600,
};

describe("getLightboxContainedSize", () => {
  it("fits the aspect ratio inside the box", () => {
    expect(getLightboxContainedSize(2, 800, 600)).toEqual({
      width: 800,
      height: 400,
    });
    expect(getLightboxContainedSize(0.5, 800, 600)).toEqual({
      width: 300,
      height: 600,
    });
  });
});

describe("getLightboxPanBounds", () => {
  it("doesn't pan an image smaller than its item", () => {
    expect(getLightboxPanBounds(LAYOUT, 1.5)).toEqual({
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    });
  });

  it("lets a zoomed image pan until its edges meet the item's", () => {
    // 1200 × 900 at scale 3: 200 px over each side horizontally, 150 vertically.
    expect(getLightboxPanBounds(LAYOUT, 3)).toEqual({
      minX: -200,
      maxX: 200,
      minY: -150,
      maxY: 150,
    });
  });

  it.each([
    { top: 100, scale: 1.5, offset: 0 },
    { top: 100, scale: 2, offset: 50 },
    { top: 200, scale: 2, offset: -50 },
    { top: 0, scale: 1.5, offset: 75 },
    { top: 300, scale: 1.5, offset: -75 },
  ])(
    "keeps an off-center image inside its item at $top and scale $scale",
    ({ top, scale, offset }) => {
      const layout = { ...LAYOUT, top };
      expect(getLightboxPanBounds(layout, scale)).toEqual({
        minX: 0,
        maxX: 0,
        minY: offset,
        maxY: offset,
      });
      const zoom = clampLightboxZoom({ scale, x: 999, y: -999 }, layout, 1, 4);
      const imageTop =
        top + layout.height / 2 - (layout.height * scale) / 2 + zoom.y;
      expect(imageTop).toBeGreaterThanOrEqual(0);
      expect(imageTop + layout.height * scale).toBeLessThanOrEqual(
        layout.slideHeight,
      );
    },
  );
});

describe("zoomLightboxAroundPoint", () => {
  it("keeps the point under the cursor", () => {
    const point = { x: 500, y: 300 };
    const zoom = zoomLightboxAroundPoint(
      { scale: 1, x: 0, y: 0 },
      2,
      point,
      LAYOUT,
    );
    // The point was 100 px right of the centre; at scale 2 it would be 200,
    // so the image moves 100 px left.
    expect(zoom).toEqual({ scale: 2, x: -100, y: 0 });
  });
});

describe("clampLightboxZoom", () => {
  it("drops the pan back at rest", () => {
    expect(
      clampLightboxZoom({ scale: 0.5, x: 40, y: 10 }, LAYOUT, 1, 4),
    ).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it("caps the scale and the pan", () => {
    expect(
      clampLightboxZoom({ scale: 9, x: 999, y: -999 }, LAYOUT, 1, 4),
    ).toEqual({ scale: 4, x: 400, y: -300 });
  });
});

describe("rubberbandLightboxOverflow", () => {
  it("moves less than the finger and keeps the sign", () => {
    const moved = rubberbandLightboxOverflow(200, 400);
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(200);
    expect(rubberbandLightboxOverflow(-200, 400)).toBe(-moved);
  });
});

describe("getLightboxRelativeRect", () => {
  it("places a rect in its container, moved by an offset", () => {
    expect(
      getLightboxRelativeRect(
        { left: 120, top: 80, width: 60, height: 40 },
        { left: 100, top: 50, width: 500, height: 100 },
        { left: 2, top: 2 },
      ),
    ).toEqual({ left: 18, top: 28, width: 60, height: 40 });
  });
});

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
});

describe("isLightboxRectVisible", () => {
  const area = box(0, 0, 400, 300);

  it.each([
    { name: "inside", rect: box(10, 10, 50, 50), visible: true },
    { name: "partly past an edge", rect: box(380, 10, 50, 50), visible: true },
    { name: "past the right edge", rect: box(400, 10, 50, 50), visible: false },
    { name: "above the top", rect: box(10, -50, 50, 50), visible: false },
    { name: "empty", rect: box(10, 10, 0, 50), visible: false },
  ])("is $visible for a box $name", ({ rect, visible }) => {
    expect(isLightboxRectVisible(rect, area)).toBe(visible);
  });

  it("measures against an area away from the corner", () => {
    expect(
      isLightboxRectVisible(box(10, 10, 50, 50), box(100, 0, 200, 300)),
    ).toBe(false);
  });
});

describe("intersectLightboxRects", () => {
  it("returns the overlap", () => {
    expect(
      intersectLightboxRects(box(0, 0, 100, 100), box(50, 25, 100, 100)),
    ).toEqual(box(50, 25, 50, 75));
  });

  it("is empty when the boxes don't overlap", () => {
    const overlap = intersectLightboxRects(
      box(0, 0, 100, 100),
      box(200, 0, 100, 100),
    );
    expect(overlap.width).toBe(0);
  });
});

describe("getLightboxVisibleArea", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  function mockRects(rects: Map<Element, ReturnType<typeof box>>) {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const rect = rects.get(this) ?? box(0, 0, 0, 0);
        return DOMRect.fromRect({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      },
    );
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      800,
    );
    vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
      600,
    );
  }

  it("is the window when nothing clips the element", () => {
    const wrapper = document.createElement("div");
    const element = document.createElement("button");
    wrapper.append(element);
    document.body.append(wrapper);
    mockRects(new Map([[wrapper, box(10, 10, 100, 100)]]));

    expect(getLightboxVisibleArea(element)).toEqual(box(0, 0, 800, 600));
  });

  it("is cut by each ancestor that clips its content", () => {
    const list = document.createElement("div");
    list.style.overflowY = "auto";
    const card = document.createElement("div");
    // Longhands: jsdom doesn't expand the `overflow` shorthand.
    card.style.overflowX = "hidden";
    card.style.overflowY = "hidden";
    const element = document.createElement("button");
    card.append(element);
    list.append(card);
    document.body.append(list);
    mockRects(
      new Map([
        [list, box(100, 100, 300, 200)],
        [card, box(50, 150, 300, 300)],
      ]),
    );

    expect(getLightboxVisibleArea(element)).toEqual(box(100, 150, 250, 150));
  });
});
