"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { ChevronIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Roll: "w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-black select-none",
  RollHeader: "flex items-baseline justify-between px-4 pt-4 pb-3",
  RollTitle: "m-0 text-lg font-bold",
  RollCount: "text-xs text-neutral-500",
  // Square tiles edge to edge, like a phone's camera roll.
  RollGrid: "grid grid-cols-4 gap-0.5",
  Tile: "aspect-square",
  // The image fills the screen width, behind the bars.
  Viewport:
    "absolute inset-0 cursor-default gap-x-2 select-none in-data-zoomed:cursor-grab in-data-zoomed:data-swiping:cursor-grabbing",
  Slide: "p-0",
  TopBar:
    "absolute inset-x-0 top-0 grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 bg-black/50 px-2 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur-xl",
  Back: "flex size-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white focus-visible:outline-2 focus-visible:outline-white",
  Heading: "flex min-w-0 flex-col items-center text-center",
  Title: `m-0 truncate text-[0.9375rem] font-semibold ${classes.enter}`,
  Counter: "text-xs text-neutral-400 tabular-nums",
  BottomBar:
    "absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-black/50 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl",
  Caption: `m-0 text-[0.8125rem] text-neutral-300 ${classes.enter}`,
  Strip: `relative flex max-w-full gap-1 overflow-x-auto px-[50%] py-1 ${classes.hideScrollbar} ${classes.fadeX}`,
  Thumbnail:
    "h-10 w-7 flex-none cursor-pointer overflow-hidden rounded-sm border-none bg-white/10 p-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-active:w-12 focus-visible:outline-2 focus-visible:outline-white",
  Ring: `${classes.indicator} rounded-sm outline-offset-1`,
};

/**
 * Like a phone's photo app: the image fills the screen width, translucent bars
 * sit over it, and a tap hides them. Drag the image down: the bars slide away
 * and the page shows through. Try it on a phone, or the browser's device mode.
 */
export default function ExampleLightboxPhone() {
  return (
    <Lightbox.Root items={photos}>
      <section className={local.Roll}>
        <header className={local.RollHeader}>
          <h3 className={local.RollTitle}>Recents</h3>
          <span className={local.RollCount}>{photos.length} photos</span>
        </header>
        <div className={local.RollGrid}>
          {photos.map((photo) => (
            <Lightbox.Trigger
              key={photo.id}
              value={photo.id}
              className={`${classes.trigger} ${local.Tile}`}
            >
              <img
                src={getThumbnailSrc(photo)}
                alt=""
                className={classes.triggerImage}
              />
            </Lightbox.Trigger>
          ))}
        </div>
      </section>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Viewport className={local.Viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={local.Slide}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>

          <header className={`${local.TopBar} ${classes.controlTop}`}>
            <Lightbox.Close aria-label="Back" className={local.Back}>
              <ChevronIcon direction="left" />
            </Lightbox.Close>
            <div className={local.Heading}>
              <Lightbox.Title className={local.Title}>
                {(photo: Photo) => photo.caption ?? "Untitled"}
              </Lightbox.Title>
              <Lightbox.Counter className={local.Counter}>
                {(state) => `${state.index + 1} of ${state.count}`}
              </Lightbox.Counter>
            </div>
          </header>

          <footer className={`${local.BottomBar} ${classes.controlBottom}`}>
            <Lightbox.Description className={local.Caption}>
              {(photo: Photo) => photo.alt}
            </Lightbox.Description>
            {/* The active thumbnail widens, and the ring follows it. */}
            <Lightbox.ThumbnailList className={local.Strip}>
              {(photo: Photo) => (
                <Lightbox.Thumbnail
                  aria-label={photo.alt}
                  className={local.Thumbnail}
                >
                  <img
                    src={getThumbnailSrc(photo)}
                    alt=""
                    className="size-full object-cover"
                  />
                </Lightbox.Thumbnail>
              )}
              <Lightbox.ThumbnailIndicator className={local.Ring} />
            </Lightbox.ThumbnailList>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
