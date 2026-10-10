/**
 * The controls of a viewer: they fade and slide off the edge of the screen
 * they sit on while the image is dragged to close (`--lightbox-dismiss-progress`
 * goes from 0 to 1), and the same way when a tap hides them or the viewer
 * opens and closes. Transitions are off during a drag so they follow the finger.
 */
const control =
  "opacity-[calc(1_-_var(--lightbox-dismiss-progress,0)*1.5)] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] in-data-dragging:transition-none in-data-controls-hidden:pointer-events-none in-data-controls-hidden:opacity-0 in-data-starting-style:opacity-0 in-data-ending-style:pointer-events-none in-data-ending-style:opacity-0 motion-reduce:translate-none";

/** Tailwind classes shared by the lightbox demos. */
export const classes = {
  // The page around the triggers.
  row: "flex flex-wrap items-center gap-2",
  stack: "flex w-full flex-col items-center gap-4",
  text: "m-0 text-sm text-neutral-400",
  button:
    "flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm whitespace-nowrap text-white select-none hover:not-disabled:bg-white/10 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",

  // Triggers. While the viewer shows a trigger's image, hide the trigger but
  // keep its space (`invisible`): the image looks like it left its slot.
  trigger:
    "group relative cursor-zoom-in overflow-hidden border-none bg-white/5 p-0 data-flying:invisible data-popup-open:invisible data-pending:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  triggerImage:
    "size-full object-cover transition-opacity duration-300 group-data-pending:opacity-60",

  // Viewer.
  backdrop:
    "fixed inset-0 bg-[rgb(8_8_12/calc(0.92*(1_-_var(--lightbox-dismiss-progress,0))))] backdrop-blur-[calc(20px*(1_-_var(--lightbox-dismiss-progress,0)))] transition-[background-color,backdrop-filter] duration-300 data-dragging:transition-none data-starting-style:bg-transparent data-starting-style:backdrop-blur-none data-ending-style:bg-transparent data-ending-style:backdrop-blur-none",
  popup: "fixed inset-0 text-white outline-none",
  viewport:
    "absolute inset-0 cursor-zoom-in gap-x-4 in-data-zoomed:cursor-grab data-dragging:cursor-grabbing",
  // Room for the controls above and below the image, and for notches.
  slide:
    "px-[max(1rem,env(safe-area-inset-left))] pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-20",

  /** A control at the top: it slides up and away. */
  controlTop: `${control} -translate-y-[calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0))] in-data-controls-hidden:-translate-y-4 in-data-starting-style:-translate-y-4 in-data-ending-style:-translate-y-4`,
  /** A control at the bottom: it slides down and away. */
  controlBottom: `${control} translate-y-[calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0))] in-data-controls-hidden:translate-y-4 in-data-starting-style:translate-y-4 in-data-ending-style:translate-y-4`,
  /** A control on the right edge: it slides right and away. */
  controlRight: `${control} translate-x-[calc((100%+1rem)*1.5*var(--lightbox-dismiss-progress,0))] in-data-controls-hidden:translate-x-4 in-data-starting-style:translate-x-4 in-data-ending-style:translate-x-4`,

  topBar:
    "absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-[max(0.75rem,env(safe-area-inset-left))] pt-[calc(0.75rem+env(safe-area-inset-top))]",
  bottomBar:
    "absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-3 pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))]",
  // A soft shade behind controls over the image, so they stay readable.
  shadeTop: "bg-linear-to-b from-black/60 to-transparent pb-8",
  shadeBottom: "bg-linear-to-t from-black/70 to-transparent",
  iconButton:
    "flex size-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/10 text-white backdrop-blur-md transition-colors hover:not-data-disabled:bg-white/20 data-disabled:cursor-default data-disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white",
  // As tall as the icon buttons, its text as far from the side as from the top.
  counter:
    "flex h-10 items-center px-2.5 text-sm font-medium text-white/90 tabular-nums",
  toolbar:
    "flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-neutral-900/80 p-1 shadow-2xl backdrop-blur-xl",
  toolbarButton:
    "flex size-9 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white transition-colors hover:not-data-disabled:bg-white/12 data-disabled:cursor-default data-disabled:opacity-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white",
  toolbarValue:
    "min-w-14 text-center text-[0.8125rem] text-neutral-400 tabular-nums",
  separator: "mx-1 h-4 w-px flex-none bg-white/15",

  /**
   * New text slides in from the side the photo came from:
   * `data-starting-style` lasts one frame, then the transition brings it in.
   * The element stays on screen, so jump to the start without a transition.
   */
  enter:
    "transition-[opacity,translate] duration-300 ease-out data-starting-style:opacity-0 data-starting-style:transition-none data-starting-style:data-[activation-direction=left]:-translate-x-5 data-starting-style:data-[activation-direction=right]:translate-x-5 motion-reduce:transition-none",

  // Thumbnail strips: they still scroll, only the browser's scrollbar is hidden.
  hideScrollbar: "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  fadeX:
    "data-overflow-start:mask-l-from-85% data-overflow-end:mask-r-from-85%",
  fadeY:
    "data-overflow-start:mask-t-from-85% data-overflow-end:mask-b-from-85%",
  // A ring that glides to the active thumbnail.
  indicator:
    "pointer-events-none absolute top-(--active-thumbnail-top) left-(--active-thumbnail-left) h-(--active-thumbnail-height) w-(--active-thumbnail-width) outline-2 outline-offset-2 outline-white transition-[left,top,width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",

  // Loading and errors, inside `Lightbox.Media`.
  spinner:
    "absolute inset-0 m-auto hidden size-8 animate-spin rounded-full border-2 border-white/20 border-t-white group-data-loading:block",
};
