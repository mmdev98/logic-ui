"use client";
import * as React from "react";
import {
  Cropper,
  type CropperCoordinates,
  type CropperRootActions,
  type CropperRootStatus,
  type CropperState,
} from "@logic-ui/react/cropper";
import { Dialog } from "@logic-ui/react/dialog";
import { cn } from "cn";
import { handleClasses, handlePositions, photos } from "./_classes";
import { FlipIcon, ResetIcon, RotateIcon } from "./_icons";
import { ZoomDial } from "./_zoom-dial";

/** What is being cropped: each has its own shape, output size and labels. */
type Target = "avatar" | "cover";

const targets = {
  avatar: {
    title: "Profile photo",
    // A circle that keeps its size: the photo moves and zooms behind it.
    stencilSize: (state: CropperState) => {
      const side = Math.min(state.boundary.width, state.boundary.height) * 0.78;
      return { width: side, height: side };
    },
    aspectRatio: 1,
    output: { width: 512, height: 512 },
    sample: photos.portrait,
  },
  cover: {
    title: "Cover",
    // A 3:1 banner across the width.
    stencilSize: (state: CropperState) => {
      const width = Math.min(
        state.boundary.width * 0.92,
        state.boundary.height * 2.7,
      );
      return { width, height: width / 3 };
    },
    aspectRatio: 3,
    output: { width: 1500, height: 500 },
    sample: photos.landscape,
  },
} as const;

/** Tailwind classes of this demo. */
const local = {
  // The profile card.
  Card: "w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 text-white shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] select-none",
  // Drop zones: a yellow ring while a file is dragged over them.
  Cover:
    "group relative block aspect-[3/1] w-full cursor-pointer overflow-hidden border-none bg-[radial-gradient(90%_140%_at_0%_0%,rgb(56_189_248/0.7),transparent_60%),radial-gradient(80%_140%_at_100%_100%,rgb(251_191_36/0.55),transparent_60%),radial-gradient(60%_100%_at_70%_0%,rgb(167_139_250/0.6),transparent_70%),linear-gradient(135deg,#312e81,#0f172a)] p-0 outline-none after:pointer-events-none after:absolute after:inset-0 after:ring-2 after:ring-[#ffd60a] after:ring-inset after:opacity-0 after:transition-opacity data-dragging:after:opacity-100 has-focus-visible:after:opacity-100",
  Avatar:
    "group relative z-10 -mt-12 ml-5 flex size-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-none bg-gradient-to-br from-violet-500 to-sky-500 p-0 text-2xl font-semibold text-white ring-4 ring-neutral-950 outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-2 after:ring-[#ffd60a] after:ring-inset after:opacity-0 after:transition-opacity data-dragging:after:opacity-100 has-focus-visible:after:opacity-100",
  Fill: "absolute inset-0 size-full object-cover",
  // A camera badge over the photo on hover, focus or drag.
  Hover:
    "absolute inset-0 flex items-center justify-center gap-2 bg-black/45 text-sm font-medium opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-dragging:opacity-100",
  Body: "flex flex-col gap-4 px-5 pt-3 pb-5",
  Name: "m-0 text-lg font-semibold",
  Handle: "m-0 text-sm text-white/50",
  Row: "flex flex-wrap items-center gap-2",
  Chip: "flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-none bg-white/10 px-3 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  Remove:
    "flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-none bg-transparent px-3 text-xs font-medium text-red-300/90 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300",
  Hint: "m-0 text-xs text-white/40",
  Error: "m-0 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300",

  // The editor: a sheet on phones, a card on larger screens. The cropper
  // fills it under frosted bars; the viewport's padding keeps the crop clear
  // of them.
  Backdrop:
    "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0",
  Popup:
    "fixed inset-x-0 bottom-0 h-[min(680px,92dvh)] overflow-hidden rounded-t-[2rem] border border-white/10 bg-black text-white outline-none transition-[translate,opacity,scale] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] select-none [--bar-top:3.75rem] [--bar-bottom:calc(9.5rem+env(safe-area-inset-bottom))] data-ending-style:translate-y-full data-starting-style:translate-y-full sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:h-[640px] sm:w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:[--bar-bottom:9.5rem] sm:data-ending-style:-translate-y-1/2 sm:data-ending-style:scale-95 sm:data-ending-style:opacity-0 sm:data-starting-style:-translate-y-1/2 sm:data-starting-style:scale-95 sm:data-starting-style:opacity-0",
  Frost:
    "border-white/10 bg-neutral-950/55 backdrop-blur-xl backdrop-saturate-150",
  TopBar:
    "absolute inset-x-0 top-0 z-20 flex h-(--bar-top) items-center justify-between border-b px-5",
  Title:
    "m-0 flex flex-col items-center text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase [&_span]:font-mono [&_span]:tracking-normal [&_span]:text-white/40 [&_span]:normal-case",
  TextButton:
    "-mx-2 cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[15px] text-white transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-white",
  SaveButton:
    "-mx-2 cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[15px] font-semibold text-[#ffd60a] transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[#ffd60a] disabled:cursor-default disabled:opacity-30",
  Viewport:
    "absolute inset-0 cursor-grab bg-black pt-(--bar-top) pb-(--bar-bottom) opacity-0 transition-opacity duration-500 data-interacting:cursor-grabbing data-loaded:opacity-100",
  Image:
    "data-transitioning:transition-transform data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.32,0.72,0,1)]",
  Stencil:
    "shadow-[0_0_0_9999px_rgb(0_0_0/0.65)] ring-1 ring-white/70 ring-inset outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-[#ffd60a] data-interacting:shadow-[0_0_0_9999px_rgb(0_0_0/0.35)] data-transitioning:transition-[width,height,transform,box-shadow] data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.32,0.72,0,1)]",
  // Shown while the image loads, or when it can't be opened.
  Status:
    "pointer-events-none absolute inset-x-0 top-(--bar-top) bottom-(--bar-bottom) z-10 hidden flex-col items-center justify-center gap-3 text-sm text-white/60 in-data-error:flex in-data-loading:flex",
  Spinner:
    "size-7 animate-spin rounded-full border-2 border-white/15 border-t-white in-data-error:hidden",
  BottomBar:
    "absolute inset-x-0 bottom-0 z-20 flex h-(--bar-bottom) flex-col justify-center gap-2 border-t pb-[env(safe-area-inset-bottom)]",
  Tools: "flex items-center justify-between px-5",
  ToolGroup: "flex items-center gap-1",
  Tool: "flex size-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/90 transition-[background-color,opacity,scale] hover:bg-white/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
  // The result, live, at its real shape.
  Result: "flex items-center gap-3 font-mono text-[11px] text-white/45",
  AvatarPreview: "size-10 rounded-full bg-white/10 ring-2 ring-white/15",
  CoverPreview: "h-8 w-24 rounded-md bg-white/10 ring-2 ring-white/15",
};

