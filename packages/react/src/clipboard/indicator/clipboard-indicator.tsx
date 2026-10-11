"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { useClipboardRootContext } from "../root/clipboard-root-context";

export type ClipboardIndicatorState = {
  /** Whether the value was just copied. */
  copied: boolean;
};

export interface ClipboardIndicatorProps extends useRender.ComponentProps<
  "span",
  ClipboardIndicatorState
> {
  /**
   * Keep the element in the DOM when the value is not copied.
   * Style it with `data-copied`.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

/**
 * Shows that the value was just copied, for example a check icon.
 * Renders a `<span>` element, only while `copied` is `true` unless `keepMounted` is set.
 */
export function ClipboardIndicator(
  props: ClipboardIndicatorProps,
): React.ReactElement | null {
  const { keepMounted = false, render, ref, ...elementProps } = props;
  const { copied } = useClipboardRootContext();

  const state: ClipboardIndicatorState = React.useMemo(
    () => ({ copied }),
    [copied],
  );

  return useRender({
    defaultTagName: "span",
    render,
    ref,
    state,
    props: elementProps,
    enabled: copied || keepMounted,
  });
}
