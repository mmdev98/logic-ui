"use client";
import * as React from "react";
import {
  Lightbox,
  type LightboxItemValue,
  loadLightboxMedia,
} from "@logic-ui/react/lightbox";
import { useStableCallback } from "@logic-ui/react/utils";
import { cn } from "cn";
import { videos } from "./_photos";
import {
  ChevronIcon,
  CloseIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
} from "./_icons";
import { classes } from "./_classes";

/** One photo or video in a person's stories. */
type Frame = {
  id: string;
  src: string;
  alt: string;
  time: string;
  text?: string;
  video?: boolean;
};

/** A person in the row: the lightbox item. Their stories play in their slide. */
type Person = {
  id: string;
  name: string;
  avatar: string;
  frames: Frame[];
};

const story = (id: number) => `https://picsum.photos/id/${id}/900/1600`;
const face = (id: number) => `https://i.pravatar.cc/150?img=${id}`;

const people: Person[] = [
  {
    id: "maya",
    name: "Maya",
    avatar: face(32),
    frames: [
      {
        id: "maya-1",
        src: story(1011),
        alt: "Paddling a canoe across a still lake",
        time: "5h",
        text: "Morning paddle before anyone woke up",
      },
      {
        id: "maya-2",
        src: story(1039),
        alt: "A waterfall over a mossy cliff",
        time: "4h",
      },
      {
        id: "maya-3",
        src: story(1036),
        alt: "Tents in the snow below the mountains",
        time: "2h",
        text: "Camp three. Freezing, but look at it",
      },
    ],
  },
  {
    id: "noah",
    name: "Noah",
    avatar: face(12),
    frames: [
      {
        id: "noah-1",
        src: story(1031),
        alt: "A glass tower rising into the fog",
        time: "8h",
        text: "Looking up more often",
      },
      {
        id: "noah-2",
        src: story(1033),
        alt: "Escalators in a station",
        time: "7h",
      },
      {
        id: "noah-3",
        src: story(1047),
        alt: "A narrow brick alley",
        time: "6h",
      },
      {
        id: "noah-4",
        src: story(1078),
        alt: "Lit windows of an office block at night",
        time: "1h",
        text: "Everyone's still at work",
      },
    ],
  },
  {
    id: "sofia",
    name: "Sofia",
    avatar: face(24),
    frames: [
      {
        id: "sofia-1",
        src: story(1060),
        alt: "Coffee brewing in a pour-over",
        time: "3h",
        text: "Pour-over o'clock",
      },
      {
        id: "sofia-2",
        src: story(1080),
        alt: "A pile of strawberries",
        time: "2h",
        text: "Market haul",
      },
      {
        id: "sofia-3",
        src: videos[0].src,
        alt: "A flower opening",
        time: "45m",
        video: true,
      },
    ],
  },
  {
    id: "leo",
    name: "Leo",
    avatar: face(13),
    frames: [
      {
        id: "leo-1",
        src: story(1025),
        alt: "A pug wrapped in a blanket outdoors",
        time: "6h",
        text: "He refuses to walk in the cold",
      },
      {
        id: "leo-2",
        src: story(1062),
        alt: "The pug in a blanket on the bed",
        time: "30m",
        text: "Monday mood",
      },
    ],
  },
  {
    id: "ava",
    name: "Ava",
    avatar: face(16),
    frames: [
      {
        id: "ava-1",
        src: story(1074),
        alt: "A lioness looking into the camera",
        time: "9h",
        text: "She stared for a full minute",
      },
      {
        id: "ava-2",
        src: story(1003),
        alt: "A fawn in a sunlit forest",
        time: "7h",
      },
      {
        id: "ava-3",
        src: story(1024),
        alt: "A vulture spreading its wings",
        time: "3h",
      },
    ],
  },
  {
    id: "kai",
    name: "Kai",
    avatar: face(14),
    frames: [
      {
        id: "kai-1",
        src: story(1072),
        alt: "An old truck in a field",
        time: "12h",
        text: "Found her behind a barn",
      },
      {
        id: "kai-2",
        src: story(1071),
        alt: "The chrome grille of a vintage car",
        time: "10h",
      },
      {
        id: "kai-3",
        src: story(1057),
        alt: "A coast road above the sea",
        time: "4h",
        text: "Road trip, day one",
      },
    ],
  },
];

