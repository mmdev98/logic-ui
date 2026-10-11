"use client";
import * as React from "react";
import { cn } from "cn";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { ChevronIcon, CloseIcon, ZoomInIcon, ZoomOutIcon } from "./_icons";
import { classes } from "./_classes";

type Album = {
  id: string;
  src: string;
  thumb: string;
  title: string;
  artist: string;
};

const cover = (id: number, size: number) =>
  `https://picsum.photos/id/${id}/${size}/${size}`;

const albums: Album[] = [
  [1022, "Northern Lights", "Aurora Field"],
  [1041, "Low Tide", "The Undertow"],
  [1042, "Long Exposure", "Night Shift"],
  [1079, "Ember", "Saltwater Kids"],
  [1016, "Red Rock", "Desert Lines"],
  [1064, "Above the Fog", "Morning Choir"],
  [1002, "Open Water", "Blue Hour"],
  [1036, "Base Camp", "High Country"],
  [1057, "Coast Road", "The Wanderers"],
  [1047, "Back Alley", "Brick & Mortar"],
].map(([id, title, artist]) => ({
  id: String(id),
  src: cover(id as number, 1000),
  thumb: cover(id as number, 300),
  title: title as string,
  artist: artist as string,
}));

/** Tailwind classes of this demo. */
const local = {
  Shelf: "grid w-full max-w-xl grid-cols-3 gap-4 select-none sm:grid-cols-5",
  Album: "flex min-w-0 flex-col gap-2",
  Cover:
    "aspect-square w-full rounded-lg shadow-lg shadow-black/40 ring-1 ring-white/10 transition-opacity hover:opacity-80",
  AlbumTitle: "m-0 truncate text-sm font-medium",
  Artist: "m-0 truncate text-xs text-neutral-500",
  Popup:
    "isolate overflow-hidden [--cover-size:min(40dvh,58vw,23rem)] [--cover-y:41dvh] [@media(max-height:500px)]:[--cover-y:36dvh]",
  Ambient:
    "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_40%,rgb(90_100_130/0.18),transparent_65%)] opacity-[calc(1_-_var(--lightbox-dismiss-progress,0))] transition-opacity duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) in-data-swiping:transition-none in-data-starting-style:opacity-0 in-data-ending-style:opacity-0 motion-reduce:transition-none",
  // Pan bounds use the whole viewer, not the smaller resting cover.
  Viewport:
    "absolute inset-0 cursor-grab gap-x-0 select-none data-swiping:cursor-grabbing",
  /**
   * Placement, rotation and lifecycle motion are separate layers. A smoothstep
   * curve eases the rotation into the wings without a hard stop at ±1.
   * Parallel slides sort the flattened covers without intersecting planes.
   */
  Slide:
    "group/cover px-[calc((100%_-_var(--cover-size))/2)] pt-[calc(var(--cover-y)_-_var(--cover-size)/2)] pb-[calc(100dvh_-_var(--cover-y)_-_var(--cover-size)/2)] [--p:var(--lightbox-slide-progress)] [--distance:max(var(--p),-1*var(--p))] [--t:calc(clamp(-1,var(--p),1)*min(1,var(--distance))*(3_-_2*min(1,var(--distance))))] [--depth:max(var(--t),-1*var(--t))] [transform:translateX(calc((var(--t)*0.68_+_(var(--p)_-_var(--t))*0.24)*var(--cover-size)_-_var(--p)*100%))_translateZ(calc(var(--distance)*-1px))] [opacity:clamp(0,calc(3.5_-_var(--distance)),1)] motion-reduce:transform-none motion-reduce:opacity-100",
  /**
   * Each cover tilts inward in its own perspective, flattened into its slide.
   * Depth scales with the cover, so phones and desktops share the same shape.
   */
  Turn: "absolute inset-0 origin-[50%_var(--cover-y)] [transform:perspective(calc(var(--cover-size)*4))_translateZ(calc(var(--depth)*var(--cover-size)*-0.65))_rotateY(calc(var(--t)*-58deg))] [filter:brightness(calc(1_-_var(--depth)*0.38))] motion-reduce:transform-none motion-reduce:filter-none",
  // Only the wings fold away: the active media keeps its own return flight.
  Surface:
    "absolute inset-0 origin-[50%_var(--cover-y)] transition-[opacity,translate,scale] duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) group-not-data-active/cover:opacity-[calc(1_-_var(--lightbox-dismiss-progress,0))] in-data-swiping:transition-none in-data-starting-style:group-not-data-active/cover:translate-x-[calc(var(--t)*var(--cover-size)*-0.2)] in-data-starting-style:group-not-data-active/cover:scale-85 in-data-starting-style:group-not-data-active/cover:opacity-0 in-data-ending-style:group-not-data-active/cover:translate-x-[calc(var(--t)*var(--cover-size)*-0.2)] in-data-ending-style:group-not-data-active/cover:scale-85 in-data-ending-style:group-not-data-active/cover:opacity-0 in-data-zoomed:group-not-data-active/cover:scale-95 in-data-zoomed:group-not-data-active/cover:opacity-0 motion-reduce:transition-none",
  // Keep overflow visible: zoom and the return flight leave this box.
  Media: "rounded-xl",
  // Zoom and pan transform the image, so its frame must live here too.
  Image: "rounded-[inherit] shadow-2xl shadow-black/50 ring-1 ring-white/10",
  Reflection:
    "pointer-events-none absolute top-[calc(var(--cover-y)+var(--cover-size)/2+0.75rem)] left-1/2 h-[calc(var(--cover-size)/2)] w-(--cover-size) -translate-x-1/2 overflow-hidden mask-b-from-0% mask-b-to-100% opacity-15 transition-opacity duration-(--lightbox-flight-duration) ease-(--lightbox-flight-easing) in-data-starting-style:opacity-0 in-data-ending-style:opacity-0 in-data-zoomed:opacity-0 motion-reduce:hidden motion-reduce:transition-none",
  ReflectionImage: "block aspect-square w-full -scale-y-100 rounded-xl",
  Footer: cn(
    classes.controlBottom,
    "absolute inset-x-0 top-[calc(var(--cover-y)+var(--cover-size)/2+2.5rem)] flex flex-col items-center gap-5 px-4 [@media(max-height:500px)]:top-[calc(var(--cover-y)+var(--cover-size)/2+1rem)] [@media(max-height:500px)]:gap-2",
  ),
  Text: "flex min-h-12 flex-col items-center text-center transition-opacity duration-200 in-data-zoomed:opacity-0 motion-reduce:transition-none",
  Title: cn("m-0 text-xl font-semibold tracking-tight", classes.enter),
  Description: cn("m-0 text-sm text-neutral-400", classes.enter),
  Navigation: "flex items-center gap-4",
  ZoomReset: cn(
    classes.toolbarValue,
    "h-9 cursor-pointer rounded-full border-none bg-transparent px-2 hover:not-data-disabled:bg-white/10 focus-visible:outline-2 focus-visible:outline-white",
  ),
  Hint: "m-0 text-xs text-neutral-500 transition-opacity duration-200 in-data-zoomed:opacity-0 motion-reduce:transition-none [@media(max-height:500px)]:hidden",
};

