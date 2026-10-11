"use client";

import {
  Dialog,
  type DialogPopupProps,
  type DialogPopupState,
} from "@base-ui/react/dialog";
import { ownerWindow } from "@base-ui/utils/owner";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { LIGHTBOX_KEYBOARD_PAN_STEP } from "../constants";
import {
  addLightboxState,
  type LightboxStateProps,
} from "../lightbox-dialog-state";
import { getLightboxStateAttributes } from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import type { LightboxRootActivationDirection } from "../root/lightbox-root";
import * as REASONS from "../lightbox-reasons";
import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";

export type LightboxPopupState = DialogPopupState & {
  /** Whether the active image is zoomed in. */
  zoomed: boolean;
  /** Whether a tap hid the controls. */
  controlsHidden: boolean;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxRootActivationDirection;
};

export interface LightboxPopupProps
  extends
    Omit<DialogPopupProps, "className" | "style" | "render">,
    LightboxStateProps<LightboxPopupState> {}

type LightboxPopupKeyboardEvent = Parameters<
  NonNullable<DialogPopupProps["onKeyDown"]>
>[0];

/**
 * Widgets that use the arrow keys themselves: a Base UI toolbar, a menu, a
 * slider, a text field. Inside one, the keys stay theirs.
 */
const KEYBOARD_WIDGETS = [
  '[role="toolbar"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  '[role="grid"]',
  '[role="tablist"]',
  '[role="radiogroup"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
  // A focused player seeks and changes the volume with the arrow keys.
  "video[controls]",
  "audio[controls]",
  "input",
  "textarea",
  "select",
  '[contenteditable="true"]',
].join(",");

function isInLightboxKeyboardWidget(
  target: EventTarget,
  popup: Element,
): boolean {
  // Not `instanceof Element`: it fails for elements of another window (iframes).
  const element = target as Partial<Element>;
  if (target === popup || typeof element.closest !== "function") return false;
  const widget = element.closest(KEYBOARD_WIDGETS);
  return widget !== null && popup.contains(widget);
}

/**
 * The full-screen viewer. Place `Lightbox.Viewport` and the controls inside.
 * It takes focus when it opens, so its keys work at once; Tab moves on to
 * the controls. Pass `initialFocus` to focus another element.
 *
 * Keys: ← → previous / next (pan while zoomed), ↑ ↓ pan, Home / End first /
 * last, + − zoom, 0 reset zoom, Esc close. Inside a widget that uses these
 * keys itself (a Base UI `Toolbar`, `Lightbox.ThumbnailList`, a slider, a text
 * field), they stay that widget's.
 *
 * Has `data-zoomed` while the image is zoomed, `data-controls-hidden` after a
 * tap hides the controls, and `data-ending-style` while the image flies back
 * (fade the controls then, not the popup: the image is inside it). Gets
 * `--lightbox-dismiss-progress` while the image is pulled to dismiss,
 * `--lightbox-swipe-movement-x` and `--lightbox-swipe-progress` while a swipe
 * moves the slides, and has `data-swiping` during a drag: turn transitions
 * off then.
 * Renders a `<div>` element.
 */
export function LightboxPopup(props: LightboxPopupProps): React.ReactElement {
  const { ref, onKeyDown, className, style, render, ...elementProps } = props;

  const {
    items,
    phase,
    zoomed,
    controlsHidden,
    activationDirection,
    getFinalFocus,
    goTo,
    goToPrevious,
    goToNext,
    zoomIn,
    zoomOut,
    resetZoom,
    panBy,
    setPopupElement,
  } = useLightboxRootContext();
  const popupRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, popupRef, setPopupElement);

  const extra = React.useMemo(
    () => ({ zoomed, controlsHidden, activationDirection }),
    [zoomed, controlsHidden, activationDirection],
  );

  const handleKeyDown = (event: LightboxPopupKeyboardEvent) => {
    // The caller's handler runs first and can prevent the shortcut.
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isInLightboxKeyboardWidget(event.target, event.currentTarget)
    )
      return;
    const isRtl =
      ownerWindow(event.currentTarget).getComputedStyle(event.currentTarget)
        .direction === "rtl";
    const step = LIGHTBOX_KEYBOARD_PAN_STEP;
    const eventDetails = createLightboxChangeEventDetails(
      REASONS.keyboard,
      event.nativeEvent,
    );

    const actions: Record<string, () => void> = {
      ArrowLeft: () => {
        if (zoomed) panBy(step, 0);
        else if (isRtl) goToNext(eventDetails);
        else goToPrevious(eventDetails);
      },
      ArrowRight: () => {
        if (zoomed) panBy(-step, 0);
        else if (isRtl) goToPrevious(eventDetails);
        else goToNext(eventDetails);
      },
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
      Home: () => goTo(0, eventDetails),
      End: () => goTo(items.length - 1, eventDetails),
      "+": zoomIn,
      "=": zoomIn,
      "-": zoomOut,
      "0": resetZoom,
    };

    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <Dialog.Popup
      ref={mergedRef}
      // The popup itself, not its first control: the keys work at once, even
      // with a toolbar inside, which keeps the arrow keys while it has focus.
      initialFocus={popupRef}
      finalFocus={() => getFinalFocus() ?? true}
      data-zoomed={zoomed ? "" : undefined}
      data-controls-hidden={controlsHidden ? "" : undefined}
      // The dialog stays open while the image flies back.
      data-ending-style={phase === "closing" ? "" : undefined}
      {...getLightboxStateAttributes(extra)}
      {...elementProps}
      {...addLightboxState<DialogPopupState, typeof extra>(
        { className, style, render },
        extra,
      )}
      onKeyDown={handleKeyDown}
    />
  );
}
