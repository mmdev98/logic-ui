// The stateful cropper: runs the algorithms, post-processes their result and
// tracks interactions and transitions. Ported from `AbstractCropperInstance`
// of `advanced-cropper` (MIT, Copyright (c) Norserium), see LICENSE.
import { Timeout } from "@base-ui/utils/useTimeout";
import type { CropperHandlePosition } from "../handle/cropper-handle";
import * as REASONS from "../cropper-reasons";
import type {
  CropperCoordinates,
  CropperPoint,
  CropperSize,
  CropperState,
} from "../types";
import {
  copyCropperState,
  getCropperCoefficient,
  isCropperStateConsistent,
} from "../utils/cropper-restrictions";
import type { CropperResizeOptions } from "../utils/cropper-resize";
import type {
  CropperCoordinatesTransform,
  CropperSettings,
} from "../utils/cropper-settings";
import {
  createCropperState,
  moveCropperCoordinates,
  reconcileCropperState,
  resizeCropperCoordinatesInState,
  setCropperBoundary,
  setCropperCoordinates,
  setCropperVisibleArea,
} from "../utils/cropper-state";
import {
  applyCropperImageTransform,
  type CropperImageTransform,
  normalizeCropperFlip,
  normalizeCropperImageTransform,
} from "../utils/cropper-transform";
import type { CropperRootChangeEventReason } from "./cropper-root";

/** The gestures in progress. */
export interface CropperInteractions {
  moveCoordinates: boolean;
  resizeCoordinates: boolean;
  transformImage: boolean;
}

export interface CropperEngineSnapshot {
  state: CropperState | null;
  /** A change is animating: new drags wait for it to end. */
  transitioning: boolean;
  interactions: CropperInteractions;
  /** Cause of the last change of `state`. */
  reason: CropperRootChangeEventReason;
  event: Event | undefined;
}

/** Options of an action on the engine. */
export interface CropperActionOptions {
  reason?: CropperRootChangeEventReason | undefined;
  event?: Event | undefined;
  /** Animate the change. */
  transitions?: boolean | undefined;
  /** The change is part of a gesture that ends with the matching `…End` call. */
  interaction?: boolean | undefined;
  /** The change is final: post-processing that waits for the end of a gesture runs now. */
  immediately?: boolean | undefined;
  /** Lengths and points are in screen pixels, relative to the viewport. */
  normalize?: boolean | undefined;
}

const NO_INTERACTIONS: CropperInteractions = {
  moveCoordinates: false,
  resizeCoordinates: false,
  transformImage: false,
};

export function hasCropperInteractions(
  interactions: CropperInteractions,
): boolean {
  return (
    interactions.moveCoordinates ||
    interactions.resizeCoordinates ||
    interactions.transformImage
  );
}

function isCropperRectEqual(
  a: CropperCoordinates | CropperSize | null,
  b: CropperCoordinates | CropperSize | null,
  tolerance: number,
): boolean {
  if (!a || !b) return a === b;
  const close = (x: number | undefined, y: number | undefined) =>
    x === y ||
    (x !== undefined && y !== undefined && Math.abs(x - y) < tolerance);
  return (
    close(a.width, b.width) &&
    close(a.height, b.height) &&
    close("left" in a ? a.left : undefined, "left" in b ? b.left : undefined) &&
    close("top" in a ? a.top : undefined, "top" in b ? b.top : undefined)
  );
}

/** Whether two states differ by less than `tolerance` image pixels. */
export function isCropperStateEqual(
  a: CropperState | null,
  b: CropperState | null,
  tolerance = 1e-3,
): boolean {
  if (!a || !b) return a === b;
  return (
    isCropperRectEqual(a.boundary, b.boundary, tolerance) &&
    isCropperRectEqual(a.imageSize, b.imageSize, tolerance) &&
    isCropperRectEqual(a.visibleArea, b.visibleArea, tolerance) &&
    isCropperRectEqual(a.coordinates, b.coordinates, tolerance) &&
    Math.abs(a.transforms.rotate - b.transforms.rotate) < tolerance &&
    a.transforms.flip.horizontal === b.transforms.flip.horizontal &&
    a.transforms.flip.vertical === b.transforms.flip.vertical
  );
}

