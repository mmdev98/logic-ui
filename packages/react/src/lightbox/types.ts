import type { BaseUIChangeEventDetails } from "@base-ui/react/types";

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

/**
 * Loading state of the media in a `Lightbox.Slide`.
 *
 * - `"idle"`: No `Lightbox.Media` in the slide.
 * - `"loading"`: The media is loading; the slide and the media have `data-loading`.
 * - `"loaded"`: The media has loaded, or has nothing to load.
 * - `"error"`: The media failed to load; the slide and the media have `data-error`.
 */
export type LightboxMediaStatus = "idle" | "loading" | "loaded" | "error";

/**
 * Where the viewer is in its open and close animation.
 *
 * - `"closed"`: The viewer is not shown.
 * - `"opening"`: The image flies from its trigger, or fades in.
 * - `"open"`: The image has landed in the viewer.
 * - `"closing"`: The image flies back to its trigger, or fades out.
 */
export type LightboxPhase = "closed" | "opening" | "open" | "closing";

/**
 * Side of the previous item the item shown came from, on screen. Set as
 * `data-activation-direction`, like Base UI's tabs.
 *
 * - `"left"`: It came from the left: after Previous in a left-to-right layout, Next in a right-to-left one.
 * - `"right"`: It came from the right: after Next in a left-to-right layout, Previous in a right-to-left one.
 * - `"none"`: The viewer just opened, or the item shown didn't move.
 */
export type LightboxActivationDirection = "left" | "right" | "none";

/**
 * Why the item open in the viewer changed, in `onValueChange`. The values
 * are Base UI's where it has one (`escape-key`, `close-press`), so a
 * reason compares with the same string as in a Base UI dialog.
 *
 * - `"trigger-press"`: A `Lightbox.Trigger` was pressed.
 * - `"swipe"`: A swipe to the next or previous item, or a pull to dismiss.
 * - `"keyboard"`: A viewer shortcut: ← → Home End.
 * - `"list-navigation"`: The arrow keys in a `Lightbox.ThumbnailList` with `activateOnFocus`.
 * - `"thumbnail-press"`: A `Lightbox.Thumbnail` was pressed.
 * - `"previous-press"`: `Lightbox.Previous` was pressed.
 * - `"next-press"`: `Lightbox.Next` was pressed.
 * - `"close-press"`: `Lightbox.Close` was pressed.
 * - `"escape-key"`: Escape was pressed.
 * - `"outside-press"`: A press outside the popup.
 * - `"focus-out"`: Focus left the popup.
 * - `"imperative-action"`: A call on the `handle`: `open()` or `close()`.
 * - `"missing"`: The open item was removed from `items`: the viewer shows its neighbour, or closes.
 * - `"none"`: Another cause, such as a Base UI dialog change without a reason.
 */
export type LightboxRootChangeEventReason =
  | "trigger-press"
  | "swipe"
  | "keyboard"
  | "list-navigation"
  | "thumbnail-press"
  | "previous-press"
  | "next-press"
  | "close-press"
  | "escape-key"
  | "outside-press"
  | "focus-out"
  | "imperative-action"
  | "missing"
  | "none";

/**
 * Details of a change of the open item: its `reason`, the native `event`,
 * and the element it came from (`trigger`). Call `cancel()` to keep the
 * current item; a cancelled swipe or pull to dismiss springs back.
 */
export type LightboxRootChangeEventDetails =
  BaseUIChangeEventDetails<LightboxRootChangeEventReason>;

/**
 * Where the image flies back to when the viewer closes, and where focus returns.
 *
 * - `"active"`: The trigger of the item shown. Without one on the page, the image fades out. For a grid with a trigger per item.
 * - `"opener"`: The trigger that opened the viewer, whichever item is shown. For one cover that opens a whole album.
 * - `"nearest"`: The trigger of the item shown, or else the trigger of the nearest item that has one. For a grid that shows a few items and a "+5" tile.
 */
export type LightboxCloseTarget = "active" | "opener" | "nearest";
