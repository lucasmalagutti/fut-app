import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { notificationsService } from '../services/notifications.service';
import { useAuthStore } from '../store/auth.store';

Notifications.setNotificationHandler({
  handleNotification: async (_notification: Notifications.Notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePush() {
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification: Notifications.Notification) => {}
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response: Notifications.NotificationResponse) => {}
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [accessToken]);
}

async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await notificationsService.registerDevice(token, Platform.OS);
  } catch {
    // push not critical
  }
}
