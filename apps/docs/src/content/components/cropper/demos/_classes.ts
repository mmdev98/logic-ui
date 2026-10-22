import type { CropperHandlePosition } from "@logic-ui/react/cropper";

/** Slide to the new place after a button or key press, like a phone editor. */
const settle =
  "data-transitioning:duration-(--cropper-transition-duration) data-transitioning:ease-[cubic-bezier(0.32,0.72,0,1)]";

/** Tailwind classes shared by the cropper demos: a dark, phone-style editor. */
export const classes = {
  // A phone-sized editor: black, edge to edge, rounded like a screen.
  phone:
    "relative mx-auto flex w-full max-w-[400px] flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-black text-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] select-none",
  topBar: "flex h-14 items-center justify-between px-6",
  title:
    "m-0 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase",
  textButton:
    "-mx-2 cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[15px] text-white transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-30",
  doneButton:
    "-mx-2 cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[15px] font-semibold text-[#ffd60a] transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[#ffd60a] disabled:cursor-default disabled:opacity-30",

  // The image fades in once it is on screen.
  viewport:
    "w-full cursor-grab bg-black opacity-0 transition-opacity duration-500 data-interacting:cursor-grabbing data-loaded:opacity-100",
  image: `${settle} data-transitioning:transition-transform`,

  // The crop: the image around it is dimmed, and less while you drag, so you
  // see what you leave out. A hairline frame; corner brackets are the handles.
  stencil: `shadow-[0_0_0_9999px_rgb(0_0_0/0.6)] ring-1 ring-white/70 ring-inset outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-[#ffd60a] data-interacting:shadow-[0_0_0_9999px_rgb(0_0_0/0.35)] data-movable:cursor-move ${settle} data-transitioning:transition-[width,height,transform,box-shadow]`,

  // Rule of thirds, fading in while the crop or the image moves. Only the
  // inner lines: the frame draws the outer ones.
  grid: "pointer-events-none absolute inset-0 grid grid-cols-[repeat(var(--cropper-grid-columns),minmax(0,1fr))] grid-rows-[repeat(var(--cropper-grid-rows),minmax(0,1fr))] opacity-0 transition-opacity duration-300 data-interacting:opacity-100 *:border-white/40 *:not-data-[column='2']:border-r *:not-data-[row='2']:border-b",

  // Aspect ratio chips.
  chips: "flex justify-center gap-2 px-4",
  chip: "h-7 cursor-pointer rounded-full border-none bg-white/10 px-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-pressed:bg-white aria-pressed:text-black",

  // Round icon buttons along the bottom.
  toolbar: "flex items-center justify-around px-6 pt-2 pb-6",
  iconButton:
    "flex size-11 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/90 transition-[background-color,opacity,scale] hover:bg-white/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",

  text: "m-0 text-sm text-neutral-400",
  primaryButton:
    "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-white px-4 text-sm font-medium whitespace-nowrap text-black transition-[background-color,scale] select-none hover:bg-neutral-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  button:
    "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-white/10 px-4 text-sm font-medium whitespace-nowrap text-white transition-colors select-none hover:bg-white/15 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
} as const;

/**
 * The handles: thick corner brackets, like a phone's photo editor, with a
 * 32 px target, drawn inside the crop so they never leave it, even at full
 * size; the edges are invisible strips you can drag.
 */
const corner =
  "absolute z-10 size-8 border-white outline-none drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)] focus-visible:border-[#ffd60a]";
const edge = "absolute z-10 outline-none";

export const handleClasses: Record<CropperHandlePosition, string> = {
  "top-left": `${corner} top-0 left-0 cursor-nwse-resize rounded-tl-[3px] border-t-[3px] border-l-[3px]`,
  "top-right": `${corner} top-0 right-0 cursor-nesw-resize rounded-tr-[3px] border-t-[3px] border-r-[3px]`,
  "bottom-right": `${corner} right-0 bottom-0 cursor-nwse-resize rounded-br-[3px] border-r-[3px] border-b-[3px]`,
  "bottom-left": `${corner} bottom-0 left-0 cursor-nesw-resize rounded-bl-[3px] border-b-[3px] border-l-[3px]`,
  top: `${edge} inset-x-8 top-0 h-3 cursor-ns-resize`,
  bottom: `${edge} inset-x-8 bottom-0 h-3 cursor-ns-resize`,
  left: `${edge} inset-y-8 left-0 w-3 cursor-ew-resize`,
  right: `${edge} inset-y-8 right-0 w-3 cursor-ew-resize`,
};

/** The eight handles: four corners and four edges. */
export const handlePositions = Object.keys(
  handleClasses,
) as CropperHandlePosition[];

/** Photos served with CORS headers, so `getCanvas()` can read them. */
export const photos = {
  landscape: "https://picsum.photos/id/1015/1600/1067",
  portrait: "https://picsum.photos/id/1027/1067/1600",
} as const;
