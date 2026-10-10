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

/** Offset of the image while it is dragged to close the viewer. */
export type LightboxDismiss = {
  x: number;
  y: number;
  /** Extra scale applied while dragging, 1 at rest. */
  scale: number;
};

/** Loading state of the media in a `Lightbox.Slide`. */
export enum LightboxMediaStatus {
  /** No `Lightbox.Media` in the slide. */
  Idle = "idle",
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}

/** Where the viewer is in its open and close animation. */
export enum LightboxPhase {
  Closed = "closed",
  /** The image flies from its trigger, or fades in. */
  Opening = "opening",
  Open = "open",
  /** The image flies back to its trigger, or fades out. */
  Closing = "closing",
}

/**
 * Side of the previous item the item shown came from, on screen: `right` when
 * the next item was shown in a left-to-right layout, `left` in a
 * right-to-left one. Set as `data-activation-direction`, like Base UI's tabs.
 */
export enum LightboxActivationDirection {
  Left = "left",
  Right = "right",
  /** The viewer just opened, or the item shown didn't move. */
  None = "none",
}
