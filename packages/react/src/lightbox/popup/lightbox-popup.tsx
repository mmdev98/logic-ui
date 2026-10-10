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
import { type LightboxActivationDirection, LightboxPhase } from "../types";

export type LightboxPopupState = DialogPopupState & {
  /** Whether the active image is zoomed in. */
  zoomed: boolean;
  /** Whether a tap hid the controls. */
  controlsHidden: boolean;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxActivationDirection;
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
 *
 * Keys: ← → previous / next (pan while zoomed), ↑ ↓ pan, Home / End first /
 * last, + − zoom, 0 reset zoom, Esc close. Inside a widget that uses these
 * keys itself (a Base UI `Toolbar`, `Lightbox.ThumbnailList`, a slider, a text
 * field), they stay that widget's.
 *
 * Has `data-zoomed` while the image is zoomed, `data-controls-hidden` after a
 * tap hides the controls, and `data-ending-style` while the image flies back
 * (fade the controls then, not the popup: the image is inside it). Gets
 * `--lightbox-dismiss-progress` while the image is dragged to close, and has
 * `data-dragging` during a drag: turn transitions off then.
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
  const mergedRef = useMergedRefs(ref, setPopupElement);

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

    const actions: Record<string, () => void> = {
      ArrowLeft: () => {
        if (zoomed) panBy(step, 0);
        else if (isRtl) goToNext();
        else goToPrevious();
      },
      ArrowRight: () => {
        if (zoomed) panBy(-step, 0);
        else if (isRtl) goToPrevious();
        else goToNext();
      },
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
      Home: () => goTo(0),
      End: () => goTo(items.length - 1),
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
      finalFocus={() => getFinalFocus() ?? true}
      data-zoomed={zoomed ? "" : undefined}
      data-controls-hidden={controlsHidden ? "" : undefined}
      // The dialog stays open while the image flies back.
      data-ending-style={phase === LightboxPhase.Closing ? "" : undefined}
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