/** Whether a drag carries files. */
function hasFiles(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * An "Edit profile" card: click or drop an image on the cover or the photo,
 * crop it in a dialog shaped for each (a fixed circle, a 3:1 banner), and see
 * the result on the card. On a phone the dialog is a sheet; on a larger
 * screen, a card.
 */
export default function ExampleCropperDialog() {
  const [images, setImages] = React.useState<Record<Target, string | null>>({
    avatar: null,
    cover: null,
  });
  const [editing, setEditing] = React.useState<{
    target: Target;
    src: string;
  } | null>(null);
  const [open, setOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState<Target | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Object URLs made for chosen files are released once replaced.
  const src = editing?.src;
  React.useEffect(() => {
    if (!src?.startsWith("blob:")) return undefined;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  function startEditing(target: Target, nextSrc: string) {
    setError(null);
    setEditing({ target, src: nextSrc });
    setOpen(true);
  }

  function edit(target: Target, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(`“${file.name}” isn't an image. Choose a JPEG, PNG or WebP.`);
      return;
    }
    startEditing(target, URL.createObjectURL(file));
  }

  function dropZone(target: Target) {
    return {
      "data-dragging": dragging === target ? "" : undefined,
      onDragEnter: (event: React.DragEvent) => {
        if (hasFiles(event)) setDragging(target);
      },
      onDragOver: (event: React.DragEvent) => {
        if (hasFiles(event)) event.preventDefault();
      },
      onDragLeave: (event: React.DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(null);
        }
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        setDragging(null);
        edit(target, event.dataTransfer.files[0]);
      },
    };
  }

  return (
    <div className={local.Card}>
      <label className={local.Cover} {...dropZone("cover")}>
        <FileInput target="cover" label="Change cover" onFile={edit} />
        {images.cover && (
          <img src={images.cover} alt="" className={local.Fill} />
        )}
        <span className={local.Hover}>
          <CameraIcon /> {images.cover ? "Change cover" : "Add a cover"}
        </span>
      </label>
      <label className={local.Avatar} {...dropZone("avatar")}>
        <FileInput target="avatar" label="Change profile photo" onFile={edit} />
        {images.avatar ? (
          <img src={images.avatar} alt="" className={local.Fill} />
        ) : (
          "AM"
        )}
        <span className={cn(local.Hover, "rounded-full")}>
          <CameraIcon />
        </span>
      </label>

      <div className={local.Body}>
        <div>
          <p className={local.Name}>Ava Martin</p>
          <p className={local.Handle}>@ava · Photographer</p>
        </div>
        {error && (
          <p role="alert" className={local.Error}>
            {error}
          </p>
        )}
        <div className={local.Row}>
          <button
            type="button"
            className={local.Chip}
            onClick={() => startEditing("avatar", targets.avatar.sample)}
          >
            Try a sample photo
          </button>
          <button
            type="button"
            className={local.Chip}
            onClick={() => startEditing("cover", targets.cover.sample)}
          >
            Try a sample cover
          </button>
          {(images.avatar || images.cover) && (
            <button
              type="button"
              className={local.Remove}
              onClick={() => setImages({ avatar: null, cover: null })}
            >
              <TrashIcon /> Remove
            </button>
          )}
        </div>
        <p className={local.Hint}>
          Click the cover or the photo, or drop an image on it.
        </p>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={local.Backdrop} />
          <Dialog.Popup className={local.Popup}>
            {editing && (
              <Editor
                key={editing.target + editing.src}
                target={editing.target}
                src={editing.src}
                onSave={(result) => {
                  setImages((current) => ({
                    ...current,
                    [editing.target]: result,
                  }));
                  setOpen(false);
                }}
              />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/**
 * A file input, hidden but focusable, inside a drop zone's label: a click on
 * the zone opens the file picker, and the keyboard reaches it.
 */
function FileInput(props: {
  target: Target;
  label: string;
  onFile: (target: Target, file: File | undefined) => void;
}) {
  const { target, label, onFile } = props;
  return (
    <input
      type="file"
      accept="image/*"
      aria-label={label}
      className="sr-only"
      onChange={(event) => {
        onFile(target, event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  );
}

/** The cropper in the dialog, shaped for the photo or the cover. */
function Editor(props: {
  target: Target;
  src: string;
  onSave: (result: string) => void;
}) {
  const { target, src, onSave } = props;
  const config = targets[target];
  const actionsRef = React.useRef<CropperRootActions>(null);
  const [status, setStatus] = React.useState<CropperRootStatus>("loading");
  const [size, setSize] = React.useState<CropperCoordinates | null>(null);

  function save() {
    const canvas = actionsRef.current?.getCanvas(config.output);
    if (canvas) onSave(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <Cropper.Root
      src={src}
      stencilSize={config.stencilSize}
      aspectRatio={config.aspectRatio}
      imageRestriction="stencil"
      actionsRef={actionsRef}
      onStatusChange={setStatus}
      onCoordinatesChange={setSize}
      className="absolute inset-0"
    >
      <Cropper.Viewport className={local.Viewport}>
        <Cropper.Image className={local.Image} />
        <Cropper.Stencil
          aria-label={config.title}
          className={cn(local.Stencil, target === "avatar" && "rounded-full")}
        >
          {/* Fixed in size: the corners only frame the cover. */}
          {target === "cover" &&
            handlePositions
              .filter((position) => position.includes("-"))
              .map((position) => (
                <Cropper.Handle
                  key={position}
                  position={position}
                  className={handleClasses[position]}
                />
              ))}
        </Cropper.Stencil>
      </Cropper.Viewport>

      <div className={local.Status} aria-live="polite">
        <span className={local.Spinner} />
        {status === "error" ? "This image can't be opened." : "Loading…"}
      </div>

      <div className={cn(local.TopBar, local.Frost)}>
        <Dialog.Close className={local.TextButton}>Cancel</Dialog.Close>
        <Dialog.Title className={local.Title}>
          {config.title}
          <span>{size ? `${size.width} × ${size.height}` : "…"}</span>
        </Dialog.Title>
        <button
          type="button"
          onClick={save}
          disabled={status !== "loaded"}
          className={local.SaveButton}
        >
          Save
        </button>
      </div>
      <Dialog.Description className="sr-only">
        Drag the photo to place it in the frame, and zoom with the dial, the
        wheel or a pinch.
      </Dialog.Description>

      <div className={cn(local.BottomBar, local.Frost)}>
        <ZoomDial />
        <div className={local.Tools}>
          <div className={local.ToolGroup}>
            <Cropper.Rotate angle={-90} className={local.Tool}>
              <RotateIcon direction="counterclockwise" />
            </Cropper.Rotate>
            <Cropper.Flip className={local.Tool}>
              <FlipIcon />
            </Cropper.Flip>
            <Cropper.Reset className={local.Tool}>
              <ResetIcon />
            </Cropper.Reset>
          </div>
          <div className={local.Result}>
            {config.output.width} × {config.output.height}
            <Cropper.Preview
              aria-hidden
              className={
                target === "avatar" ? local.AvatarPreview : local.CoverPreview
              }
            />
          </div>
        </div>
      </div>
    </Cropper.Root>
  );
}

type IconProps = React.ComponentProps<"svg">;

function Icon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
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

function CameraIcon(props: IconProps) {
  return (
    <Icon width="18" height="18" {...props}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </Icon>
  );
}

function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
    </Icon>
  );
}
