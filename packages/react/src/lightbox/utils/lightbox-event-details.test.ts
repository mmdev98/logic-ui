import { describe, expect, it } from "vitest";

import { createLightboxChangeEventDetails } from "./lightbox-event-details";

describe("createLightboxChangeEventDetails", () => {
  it("carries the reason, the event and the element it came from", () => {
    const event = new MouseEvent("click");
    const trigger = document.createElement("button");
    const details = createLightboxChangeEventDetails(
      "next-press",
      event,
      trigger,
    );
    expect(details.reason).toBe("next-press");
    expect(details.event).toBe(event);
    expect(details.trigger).toBe(trigger);
  });

  it("gives a placeholder event when there is none", () => {
    const details = createLightboxChangeEventDetails("imperative-action");
    expect(details.event).toBeInstanceOf(Event);
    expect(details.trigger).toBeUndefined();
  });

  it("is cancelled by cancel()", () => {
    const details = createLightboxChangeEventDetails("swipe");
    expect(details.isCanceled).toBe(false);
    details.cancel();
    expect(details.isCanceled).toBe(true);
  });

  it("allows propagation with allowPropagation()", () => {
    const details = createLightboxChangeEventDetails("keyboard");
    expect(details.isPropagationAllowed).toBe(false);
    details.allowPropagation();
    expect(details.isPropagationAllowed).toBe(true);
  });
});
