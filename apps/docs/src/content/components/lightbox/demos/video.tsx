"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { getThumbnailSrc, type MediaItem, photos, videos } from "./_photos";
import { CloseIcon, PlayIcon, ZoomInIcon, ZoomOutIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Row: "grid w-full max-w-md grid-cols-3 gap-2 select-none",
  Tile: "aspect-[3/4] rounded-xl",
  Badge:
    "absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-md",
  Media: "group",
  Video: "rounded-lg bg-black",
  Caption: `m-0 text-sm text-neutral-300 ${classes.enter}`,
};

type Item = MediaItem;

const items: Item[] = [
  { ...photos[5], type: "image" },
  videos[0],
  { ...photos[1], type: "image" },
];

/**
 * Photos and a video in one viewer. The video pauses when you swipe away
 * or close; the zoom buttons are disabled on it, as only images zoom.
 */
export default function ExampleLightboxVideo() {
  return (
    <Lightbox.Root items={items}>
      <div className={local.Row}>
        {items.map((item) => (
          <Lightbox.Trigger
            key={item.id}
            value={item.id}
            aria-label={`Open ${item.alt}`}
            className={`${classes.trigger} ${local.Tile}`}
          >
            {item.type === "video" ? (
              <React.Fragment>
                {/* A frame of the video as its thumbnail. */}
                <video
                  src={`${item.src}#t=1`}
                  muted
                  playsInline
                  preload="metadata"
                  className={classes.triggerImage}
                />
                <span className={local.Badge}>
                  <PlayIcon className="size-3" /> Video
                </span>
              </React.Fragment>
            ) : (
              <img
                src={getThumbnailSrc(item)}
                alt=""
                className={classes.triggerImage}
              />
            )}
          </Lightbox.Trigger>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos and videos</Lightbox.Title>
          <Lightbox.Viewport className={classes.viewport}>
            {(item: Item) => (
              <Lightbox.Slide className={classes.slide}>
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
            <Lightbox.Close className={classes.iconButton}>
              <CloseIcon />
            </Lightbox.Close>
          </header>
          <footer className={`${classes.bottomBar} ${classes.controlBottom}`}>
            <Lightbox.Description className={local.Caption}>
              {(item: Item) => item.alt}
            </Lightbox.Description>
            <Toolbar.Root className={classes.toolbar}>
              <Lightbox.ZoomOut
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ZoomOutIcon />
              </Lightbox.ZoomOut>
              <Lightbox.ZoomValue className={classes.toolbarValue} />
              <Lightbox.ZoomIn
                render={<Toolbar.Button />}
                className={classes.toolbarButton}
              >
                <ZoomInIcon />
              </Lightbox.ZoomIn>
            </Toolbar.Root>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
