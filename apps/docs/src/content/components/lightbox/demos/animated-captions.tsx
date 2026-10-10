"use client";
import * as React from "react";
import { Lightbox } from "@logic-ui/react/lightbox";
import { photos, type Photo } from "./_photos";
import { CloseIcon, DemoTriggers } from "./_viewer";
import { classes } from "./_classes";

/**
 * New text starts faded and pushed towards the side the photo came from
 * (`data-starting-style` lasts one frame), then the transition brings it in.
 */
const enter =
  "transition-[opacity,translate] duration-300 ease-out data-starting-style:opacity-0 data-starting-style:data-[activation-direction=left]:-translate-x-6 data-starting-style:data-[activation-direction=right]:translate-x-6 motion-reduce:transition-none";

/** Tailwind classes of this demo. */
const local = {
  Panel:
    "absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-linear-to-t from-black/75 to-transparent px-6 pt-12 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center",
  Title: `m-0 text-base font-semibold ${enter}`,
  Description: `m-0 text-sm text-neutral-300 ${enter}`,
  Counter: `text-[0.8125rem] text-neutral-400 tabular-nums ${enter}`,
};

const items = photos.slice(0, 6);

export default function ExampleLightboxAnimatedCaptions() {
  return (
    <Lightbox.Root items={items}>
      <DemoTriggers items={items.slice(0, 4)} />
      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
          <Lightbox.Viewport className={classes.viewport}>
            {(photo: Photo) => (
              <Lightbox.Slide className={classes.item}>
                <Lightbox.Media width={photo.width} height={photo.height}>
                  <img src={photo.src} alt={photo.alt} />
                </Lightbox.Media>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>
          <Lightbox.Close className={`${classes.close} ${classes.control}`}>
            <CloseIcon />
          </Lightbox.Close>
          <div className={`${local.Panel} ${classes.control}`}>
            {/* Function children follow the photo shown, and animate in when it changes. */}
            <Lightbox.Title className={local.Title}>
              {(photo: Photo) => photo.caption ?? "Untitled"}
            </Lightbox.Title>
            <Lightbox.Description className={local.Description}>
              {(photo: Photo) => photo.alt}
            </Lightbox.Description>
            <Lightbox.Counter className={local.Counter} />
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