/** How long a photo stays on screen; a video plays to its end (ms). */
const PHOTO_DURATION = 5000;
/** A press that moves less than this is a tap (px). */
const TAP_SLOP = 8;
/** A press held longer than this pauses instead of moving on (ms). */
const HOLD_DELAY = 250;

/** Whether a press started on a control of the card, which handles it. */
function isOnControl(target: EventTarget): boolean {
  return Boolean((target as Partial<Element>).closest?.("button, a, input"));
}

/**
 * The controls ride on the story card: they fade as the viewer opens or
 * closes and while you hold the story, but follow the pull to dismiss and fly
 * back into the ring with the card.
 */
const onCard =
  "transition-opacity duration-250 ease-out group-data-holding:opacity-0 group-data-holding:delay-200 in-data-starting-style:opacity-0 in-data-ending-style:opacity-0 in-data-ending-style:duration-150 motion-reduce:transition-none";

/** Tailwind classes of this demo. */
const local = {
  Feed: "w-full min-w-0 max-w-xl cursor-default rounded-3xl border border-white/10 bg-linear-to-b from-neutral-900 to-neutral-950 p-4 shadow-xl shadow-black/10 select-none sm:p-5",
  FeedHeader:
    "mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-4 sm:gap-4",
  FeedTitle: "m-0 text-base font-semibold tracking-tight text-white",
  FeedHint: "m-0 mt-1 text-xs leading-relaxed text-neutral-400",
  FeedCount:
    "shrink-0 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[0.6875rem] font-medium text-rose-200 tabular-nums",
  List: cn(
    classes.hideScrollbar,
    "-mx-2 my-0 flex min-w-0 list-none flex-nowrap items-start gap-3 overflow-x-auto overscroll-x-contain scroll-px-2 p-2 sm:gap-4",
  ),
  Item: "group/story flex w-16 flex-none flex-col items-center gap-2.5 sm:w-18",
  // The gradient ring of someone with new stories; grey once watched.
  Ring: "rounded-full bg-linear-to-tr from-amber-400 via-rose-500 to-fuchsia-500 p-0.5 transition-opacity duration-200 ease-out group-hover/story:opacity-85 group-focus-within/story:opacity-85 data-seen:from-neutral-600 data-seen:via-neutral-600 data-seen:to-neutral-600 motion-reduce:transition-none",
  Trigger:
    "group block size-14 cursor-pointer overflow-hidden rounded-full border-[3px] border-neutral-950 bg-neutral-900 p-0 data-flying:invisible data-popup-open:invisible focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:size-16",
  Name: "w-full truncate text-center text-xs font-medium text-neutral-300 transition-colors group-hover/story:text-white group-focus-within/story:text-white motion-reduce:transition-none",
  Popup:
    "fixed inset-0 cursor-default text-white outline-none select-none [--story-gutter:max(1rem,env(safe-area-inset-top),env(safe-area-inset-bottom))] [--story-height:min(46rem,calc(100dvh-2*var(--story-gutter)))] [--story-inline-gutter:max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] sm:[--story-gutter:max(2.5rem,env(safe-area-inset-top),env(safe-area-inset-bottom))]",
  // Exactly the size of a story, so the people meet edge to edge like the
  // faces of a cube. The perspective reaches the slides turned in 3D, and it
  // doesn't clip: neighbours wait edge-on, and the card leaves it when dragged.
  Viewport:
    "absolute top-1/2 left-1/2 aspect-9/16 w-[min(calc(var(--story-height)*9/16),calc(100vw-2*var(--story-inline-gutter)))] -translate-1/2 cursor-default gap-x-0 select-none [perspective:1400px]",
  /**
   * The cube: each person turns away around the edge they share with the
   * next one, by `--lightbox-slide-progress` times 90°. The pivot is on the
   * right edge while a slide leaves to the left, on the left edge while it
   * comes in from the right, and the face turning away darkens.
   */
  Slide:
    "cursor-default select-none [transform-origin:clamp(0%,calc(50%_-_var(--lightbox-slide-progress)*10000%),100%)_50%] [transform:rotateY(calc(var(--lightbox-slide-progress)*90deg))] [backface-visibility:hidden] [filter:brightness(calc(1_-_min(1,max(var(--lightbox-slide-progress),-1*var(--lightbox-slide-progress)))*0.6))] motion-reduce:[transform:none]",
  // The card: the story with its controls on it. It clips them to its corners.
  Media:
    "group @container/story overflow-hidden rounded-3xl bg-neutral-900 [&>img]:object-cover [&>video]:object-cover",
  Header: cn(
    classes.shadeTop,
    onCard,
    "absolute inset-x-0 top-0 flex flex-col gap-2.5 px-3 pt-3 pb-12 @xs/story:px-4",
  ),
  Segments: "flex gap-1",
  // One bar per story of the person: full once watched, filling while shown.
  Segment:
    "relative h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/30",
  Fill: "absolute inset-0 origin-left scale-x-0 rounded-full bg-white data-watched:scale-x-100",
  Profile: "flex items-center justify-between gap-2",
  Author: "m-0 flex min-w-0 items-center gap-2 text-sm font-semibold",
  Avatar:
    "size-8 shrink-0 rounded-full object-cover ring-2 ring-white/25 @xs/story:size-9",
  Time: "ms-1.5 font-normal text-white/65",
  Buttons: "flex items-center gap-1",
  Button: cn(
    classes.iconButton,
    "size-10 shrink-0 bg-transparent backdrop-blur-none transition-[background-color,scale] hover:not-data-disabled:bg-white/15 active:scale-95 motion-reduce:scale-100 motion-reduce:transition-none",
  ),
  // Big tap targets aren't enough with a mouse: arrows on the card's edges.
  Step: cn(
    classes.iconButton,
    onCard,
    "absolute top-1/2 hidden size-9 -translate-y-1/2 bg-black/35 opacity-0 group-hover:opacity-100 pointer-fine:flex",
  ),
  Footer: cn(
    classes.shadeBottom,
    onCard,
    "absolute inset-x-0 bottom-0 flex flex-col items-start gap-4 px-3 pt-16 pb-3 @xs/story:px-4 @xs/story:pb-4",
  ),
  Text: `m-0 max-w-[85%] rounded-xl bg-black/45 px-3 py-2 text-[0.9375rem] leading-snug font-semibold tracking-tight text-pretty backdrop-blur-sm @xs/story:text-lg ${classes.enter}`,
  Reply: "flex w-full items-center gap-1",
  Input:
    "h-11 min-w-0 flex-1 cursor-text rounded-full border border-white/40 bg-transparent px-4 text-sm text-white select-text placeholder:text-white/70 focus:border-white focus:outline-none",
  Like: "[&[aria-pressed=true]]:text-rose-500 [&[aria-pressed=true]_svg]:scale-110 [&[aria-pressed=true]_svg]:fill-current [&_svg]:transition-transform [&_svg]:duration-200",
  Hint: cn(
    classes.controlBottom,
    "pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] hidden flex-wrap justify-center gap-x-4 gap-y-1 px-4 text-center text-[0.6875rem] text-white/40 sm:flex",
  ),
  Error:
    "absolute inset-0 m-auto hidden h-fit px-6 text-center text-sm text-white/70 group-data-error:block",
};

