"use client";
import * as React from "react";
import { Lightbox, type LightboxItemValue } from "@logic-ui/react/lightbox";
import {
  Cropper,
  type CropperCoordinates,
  type CropperRootActions,
  type CropperState,
} from "@logic-ui/react/cropper";
import { cn } from "cn";
import { handleClasses, handlePositions } from "./_classes";
import { getThumbnailSrc, photos, type Photo, viewer } from "./_lightbox";
import { ZoomDial } from "./_zoom-dial";

/** A crop saved with a photo, to start from it the next time it is edited. */
type SavedCrop = Pick<CropperState, "transforms"> & {
  coordinates: CropperCoordinates;
  visibleArea: CropperCoordinates;
  ratio: RatioKey;
};

/** The cropped image of a photo, with the crop that made it. */
type Edit = { src: string; width: number; height: number; crop: SavedCrop };

type GalleryPhoto = Photo & { edited: boolean };

const ratios = {
  original: "Original",
  free: "Free",
  square: "1:1",
  portrait: "4:5",
  wide: "16:9",
} as const;
type RatioKey = keyof typeof ratios;

function getRatio(key: RatioKey, photo: Photo): number | undefined {
  switch (key) {
    case "original":
      return photo.width && photo.height
        ? photo.width / photo.height
        : undefined;
    case "square":
      return 1;
    case "portrait":
      return 4 / 5;
    case "wide":
      return 16 / 9;
    default:
      return undefined;
  }
}

