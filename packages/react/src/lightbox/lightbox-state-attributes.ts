import type { LightboxActivationDirection } from "./types";

/**
 * Starting point of the animation of new content, as in Base UI's state:
 * `data-starting-style` for one frame.
 */
export type LightboxTransitionStatus = "starting" | undefined;

/**
 * Names the `data-*` attributes of the state fields shared by the parts.
 * Without it, `useRender` would write `data-activationdirection`.
 */
export const LIGHTBOX_STATE_ATTRIBUTES = {
  activationDirection: (value: LightboxActivationDirection) => ({
    "data-activation-direction": value,
  }),
  transitionStatus: (value: LightboxTransitionStatus) =>
    value === "starting" ? { "data-starting-style": "" } : null,
};

/**
 * The same attributes as props, for parts built on a Base UI Dialog part,
 * which maps only its own state.
 */
export function getLightboxStateAttributes(state: {
  activationDirection: LightboxActivationDirection;
  transitionStatus?: LightboxTransitionStatus;
}): Record<string, string> {
  return {
    ...LIGHTBOX_STATE_ATTRIBUTES.activationDirection(state.activationDirection),
    ...LIGHTBOX_STATE_ATTRIBUTES.transitionStatus(state.transitionStatus),
  };
}
