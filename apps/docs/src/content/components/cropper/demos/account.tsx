"use client";
import * as React from "react";
import { Cropper, type CropperRootActions } from "@logic-ui/react/cropper";
import { Dialog } from "@logic-ui/react/dialog";
import { Tabs } from "@logic-ui/react/tabs";
import { cn } from "cn";
import { getThumbnailSrc, photos } from "./_lightbox";

/** The steps of the dialog, in order. */
type Step = "view" | "remove" | "choose" | "crop";

/** Where the next step comes from, or `none` when the dialog opens. */
type Direction = "forward" | "back" | "none";

/**
 * Material 3 dark colours: surfaces from dark to light, the primary blue,
 * the text and the outline.
 */
const m3 = {
  surface: "bg-[#1e1f20]",
  container: "bg-[#282a2c]",
  containerHigh: "bg-[#333537]",
  primary: "bg-[#a8c7fa] text-[#062e6f]",
  primaryText: "text-[#a8c7fa]",
  text: "text-[#e3e3e3]",
  muted: "text-[#c4c7c5]",
  outline: "border-[#444746]",
};

/** Tailwind classes of this demo. */
const local = {
  // The account header on the page.
  Account: cn(
    "flex w-full max-w-md items-center gap-4 rounded-[28px] border px-5 py-4 select-none",
    m3.surface,
    m3.outline,
    m3.text,
  ),
  // The badge sits outside the circle, ringed in the card's colour, so
  // nothing clips it.
  AccountButton:
    "group relative size-16 flex-none cursor-pointer rounded-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1f20]",
  AccountShade:
    "pointer-events-none absolute inset-0 rounded-full bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
  CameraBadge: cn(
    "absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full ring-[3px] ring-[#1e1f20]",
    m3.containerHigh,
    m3.text,
  ),
  AccountText: "flex min-w-0 flex-1 flex-col gap-0.5",
  Name: "m-0 text-base font-medium",
  Email: cn("m-0 truncate text-sm", m3.muted),
  ManageButton: cn(
    "flex h-9 flex-none cursor-pointer items-center rounded-full border bg-transparent px-4 text-sm font-medium outline-none transition-colors hover:bg-[#a8c7fa]/8 focus-visible:ring-2 focus-visible:ring-[#a8c7fa]",
    m3.outline,
    m3.primaryText,
  ),

  // The dialog: full screen on phones, a 28 px card on larger screens.
  Backdrop:
    "fixed inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-[400ms] ease-[cubic-bezier(0.05,0.7,0.1,1)] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0",
  Popup: cn(
    "fixed inset-0 flex flex-col overflow-hidden outline-none select-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:shadow-[0_8px_40px_rgb(0_0_0/0.6)]",
    "origin-center transition-[opacity,scale,translate] duration-[400ms] ease-[cubic-bezier(0.05,0.7,0.1,1)] data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-[cubic-bezier(0.3,0,0.8,0.15)] data-starting-style:opacity-0 max-sm:data-ending-style:translate-y-6 max-sm:data-starting-style:translate-y-6 sm:data-ending-style:scale-[0.96] sm:data-starting-style:scale-[0.92]",
    m3.surface,
    m3.text,
  ),
  Header: "flex h-16 flex-none items-center gap-2 px-3",
  HeaderText: "flex min-w-0 flex-1 flex-col",
  Overline: cn("m-0 text-xs", m3.muted),
  Title: "m-0 text-[22px] leading-7 font-normal",
  IconButton: cn(
    "flex size-10 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent outline-none transition-colors hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-[#a8c7fa]",
    m3.muted,
  ),
  // Each step slides in from the side it comes from.
  Step: "flex min-h-0 flex-1 flex-col transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.2,0,0,1)] data-[direction=back]:starting:-translate-x-6 data-[direction=back]:starting:opacity-0 data-[direction=forward]:starting:translate-x-6 data-[direction=forward]:starting:opacity-0",
  Body: "flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 pt-2 pb-6",
  Lead: cn("m-0 max-w-sm text-center text-sm leading-5", m3.muted),
  Big: "flex size-48 items-center justify-center overflow-hidden rounded-full text-7xl font-medium text-white sm:size-56",
  Actions: "flex w-full gap-3 px-6 pb-6",
  // Material buttons: tonal, filled, text.
  Tonal: cn(
    "flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-none px-6 text-sm font-medium outline-none transition-[background-color,box-shadow] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#a8c7fa] disabled:cursor-default disabled:opacity-40",
    m3.containerHigh,
    m3.primaryText,
  ),
  Filled: cn(
    "relative flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-none px-6 text-sm font-medium outline-none transition-[filter,box-shadow] hover:shadow-[0_1px_3px_rgb(0_0_0/0.4)] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#a8c7fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1f20] disabled:cursor-default disabled:opacity-60",
    m3.primary,
  ),
  Danger:
    "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-[#ffb4ab] px-6 text-sm font-medium text-[#690005] outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#ffb4ab] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1f20]",
  Text: cn(
    "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-transparent px-3 text-sm font-medium outline-none transition-colors hover:bg-[#a8c7fa]/8 focus-visible:ring-2 focus-visible:ring-[#a8c7fa]",
    m3.primaryText,
  ),

  // Tabs with a sliding indicator under the active tab.
  TabList: cn("relative flex flex-none border-b px-6", m3.outline),
  Tab: cn(
    "h-12 flex-1 cursor-pointer border-none bg-transparent px-4 text-sm font-medium outline-none transition-colors hover:bg-white/5 focus-visible:bg-white/8 data-active:text-[#a8c7fa]",
    m3.muted,
  ),
  TabIndicator:
    "absolute bottom-0 left-(--active-tab-left) h-[3px] w-(--active-tab-width) rounded-t-full bg-[#a8c7fa] transition-[left,width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
  Panel: "min-h-0 flex-1 overflow-y-auto p-6 outline-none",
  Grid: "grid grid-cols-3 gap-2",
  Photo:
    "aspect-square cursor-pointer overflow-hidden rounded-xl border-none bg-white/5 p-0 outline-none transition-opacity duration-200 hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#a8c7fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1f20]",
  // The drop zone of the upload tab.
  Drop: cn(
    "flex h-full min-h-64 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed text-center transition-colors data-dragging:border-[#a8c7fa] data-dragging:bg-[#a8c7fa]/8",
    m3.outline,
  ),
  DropTitle: "m-0 text-base",
  Or: cn("m-0 text-xs tracking-wider uppercase", m3.muted),
  Error: "m-0 rounded-xl bg-[#ffb4ab]/10 px-3 py-2 text-xs text-[#ffb4ab]",

  // The crop step: the image on black, a square crop with a circle that
  // shows what people see, and round handles on its corners.
  CropArea: "relative mx-6 min-h-0 flex-1 overflow-hidden rounded-3xl bg-black",
  Viewport:
    "absolute inset-0 cursor-grab p-6 opacity-0 transition-opacity duration-500 data-interacting:cursor-grabbing data-loaded:opacity-100",
  Image:
    "data-transitioning:transition-transform data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.2,0,0,1)]",
  Stencil:
    "shadow-[0_0_0_9999px_rgb(0_0_0/0.6)] ring-1 ring-white/80 ring-inset outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-[#a8c7fa] data-interacting:shadow-[0_0_0_9999px_rgb(0_0_0/0.4)] data-movable:cursor-move data-transitioning:transition-[width,height,transform,box-shadow] data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.2,0,0,1)]",
  Circle:
    "pointer-events-none absolute inset-0 rounded-full border border-dashed border-white/70",
  Handle:
    "absolute z-10 size-6 rounded-full outline-none after:absolute after:inset-1 after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgb(0_0_0/0.5)] after:transition-transform after:content-[''] focus-visible:after:bg-[#a8c7fa] data-resizing:after:scale-125",
  CropFooter: "flex flex-none items-center gap-2 p-6",
  Spinner:
    "size-4 animate-spin rounded-full border-2 border-[#062e6f]/30 border-t-[#062e6f]",
};