/** Tailwind classes of this demo. */
const local = {
  Gallery: "flex w-full max-w-xl flex-col gap-3 select-none",
  Header: "flex items-baseline justify-between",
  Heading: "m-0 text-sm font-semibold text-white",
  Hint: "m-0 text-xs text-neutral-500",
  Grid: "grid grid-cols-3 gap-1.5 sm:grid-cols-5",
  Tile: "aspect-square rounded-xl",
  // A dot on the tiles of edited photos.
  EditedDot:
    "absolute top-2 right-2 size-2 rounded-full bg-[#ffd60a] shadow-[0_0_0_2px_rgb(0_0_0/0.5)]",
  Actions: "ms-auto flex items-center gap-2",
  Pill: "flex h-10 cursor-pointer items-center gap-2 rounded-full border-none bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors no-underline hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white",
  EditedBadge:
    "rounded-full bg-[#ffd60a]/15 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#ffd60a] uppercase",
  Caption: `m-0 flex items-center gap-2 text-[0.9375rem] font-semibold ${viewer.enter}`,
  Strip: viewer.strip,
  Thumbnail:
    "relative size-12 flex-none cursor-pointer overflow-hidden rounded-lg border-none bg-white/10 p-0 opacity-50 transition-opacity duration-300 hover:opacity-80 data-active:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  Ring: viewer.indicator,

  // Frosted bars over the photo: a zoomed photo shows through them, blurred.
  // The bars have fixed heights, and the photo at rest fills exactly the
  // room between them, edge to edge: it only goes under them when zoomed.
  // The editor inherits the same heights, so its bars match.
  Popup: `${viewer.popup} [--bar-top:calc(4rem+env(safe-area-inset-top))] [--bar-bottom:calc(9.5rem+env(safe-area-inset-bottom))]`,
  Slide: "pt-(--bar-top) pb-(--bar-bottom)",
  TopBar:
    "absolute inset-x-0 top-0 flex h-(--bar-top) items-center justify-between gap-3 border-b border-white/10 bg-neutral-950/50 px-[max(0.75rem,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150",
  BottomBar:
    "absolute inset-x-0 bottom-0 flex h-(--bar-bottom) flex-col items-center justify-center gap-3 border-t border-white/10 bg-neutral-950/50 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150",

  // The editor covers the viewer, like a phone's photo editor.
  // The cropper fills the editor, and its bars float over it, frosted. The
  // viewport's padding keeps the crop clear of them, while a zoomed photo
  // still runs under them.
  Editor:
    "absolute inset-0 z-10 bg-black text-white outline-none transition-opacity duration-300 starting:opacity-0",
  EditorBar:
    "absolute inset-x-0 top-0 z-20 flex h-(--bar-top) items-center justify-between border-b border-white/10 bg-neutral-950/50 backdrop-blur-xl backdrop-saturate-150 px-5 pt-[env(safe-area-inset-top)]",
  EditorTitle:
    "m-0 flex flex-col items-center text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase [&_span]:font-mono [&_span]:tracking-normal [&_span]:text-white/40 [&_span]:normal-case",
  TextButton:
    "-mx-2 cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[15px] text-white transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-30",
  DoneButton:
    "-mx-2 cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[15px] font-semibold text-[#ffd60a] transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[#ffd60a]",
  Viewport:
    "absolute inset-0 pt-(--bar-top) pb-(--bar-bottom) cursor-grab bg-black opacity-0 transition-opacity duration-500 data-interacting:cursor-grabbing data-loaded:opacity-100",
  Image:
    "data-transitioning:transition-transform data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.32,0.72,0,1)]",
  Stencil:
    "shadow-[0_0_0_9999px_rgb(0_0_0/0.65)] ring-1 ring-white/70 ring-inset outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-[#ffd60a] data-interacting:shadow-[0_0_0_9999px_rgb(0_0_0/0.35)] data-movable:cursor-move data-transitioning:transition-[width,height,transform,box-shadow] data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.32,0.72,0,1)]",
  Guides:
    "pointer-events-none absolute inset-0 grid grid-cols-[repeat(var(--cropper-grid-columns),minmax(0,1fr))] grid-rows-[repeat(var(--cropper-grid-rows),minmax(0,1fr))] opacity-0 transition-opacity duration-300 data-interacting:opacity-100 *:border-white/40 *:not-data-[column='2']:border-r *:not-data-[row='2']:border-b",
  Controls:
    "absolute inset-x-0 bottom-0 z-20 flex h-(--bar-bottom) flex-col justify-center gap-2 border-t border-white/10 bg-neutral-950/50 backdrop-blur-xl backdrop-saturate-150 pb-[env(safe-area-inset-bottom)]",
  Chips: "flex justify-center gap-2 overflow-x-auto px-4",
  Chip: "h-7 flex-none cursor-pointer rounded-full border-none bg-white/10 px-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-pressed:bg-white aria-pressed:text-black",
  Tools: "flex items-center justify-center gap-6 px-6",
  Tool: "flex size-11 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/90 transition-[background-color,opacity,scale] hover:bg-white/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
};

const gallery = photos;

/**
 * A gallery that edits in place: open a photo, press Edit, and crop it full
 * screen without leaving the viewer. Saving puts the cropped photo in the
 * gallery, and the image flies back to its tile; editing it again starts
 * from the same crop, and Revert brings the original back.
 */
