import type {
  LightboxRootChangeEventDetails,
  LightboxRootChangeEventReason,
} from "../root/lightbox-root";

/**
 * Details passed to `onValueChange`, built like Base UI's: `cancel()` marks
 * them cancelled, and the root then keeps the current item.
 */
export function createLightboxChangeEventDetails(
  reason: LightboxRootChangeEventReason,
  event?: Event,
  trigger?: Element,
): LightboxRootChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  const details = {
    reason,
    event: event ?? new Event("base-ui"),
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    trigger,
  };
  // One object for every reason; the type is a union over them, like Base UI's.
  return details as LightboxRootChangeEventDetails;
}
