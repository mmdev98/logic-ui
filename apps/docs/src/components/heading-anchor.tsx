import { cn } from "cn";
import * as React from "react";

const STYLES = {
  // The first heading sits right under the page header's border: no second one.
  2: "mt-14 mb-4 border-t border-line pt-10 first:mt-0 first:border-t-0 first:pt-0 font-mono text-xl font-semibold tracking-tight text-fg",
  3: "mt-10 mb-3 text-base font-semibold text-fg",
  4: "mt-8 mb-2 text-sm font-semibold text-fg",
} as const;

/** A heading with a `#` link to itself, shown on hover. Picked up by the table of contents. */
export function HeadingAnchor(props: {
  level: 2 | 3 | 4;
  id?: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { level, id, className, children } = props;
  const Tag = `h${level}` as const;

  return (
    <Tag
      id={id}
      // Long type names wrap anywhere instead of widening a phone's page.
      className={cn(
        "group/heading scroll-mt-24 wrap-anywhere",
        STYLES[level],
        className,
      )}
    >
      {children}
      {id ? (
        <a
          href={`#${id}`}
          aria-label="Link to this section"
          className="ml-2 font-mono font-normal text-faint no-underline opacity-0 group-hover/heading:opacity-100 hover:text-accent focus-visible:opacity-100"
        >
          #
        </a>
      ) : null}
    </Tag>
  );
}
