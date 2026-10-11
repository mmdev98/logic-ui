import type * as React from "react";

/** The props of a Base UI part that receive its state. */
export type LightboxStateProps<State> = {
  /**
   * CSS class applied to the element, or a function that returns a class
   * based on the component's state.
   */
  className?: string | ((state: State) => string | undefined) | undefined;
  /**
   * Style applied to the element, or a function that returns a style object
   * based on the component's state.
   */
  style?:
    | React.CSSProperties
    | ((state: State) => React.CSSProperties | undefined)
    | undefined;
  /**
   * Replaces the component's HTML element with a different tag, or composes
   * it with another component. Accepts a `ReactElement` or a function that
   * returns the element to render.
   */
  render?:
    | React.ReactElement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((props: any, state: State) => React.ReactElement)
    | undefined;
};

/**
 * Lets the `className`, `style` and `render` functions of a part built on a
 * Base UI Dialog part receive the lightbox state too: they get the Dialog
 * part's state with `extra` added.
 */
export function addLightboxState<DialogState, Extra>(
  props: LightboxStateProps<DialogState & Extra>,
  extra: Extra,
): LightboxStateProps<DialogState> {
  const { className, style, render } = props;
  return {
    className:
      typeof className === "function"
        ? (state) => className({ ...state, ...extra })
        : className,
    style:
      typeof style === "function"
        ? (state) => style({ ...state, ...extra })
        : style,
    render:
      typeof render === "function"
        ? (renderProps, state) => render(renderProps, { ...state, ...extra })
        : render,
  };
}
