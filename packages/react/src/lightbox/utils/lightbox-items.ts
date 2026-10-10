import {
  LIGHTBOX_PRELOAD_TIMEOUT,
  LIGHTBOX_RENDERED_NEIGHBORS,
} from "../constants";
import type { LightboxMediaSize, LightboxItemValue } from "../types";
import { clampLightboxValue } from "./lightbox-geometry";

export function clampLightboxIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return clampLightboxValue(Math.round(index), 0, count - 1);
}

export function isLightboxItemRendered(
  index: number,
  activeIndex: number,
): boolean {
  return Math.abs(index - activeIndex) <= LIGHTBOX_RENDERED_NEIGHBORS;
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
 * The default `loadMedia`: loads the item's `src` and resolves with its
 * natural size, or `null` when the item has no `src`, the image fails, or it
 * takes longer than `LIGHTBOX_PRELOAD_TIMEOUT`. Never rejects.
 */
export function loadLightboxMedia(
  item: unknown,
): Promise<LightboxMediaSize | null> {
  const src = readLightboxField(item, "src");
  if (typeof src !== "string" || src === "") return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(null), LIGHTBOX_PRELOAD_TIMEOUT);
    const finish = (size: LightboxMediaSize | null) => {
      clearTimeout(timer);
      resolve(size);
    };
    image.onload = () =>
      finish({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => finish(null);
    image.src = src;
  });
}

/** Id of a slide, which its thumbnail controls. */
export function getLightboxSlideId(rootId: string, index: number): string {
  return `${rootId}-slide-${index}`;
}
