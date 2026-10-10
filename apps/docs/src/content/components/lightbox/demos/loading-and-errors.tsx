"use client";
import * as React from "react";
import { Avatar } from "@logic-ui/react/avatar";
import { Lightbox, loadLightboxMedia } from "@logic-ui/react/lightbox";
import { BROKEN_SRC, getThumbnailSrc, photos, type Photo } from "./_photos";
import { BrokenImageIcon, CloseIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Gallery:
    "grid w-full max-w-xl grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3",
  Item: "flex flex-col gap-1.5",
  Tile: "aspect-square rounded-xl",
  Label: "m-0 text-center text-xs text-neutral-500",
  // On the trigger while its image loads before the viewer opens.
  Pending:
    "absolute inset-0 m-auto hidden size-6 animate-spin rounded-full border-2 border-white/30 border-t-white group-data-pending:block",
  BrokenTile:
    "flex size-full items-center justify-center bg-white/5 text-neutral-600",
  Media: "group",
  // Fades in once loaded; hidden, but keeping its place, when it fails.
  Image:
    "transition-opacity duration-500 group-data-loading:opacity-0 group-data-error:invisible",
  Error:
    "absolute inset-0 m-auto hidden h-fit w-[min(19rem,calc(100%-2rem))] flex-col items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/90 px-6 py-6 text-center shadow-2xl backdrop-blur-xl group-data-error:flex",
  ErrorIcon: "size-9 text-neutral-500",
  ErrorTitle: "m-0 text-[0.9375rem] font-semibold",
  ErrorText: "m-0 text-sm text-neutral-400",
  Retry:
    "mt-2 h-9 cursor-pointer rounded-full border-none bg-white px-5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  Caption: `m-0 text-sm text-neutral-300 ${classes.enter}`,
};

type DemoPhoto = Photo & {
  label: string;
  /** How its image behaves on this demo's network. */
  network: "ok" | "slow" | "flaky" | "missing";
};

const items: DemoPhoto[] = [
  { ...photos[0], label: "Instant", network: "ok" },
  { ...photos[1], label: "Slow network", network: "slow" },
  // No `width` or `height`: its shape is only known once it loads.
  {
    ...photos[2],
    width: undefined,
    height: undefined,
    label: "Unknown size",
    network: "ok",
  },
  { ...photos[3], label: "Fails once", network: "flaky" },
  { ...photos[4], label: "Missing", network: "missing" },
];

/** The URL of a photo after `attempts` retries. */
function getSrc(photo: DemoPhoto, attempts: number) {
  if (photo.network === "missing") return BROKEN_SRC;
  if (photo.network === "flaky" && attempts === 0) return BROKEN_SRC;
  return photo.src;
}

/** Preloads before the viewer opens; the slow photo waits 1.5 s, as on a slow network. */
async function loadMedia(photo: DemoPhoto) {
  if (photo.network === "slow") {
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }
  return loadLightboxMedia({ src: getSrc(photo, 0) });
}

export default function ExampleLightboxLoadingAndErrors() {
  // Retries per photo: a new `src` makes `Lightbox.Media` load again.
  const [attempts, setAttempts] = React.useState<Record<string, number>>({});
  const retry = (id: string) =>
    setAttempts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));

  return (
    <Lightbox.Root items={items} loadMedia={loadMedia}>
      <div className={local.Gallery}>
        {items.map((photo) => (
          <div key={photo.id} className={local.Item}>
            <Lightbox.Trigger
              value={photo.id}
              className={`${classes.trigger} ${local.Tile}`}
            >
              {/* Avatar shows an icon when the thumbnail fails, after a short delay. */}
              <Avatar.Root className="size-full">
                <Avatar.Image
                  src={
                    photo.network === "missing"
                      ? BROKEN_SRC
                      : getThumbnailSrc(photo)
                  }
                  alt=""
                  className={classes.triggerImage}
                />
                <Avatar.Fallback delay={300} className={local.BrokenTile}>
                  <BrokenImageIcon className="size-6" />
                </Avatar.Fallback>
              </Avatar.Root>
              <span className={local.Pending} aria-hidden />
            </Lightbox.Trigger>
            <p className={local.Label}>{photo.label}</p>
          </div>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Title className="sr-only">Photos</Lightbox.Title>
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: DemoPhoto) => (
              <Lightbox.Slide className={classes.slide}>
                {/* Everything inside flies and follows the drag to close. */}
                <Lightbox.Media
                  width={photo.width}
                  height={photo.height}
                  className={local.Media}
                >
                  <img
                    src={getSrc(photo, attempts[photo.id] ?? 0)}
                    alt={photo.alt}
                    className={local.Image}
                  />
                  <span className={classes.spinner} aria-hidden />
                  <div className={local.Error} role="alert">
                    <BrokenImageIcon className={local.ErrorIcon} />
                    <p className={local.ErrorTitle}>Couldn’t load this photo</p>
                    <p className={local.ErrorText}>
                      {photo.network === "flaky"
                        ? "The connection dropped. Try again."
                        : "It was moved or deleted."}
                    </p>
                    {photo.network === "flaky" && (
                      <button
                        type="button"
                        className={local.Retry}
                        onClick={() => retry(photo.id)}
                      >
                        Retry
                      </button>
                    )}
                  </div>
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
              {(photo: DemoPhoto) => photo.label}
            </Lightbox.Description>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
