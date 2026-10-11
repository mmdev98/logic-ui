"use client";
import * as React from "react";
import { Lightbox, loadLightboxMedia } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import {
  getThumbnailSrc,
  loadVideoSize,
  type MediaItem,
  photos,
  videos,
} from "./_photos";
import {
  ChevronIcon,
  CloseIcon,
  PlayIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // One large tile and four small ones. The outer corners are on the tiles,
  // not clipped by the grid: the image flies out of each tile with its corners.
  Layout:
    "grid w-full max-w-xl grid-cols-[2fr_1fr_1fr] grid-rows-[repeat(2,8rem)] gap-1.5 select-none",
  Tile: "first:row-span-2 first:rounded-l-2xl nth-3:rounded-tr-2xl last:rounded-br-2xl",
  // Over the last tile: how many items the grid doesn't show.
  More: "absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white tabular-nums backdrop-blur-[2px] transition-colors duration-300 group-hover:bg-black/45",
  // Marks a video tile.
  Badge:
    "absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md",
  // Room below the media for the caption and the strip.
  Slide:
    "px-[max(1rem,env(safe-area-inset-left))] pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(11rem+env(safe-area-inset-bottom))] md:px-24",
  Actions: "flex items-center gap-2",
  // As tall as the close button, so the top bar lines up.
  Toolbar:
    "flex h-10 items-center gap-0.5 rounded-full border border-white/10 bg-neutral-900/80 px-px backdrop-blur-xl",
  Media: "group",
  Video: "bg-black",
  Text: "flex min-h-11 flex-col items-center text-center",
  Title: `m-0 text-[0.9375rem] font-semibold ${classes.enter}`,
  Description: `m-0 text-[0.8125rem] text-neutral-400 ${classes.enter}`,
  // Positioned, so the ring is placed in it. `px-[50%]` lets the first and
  // last thumbnails reach the centre too.
  Strip: `relative flex max-w-full gap-2 overflow-x-auto px-[50%] py-1.5 ${classes.hideScrollbar} ${classes.fadeX}`,
  Thumbnail:
    "relative size-12 flex-none cursor-pointer overflow-hidden rounded-lg border-none bg-white/10 p-0 opacity-50 transition-opacity duration-300 hover:opacity-80 data-active:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  ThumbnailBadge:
    "absolute inset-0 m-auto size-3.5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]",
  Ring: `${classes.indicator} rounded-lg`,
  ZoomReset: `${classes.toolbarValue} h-9 cursor-pointer rounded-full border-none bg-transparent px-2 transition-colors hover:not-data-disabled:bg-white/12 hover:not-data-disabled:text-white data-disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white`,
  // The shortcuts, on large screens with a mouse, set in from the corner,
  // with even padding.
  Legend:
    "absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))] m-0 hidden flex-col gap-2 rounded-2xl border border-white/10 bg-neutral-900/70 p-3 text-xs backdrop-blur-xl lg:pointer-fine:flex",
  LegendRow:
    "flex items-center gap-3 [&_dd]:m-0 [&_dd]:text-neutral-400 [&_dt]:flex [&_dt]:min-w-16 [&_dt]:gap-1",
  Key: "min-w-5 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-center font-[inherit] text-[0.6875rem]",
};

/** Photos and videos, in one viewer. */
const items: MediaItem[] = [
  { ...photos[0], type: "image" },
  videos[0],
  { ...photos[2], type: "image" },
  videos[1],
  { ...photos[5], type: "image" },
  { ...photos[7], type: "image" },
  { ...photos[1], type: "image" },
  { ...photos[3], type: "image" },
  { ...photos[4], type: "image" },
  { ...photos[6], type: "image" },
];

/** The grid shows the first five; the last tile counts the rest. */
const TILES = 5;
const hiddenCount = items.length - TILES;

/** Preloads an image, or reads a video's size, before the viewer opens. */
function loadMedia(item: MediaItem) {
  return item.type === "video"
    ? loadVideoSize(item.src)
    : loadLightboxMedia(item);
}

const shortcuts = [
  ["← →", "Previous / next"],
  ["+ −", "Zoom"],
  ["0", "Reset zoom"],
  ["Esc", "Close"],
  ["Drag", "Swipe, or close"],
];

