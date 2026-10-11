"use client";
import * as React from "react";
import { Lightbox, type LightboxItemValue } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, PlusIcon, TrashIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Window:
    "flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 select-none",
  // The address bar shows the controlled value, as an app would put it in the URL.
  AddressBar:
    "flex items-center gap-2 border-b border-white/10 bg-neutral-900/60 px-3 py-2",
  Lights:
    "flex gap-1.5 [&_span]:size-2.5 [&_span]:rounded-full [&_span]:bg-white/15",
  Address:
    "flex-1 truncate rounded-md bg-black/40 px-2.5 py-1 font-mono text-xs text-neutral-400 [&_b]:font-normal [&_b]:text-sky-300",
  Body: "flex flex-col gap-3 p-4",
  Toolbar: "flex items-center justify-between gap-3",
  Title:
    "m-0 text-sm font-semibold [&_span]:font-normal [&_span]:text-neutral-500",
  Grid: "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5",
  Tile: "aspect-square rounded-lg",
  Empty:
    "m-0 rounded-lg border border-dashed border-white/10 py-10 text-center text-sm text-neutral-500",
  TopActions: "flex items-center gap-2",
};

export default function ExampleLightboxManager() {
  const [items, setItems] = React.useState<Photo[]>(() => photos.slice(0, 5));
  // Whether the viewer is open, and the photo it shows: what an app keeps in
  // the URL.
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState<LightboxItemValue>(photos[0].id);

  const nextPhoto = photos.find(
    (photo) => !items.some((item) => item.id === photo.id),
  );
  const add = () => {
    if (nextPhoto) setItems((current) => [...current, nextPhoto]);
  };
  // The viewer moves to the neighbour, or closes when no photo is left.
  const remove = () =>
    setItems((current) => current.filter((item) => item.id !== value));

  return (
    <section className={local.Window}>
      <div className={local.AddressBar}>
        <div className={local.Lights} aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <output className={local.Address}>
          /album{open && <b>?photo={value}</b>}
        </output>
      </div>

      <div className={local.Body}>
        <div className={local.Toolbar}>
          <h3 className={local.Title}>
            Album <span>· {items.length} photos</span>
          </h3>
          <button
            type="button"
            className={classes.button}
            disabled={!nextPhoto}
            onClick={add}
          >
            <PlusIcon /> Add photo
          </button>
        </div>

        <Lightbox.Root
          items={items}
          open={open}
          onOpenChange={setOpen}
          value={value}
          onValueChange={setValue}
        >
          {items.length === 0 ? (
            <p className={local.Empty}>No photos. Add one to start.</p>
          ) : (
            <div className={local.Grid}>
              {items.map((photo) => (
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
          )}

          <Lightbox.Portal>
            <Lightbox.Backdrop className={classes.backdrop} />
            <Lightbox.Popup className={classes.popup}>
              <Lightbox.Title className="sr-only">Album</Lightbox.Title>
              <Lightbox.Viewport className={classes.viewport}>
                {(photo: Photo) => (
                  <Lightbox.Slide className={classes.slide}>
                    <Lightbox.Media width={photo.width} height={photo.height}>
                      <img src={photo.src} alt={photo.alt} />
                    </Lightbox.Media>
                  </Lightbox.Slide>
                )}
              </Lightbox.Viewport>
              <header className={`${classes.topBar} ${classes.controlTop}`}>
                <Lightbox.Counter className={classes.counter} />
                <div className={local.TopActions}>
                  {/* Removing the open item from `items` is all it takes. */}
                  <button
                    type="button"
                    aria-label="Delete photo"
                    className={classes.iconButton}
                    onClick={remove}
                  >
                    <TrashIcon />
                  </button>
                  <Lightbox.Close className={classes.iconButton}>
                    <CloseIcon />
                  </Lightbox.Close>
                </div>
              </header>
            </Lightbox.Popup>
          </Lightbox.Portal>
        </Lightbox.Root>
      </div>
    </section>
  );
}