type StoryCardProps = {
  person: Person;
  frameIndex: number;
  /** Whether the slide is the one shown. */
  active: boolean;
  /** Whether the shown story moves on by itself (not paused, held or typed in). */
  playing: boolean;
  /** Changes to play the same story again from its start. */
  run: number;
  holding: boolean;
  paused: boolean;
  liked: boolean;
  onStep: (delta: 1 | -1) => void;
  onPausedChange: (paused: boolean) => void;
  onLikedChange: (liked: boolean) => void;
  onTypingChange: (typing: boolean) => void;
};

/** A person's slide: their current story, its progress, and the controls. */
function StoryCard(props: StoryCardProps) {
  const {
    person,
    frameIndex,
    active,
    playing,
    run,
    holding,
    paused,
    liked,
    onStep,
    onPausedChange,
    onLikedChange,
    onTypingChange,
  } = props;
  const frame = person.frames[frameIndex];
  const fillRef = React.useRef<HTMLSpanElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const animationRef = React.useRef<Animation | null>(null);
  // Stable: a new `onStep` each render mustn't restart the bar.
  const stepForward = useStableCallback(() => onStep(1));

  // How long the story lasts, once its media has loaded.
  const [timing, setTiming] = React.useState<{
    frameId: string;
    duration: number;
  } | null>(null);
  const duration = timing?.frameId === frame.id ? timing.duration : null;

  // The bar of the story shown fills over its duration, then moves on. It
  // keeps its place while paused or while another person is shown.
  React.useEffect(() => {
    const fill = fillRef.current;
    if (!fill || duration === null || typeof fill.animate !== "function")
      return undefined;
    const animation = fill.animate(
      // `scale`, the property the fill's `scale-x-0` sets.
      [{ scale: "0 1" }, { scale: "1 1" }],
      { duration, fill: "forwards" },
    );
    animation.pause();
    animation.onfinish = stepForward;
    animationRef.current = animation;
    return () => {
      animation.cancel();
      animationRef.current = null;
    };
  }, [frame.id, duration, run, stepForward]);

  const running = active && playing;
  React.useEffect(() => {
    const animation = animationRef.current;
    if (running) animation?.play();
    else animation?.pause();
    const video = videoRef.current;
    if (!video) return;
    if (running) video.play().catch(() => {});
    else video.pause();
  }, [running, frame.id, duration, run]);

  // Playing the same story again starts its video over too.
  React.useEffect(() => {
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [run]);

  const done = () => setTiming({ frameId: frame.id, duration: PHOTO_DURATION });

  return (
    <Lightbox.Media
      width={900}
      height={1600}
      data-holding={holding || undefined}
      className={local.Media}
    >
      {frame.video ? (
        <video
          key={frame.id}
          ref={videoRef}
          src={frame.src}
          aria-label={frame.alt}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) =>
            setTiming({
              frameId: frame.id,
              duration: event.currentTarget.duration * 1000,
            })
          }
          onError={done}
        />
      ) : (
        <img
          key={frame.id}
          src={frame.src}
          alt={frame.alt}
          onLoad={done}
          onError={done}
          className="group-data-error:invisible"
        />
      )}
      <span
        className={cn(classes.spinner, "motion-reduce:animate-none")}
        aria-hidden
      />
      <p role="alert" className={local.Error}>
        This story couldn’t be loaded.
      </p>

      <header className={local.Header}>
        <div className={local.Segments} aria-hidden>
          {person.frames.map((other, index) => (
            <span key={other.id} className={local.Segment}>
              <span
                ref={index === frameIndex ? fillRef : undefined}
                data-watched={index < frameIndex || undefined}
                className={local.Fill}
              />
            </span>
          ))}
        </div>
        <div className={local.Profile}>
          <p className={local.Author}>
            <img src={person.avatar} alt="" className={local.Avatar} />
            <span>
              {person.name}
              <span className={local.Time}>{frame.time}</span>
            </span>
          </p>
          <div className={local.Buttons}>
            {/* Stories move on by themselves, so they can be paused (WCAG 2.2.2). */}
            <button
              type="button"
              aria-label={paused ? "Play stories" : "Pause stories"}
              className={local.Button}
              onClick={() => onPausedChange(!paused)}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <Lightbox.Close aria-label="Close stories" className={local.Button}>
              <CloseIcon />
            </Lightbox.Close>
          </div>
        </div>
      </header>

      <button
        type="button"
        aria-label="Previous story"
        className={cn(local.Step, "start-2")}
        onClick={() => onStep(-1)}
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        aria-label="Next story"
        className={cn(local.Step, "end-2")}
        onClick={() => onStep(1)}
      >
        <ChevronIcon direction="right" />
      </button>

      <footer className={local.Footer}>
        {frame.text && (
          <Lightbox.Caption className={local.Text}>
            {frame.text}
          </Lightbox.Caption>
        )}
        <form
          className={local.Reply}
          onSubmit={(event) => {
            event.preventDefault();
            event.currentTarget.reset();
          }}
        >
          {/* Typing pauses the story. */}
          <input
            name="reply"
            aria-label={`Reply to ${person.name}`}
            placeholder={`Reply to ${person.name}…`}
            autoComplete="off"
            className={local.Input}
            onFocus={() => onTypingChange(true)}
            onBlur={() => onTypingChange(false)}
          />
          <button
            type="button"
            aria-label="Like"
            aria-pressed={liked}
            className={cn(local.Button, local.Like)}
            onClick={() => onLikedChange(!liked)}
          >
            <HeartIcon className="size-5" />
          </button>
          <button type="submit" aria-label="Send" className={local.Button}>
            <SendIcon className="size-5" />
          </button>
        </form>
      </footer>
    </Lightbox.Media>
  );
}