/** A still of an item: the image's thumbnail, or a frame of the video. */
function Preview(props: {
  item: MediaItem;
  large?: boolean;
  className: string;
}) {
  const { item, large, className } = props;
  if (item.type === "video") {
    return (
      <video
        src={`${item.src}#t=1`}
        muted
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }
  return (
    <img
      src={large ? item.src : getThumbnailSrc(item)}
      alt=""
      className={className}
    />
  );
}

export default function ExampleLightbox() {
  return (
    // The items without a tile fly back into the "+5" tile, the nearest
    // one, and dissolve into it.
    <Lightbox.Root items={items} loadMedia={loadMedia} closeTarget="nearest">
      <div className={local.Layout}>
        {items.slice(0, TILES).map((item, index) => {
          const isLast = index === TILES - 1;
          return (
            <Lightbox.Trigger
              key={item.id}
              value={item.id}
              // The "+5" and the play badge aren't in the viewer: they fade
              // out as the image leaves the tile, and back in as it lands.
              crossfade={isLast || item.type === "video"}
              aria-label={
                isLast
                  ? `Open ${item.alt}, and ${hiddenCount} more`
                  : `Open ${item.alt}`
              }
              className={`${classes.trigger} ${local.Tile}`}
            >
              <Preview
                item={item}
                large={index === 0}
                className={classes.triggerImage}
              />
              {isLast ? (
                <span className={local.More} aria-hidden>
                  +{hiddenCount}
                </span>
              ) : (
                item.type === "video" && (
                  <span className={local.Badge}>
                    <PlayIcon className="size-3" />
                  </span>
                )
              )}
            </Lightbox.Trigger>
          );
        })}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Viewport className={classes.viewport}>
            {(item: MediaItem) => (
              <Lightbox.Slide className={local.Slide}>
                {/* A video plays in place, pauses when you swipe away, and doesn't zoom. */}
                <Lightbox.Media
                  width={item.width}
                  height={item.height}
                  className={local.Media}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.src}
                      controls
                      playsInline
                      preload="metadata"
                      className={local.Video}
                    />
                  ) : (
                    <img src={item.src} alt={item.alt} />
                  )}
                  <span className={classes.spinner} aria-hidden />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>

          <header className={`${classes.topBar} ${classes.controlTop}`}>
            <Lightbox.Counter className={classes.counter} />
            <div className={local.Actions}>
              <Toolbar.Root className={local.Toolbar}>
                <Lightbox.Previous
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ChevronIcon direction="left" />
                </Lightbox.Previous>
                <Toolbar.Separator className={classes.separator} />
                {/* Disabled on a video: only images zoom. */}
                <Lightbox.ZoomOut
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ZoomOutIcon />
                </Lightbox.ZoomOut>
                {/* The scale, which resets the zoom when pressed. */}
                <Lightbox.ZoomReset
                  render={<Toolbar.Button />}
                  className={local.ZoomReset}
                >
                  <Lightbox.ZoomValue />
                </Lightbox.ZoomReset>
                <Lightbox.ZoomIn
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ZoomInIcon />
                </Lightbox.ZoomIn>
                <Toolbar.Separator className={classes.separator} />
                <Lightbox.Next
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ChevronIcon direction="right" />
                </Lightbox.Next>
              </Toolbar.Root>
              <Lightbox.Close className={classes.iconButton}>
                <CloseIcon />
              </Lightbox.Close>
            </div>
          </header>

          <footer className={`${classes.bottomBar} ${classes.controlBottom}`}>
            {/* Function children follow the item shown, and slide in when it changes. */}
            <div className={local.Text}>
              <Lightbox.Title className={local.Title}>
                {(item: MediaItem) => item.caption ?? "Untitled"}
              </Lightbox.Title>
              <Lightbox.Description className={local.Description}>
                {(item: MediaItem) => item.alt}
              </Lightbox.Description>
            </div>
            <Lightbox.ThumbnailList className={local.Strip}>
              {(item: MediaItem) => (
                <Lightbox.Thumbnail
                  aria-label={item.alt}
                  className={local.Thumbnail}
                >
                  <Preview item={item} className="size-full object-cover" />
                  {item.type === "video" && (
                    <PlayIcon className={local.ThumbnailBadge} />
                  )}
                </Lightbox.Thumbnail>
              )}
              {/* One ring that glides to the active thumbnail. */}
              <Lightbox.ThumbnailIndicator className={local.Ring} />
            </Lightbox.ThumbnailList>
          </footer>

          <dl className={`${local.Legend} ${classes.controlBottom}`}>
            {shortcuts.map(([keys, action]) => (
              <div key={keys} className={local.LegendRow}>
                <dt>
                  {keys.split(" ").map((key) => (
                    <kbd key={key} className={local.Key}>
                      {key}
                    </kbd>
                  ))}
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
