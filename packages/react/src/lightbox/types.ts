/**
 * Identifies an item, as returned by `itemToValue`: stable when items are
 * added, removed or reordered.
 */
export type LightboxItemValue = string | number;

/** Natural size of a media element, in px. */
export type LightboxMediaSize = {
  width: number;
  height: number;
};

/** Box in px, as from `getBoundingClientRect`. */
export type LightboxRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Box of a `Lightbox.Media` inside its `Lightbox.Slide`, in px from the slide's corner. */
export type LightboxMediaLayout = LightboxRect & {
  slideWidth: number;
  slideHeight: number;
};

/** Zoom of the active image: a scale around its centre, then a pan in px. */
export type LightboxZoom = {
  scale: number;
  x: number;
  y: number;
};

/** Offset of the image while it is pulled to dismiss the viewer. */
export type LightboxDismiss = {
  x: number;
  y: number;
  /** Extra scale applied while swiping, 1 at rest. */
  scale: number;
};