/** Album covers in a coverflow: a 3D transition in CSS, from one variable. */
export default function ExampleLightboxCoverflow(): React.ReactElement {
  return (
    <Lightbox.Root items={albums}>
      <div className={local.Shelf}>
        {albums.map((album) => (
          <div key={album.id} className={local.Album}>
            <Lightbox.Trigger
              value={album.id}
              aria-label={`Open ${album.title} by ${album.artist}`}
              className={cn(classes.trigger, local.Cover)}
            >
              <img src={album.thumb} alt="" className={classes.triggerImage} />
            </Lightbox.Trigger>
            <div>
              <p className={local.AlbumTitle}>{album.title}</p>
              <p className={local.Artist}>{album.artist}</p>
            </div>
          </div>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className={classes.backdrop} />
        <Lightbox.Popup className={cn(classes.popup, local.Popup)}>
          <div aria-hidden="true" className={local.Ambient} />
          <Lightbox.Viewport
            aria-label="Albums"
            neighbors={3}
            className={local.Viewport}
          >
            {(album: Album) => (
              <Lightbox.Slide className={local.Slide}>
                <div className={local.Turn}>
                  <div className={local.Surface}>
                    <Lightbox.Media
                      width={1000}
                      height={1000}
                      className={local.Media}
                    >
                      <img
                        src={album.src}
                        alt={`${album.title} cover`}
                        className={local.Image}
                      />
                    </Lightbox.Media>
                    <div aria-hidden="true" className={local.Reflection}>
                      <img
                        src={album.src}
                        alt=""
                        draggable={false}
                        className={local.ReflectionImage}
                      />
                    </div>
                  </div>
                </div>
              </Lightbox.Slide>
            )}
          </Lightbox.Viewport>

          <div className={cn(classes.topBar, classes.controlTop)}>
            <Lightbox.Counter className={classes.counter} />
            <Lightbox.Close className={classes.iconButton}>
              <CloseIcon />
            </Lightbox.Close>
          </div>

          <footer className={local.Footer}>
            <div className={local.Text}>
              <Lightbox.Title className={local.Title}>
                {(album: Album) => album.title}
              </Lightbox.Title>
              <Lightbox.Description className={local.Description}>
                {(album: Album) => album.artist}
              </Lightbox.Description>
            </div>
            <div className={local.Navigation}>
              <Lightbox.Previous className={classes.iconButton}>
                <ChevronIcon direction="left" />
              </Lightbox.Previous>
              <Toolbar.Root aria-label="Album zoom" className={classes.toolbar}>
                <Lightbox.ZoomOut
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ZoomOutIcon />
                </Lightbox.ZoomOut>
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
              </Toolbar.Root>
              <Lightbox.Next className={classes.iconButton}>
                <ChevronIcon direction="right" />
              </Lightbox.Next>
            </div>
            <p className={local.Hint}>
              Swipe or use arrow keys · Pinch or double-click to zoom
            </p>
          </footer>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
