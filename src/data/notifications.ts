import type { Notification } from '@/lib/types';
import { read, store, write } from './store';

export async function getNotifications(recipientId: string): Promise<Notification[]> {
  return read(() =>
    store.notifications
      .filter((n) => n.recipientId === recipientId)
      .sort((a, b) => b.createdOn.localeCompare(a.createdOn)),
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await write(() => {
    const notification = store.notifications.find((n) => n.id === id);
    if (notification) notification.read = true;
  });
}
