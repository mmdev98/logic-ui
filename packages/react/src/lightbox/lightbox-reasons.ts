/**
 * Why the item open in the viewer changed, as passed in `eventDetails.reason`.
 * Imported as `* as REASONS`, like Base UI's `reason-parts`: the parts write
 * `REASONS.swipe`, and `LightboxRootChangeEventReason` is a union of their types.
 * The values are Base UI's where it has one, so a reason compares with the same
 * string as in a Base UI dialog.
 */

/** A `Lightbox.Trigger` was pressed. */
export const triggerPress = "trigger-press" as const;

/** A swipe to the next or previous item, or a pull to dismiss. */
export const swipe = "swipe" as const;

/** A viewer shortcut: ← → Home End. */
export const keyboard = "keyboard" as const;

/** The arrow keys in a `Lightbox.ThumbnailList` with `activateOnFocus`. */
export const listNavigation = "list-navigation" as const;

/** A `Lightbox.Thumbnail` was pressed. */
export const thumbnailPress = "thumbnail-press" as const;

/** `Lightbox.Previous` was pressed. */
export const previousPress = "previous-press" as const;

/** `Lightbox.Next` was pressed. */
export const nextPress = "next-press" as const;

/** `Lightbox.Close` was pressed. */
export const closePress = "close-press" as const;

/** Escape was pressed. */
export const escapeKey = "escape-key" as const;

/** A press outside the popup. */
export const outsidePress = "outside-press" as const;

/** Focus left the popup. */
export const focusOut = "focus-out" as const;

/** A call on the `handle`: `open()` or `close()`. */
export const imperativeAction = "imperative-action" as const;

/** The open item was removed from `items`: the viewer shows its neighbour, or closes. */
export const missing = "missing" as const;

/** Another cause, such as a Base UI dialog change without a reason. */
export const none = "none" as const;
