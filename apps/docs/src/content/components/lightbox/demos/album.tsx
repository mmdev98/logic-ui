"use client";
import * as React from "react";
import { Lightbox, LightboxCloseTarget } from "@logic-ui/react/lightbox";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { ChevronIcon, CloseIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Shelf: "flex flex-wrap justify-center gap-10 select-none",
  Album: "group/album flex w-40 flex-col gap-3",
  // The cover on a stack of two more photos, which fan out on hover.
  Stack: "relative size-40",
  Behind:
    "pointer-events-none absolute inset-0 size-full rounded-2xl object-cover shadow-lg ring-1 ring-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
  BehindLeft:
    "-translate-x-2.5 -rotate-8 opacity-55 group-hover/album:-translate-x-5 group-hover/album:-rotate-12",
  BehindRight:
    "translate-x-2.5 rotate-6 opacity-80 group-hover/album:translate-x-5 group-hover/album:rotate-10",
  // The cover stays on the page while the viewer shows another photo: the
  // photo dissolves into it on close.
  Cover: "size-full rounded-2xl shadow-2xl ring-1 ring-white/15",
  Title: "m-0 text-sm font-semibold",
  Count: "m-0 text-xs text-neutral-500",
  Nav: "flex w-full max-w-md items-center justify-between gap-4",
  Caption: `m-0 min-w-0 flex-1 truncate text-center text-sm text-neutral-300 ${classes.enter}`,
};

type Album = { id: string; title: string; photos: Photo[] };

const albums: Album[] = [
  {
    id: "iceland",
    title: "Iceland",
    photos: [photos[0], photos[2], photos[7], photos[3]],
  },
  {
    id: "city",
    title: "Faces and places",
    photos: [photos[1], photos[6], photos[5], photos[4]],
  },
];

/** One album: its cover opens all of its photos. */
function AlbumCover(props: { album: Album }) {
  const { album } = props;
  const [cover, second, third] = album.photos;
  return (
    // Whichever photo is shown, it flies back into the cover.
    <Lightbox.Root
      items={album.photos}
      closeTarget={LightboxCloseTarget.Opener}
    >
      <div className={local.Album}>
        <div className={local.Stack}>
          <img
            src={getThumbnailSrc(third)}
            alt=""
            className={`${local.Behind} ${local.BehindLeft}`}
          />
          <img
            src={getThumbnailSrc(second)}
            alt=""
            className={`${local.Behind} ${local.BehindRight}`}
          />
          <Lightbox.Trigger
            value={cover.id}
            aria-label={`Open the album ${album.title}, ${album.photos.length} photos`}
            className={`${classes.trigger} ${local.Cover}`}
          >
            <img
              src={getThumbnailSrc(cover)}
              alt=""
              className={classes.triggerImage}
            />
          </Lightbox.Trigger>
        </div>
        <div>
          <p className={local.Title}>{album.title}</p>
          <p className={local.Count}>{album.photos.length} photos</p>
        </div>
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={classes.popup}>
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
            <Lightbox.Title className="m-0 text-sm font-semibold">
              {album.title}
            </Lightbox.Title>
            <Lightbox.Close className={classes.iconButton}>
              <CloseIcon />
            </Lightbox.Close>
          </header>
          <footer className={`${classes.bottomBar} ${classes.controlBottom}`}>
            <div className={local.Nav}>
              <Lightbox.Previous className={classes.iconButton}>
                <ChevronIcon direction="left" />
              </Lightbox.Previous>
              <Lightbox.Description className={local.Caption}>
                {(photo: Photo) => photo.alt}
              </Lightbox.Description>
              <Lightbox.Next className={classes.iconButton}>
                <ChevronIcon direction="right" />
              </Lightbox.Next>
            </div>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}

/** A shelf of albums, like a photo app's. */
export default function ExampleLightboxAlbum() {
  return (
    <div className={local.Shelf}>
      {albums.map((album) => (
        <AlbumCover key={album.id} album={album} />
      ))}
    </div>
  );
}
