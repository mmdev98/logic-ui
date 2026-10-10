/**
 * Side of the previous item the item shown came from, on screen: `right`
 * after Next in a left-to-right layout. `none` when the viewer opens.
 * @type {'left' | 'right' | 'none'}
 */
export const activationDirection = "data-activation-direction";

/**
 * Present for one frame when the item shown changes, with a function child:
 * style where the new content starts from, and a transition animates it in.
 */
export const startingStyle = "data-starting-style";
