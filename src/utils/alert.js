import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert() is a no-op, so anything gated inside its
// callback (navigation, follow-up calls) silently never runs on web.

export function confirmAction(title, message, { confirmText = 'OK', destructive = false, onConfirm }) {
  if (Platform.OS === 'web') {
    if (window.confirm([title, message].filter(Boolean).join('\n\n'))) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function notify(title, message, onDismiss) {
  if (Platform.OS === 'web') {
    window.alert([title, message].filter(Boolean).join('\n\n'));
    onDismiss?.();
    return;
  }
  Alert.alert(title, message, onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined);
}
