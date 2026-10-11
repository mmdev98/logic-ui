/**
 * How far the finger travels to move one slide: any CSS length. Set it
 * yourself on the viewport; the viewport reads it. By default, one slide is
 * the viewport's width plus its `column-gap`. Set it when the CSS draws the
 * slides closer together than that, as a coverflow does, so they follow the
 * finger instead of lagging behind it:
 * `[--lightbox-swipe-distance:calc(var(--cover-size)*0.68)]`.
 * @type {CSS length}
 */
export const swipeDistance = "--lightbox-swipe-distance";