export default function ExampleCropperLightbox() {
  const [edits, setEdits] = React.useState<Record<string, Edit>>({});
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState<LightboxItemValue>(gallery[0]!.id);
  const [editing, setEditing] = React.useState(false);

  const items: GalleryPhoto[] = gallery.map((photo) => {
    const edit = edits[photo.id];
    return edit
      ? {
          ...photo,
          src: edit.src,
          width: edit.width,
          height: edit.height,
          edited: true,
        }
      : { ...photo, edited: false };
  });
  const original = gallery.find((photo) => photo.id === value) ?? gallery[0]!;
  const edit = edits[original.id];

  const revert = () =>
    setEdits((current) => {
      const next = { ...current };
      delete next[original.id];
      return next;
    });

  return (
    <section className={local.Gallery}>
      <div className={local.Header}>
        <h3 className={local.Heading}>Recents</h3>
        <p className={local.Hint}>Open a photo, then Edit</p>
      </div>

      <Lightbox.Root
        items={items}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setEditing(false);
        }}
        value={value}
        onValueChange={setValue}
      >
        <div className={local.Grid}>
          {items.map((photo) => (
            <Lightbox.Trigger
              key={photo.id}
              value={photo.id}
              className={cn(viewer.trigger, local.Tile)}
            >
              <img
                loading="lazy"
                src={getThumbnailSrc(photo)}
                alt=""
                className={viewer.triggerImage}
              />
              {photo.edited && <span className={local.EditedDot} />}
            </Lightbox.Trigger>
          ))}
        </div>

        <Lightbox.Portal>
          <Lightbox.Backdrop className={viewer.backdrop} />
          <Lightbox.Popup className={local.Popup}>
            <Lightbox.Viewport className={viewer.viewport}>
              {(photo: GalleryPhoto) => (
                <Lightbox.Slide className={local.Slide}>
                  <Lightbox.Media width={photo.width} height={photo.height}>
                    <img src={photo.src} alt={photo.alt} />
                  </Lightbox.Media>
                </Lightbox.Slide>
              )}
            </Lightbox.Viewport>

            <header className={cn(local.TopBar, viewer.controlTop)}>
              <Lightbox.Counter className={viewer.counter} />
              <div className={local.Actions}>
                {edit && (
                  <>
                    <a
                      href={edit.src}
                      download={`${original.id}-cropped.jpg`}
                      aria-label="Download the cropped photo"
                      className={local.Pill}
                    >
                      <DownloadIcon />
                    </a>
                    <button
                      type="button"
                      className={local.Pill}
                      onClick={revert}
                    >
                      <UndoIcon /> Revert
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={local.Pill}
                  onClick={() => setEditing(true)}
                >
                  <CropIcon /> Edit
                </button>
                <Lightbox.Close className={viewer.iconButton}>
                  <CloseIcon />
                </Lightbox.Close>
              </div>
            </header>

            <footer className={cn(local.BottomBar, viewer.controlBottom)}>
              <Lightbox.Title className={local.Caption}>
                {(photo: GalleryPhoto) => (
                  <>
                    {photo.caption ?? "Untitled"}
                    {photo.edited && (
                      <span className={local.EditedBadge}>Edited</span>
                    )}
                  </>
                )}
              </Lightbox.Title>
              <Lightbox.ThumbnailList className={local.Strip}>
                {(photo: GalleryPhoto) => (
                  <Lightbox.Thumbnail
                    aria-label={photo.alt}
                    className={local.Thumbnail}
                  >
                    <img
                      src={getThumbnailSrc(photo)}
                      alt=""
                      className="size-full object-cover"
                    />
                  </Lightbox.Thumbnail>
                )}
                <Lightbox.ThumbnailIndicator className={local.Ring} />
              </Lightbox.ThumbnailList>
            </footer>

            {editing && (
              <Editor
                key={original.id}
                photo={original}
                saved={edit?.crop}
                onCancel={() => setEditing(false)}
                onDone={(next) => {
                  setEdits((current) => ({ ...current, [original.id]: next }));
                  setEditing(false);
                }}
              />
            )}
          </Lightbox.Popup>
        </Lightbox.Portal>
      </Lightbox.Root>
    </section>
  );
}

/**
 * The crop editor, over the viewer. It crops the original photo, starting
 * from the last saved crop. Its keys stay its own: the arrows move the crop
 * rather than the viewer's photo, and Esc cancels the edit rather than
 * closing the viewer.
 */
