"use client";

import { type LightboxItemValue } from "../types";
import { createLightboxChangeEventDetails } from "../utils/lightbox-event-details";
import type { LightboxRootContextValue } from "./lightbox-root-context";

/**
 * Links `Lightbox.Trigger`s placed outside `Lightbox.Root` to it, like Base
 * UI's `Dialog.createHandle()`. Pass the same handle to the root and to each
 * trigger. Also opens and closes the lightbox from code.
 */
export class LightboxHandle {
  #root: LightboxRootContextValue | null = null;

  readonly #listeners = new Set<() => void>();

  /** Opens the lightbox on the item with this value. */
  open(value: LightboxItemValue): void {
    void this.#root?.openValue(
      value,
      createLightboxChangeEventDetails("imperative-action"),
    );
  }

  /** Closes the lightbox. */
  close(): void {
    this.#root?.close(createLightboxChangeEventDetails("imperative-action"));
  }

  /** Whether the lightbox is open. */
  get isOpen(): boolean {
    return this.#root?.open ?? false;
  }

  /** @internal Called by `Lightbox.Root` whenever its context changes. */
  setRoot(root: LightboxRootContextValue | null): void {
    if (this.#root === root) return;
    this.#root = root;
    for (const listener of this.#listeners) listener();
  }

  /** @internal Read by `Lightbox.Trigger`. */
  getRoot = (): LightboxRootContextValue | null => this.#root;

  /** @internal Read by `Lightbox.Trigger`. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
}

/** Creates a handle that links detached triggers to a `Lightbox.Root`. */
export function createLightboxHandle(): LightboxHandle {
  return new LightboxHandle();
}