/**
 * Holds the cropper state and changes it through the algorithms. React reads
 * it with `useSyncExternalStore`.
 */
export class CropperEngine {
  #snapshot: CropperEngineSnapshot = {
    state: null,
    transitioning: false,
    interactions: NO_INTERACTIONS,
    reason: REASONS.none,
    event: undefined,
  };

  readonly #listeners = new Set<() => void>();

  readonly #transitionTimeout = new Timeout();

  #settings: CropperSettings;

  /** How long a change animates (ms). */
  #transitionDuration: number;

  constructor(settings: CropperSettings, transitionDuration: number) {
    this.#settings = settings;
    this.#transitionDuration = transitionDuration;
  }

  /** Updates the settings, read by the next action. */
  configure(settings: CropperSettings, transitionDuration: number): void {
    this.#settings = settings;
    this.#transitionDuration = transitionDuration;
  }

  getSettings = (): CropperSettings => this.#settings;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = (): CropperEngineSnapshot => this.#snapshot;

  /** Stops the pending end of a transition. */
  dispose(): void {
    this.#transitionTimeout.clear();
  }

  #setSnapshot(snapshot: CropperEngineSnapshot): void {
    this.#snapshot = snapshot;
    for (const listener of this.#listeners) listener();
  }

  #postProcess(
    name: string,
    state: CropperState,
    options: {
      immediately?: boolean | undefined;
      transitions?: boolean | undefined;
      interaction?: boolean | undefined;
    },
  ): CropperState {
    return this.#settings.postProcess(state, {
      name,
      immediately: options.immediately ?? false,
      transitions: options.transitions ?? false,
      interaction: options.interaction ?? false,
    });
  }

  #update(
    state: CropperState | null,
    options: CropperActionOptions = {},
  ): void {
    const previous = this.#snapshot;
    const tolerance = state ? 1e-3 * (getCropperCoefficient(state) || 1) : 1e-3;
    if (isCropperStateEqual(previous.state, state, tolerance)) return;

    const duration = this.#transitionDuration;
    const transitioning = Boolean(options.transitions) && duration > 0;
    if (transitioning) {
      this.#transitionTimeout.start(duration, () => {
        this.#setSnapshot({ ...this.#snapshot, transitioning: false });
      });
    } else {
      // A change without transition ends the one in progress: the image jumps.
      this.#transitionTimeout.clear();
    }
    this.#setSnapshot({
      ...previous,
      state: copyCropperState(state),
      transitioning,
      reason: options.reason ?? REASONS.none,
      event: options.event,
    });
  }

  #setInteractions(
    interactions: Partial<CropperInteractions>,
    options: CropperActionOptions,
  ): void {
    const previous = this.#snapshot.interactions;
    const next = { ...previous, ...interactions };
    if (
      next.moveCoordinates === previous.moveCoordinates &&
      next.resizeCoordinates === previous.resizeCoordinates &&
      next.transformImage === previous.transformImage
    ) {
      return;
    }
    this.#setSnapshot({ ...this.#snapshot, interactions: next });

    // The last gesture ended: run the post-processing that waited for it.
    if (hasCropperInteractions(previous) && !hasCropperInteractions(next)) {
      const { state } = this.#snapshot;
      if (state) {
        this.#update(
          this.#postProcess("interactionEnd", state, {
            immediately: true,
            transitions: true,
          }),
          { ...options, transitions: true },
        );
      }
    }
  }

  /** Starts over on an image in a viewport of size `boundary`. */
  reset(
    boundary: CropperSize,
    imageSize: CropperSize,
    options: CropperActionOptions = {},
  ): void {
    const settings = this.#settings;
    const state = this.#postProcess(
      "createState",
      createCropperState({ boundary, imageSize }, settings),
      { immediately: true },
    );
    this.#update(state, options);
  }

  /** The state `reset` would create, without applying it. */
  createDefaultState(
    boundary: CropperSize,
    imageSize: CropperSize,
  ): CropperState {
    return this.#postProcess(
      "createState",
      createCropperState({ boundary, imageSize }, this.#settings),
      { immediately: true },
    );
  }

  clear(): void {
    this.#transitionTimeout.clear();
    this.#setSnapshot({
      ...this.#snapshot,
      state: null,
      transitioning: false,
      interactions: NO_INTERACTIONS,
    });
  }

  isConsistent(): boolean {
    const { state } = this.#snapshot;
    return state ? isCropperStateConsistent(state, this.#settings) : true;
  }

  /** Brings the state back within the restrictions after the settings changed. */
  reconcile(options: CropperActionOptions = {}): void {
    const { state } = this.#snapshot;
    const settings = this.#settings;
    if (!state || isCropperStateConsistent(state, settings)) return;
    this.#update(
      this.#postProcess(
        "reconcileState",
        reconcileCropperState(state, settings),
        {
          immediately: true,
          transitions: options.transitions,
        },
      ),
      options,
    );
  }

  setBoundary(boundary: CropperSize, options: CropperActionOptions = {}): void {
    const { state } = this.#snapshot;
    if (!state) return;
    this.#update(
      this.#postProcess(
        "setBoundary",
        setCropperBoundary(state, this.#settings, boundary),
        { immediately: true },
      ),
      { ...options, transitions: false },
    );
  }

  setState(
    state: CropperState | null,
    options: CropperActionOptions = {},
  ): void {
    this.#update(state, { transitions: true, ...options });
  }

  setCoordinates(
    transform: CropperCoordinatesTransform | CropperCoordinatesTransform[],
    options: CropperActionOptions = {},
  ): void {
    const { state } = this.#snapshot;
    if (!state) return;
    const { transitions = true } = options;
    this.#update(
      this.#postProcess(
        "setCoordinates",
        setCropperCoordinates(state, this.#settings, transform, "zoom"),
        { immediately: true, transitions },
      ),
      { ...options, transitions },
    );
  }

  setVisibleArea(
    visibleArea: CropperCoordinates,
    options: CropperActionOptions = {},
  ): void {
    const { state } = this.#snapshot;
    if (!state) return;
    const { transitions = true } = options;
    this.#update(
      this.#postProcess(
        "setVisibleArea",
        setCropperVisibleArea(state, this.#settings, visibleArea),
        { immediately: true, transitions },
      ),
      { ...options, transitions },
    );
  }

  /** Moves, zooms, rotates or flips the image. */
  transformImage(
    transform: CropperImageTransform,
    options: CropperActionOptions = {},
  ): void {
    const { state } = this.#snapshot;
    if (!state) return;
    const {
      transitions = true,
      interaction = true,
      immediately = false,
      normalize = true,
    } = options;
    const settings = this.#settings;
    const normalized = normalize
      ? normalizeCropperImageTransform(state, transform)
      : transform;

    let result = this.#postProcess(
      "transformImage",
      applyCropperImageTransform(state, settings, normalized),
      { transitions, immediately },
    );
    if (interaction) {
      this.#setInteractions({ transformImage: true }, options);
    } else {
      result = this.#postProcess("transformImageEnd", result, {
        transitions,
        immediately: true,
      });
    }
    this.#update(result, {
      ...options,
      transitions: immediately && transitions,
    });
  }

  transformImageEnd(options: CropperActionOptions = {}): void {
    const { state } = this.#snapshot;
    const { immediately = true, transitions = true } = options;
    if (state) {
      this.#update(
        this.#postProcess("transformImageEnd", state, {
          immediately,
          transitions,
        }),
        { ...options, transitions },
      );
    }
    this.#setInteractions({ transformImage: false }, options);
  }

  /** Zooms the image by `factor` (above 1 zooms in), around `center` in image pixels. */
  zoomImage(
    factor: number,
    center?: CropperPoint,
    options: CropperActionOptions = {},
  ): void {
    this.transformImage(
      { scale: { factor, center } },
      { interaction: false, immediately: true, normalize: false, ...options },
    );
  }

  /** Moves the visible area by image pixels. */
  moveImage(
    left: number,
    top: number,
    options: CropperActionOptions = {},
  ): void {
    this.transformImage(
      { move: { left, top } },
      { interaction: false, immediately: true, normalize: false, ...options },
    );
  }

  /** Rotates the image by `angle` degrees, clockwise. */
  rotateImage(angle: number, options: CropperActionOptions = {}): void {
    this.transformImage(
      { rotate: angle },
      { interaction: false, immediately: true, normalize: false, ...options },
    );
  }

  /** Flips the image as seen on screen. */
  flipImage(
    horizontal: boolean,
    vertical: boolean,
    options: CropperActionOptions = {},
  ): void {
    const { state } = this.#snapshot;
    if (!state) return;
    this.transformImage(
      { flip: normalizeCropperFlip(state, horizontal, vertical) },
      { interaction: false, immediately: true, normalize: false, ...options },
    );
  }

  /** Moves the crop; in screen pixels unless `normalize` is `false`. */
  moveCoordinates(
    directions: CropperPoint,
    options: CropperActionOptions = {},
  ): void {
    const { state, transitioning } = this.#snapshot;
    if (transitioning || !state) return;
    const {
      interaction = true,
      transitions = false,
      immediately = false,
      normalize = true,
    } = options;
    const coefficient = normalize ? getCropperCoefficient(state) : 1;
    const settings = this.#settings;

    let result = this.#postProcess(
      "moveCoordinates",
      moveCropperCoordinates(state, settings, {
        left: directions.left * coefficient,
        top: directions.top * coefficient,
      }),
      { interaction, immediately, transitions },
    );
    if (interaction) {
      this.#setInteractions({ moveCoordinates: true }, options);
    } else {
      result = this.#postProcess("moveCoordinatesEnd", result, {
        interaction,
        immediately,
        transitions,
      });
    }
    this.#update(result, {
      ...options,
      transitions: immediately && transitions,
    });
  }

  moveCoordinatesEnd(options: CropperActionOptions = {}): void {
    const { state } = this.#snapshot;
    const { transitions = true, immediately = false } = options;
    if (state) {
      this.#update(
        this.#postProcess("moveCoordinatesEnd", state, {
          transitions,
          immediately,
        }),
        { ...options, transitions },
      );
    }
    this.#setInteractions({ moveCoordinates: false }, options);
  }

  /** Resizes the crop by dragging the handle at `position`; in screen pixels unless `normalize` is `false`. */
  resizeCoordinates(
    position: CropperHandlePosition,
    directions: CropperPoint,
    resizeOptions: CropperResizeOptions = {},
    options: CropperActionOptions = {},
  ): void {
    const { state, transitioning } = this.#snapshot;
    if (transitioning || !state) return;
    const {
      interaction = true,
      transitions = false,
      immediately = false,
      normalize = true,
    } = options;
    const coefficient = normalize ? getCropperCoefficient(state) : 1;
    const settings = this.#settings;

    let result = this.#postProcess(
      "resizeCoordinates",
      resizeCropperCoordinatesInState(
        state,
        settings,
        position,
        {
          left: directions.left * coefficient,
          top: directions.top * coefficient,
        },
        resizeOptions,
      ),
      { interaction, immediately, transitions },
    );
    if (interaction) {
      this.#setInteractions({ resizeCoordinates: true }, options);
    } else {
      result = this.#postProcess("resizeCoordinatesEnd", result, {
        interaction,
        immediately,
        transitions,
      });
    }
    this.#update(result, {
      ...options,
      transitions: immediately && transitions,
    });
  }

  resizeCoordinatesEnd(options: CropperActionOptions = {}): void {
    const { state } = this.#snapshot;
    const { transitions = true, immediately = false } = options;
    if (state) {
      this.#update(
        this.#postProcess("resizeCoordinatesEnd", state, {
          transitions,
          immediately,
        }),
        { ...options, transitions },
      );
    }
    this.#setInteractions({ resizeCoordinates: false }, options);
  }
}
