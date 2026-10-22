"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import type { CropperRootChangeEventReason } from "./root/cropper-root";
import {
  type CropperRootActions,
  useCropperRootContext,
} from "./root/cropper-root-context";

export type CropperActionState = {
  /** Whether the action can't run now (no image, zoom at its limit …). */
  disabled: boolean;
};

export type CropperActionProps = useRender.ComponentProps<
  "button",
  CropperActionState
>;

export interface UseCropperActionOptions {
  props: CropperActionProps;
  /** Whether the action can't run now, besides a disabled or empty cropper. */
  disabled?: boolean | undefined;
  reason: CropperRootChangeEventReason;
  onAction: (actions: CropperRootActions) => void;
  /** Default `aria-label`; the caller's wins. */
  label: string;
}

/**
 * Renders a cropper action: a `<button>` that runs `onAction`. To place it
 * in a Base UI toolbar, render it as a `Toolbar.Button`
 * (`render={<Toolbar.Button />}`): it keeps its `disabled`.
 */
export function useCropperAction(
  options: UseCropperActionOptions,
): React.ReactElement {
  const { props, reason, onAction, label } = options;
  const { render, ref, ...elementProps } = props;
  const { status, disabled: rootDisabled, runAction } = useCropperRootContext();
  const disabled =
    Boolean(options.disabled) || rootDisabled || status !== "loaded";

  const state: CropperActionState = React.useMemo(
    () => ({ disabled }),
    [disabled],
  );

  return useRender({
    defaultTagName: "button",
    render,
    ref,
    state,
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-label": label,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          runAction(reason, event.nativeEvent, onAction);
        },
      },
      elementProps,
      { disabled },
    ),
  });
}
