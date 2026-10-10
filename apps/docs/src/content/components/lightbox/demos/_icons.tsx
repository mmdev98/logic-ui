import * as React from "react";

type IconProps = React.ComponentProps<"svg">;

/** A 16 px stroke icon: the shape is drawn by its children. */
function Icon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4 12 12M12 4 4 12" />
    </Icon>
  );
}

export function ChevronIcon(
  props: IconProps & { direction: "left" | "right" },
) {
  const { direction, ...iconProps } = props;
  return (
    <Icon {...iconProps}>
      <path d={direction === "left" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} />
    </Icon>
  );
}

export function ZoomInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M7 5v4M5 7h4M10.5 10.5 14 14" />
    </Icon>
  );
}

export function ZoomOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M5 7h4M10.5 10.5 14 14" />
    </Icon>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5V5h2.5" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.5 7v4M9.5 7v4" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M5 3.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 5 3.2Z" />
    </svg>
  );
}

/** A picture with a crack, for images that failed to load. */
export function BrokenImageIcon(props: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M21 12V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7" />
      <path d="m3 16 4-4 3 3 3-3" />
      <path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3l-3-3" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