function Editor(props: {
  photo: Photo;
  saved: SavedCrop | undefined;
  onCancel: () => void;
  onDone: (edit: Edit) => void;
}) {
  const { photo, saved, onCancel, onDone } = props;
  const actionsRef = React.useRef<CropperRootActions>(null);
  const [ratio, setRatio] = React.useState<RatioKey>(saved?.ratio ?? "free");
  const [size, setSize] = React.useState<CropperCoordinates | null>(null);

  function done() {
    const actions = actionsRef.current;
    const state = actions?.getState();
    const canvas = actions?.getCanvas({ maxWidth: 2000, maxHeight: 2000 });
    if (!state?.coordinates || !state.visibleArea || !canvas) return;
    onDone({
      src: canvas.toDataURL("image/jpeg", 0.92),
      width: canvas.width,
      height: canvas.height,
      crop: {
        coordinates: state.coordinates,
        visibleArea: state.visibleArea,
        transforms: state.transforms,
        ratio,
      },
    });
  }

  return (
    <div
      ref={focusOnMount}
      role="group"
      aria-label="Edit photo"
      tabIndex={-1}
      className={local.Editor}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
        event.stopPropagation();
      }}
    >
      <Cropper.Root
        src={photo.src}
        aspectRatio={getRatio(ratio, photo)}
        defaultCoordinates={saved?.coordinates}
        defaultVisibleArea={saved?.visibleArea}
        defaultTransforms={saved?.transforms}
        actionsRef={actionsRef}
        onCoordinatesChange={setSize}
        className="absolute inset-0"
      >
        <div className={local.EditorBar}>
          <button type="button" className={local.TextButton} onClick={onCancel}>
            Cancel
          </button>
          <p className={local.EditorTitle}>
            Crop
            <span>{size ? `${size.width} × ${size.height}` : "…"}</span>
          </p>
          <button type="button" className={local.DoneButton} onClick={done}>
            Done
          </button>
        </div>

        <Cropper.Viewport className={local.Viewport}>
          <Cropper.Image className={local.Image} />
          <Cropper.Stencil className={local.Stencil}>
            <Cropper.Grid className={local.Guides} />
            {handlePositions.map((position) => (
              <Cropper.Handle
                key={position}
                position={position}
                className={handleClasses[position]}
              />
            ))}
          </Cropper.Stencil>
        </Cropper.Viewport>

        <div className={local.Controls}>
          <ZoomDial />
          <div className={local.Chips}>
            {(Object.keys(ratios) as RatioKey[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={ratio === key}
                onClick={() => setRatio(key)}
                className={local.Chip}
              >
                {ratios[key]}
              </button>
            ))}
          </div>
          <div className={local.Tools}>
            <Cropper.Rotate angle={-90} className={local.Tool}>
              <RotateIcon />
            </Cropper.Rotate>
            <Cropper.Flip className={local.Tool}>
              <FlipIcon />
            </Cropper.Flip>
            <Cropper.Flip orientation="vertical" className={local.Tool}>
              <FlipIcon className="rotate-90" />
            </Cropper.Flip>
            <Cropper.Reset className={local.Tool}>
              <UndoIcon />
            </Cropper.Reset>
          </div>
        </div>
      </Cropper.Root>
    </div>
  );
}

/** Moves focus into the editor, so its keys reach it from the start. */
function focusOnMount(element: HTMLDivElement | null) {
  element?.focus();
}

type IconProps = React.ComponentProps<"svg">;

function Icon(props: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

function CropIcon(props: IconProps) {
  return (
    <Icon width="16" height="16" {...props}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M2 6h14a2 2 0 0 1 2 2v14" />
    </Icon>
  );
}

function UndoIcon(props: IconProps) {
  return (
    <Icon width="16" height="16" {...props}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </Icon>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <Icon width="16" height="16" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

function DownloadIcon(props: IconProps) {
  return (
    <Icon width="16" height="16" {...props}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Icon>
  );
}

function RotateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="10" width="10" height="10" rx="1.5" />
      <path d="M8 6.5A8 8 0 0 1 19.5 13" />
      <path d="m5.5 5 2.5 1.5L6.5 9" />
    </Icon>
  );
}

function FlipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" strokeDasharray="2 2.5" />
      <path d="M9 7 3.5 17H9zM15 7l5.5 10H15z" />
    </Icon>
  );
}
