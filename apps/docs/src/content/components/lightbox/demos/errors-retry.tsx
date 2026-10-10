"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { BROKEN_SRC, getThumbnailSrc, photos, type Photo } from "./_photos";
import { BrokenImageIcon, CloseIcon } from "./_viewer";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Media: "group",
  Image: "group-data-error:invisible",
  Loading:
    "absolute inset-0 m-auto hidden size-8 animate-spin rounded-full border-2 border-white/25 border-t-white group-data-loading:block",
  Fallback:
    "absolute inset-0 m-auto hidden h-fit w-[min(20rem,calc(100%-2rem))] flex-col items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/90 px-6 py-7 text-center backdrop-blur-md group-data-error:flex",
  Icon: "size-10 text-neutral-500",
  Title: "m-0 text-base font-semibold",
  Text: "m-0 text-sm text-neutral-400",
  Actions: "mt-1 flex gap-2",
  Button:
    "h-9 cursor-pointer rounded-lg border-none bg-white px-4 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  Link: "flex h-9 items-center rounded-lg px-4 text-sm text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white",
};

type DemoPhoto = Photo & {
  /** How the image behaves: loads, fails once then loads on retry, or never loads. */
  network: "ok" | "flaky" | "missing";
};

const items: DemoPhoto[] = [
  { ...photos[0], network: "ok" },
  { ...photos[1], network: "flaky", caption: "Fails once, then loads" },
  { ...photos[2], network: "missing", caption: "Never loads" },
  { ...photos[3], network: "ok" },
];

/** The URL of a photo after `attempts` retries. */
function getSrc(photo: DemoPhoto, attempts: number) {
  if (photo.network === "ok") return photo.src;
  if (photo.network === "flaky" && attempts > 0) return photo.src;
  // A new URL on each retry, so the image loads again.
  return `${BROKEN_SRC}#${attempts}`;
}

export default function ExampleLightboxErrorsRetry() {
  // Retries per photo: changing `src` makes `Lightbox.Media` load again.
  const [attempts, setAttempts] = React.useState<Record<string, number>>({});
  const retry = (id: string) =>
    setAttempts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));

  return (
    <Lightbox.Root items={items}>
      <div className={classes.row}>
        {items.map((photo) => (
          <Lightbox.Trigger
            key={photo.id}
            value={photo.id}
            className={classes.thumbnail}
          >
            <img
              src={getThumbnailSrc(photo)}
              alt=""
              className={classes.thumbnailImage}
            />
          </Lightbox.Trigger>
        ))}
      </div>
      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos</Lightbox.Title>
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: DemoPhoto) => (
              <Lightbox.Slide className={classes.item}>
                <Lightbox.Media
                  width={photo.width}
                  height={photo.height}
                  className={local.Media}
                >
                  {/* A new `src` loads again: the spinner shows meanwhile. */}
                  <img
                    src={getSrc(photo, attempts[photo.id] ?? 0)}
                    alt={photo.alt}
                    className={local.Image}
                  />
                  <span className={local.Loading} aria-hidden />
                  <div className={local.Fallback} role="alert">
                    <BrokenImageIcon className={local.Icon} />
                    <p className={local.Title}>Couldn’t load this photo</p>
                    <p className={local.Text}>
                      {photo.alt}.{" "}
                      {attempts[photo.id]
                        ? `Tried ${attempts[photo.id] + 1} times.`
                        : "Check your connection and try again."}
                    </p>
                    <div className={local.Actions}>
                      <button
                        type="button"
                        className={local.Button}
                        onClick={() => retry(photo.id)}
                      >
                        Retry
                      </button>
                      <a
                        href={photo.src}
                        target="_blank"
                        rel="noreferrer"
                        className={local.Link}
                      >
                        Open original
                      </a>
                    </div>
                  </div>
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${classes.close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
          <div className={`${classes.bottom} ${classes.control}`}>
            <Lightbox.Description className={classes.caption}>
              {(photo: DemoPhoto) => photo.caption}
            </Lightbox.Description>
            <Lightbox.Counter className={classes.value} />
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
