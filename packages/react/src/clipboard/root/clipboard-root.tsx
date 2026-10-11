"use client";

import { useRender } from "@base-ui/react/use-render";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import * as React from "react";
import { CLIPBOARD_DEFAULT_TIMEOUT } from "../constants";
import {
  ClipboardRootContext,
  type ClipboardRootContextValue,
} from "./clipboard-root-context";

export type ClipboardRootState = {
  /** Whether the value was copied less than `timeout` ms ago. */
  copied: boolean;
};

export interface ClipboardRootProps extends useRender.ComponentProps<
  "div",
  ClipboardRootState
> {
  /** The text written to the clipboard. */
  value: string;
  /**
   * Time in milliseconds before `copied` goes back to `false`.
   * @default 2000
   */
  timeout?: number | undefined;
  /** Called when `copied` changes. */
  onCopiedChange?: ((copied: boolean) => void) | undefined;
  /** Called when the browser refuses to write to the clipboard. */
  onCopyError?: ((error: unknown) => void) | undefined;
}

/**
 * Groups the clipboard parts and holds the copied state.
 * Renders a `<div>` element.
 */
export function ClipboardRoot(props: ClipboardRootProps): React.ReactElement {
  const {
    value,
    timeout = CLIPBOARD_DEFAULT_TIMEOUT,
    onCopiedChange,
    onCopyError,
    render,
    ref,
    ...elementProps
  } = props;

  const [copied, setCopied] = React.useState(false);
  const resetTimeout = useTimeout();

  const updateCopied = useStableCallback((nextCopied: boolean) => {
    setCopied(nextCopied);
    onCopiedChange?.(nextCopied);
  });

  const copy = useStableCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      onCopyError?.(error);
      return;
    }
    updateCopied(true);
    resetTimeout.start(timeout, () => updateCopied(false));
  });

  const contextValue: ClipboardRootContextValue = React.useMemo(
    () => ({ value, copied, copy }),
    [value, copied, copy],
  );

  const state: ClipboardRootState = React.useMemo(() => ({ copied }), [copied]);

  const element = useRender({
    defaultTagName: "div",
    render,
    ref,
    state,
    props: elementProps,
  });

  return (
    <ClipboardRootContext value={contextValue}>{element}</ClipboardRootContext>
  );
}
