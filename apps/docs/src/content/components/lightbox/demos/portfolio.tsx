"use client";
import * as React from "react";
import { DirectionProvider } from "@logic-ui/react/direction-provider";
import { Lightbox } from "@logic-ui/react/lightbox";
import { Toolbar } from "@logic-ui/react/toolbar";
import { useMediaQuery } from "@logic-ui/react/unstable-use-media-query";
import { getThumbnailSrc, photos, type Photo } from "./_photos";
import { CloseIcon, ResetIcon, ZoomInIcon, ZoomOutIcon } from "./_icons";
import { classes } from "./_classes";

/** Tailwind classes of this demo. */
const local = {
  Page: "flex w-full max-w-xl flex-col gap-4",
  PageHeader: "flex items-center justify-between gap-3",
  PageTitle: "m-0 text-base font-semibold",
  Switch:
    "flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs [&_button]:h-7 [&_button]:cursor-pointer [&_button]:rounded-md [&_button]:border-none [&_button]:bg-transparent [&_button]:px-2.5 [&_button]:text-neutral-400 [&_button[aria-pressed=true]]:bg-white/12 [&_button[aria-pressed=true]]:text-white",
  Cards: "grid grid-cols-2 gap-3 sm:grid-cols-3",
  Card: "flex flex-col gap-2 text-start",
  CardImage: "aspect-[4/3] w-full rounded-xl",
  CardTitle: "m-0 text-sm font-medium",
  CardText: "m-0 truncate text-xs text-neutral-500",
  // The image leaves room for the list: beside it on wide screens (at the
  // end, so on the left in right-to-left), below it on phones.
  Viewport:
    "absolute inset-x-0 top-0 bottom-24 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing md:end-72 md:bottom-0",
  Slide: "px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-4 md:px-20 md:py-16",
  Close: "absolute top-[calc(0.75rem+env(safe-area-inset-top))] start-3",
  // On wide screens, a list with titles; on phones, a strip of squares.
  // Styled through `data-orientation`, so one class list fits both.
  Panel:
    "absolute inset-x-0 bottom-0 h-24 border-t border-white/10 bg-neutral-950/80 backdrop-blur-xl md:inset-x-auto md:inset-y-0 md:end-0 md:flex md:h-auto md:w-72 md:flex-col md:border-t-0 md:border-s",
  PanelHeading:
    "m-0 hidden px-4 pt-5 pb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase md:block",
  List: `relative isolate flex gap-2 overflow-auto data-[orientation=horizontal]:h-full data-[orientation=horizontal]:items-center data-[orientation=horizontal]:px-[50%] data-[orientation=vertical]:flex-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-2 data-[orientation=vertical]:pb-4 ${classes.hideScrollbar} data-[orientation=horizontal]:data-overflow-start:mask-l-from-85% data-[orientation=horizontal]:data-overflow-end:mask-r-from-85% data-[orientation=vertical]:data-overflow-start:mask-t-from-85% data-[orientation=vertical]:data-overflow-end:mask-b-from-85%`,
  Thumbnail:
    "flex flex-none cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent p-0 text-start text-sm text-white opacity-60 transition-opacity duration-200 hover:opacity-100 data-active:opacity-100 in-data-[orientation=vertical]:p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  ThumbnailImage:
    "size-14 flex-none rounded-md object-cover in-data-[orientation=vertical]:size-12",
  ThumbnailText:
    "hidden min-w-0 flex-col in-data-[orientation=vertical]:flex [&_span]:truncate [&_span+span]:text-xs [&_span+span]:text-neutral-500",
  // A soft highlight behind the active row, or a ring around the active square.
  Highlight: `${classes.indicator} -z-10 rounded-lg in-data-[orientation=vertical]:bg-white/10 in-data-[orientation=vertical]:outline-none`,
  // Zoom, on the image's edge: ↑ ↓ move between the actions.
  ZoomBar:
    "absolute top-[calc(50%-3rem)] end-3 -translate-y-1/2 flex-col md:top-1/2 md:end-[calc(18rem+0.75rem)]",
  ZoomValue: "py-1 text-center text-[0.6875rem] text-neutral-400 tabular-nums",
  ZoomSeparator: "my-1 h-px w-4 bg-white/15",
};

/** Titles for the portfolio. The panorama zooms to 800%. */
const projects: Photo[] = photos.map((photo) => ({
  ...photo,
  caption: photo.caption ?? "Untitled",
}));

