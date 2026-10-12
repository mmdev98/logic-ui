"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  // The media fills the screen, edge to edge; the controls float over it.
  Slide: "p-0",
  Chat: "flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 select-none",
  Header:
    "flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3",
  Channel: "m-0 text-sm font-semibold",
  Members: "m-0 text-xs text-neutral-500",
  // A fixed height that scrolls, like a chat: the viewer scrolls it behind
  // itself to the message of the image shown.
  Messages: `flex h-104 flex-col gap-4 overflow-y-auto overscroll-contain p-4 ${classes.hideScrollbar}`,
  Message: "flex gap-3",
  Avatar:
    "flex size-8 flex-none items-center justify-center rounded-full text-xs font-semibold text-white",
  Body: "flex min-w-0 flex-col gap-1.5",
  Meta: "flex items-baseline gap-2 text-sm [&_time]:text-xs [&_time]:text-neutral-500",
  Text: "m-0 text-sm text-neutral-300",
  // Up to four tiles; the last one tells how many more there are.
  Grid: "grid w-64 max-w-full grid-cols-2 gap-1",
  Tile: "aspect-square rounded-lg only:col-span-2 only:aspect-[4/3] only:rounded-xl",
  More: "absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white",
  // Dots under the image, in a pill. The list is positioned, for the ring.
  Dots: "relative flex gap-1 rounded-full bg-neutral-900/80 p-1.5 backdrop-blur-xl",
  Dot: "flex size-5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-white",
  Mark: "size-1.5 rounded-full bg-white/40",
  // Spans the active dot's button; its bright dot is drawn in the middle.
  Ring: "pointer-events-none absolute top-(--active-thumbnail-top) left-(--active-thumbnail-left) h-(--active-thumbnail-height) w-(--active-thumbnail-width) after:absolute after:inset-0 after:m-auto after:size-2 after:rounded-full after:bg-white after:content-['']",
  Caption: `m-0 max-w-sm text-center text-sm text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)] ${classes.enter}`,
};

type Message = {
  id: string;
  author: string;
  color: string;
  time: string;
  text: string;
  images: Photo[];
};

const ANA = { author: "Ana", color: "bg-rose-500" };
const SAM = { author: "Sam", color: "bg-sky-500" };
const LEE = { author: "Lee", color: "bg-amber-500" };

const messages: Message[] = [
  {
    id: "m1",
    ...ANA,
    time: "9:41",
    text: "Photos from the trip. The valley at sunrise was unreal.",
    images: photos.slice(0, 2),
  },
  {
    id: "m2",
    ...SAM,
    time: "9:44",
    text: "That jellyfish though.",
    images: photos.slice(5, 6),
  },
  {
    id: "m3",
    ...LEE,
    time: "9:45",
    text: "Wait, where was the waterfall?",
    images: [],
  },
  {
    id: "m4",
    ...ANA,
    time: "9:46",
    text: "Day two. The rest of the set.",
    images: [photos[2], photos[3], photos[4], photos[6], photos[7]],
  },
  {
    id: "m5",
    ...SAM,
    time: "9:52",
    text: "Saving all of these.",
    images: [],
  },
];

/** Every image of the channel, in the order of the messages. */
const allImages = messages.flatMap((message) => message.images);

/** Opens the images from a button, without a trigger of its own. */
const sharedMedia = Lightbox.createHandle();

/**
 * One lightbox for the whole channel: swipe from one message's images to the
 * next. An image without a tile, behind "+1", flies back into the "+1" tile:
 * the nearest one.
 */
export default function ExampleLightboxChat() {
  const messagesRef = React.useRef<HTMLDivElement>(null);

  // A chat opens on its latest messages.
  React.useLayoutEffect(() => {
    const list = messagesRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, []);

  return (
    <Lightbox.Root handle={sharedMedia} items={allImages} closeTarget="nearest">
      <section className={local.Chat}>
        <header className={local.Header}>
          <div>
            <h3 className={local.Channel}># weekend-trip</h3>
            <p className={local.Members}>3 members</p>
          </div>
          {/* Opens on the first image, scrolled out of view above: it fades in. */}
          <button
            type="button"
            className={classes.button}
            onClick={() => sharedMedia.open(allImages[0].id)}
          >
            Shared media · {allImages.length}
          </button>
        </header>

        <div ref={messagesRef} className={local.Messages}>
          {messages.map((message) => {
            const shown = message.images.slice(0, 4);
            const hidden = message.images.length - shown.length;
            return (
              <article key={message.id} className={local.Message}>
                <span className={`${local.Avatar} ${message.color}`}>
                  {message.author[0]}
                </span>
                <div className={local.Body}>
                  <div className={local.Meta}>
                    <strong>{message.author}</strong>
                    <time>{message.time}</time>
                  </div>
                  <p className={local.Text}>{message.text}</p>
                  {shown.length > 0 && (
                    <div className={local.Grid}>
                      {shown.map((photo, index) => {
                        const counts = hidden > 0 && index === shown.length - 1;
                        return (
                          <Lightbox.Trigger
                            key={photo.id}
                            value={photo.id}
                            // The count fades with the flights.
                            crossfade={counts}
                            aria-label={
                              counts
                                ? `Open ${photo.alt}, and ${hidden} more`
                                : `Open ${photo.alt}`
                            }
                            className={`${classes.trigger} ${local.Tile}`}
                          >
                            <img
                              loading="lazy"
                              src={getThumbnailSrc(photo)}
                              alt=""
                              className={classes.triggerImage}
                            />
                            {counts && (
                              <span className={local.More} aria-hidden>
                                +{hidden}
                              </span>
                            )}
                          </Lightbox.Trigger>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={local.Slide}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <header
            className={`${classes.topBar} ${classes.shadeTop} ${classes.controlTop}`}
          >
            <Lightbox.Counter className={classes.counter} />
            <Lightbox.Close className={classes.iconButton}>
              <CloseIcon />
            </Lightbox.Close>
          </header>
          <footer
            className={`${classes.bottomBar} ${classes.shadeBottom} ${classes.controlBottom}`}
          >
            <Lightbox.Description className={local.Caption}>
              {(photo: Photo) => photo.alt}
            </Lightbox.Description>
            <Lightbox.ThumbnailList className={local.Dots}>
              {(photo: Photo) => (
                <Lightbox.Thumbnail
                  aria-label={photo.alt}
                  className={local.Dot}
                >
                  <span className={local.Mark} />
                </Lightbox.Thumbnail>
              )}
              {/* A bright dot that glides over the active one. */}
              <Lightbox.ThumbnailIndicator className={local.Ring} />
            </Lightbox.ThumbnailList>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
