import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Whether the software keyboard is currently on screen.
 *
 * Chat layout needs this for the gaps `KeyboardAvoidingView` cannot reason
 * about: the composer's bottom safe-area padding belongs under the home
 * indicator only while the keyboard is down — once it is up the keyboard
 * itself covers that strip, and leaving the padding in place floats the input
 * on a dead band instead of sitting flush against the keys.
 *
 * iOS gets the `Will` events so the layout moves with the keyboard animation
 * rather than snapping after it; Android only emits the `Did` pair.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = Platform.OS === "ios";
    const subscriptions = [
      Keyboard.addListener(isIOS ? "keyboardWillShow" : "keyboardDidShow", () => setVisible(true)),
      Keyboard.addListener(isIOS ? "keyboardWillHide" : "keyboardDidHide", () => setVisible(false)),
    ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return visible;
}
