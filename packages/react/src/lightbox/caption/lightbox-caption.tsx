"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useId } from "@base-ui/utils/useId";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import * as React from "react";
import {
  LIGHTBOX_STATE_ATTRIBUTES,
  type LightboxTransitionStatus,
} from "../lightbox-state-attributes";
import { useLightboxRootContext } from "../root/lightbox-root-context";
import { useLightboxSlideContext } from "../slide/lightbox-slide-context";
import { type LightboxActivationDirection } from "../types";
import { useLightboxStartingStyle } from "../use-lightbox-starting-style";

export type LightboxCaptionState = {
  /** Whether its slide is the one shown in the viewer. */
  active: boolean;
  /** Side of the previous item the item shown came from, on screen. */
  activationDirection: LightboxActivationDirection;
  /** `starting` for one frame when its slide becomes the one shown. */
  transitionStatus: LightboxTransitionStatus;
};

export type LightboxCaptionProps = useRender.ComponentProps<
  "div",
  LightboxCaptionState
>;

/**
 * The text of a `Lightbox.Slide`, such as its title or credits. Place it in
 * the slide, next to `Lightbox.Media`: it moves with the slide, and
 * describes it for screen readers. It has `data-starting-style` for a frame
 * when its slide becomes the one shown, with `data-activation-direction`, to
 * animate it in. Renders nothing when its content is empty.
 * Renders a `<div>` element.
 */
export function LightboxCaption(
  props: LightboxCaptionProps,
): React.ReactElement | null {
  const { render, ref, id: idProp, children, ...elementProps } = props;

  const { phase, activationDirection } = useLightboxRootContext();
  const { active, setCaptionId } = useLightboxSlideContext();
  const id = useId(idProp);
  const empty = children === undefined || children === null || children === "";

  useIsoLayoutEffect(() => {
    if (empty) return undefined;
    setCaptionId(id);
    return () => setCaptionId(undefined);
  }, [empty, id, setCaptionId]);

  const starting = useLightboxStartingStyle(active, active && phase === "open");

  const state: LightboxCaptionState = React.useMemo(
    () => ({
      active,
      activationDirection,
      transitionStatus: starting ? "starting" : undefined,
    }),
    [active, activationDirection, starting],
  );

  return useRender({
    defaultTagName: "div",
    render,
    ref,
    state,
    enabled: !empty,
    stateAttributesMapping: LIGHTBOX_STATE_ATTRIBUTES,
    props: mergeProps<"div">({ id, children }, elementProps),
  });
}
