import { LIGHTBOX_RENDERED_NEIGHBORS } from "../constants";
import type { LightboxMediaSize, LightboxItemValue } from "../types";
import { clampLightboxValue } from "./lightbox-geometry";

export function clampLightboxIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return clampLightboxValue(Math.round(index), 0, count - 1);
}

/** Whether the item at `index` is rendered: within `neighbors` of the active one. */
export function isLightboxItemRendered(
  index: number,
  activeIndex: number,
  neighbors: number = LIGHTBOX_RENDERED_NEIGHBORS,
): boolean {
  return Math.abs(index - activeIndex) <= neighbors;
}

function readLightboxField(item: unknown, field: string): unknown {
  return typeof item === "object" && item !== null
    ? (item as Record<string, unknown>)[field]
    : undefined;
}

/** The default `itemToValue`: the item's `id`. */
export function getLightboxItemValue(item: unknown): LightboxItemValue {
  const id = readLightboxField(item, "id");
  if (typeof id !== "string" && typeof id !== "number") {
    throw new Error(
      "Base UI: Lightbox item has no value. " +
        "Each item needs a stable value to be opened and kept open while the items change. " +
        "Give each item an `id`, or pass `itemToValue` to <Lightbox.Root>.",
    );
  }
  return id;
}

/** Width / height from the loaded size, then the given size, else `null`. */
export function getLightboxAspectRatio(
  loaded: LightboxMediaSize | undefined,
  width: number | undefined,
  height: number | undefined,
): number | null {
  const ratioWidth = loaded?.width || width;
  const ratioHeight = loaded?.height || height;
  return ratioWidth && ratioHeight ? ratioWidth / ratioHeight : null;
}

/** Reads a numeric `width` or `height` prop, which HTML also allows as a string. */
export function toLightboxDimension(
  value: number | string | undefined,
): number | undefined {
  const number = typeof value === "string" ? parseFloat(value) : value;
  return number && Number.isFinite(number) ? number : undefined;
}

/**
 * Index of the item nearest to `index` for which `matches` is true, `index`
 * itself first. On a tie, the earlier item wins. `-1` when none matches.
 */
export function getLightboxNearestIndex(
  index: number,
  count: number,
  matches: (index: number) => boolean,
): number {
  for (let distance = 0; distance < count; distance += 1) {
    const before = index - distance;
    const after = index + distance;
    if (before >= 0 && before < count && matches(before)) return before;
    if (after !== before && after >= 0 && after < count && matches(after))
      return after;
  }
  return -1;
}

/** Id of a slide, which its thumbnail controls. */
export function getLightboxSlideId(rootId: string, index: number): string {
  return `${rootId}-slide-${index}`;
}
