"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

export type LightboxActionState = {
  /** Whether the action can't run now (no previous item, zoom at its limit …). */
  disabled: boolean;
};

export type LightboxActionProps = useRender.ComponentProps<
  "button",
  LightboxActionState
>;

export interface UseLightboxActionOptions {
  props: LightboxActionProps;
  disabled: boolean;
  onAction: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Default `aria-label`; the caller's wins. */
  label: string;
  /** Key announced with `aria-keyshortcuts`. */
  shortcut?: string | undefined;
}

/**
 * Renders a viewer action that runs `onAction`: a `<button>`. To place it in
 * a Base UI toolbar, render it as a `Toolbar.Button`
 * (`render={<Toolbar.Button />}`): it gets `disabled` and stays focusable for
 * the toolbar's arrow keys.
 */
export function useLightboxAction(
  options: UseLightboxActionOptions,
): React.ReactElement {
  const { props, disabled, onAction, label, shortcut } = options;
  const { render, ref, ...elementProps } = props;

  const state: LightboxActionState = React.useMemo(
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
        "aria-keyshortcuts": shortcut,
        onClick: onAction,
      },
      elementProps,
      { disabled },
    ),
  });
}
