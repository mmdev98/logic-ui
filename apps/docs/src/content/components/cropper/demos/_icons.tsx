import * as React from "react";

type IconProps = React.ComponentProps<"svg">;

/** A 22 px stroke icon, like a phone's toolbar: the shape is drawn by its children. */
function Icon(props: IconProps) {
  return (
    <svg
      width="22"
      height="22"
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

export function ZoomInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M11 8.5v5M8.5 11h5M16 16l4 4" />
    </Icon>
  );
}

export function ZoomOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M8.5 11h5M16 16l4 4" />
    </Icon>
  );
}

/** A square with an arrow turning it a quarter. */
export function RotateIcon(
  props: IconProps & { direction: "clockwise" | "counterclockwise" },
) {
  const { direction, ...iconProps } = props;
  return (
    <Icon
      {...iconProps}
      style={direction === "clockwise" ? { scale: "-1 1" } : undefined}
    >
      <rect x="4" y="10" width="10" height="10" rx="1.5" />
      <path d="M8 6.5A8 8 0 0 1 19.5 13" />
      <path d="m5.5 5 2.5 1.5L6.5 9" />
    </Icon>
  );
}

/** Two triangles mirrored across a dashed line. */
export function FlipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" strokeDasharray="2 2.5" />
      <path d="M9 7 3.5 17H9zM15 7l5.5 10H15z" />
    </Icon>
  );
}

/** An arrow going back around: start over. */
export function ResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </Icon>
  );
}

/** A frame with corner marks: the crop tool. */
export function CropIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M2 6h14a2 2 0 0 1 2 2v14" />
    </Icon>
  );
}