/**
 * Instagram-style stories. Each ring is a person, and their stories play in
 * their slide: the bars fill and move on by themselves, a tap on the left or
 * right of the card (or ← →) steps through them, holding pauses, and the last
 * story moves on to the next person. Swipe to change person.
 */
export default function ExampleLightboxStories(): React.ReactElement {
  // Controlled, so the stories can move on to the next person by themselves.
  const [open, setOpen] = React.useState<LightboxItemValue | null>(null);
  // The story each person is on, and who has been watched to the end.
  const [positions, setPositions] = React.useState<Record<string, number>>({});
  const [seen, setSeen] = React.useState<ReadonlySet<string>>(() => new Set());
  const [liked, setLiked] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [run, setRun] = React.useState(0);
  // The card has landed: until then, nothing plays.
  const [landed, setLanded] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [holding, setHolding] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const pressRef = React.useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  /** Someone watched to the end starts over; anyone else resumes. */
  const getStart = (person: Person) => {
    const position = positions[person.id] ?? 0;
    return seen.has(person.id) && position === person.frames.length - 1
      ? 0
      : position;
  };

  const showPerson = (value: LightboxItemValue | null) => {
    const person = people.find((other) => other.id === value);
    if (person)
      setPositions((current) => ({
        ...current,
        [person.id]: getStart(person),
      }));
    setOpen(value);
  };

  /** Steps through the stories of the person shown, then on to the next person. */
  const step = (delta: 1 | -1) => {
    const index = people.findIndex((person) => person.id === open);
    const person = people[index];
    if (!person) return;
    const next = (positions[person.id] ?? 0) + delta;
    if (next >= person.frames.length) {
      setSeen((current) => new Set(current).add(person.id));
      showPerson(people[index + 1]?.id ?? null);
    } else if (next < 0) {
      const previous = people[index - 1];
      if (previous) showPerson(previous.id);
      else setRun((current) => current + 1);
    } else {
      setPositions((current) => ({ ...current, [person.id]: next }));
    }
  };

  // Holding the story pauses it until the press ends, wherever it ends.
  React.useEffect(() => {
    if (!holding) return undefined;
    const release = () => setHolding(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [holding]);

  const playing = landed && !paused && !holding && !typing;
  const newCount = people.filter((person) => !seen.has(person.id)).length;

  return (
    <Lightbox.Root
      items={people}
      value={open}
      onValueChange={showPerson}
      onOpenChangeComplete={(isOpen) => {
        setLanded(isOpen);
        if (!isOpen) setPaused(false);
      }}
      // The story the person is on loads before the card flies out of the ring.
      loadMedia={(person: Person) => {
        const frame = person.frames[getStart(person)];
        return frame.video
          ? Promise.resolve(null)
          : loadLightboxMedia({ src: frame.src });
      }}
      maxScale={1}
    >
      <section aria-label="Stories" className={local.Feed}>
        <header className={local.FeedHeader}>
          <div className="min-w-0">
            <h3 className={local.FeedTitle}>Stories</h3>
            <p className={local.FeedHint}>From the people you follow.</p>
          </div>
          <span className={local.FeedCount}>{newCount} new</span>
        </header>
        <ul aria-label="People with stories" className={local.List}>
          {people.map((person) => (
            <li key={person.id} className={local.Item}>
              <div
                data-seen={seen.has(person.id) || undefined}
                className={local.Ring}
              >
                {/* The ring shows a face, not the story: the card grows out of
                    it and turns back into it on the way home. */}
                <Lightbox.Trigger
                  value={person.id}
                  crossfade
                  aria-label={`Open ${person.name}'s stories`}
                  className={local.Trigger}
                >
                  <img
                    src={person.avatar}
                    alt=""
                    className={classes.triggerImage}
                  />
                </Lightbox.Trigger>
              </div>
              <span className={local.Name}>{person.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <Lightbox.Portal>
        <Lightbox.Backdrop
          className={cn(
            classes.backdrop,
            "cursor-default select-none motion-reduce:transition-none",
          )}
        />
        <Lightbox.Popup
          className={local.Popup}
          // ← → step through the stories, not the people: the library's
          // shortcut runs only when this handler doesn't prevent it.
          onKeyDown={(event) => {
            if ((event.target as Partial<Element>).closest?.("input")) return;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              step(event.key === "ArrowRight" ? 1 : -1);
            } else if (
              event.key === " " &&
              event.target === event.currentTarget
            ) {
              event.preventDefault();
              setPaused((current) => !current);
            }
          }}
        >
          <Lightbox.Title className="sr-only">Stories</Lightbox.Title>
          <Lightbox.Viewport
            aria-label="Stories"
            className={local.Viewport}
            onPointerDown={(event) => {
              if (isOnControl(event.target)) return;
              pressRef.current = {
                x: event.clientX,
                y: event.clientY,
                time: event.timeStamp,
              };
              setHolding(true);
            }}
            // A quick tap on the left third goes back, anywhere else forward.
            // A drag (a swipe, a pull to dismiss) or a hold isn't a tap.
            onClick={(event) => {
              const press = pressRef.current;
              pressRef.current = null;
              if (!press || isOnControl(event.target)) return;
              const moved = Math.hypot(
                event.clientX - press.x,
                event.clientY - press.y,
              );
              if (moved > TAP_SLOP || event.timeStamp - press.time > HOLD_DELAY)
                return;
              const rect = event.currentTarget.getBoundingClientRect();
              step(event.clientX < rect.left + rect.width / 3 ? -1 : 1);
            }}
          >
            {(person: Person) => {
              const frameIndex = positions[person.id] ?? 0;
              const frame = person.frames[frameIndex];
              return (
                <Lightbox.Slide className={local.Slide}>
                  {/* Everything on the card drags with it and flies back into the ring. */}
                  <StoryCard
                    person={person}
                    frameIndex={frameIndex}
                    active={person.id === open}
                    playing={playing}
                    run={run}
                    holding={holding && person.id === open}
                    paused={paused}
                    liked={liked.has(frame.id)}
                    onStep={step}
                    onPausedChange={setPaused}
                    onTypingChange={setTyping}
                    onLikedChange={(isLiked) =>
                      setLiked((current) => {
                        const next = new Set(current);
                        if (isLiked) next.add(frame.id);
                        else next.delete(frame.id);
                        return next;
                      })
                    }
                  />
                </Lightbox.Slide>
              );
            }}
          </Lightbox.Viewport>
          <div className={local.Hint} aria-hidden>
            <span>Tap or ← → for the next story</span>
            <span>Hold to pause</span>
            <span>Swipe for the next person</span>
            <span>Pull down to dismiss</span>
          </div>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
