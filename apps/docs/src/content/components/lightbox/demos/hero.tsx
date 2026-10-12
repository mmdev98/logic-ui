"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { useMediaQuery } from "@logic-ui/react/unstable-use-media-query";
import { cn } from "cn";
import { getThumbnailSrc, type MediaItem, videos } from "./_photos";
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
  // One large tile and four small ones beside it. On phones, like Instagram's
  // Explore: three columns of squares, the large tile two by two, and five
  // small ones around it. The outer corners are on the tiles, not clipped by
  // the grid: the image flies out of each tile with its corners.
  Layout:
    "grid w-full max-w-xl grid-cols-3 gap-1 select-none sm:grid-cols-[2fr_1fr_1fr] sm:grid-rows-[repeat(2,8rem)] sm:gap-1.5",
  Tile: cn(
    "aspect-square first:col-span-2 first:row-span-2 first:aspect-auto sm:aspect-auto sm:first:col-span-1",
    "first:rounded-tl-2xl nth-2:rounded-tr-2xl nth-4:rounded-bl-2xl nth-6:rounded-br-2xl",
    "sm:first:rounded-l-2xl sm:nth-2:rounded-none sm:nth-3:rounded-tr-2xl sm:nth-4:rounded-none sm:nth-5:rounded-br-2xl",
  ),
  // Over the last tile: how many items the grid doesn't show.
  More: "absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white tabular-nums backdrop-blur-[2px] transition-colors duration-300 group-hover:bg-black/45",
  // Marks a video tile.
  Badge:
    "absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md",
  // Room below the media for the caption and the strip.
  Slide:
    "px-[max(1rem,env(safe-area-inset-left))] pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(11rem+env(safe-area-inset-bottom))] md:px-24",
  // Not on phones: the toolbar needs the room, and the strip shows where you are.
  Counter: `${classes.counter} max-sm:hidden`,
  Actions: "ms-auto flex items-center gap-2",
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

/** A Picsum photo, cropped to `width` × `height`. */
function photo(
  id: string,
  picsumId: number,
  width: number,
  height: number,
  alt: string,
  caption: string,
): MediaItem {
  return {
    id,
    type: "image",
    src: `https://picsum.photos/id/${picsumId}/${width}/${height}`,
    width,
    height,
    alt,
    caption,
  };
}

/** Cars and houses, and a video first, for the large tile. */
const items: MediaItem[] = [
  videos[1],
  photo(
    "vintage-car",
    111,
    1600,
    1067,
    "A vintage car on a city street",
    "Farmer boy",
  ),
  photo(
    "green-door",
    946,
    1067,
    1600,
    "A green door in a yellow house",
    "Number 2",
  ),
  photo("camper", 655, 1600, 1067, "A blue camper van at dusk", "Blue camper"),
  photo("santorini", 49, 1600, 1067, "White houses of Santorini", "Santorini"),
  photo(
    "garage",
    133,
    1600,
    1067,
    "Two classic cars before yellow garage doors",
    "Twins",
  ),
  videos[0],
  photo("canal", 164, 1600, 1067, "Houses along a canal", "Canal houses"),
  photo("truck", 1072, 1600, 1067, "A rusty truck in a field", "Retired"),
  photo(
    "off-roader",
    514,
    1067,
    1600,
    "A white off-roader by a wooden house",
    "Off-roader",
  ),
  photo("shed", 76, 1600, 1067, "A bicycle against a wooden house", "The shed"),
  photo(
    "grille",
    1071,
    1600,
    1600,
    "The chrome grille of a classic car",
    "Chrome",
  ),
  photo("van", 183, 1600, 1067, "A camper van in a car park", "Parked"),
];

/**
 * How many tiles the grid shows; the last one counts the rest. Six on
 * phones, where the large tile is two columns wide, so the grid is full.
 * Counted here, not hidden with CSS: a closing image flies to the nearest
 * tile, and a hidden one has nowhere to land.
 */
function useTileCount(): number {
  return useMediaQuery("(min-width: 40rem)", {}) ? 5 : 6;
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
  const tiles = useTileCount();
  const hiddenCount = items.length - tiles;

  return (
    // The items without a tile fly back into the tile with the count, the
    // nearest one, and dissolve into it.
    <Lightbox.Root items={items} closeTarget="nearest">
      <div className={local.Layout}>
        {items.slice(0, tiles).map((item, index) => {
          const isLast = index === tiles - 1;
          return (
            <Lightbox.Trigger
              key={item.id}
              value={item.id}
              // The count and the play badge aren't in the viewer: they fade
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
            <Lightbox.Counter className={local.Counter} />
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