export default function ExampleLightboxPortfolio() {
  const [direction, setDirection] = React.useState<"ltr" | "rtl">("ltr");
  // The orientation sets the arrow keys, so it follows the layout.
  const wide = useMediaQuery("(min-width: 48rem)", {});

  return (
    <DirectionProvider direction={direction}>
      <div dir={direction} className={local.Page}>
        <header className={local.PageHeader}>
          <h3 className={local.PageTitle}>Selected work</h3>
          <div className={local.Switch} role="group" aria-label="Direction">
            <button
              type="button"
              aria-pressed={direction === "ltr"}
              onClick={() => setDirection("ltr")}
            >
              LTR
            </button>
            <button
              type="button"
              aria-pressed={direction === "rtl"}
              onClick={() => setDirection("rtl")}
            >
              RTL
            </button>
          </div>
        </header>

        <Lightbox.Root items={projects} maxScale={8}>
          <div className={local.Cards}>
            {projects.slice(0, 6).map((photo) => (
              <div key={photo.id} className={local.Card}>
                <Lightbox.Trigger
                  value={photo.id}
                  className={`${classes.trigger} ${local.CardImage}`}
                >
                  <img
                    src={getThumbnailSrc(photo)}
                    alt=""
                    className={classes.triggerImage}
                  />
                </Lightbox.Trigger>
                <div>
                  <p className={local.CardTitle}>{photo.caption}</p>
                  <p className={local.CardText}>{photo.alt}</p>
                </div>
              </div>
            ))}
          </div>

          <Lightbox.Portal>
            <Lightbox.Backdrop className={classes.backdrop} />
            {/* Portaled to the end of `<body>`: it needs its own `dir`. */}
            <Lightbox.Popup dir={direction} className={classes.popup}>
              <Lightbox.Title className="sr-only">Selected work</Lightbox.Title>
              <Lightbox.Viewport className={local.Viewport}>
                {(photo: Photo) => (
                  <Lightbox.Slide className={local.Slide}>
                    <Lightbox.Media width={photo.width} height={photo.height}>
                      <img src={photo.src} alt={photo.alt} />
                    </Lightbox.Media>
                  </Lightbox.Slide>
                )}
              </Lightbox.Viewport>

              <Lightbox.Close
                className={`${classes.iconButton} ${local.Close} ${classes.controlTop}`}
              >
                <CloseIcon />
              </Lightbox.Close>

              <Toolbar.Root
                orientation="vertical"
                className={`${classes.toolbar} ${local.ZoomBar} ${classes.controlRight}`}
              >
                <Lightbox.ZoomIn
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ZoomInIcon />
                </Lightbox.ZoomIn>
                {/* Short enough for a narrow toolbar: 1.0x, 7.5x. */}
                <Lightbox.ZoomValue className={local.ZoomValue}>
                  {(state) => `${state.scale.toFixed(1)}x`}
                </Lightbox.ZoomValue>
                <Lightbox.ZoomOut
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ZoomOutIcon />
                </Lightbox.ZoomOut>
                <Toolbar.Separator className={local.ZoomSeparator} />
                <Lightbox.ZoomReset
                  render={<Toolbar.Button />}
                  className={classes.toolbarButton}
                >
                  <ResetIcon />
                </Lightbox.ZoomReset>
              </Toolbar.Root>

              <aside
                className={`${local.Panel} ${wide ? classes.controlRight : classes.controlBottom}`}
              >
                <h4 className={local.PanelHeading}>
                  <Lightbox.Counter>
                    {(state) => `Project ${state.index + 1} of ${state.count}`}
                  </Lightbox.Counter>
                </h4>
                <Lightbox.ThumbnailList
                  orientation={wide ? "vertical" : "horizontal"}
                  aria-label="All projects"
                  className={local.List}
                >
                  {(photo: Photo) => (
                    // The text names the thumbnail in the list; on phones, `aria-label` does.
                    <Lightbox.Thumbnail
                      aria-label={wide ? undefined : photo.caption}
                      className={local.Thumbnail}
                    >
                      <img
                        src={getThumbnailSrc(photo)}
                        alt=""
                        className={local.ThumbnailImage}
                      />
                      <span className={local.ThumbnailText}>
                        <span>{photo.caption}</span>
                        <span>{photo.alt}</span>
                      </span>
                    </Lightbox.Thumbnail>
                  )}
                  <Lightbox.ThumbnailIndicator className={local.Highlight} />
                </Lightbox.ThumbnailList>
              </aside>
            </Lightbox.Popup>
          </Lightbox.Portal>
        </Lightbox.Root>
      </div>
    </DirectionProvider>
  );
}