/** Where each corner handle sits, half outside the crop. */
const corners = {
  "top-left": "-top-3 -left-3 cursor-nwse-resize",
  "top-right": "-top-3 -right-3 cursor-nesw-resize",
  "bottom-right": "-right-3 -bottom-3 cursor-nwse-resize",
  "bottom-left": "-bottom-3 -left-3 cursor-nesw-resize",
} as const;

/** Whether a drag carries files. */
function hasFiles(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * An account picture editor in the style of Google's: a dialog that walks
 * through the current picture, choosing a new one (your photos or an upload),
 * and cropping it to a circle, then saves and returns to the picture.
 */
export default function ExampleCropperAccount() {
  const [open, setOpen] = React.useState(false);
  const [picture, setPicture] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<Step>("view");
  // `none` when the dialog opens: the dialog animates, not the step.
  const [direction, setDirection] = React.useState<Direction>("none");
  const [source, setSource] = React.useState<string | null>(null);

  // Object URLs made for uploads are released once replaced.
  React.useEffect(() => {
    if (!source?.startsWith("blob:")) return undefined;
    return () => URL.revokeObjectURL(source);
  }, [source]);

  function go(next: Step, nextDirection: Direction = "forward") {
    setDirection(nextDirection);
    setStep(next);
  }

  function openDialog() {
    go("view", "none");
    setOpen(true);
  }

  function choose(src: string) {
    setSource(src);
    go("crop");
  }

  return (
    <>
      <div className={local.Account}>
        <button
          type="button"
          aria-label="Change profile picture"
          className={local.AccountButton}
          onClick={openDialog}
        >
          <Picture src={picture} className="size-16 text-2xl" />
          <span className={local.AccountShade} />
          <span className={local.CameraBadge}>
            <CameraIcon />
          </span>
        </button>
        <div className={local.AccountText}>
          <p className={local.Name}>Ava Martin</p>
          <p className={local.Email}>ava.martin@example.com</p>
        </div>
        <button
          type="button"
          className={local.ManageButton}
          onClick={openDialog}
        >
          Change photo
        </button>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={local.Backdrop} />
          <Dialog.Popup className={local.Popup}>
            {step === "view" && (
              <ViewStep
                picture={picture}
                direction={direction}
                onChange={() => go("choose")}
                onRemove={() => go("remove")}
              />
            )}
            {step === "remove" && (
              <RemoveStep
                picture={picture}
                direction={direction}
                onBack={() => go("view", "back")}
                onConfirm={() => {
                  setPicture(null);
                  go("view", "back");
                }}
              />
            )}
            {step === "choose" && (
              <ChooseStep
                direction={direction}
                onBack={() => go("view", "back")}
                onChoose={choose}
              />
            )}
            {step === "crop" && source && (
              <CropStep
                key={source}
                src={source}
                direction={direction}
                onBack={() => go("choose", "back")}
                onSave={(result) => {
                  setPicture(result);
                  go("view", "back");
                }}
              />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/** The picture, or the initial on a coloured circle. */
function Picture(props: { src: string | null; className?: string }) {
  const { src, className } = props;
  return src ? (
    <img
      src={src}
      alt=""
      className={cn("rounded-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-[#8e24aa] font-medium text-white",
        className,
      )}
    >
      A
    </span>
  );
}

/** The top of each step: close or back, an overline and the title. */
function Header(props: { title: string; onBack?: (() => void) | undefined }) {
  const { title, onBack } = props;
  return (
    <div className={local.Header}>
      {onBack ? (
        <button
          type="button"
          aria-label="Back"
          className={local.IconButton}
          onClick={onBack}
        >
          <ArrowBackIcon />
        </button>
      ) : (
        <Dialog.Close aria-label="Close" className={local.IconButton}>
          <CloseIcon />
        </Dialog.Close>
      )}
      <div className={local.HeaderText}>
        <p className={local.Overline}>Account</p>
        <Dialog.Title className={local.Title}>{title}</Dialog.Title>
      </div>
    </div>
  );
}

function ViewStep(props: {
  picture: string | null;
  direction: string;
  onChange: () => void;
  onRemove: () => void;
}) {
  const { picture, direction, onChange, onRemove } = props;
  return (
    <div className={local.Step} data-direction={direction}>
      <Header title="Profile picture" />
      <div className={local.Body}>
        <Dialog.Description className={local.Lead}>
          A picture helps people recognize you and lets you know when you're
          signed in to your account.
        </Dialog.Description>
        <Picture src={picture} className={local.Big} />
      </div>
      <div className={local.Actions}>
        <button type="button" className={local.Tonal} onClick={onChange}>
          <PencilIcon /> {picture ? "Change" : "Add picture"}
        </button>
        {picture && (
          <button type="button" className={local.Tonal} onClick={onRemove}>
            <TrashIcon /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

function RemoveStep(props: {
  picture: string | null;
  direction: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { picture, direction, onBack, onConfirm } = props;
  return (
    <div className={local.Step} data-direction={direction}>
      <Header title="Remove profile picture?" onBack={onBack} />
      <div className={local.Body}>
        <Dialog.Description className={local.Lead}>
          Your initial will show instead, on a coloured circle.
        </Dialog.Description>
        <div className="flex items-center gap-6">
          <Picture src={picture} className="size-28 text-4xl" />
          <ArrowForwardIcon className={m3.muted} />
          <Picture src={null} className="size-28 text-4xl" />
        </div>
      </div>
      <div className={cn(local.Actions, "justify-end")}>
        <button type="button" className={local.Text} onClick={onBack}>
          Cancel
        </button>
        <button type="button" className={local.Danger} onClick={onConfirm}>
          Remove
        </button>
      </div>
    </div>
  );
}

function ChooseStep(props: {
  direction: string;
  onBack: () => void;
  onChoose: (src: string) => void;
}) {
  const { direction, onBack, onChoose } = props;
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function take(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(`“${file.name}” isn't an image. Choose a JPEG, PNG or WebP.`);
      return;
    }
    onChoose(URL.createObjectURL(file));
  }

  return (
    <div className={local.Step} data-direction={direction}>
      <Header title="Change profile picture" onBack={onBack} />
      <Dialog.Description className="sr-only">
        Pick one of your photos, or upload one from your device.
      </Dialog.Description>
      <Tabs.Root defaultValue="photos" className="flex min-h-0 flex-1 flex-col">
        <Tabs.List className={local.TabList}>
          <Tabs.Tab value="photos" className={local.Tab}>
            Your photos
          </Tabs.Tab>
          <Tabs.Tab value="upload" className={local.Tab}>
            Upload
          </Tabs.Tab>
          <Tabs.Indicator className={local.TabIndicator} />
        </Tabs.List>
        <Tabs.Panel value="photos" className={local.Panel}>
          <div className={local.Grid}>
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                aria-label={photo.alt}
                className={local.Photo}
                onClick={() => onChoose(photo.src)}
              >
                <img
                  src={getThumbnailSrc(photo)}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="upload" className={local.Panel}>
          <div
            className={local.Drop}
            data-dragging={dragging ? "" : undefined}
            onDragEnter={(event) => {
              if (hasFiles(event)) setDragging(true);
            }}
            onDragOver={(event) => {
              if (hasFiles(event)) event.preventDefault();
            }}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                setDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              take(event.dataTransfer.files[0]);
            }}
          >
            <ImagesIcon className={m3.primaryText} />
            <p className={local.DropTitle}>Drag a photo here</p>
            <p className={local.Or}>or</p>
            <label className={local.Filled}>
              <UploadIcon /> Upload from device
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  take(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {error && (
              <p role="alert" className={local.Error}>
                {error}
              </p>
            )}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

function CropStep(props: {
  src: string;
  direction: string;
  onBack: () => void;
  onSave: (result: string) => void;
}) {
  const { src, direction, onBack, onSave } = props;
  const actionsRef = React.useRef<CropperRootActions>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function save() {
    const canvas = actionsRef.current?.getCanvas({ width: 512, height: 512 });
    if (!canvas) return;
    setSaving(true);
    const result = canvas.toDataURL("image/jpeg", 0.92);
    // A real app uploads it here; the demo waits a moment instead.
    window.setTimeout(() => onSave(result), 900);
  }

  return (
    <div className={local.Step} data-direction={direction}>
      <Header title="Crop & rotate" onBack={onBack} />
      <Dialog.Description className="sr-only">
        Drag the frame or its corners, and drag or zoom the photo. The circle
        shows what people see.
      </Dialog.Description>
      <Cropper.Root
        src={src}
        aspectRatio={1}
        actionsRef={actionsRef}
        disabled={saving}
        onStatusChange={(status) => setLoaded(status === "loaded")}
        className="flex min-h-[min(420px,55dvh)] flex-1 flex-col"
      >
        <div className={local.CropArea}>
          <Cropper.Viewport className={local.Viewport}>
            <Cropper.Image className={local.Image} />
            <Cropper.Stencil
              aria-label="Profile picture"
              className={local.Stencil}
            >
              <span className={local.Circle} />
              {(Object.keys(corners) as (keyof typeof corners)[]).map(
                (position) => (
                  <Cropper.Handle
                    key={position}
                    position={position}
                    className={cn(local.Handle, corners[position])}
                  />
                ),
              )}
            </Cropper.Stencil>
          </Cropper.Viewport>
        </div>
        <div className={local.CropFooter}>
          <Cropper.Rotate angle={-90} className={local.Text}>
            <RotateIcon /> Rotate
          </Cropper.Rotate>
          <Cropper.Reset className={local.Text}>Reset</Cropper.Reset>
          <button
            type="button"
            className={cn(local.Filled, "ms-auto")}
            disabled={!loaded || saving}
            onClick={save}
          >
            {saving ? (
              <>
                <span className={local.Spinner} /> Saving…
              </>
            ) : (
              "Save as profile picture"
            )}
          </button>
        </div>
      </Cropper.Root>
    </div>
  );
}

type IconProps = React.ComponentProps<"svg">;

/** A 20 px Material-style icon. */
function Icon(props: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

function ArrowBackIcon() {
  return (
    <Icon>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

function ArrowForwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

function PencilIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
    </Icon>
  );
}

function TrashIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
    </Icon>
  );
}

function CameraIcon() {
  return (
    <Icon width="14" height="14" strokeWidth="2.1">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </Icon>
  );
}

function RotateIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M8 6.5A8 8 0 1 1 4.5 13" />
      <path d="M8 2.5v4H4" />
    </Icon>
  );
}

function UploadIcon() {
  return (
    <Icon width="18" height="18">
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </Icon>
  );
}

function ImagesIcon(props: IconProps) {
  return (
    <Icon width="48" height="48" strokeWidth="1.4" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m3.5 17 5-5 4 4 3-3 5 5" />
    </Icon>
  );
}
