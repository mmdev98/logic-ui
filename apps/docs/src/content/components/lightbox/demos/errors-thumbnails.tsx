"use client";
import * as React from "react";
import { Avatar } from "@logic-ui/react/avatar";
import { Lightbox } from "@logic-ui/react/lightbox";
import { BROKEN_SRC, getThumbnailSrc, photos } from "./_photos";
import { BrokenImageIcon, CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Avatar: "flex size-full items-center justify-center",
  AvatarImage: "size-full object-cover",
  // The same fallback on the page and in the strip: an icon on a muted tile.
  AvatarFallback:
    "flex size-full items-center justify-center bg-neutral-200 text-neutral-500 dark:bg-neutral-800",
  Viewport:
    "absolute inset-x-0 top-0 bottom-24 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing",
  Item: "px-4 pt-14 pb-4 md:px-24 md:pt-16",
  Media: "group",
  Image: "group-data-error:invisible",
  Fallback:
    "absolute inset-0 m-auto hidden size-fit flex-col items-center gap-2 text-sm text-neutral-400 group-data-error:flex",
  Strip: `absolute inset-x-0 bottom-0 flex h-24 items-center justify-center gap-2 overflow-x-auto px-4 pb-[env(safe-area-inset-bottom)] ${classes.hideScrollbar}`,
  Thumbnail:
    "size-14 flex-none cursor-pointer overflow-hidden rounded-lg border-none bg-white/10 p-0 opacity-50 outline-offset-2 transition-opacity hover:opacity-90 data-active:opacity-100 data-active:outline-2 data-active:outline-white focus-visible:outline-2 focus-visible:outline-white",
};

/** The third photo is gone: its thumbnail and its image both fail. */
const items = photos.slice(0, 5).map((photo, index) => ({
  ...photo,
  thumbnail: index === 2 ? BROKEN_SRC : getThumbnailSrc(photo),
  src: index === 2 ? BROKEN_SRC : photo.src,
}));

type DemoPhoto = (typeof items)[number];

/** A thumbnail with an icon in its place when it fails to load. */
function Thumbnail(props: { photo: DemoPhoto }) {
  return (
    <Avatar.Root className={local.Avatar}>
      <Avatar.Image
        src={props.photo.thumbnail}
        alt=""
        className={local.AvatarImage}
      />
      {/* Waits a moment, so a thumbnail that loads quickly doesn't flash the icon. */}
      <Avatar.Fallback delay={300} className={local.AvatarFallback}>
        <BrokenImageIcon className="size-5" />
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

export default function ExampleLightboxErrorsThumbnails() {
  return (
    <Lightbox.Root items={items}>
      <div className={classes.row}>
        {items.map((photo) => (
          <Lightbox.Trigger
            key={photo.id}
            value={photo.id}
            className={classes.thumbnail}
          >
            <Thumbnail photo={photo} />
          </Lightbox.Trigger>
        ))}
      </div>
      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos</Lightbox.Title>
          <Lightbox.Viewport className={local.Viewport}>
            {(photo: DemoPhoto) => (
              <Lightbox.Slide className={local.Item}>
                <Lightbox.Media
                  width={photo.width}
                  height={photo.height}
                  className={local.Media}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className={local.Image}
                  />
                  <p className={local.Fallback}>
                    <BrokenImageIcon className="size-10" />
                    This photo is no longer available.
                  </p>
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${classes.close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
          <Lightbox.ThumbnailList
            className={`${local.Strip} ${classes.control}`}
          >
            {(photo: DemoPhoto) => (
              <Lightbox.Thumbnail
                aria-label={photo.alt}
                className={local.Thumbnail}
              >
                <Thumbnail photo={photo} />
              </Lightbox.Thumbnail>
            )}
          </Lightbox.ThumbnailList>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
