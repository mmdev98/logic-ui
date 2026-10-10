"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // Leaves room for the sidebar on the right, from medium screens up.
  Viewport:
    "absolute inset-0 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing md:right-72",
  Item: "px-4 py-14 md:px-12",
  Sidebar:
    "absolute inset-y-0 right-0 hidden w-72 flex-col border-l border-white/10 bg-neutral-950/90 md:flex",
  Heading:
    "m-0 px-4 pt-5 pb-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase",
  List: "flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4",
  Thumbnail:
    "flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent p-2 text-left text-sm text-neutral-300 hover:bg-white/5 data-active:bg-white/12 data-active:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white",
  Image: "size-12 flex-none rounded object-cover",
  Text: "flex min-w-0 flex-col",
  Title: "truncate font-medium",
  Subtitle: "truncate text-xs text-neutral-500",
  Close:
    "absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-[calc(0.75rem+env(safe-area-inset-left))] flex size-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-inherit",
};

export default function ExampleLightboxThumbnailListSidebar() {
  return (
    <Lightbox.Root items={photos}>
      <DemoTriggers items={photos.slice(0, 4)} />
      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos</Lightbox.Title>
          <Lightbox.Viewport className={local.Viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={local.Item}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${local.Close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
          {/* A list with titles, like a playlist. The thumbnail's text names it. */}
          <aside className={`${local.Sidebar} ${classes.control}`}>
            <h3 className={local.Heading}>
              <Lightbox.Counter>
                {(state) => `Photo ${state.index + 1} of ${state.count}`}
              </Lightbox.Counter>
            </h3>
            <Lightbox.ThumbnailList
              orientation="vertical"
              aria-label="All photos"
              className={`${local.List} ${classes.hideScrollbar} ${classes.fadeY}`}
            >
              {(photo: Photo) => (
                <Lightbox.Thumbnail
                  aria-label={undefined}
                  className={local.Thumbnail}
                >
                  <img
                    src={getThumbnailSrc(photo)}
                    alt=""
                    className={local.Image}
                  />
                  <span className={local.Text}>
                    <span className={local.Title}>
                      {photo.caption ?? "Untitled"}
                    </span>
                    <span className={local.Subtitle}>{photo.alt}</span>
                  </span>
                </Lightbox.Thumbnail>
              )}
            </Lightbox.ThumbnailList>
          </aside>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
