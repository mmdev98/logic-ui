/**
 * How far the slide is from the centre of the viewport, in slides, on screen:
 * `0` when it is the one shown and at rest, `-1` one slide to the left, `1`
 * one to the right, in between while a swipe, its settle or Next moves the
 * slides. The slide is placed with `translate`, so its `transform` is free
 * for a custom transition, such as a cube:
 * `transform: rotateY(calc(var(--lightbox-slide-progress) * 90deg))` with a
 * `perspective` on `Lightbox.Viewport`.
 * @type {number}
 */
export const slideProgress = "--lightbox-slide-progress";
