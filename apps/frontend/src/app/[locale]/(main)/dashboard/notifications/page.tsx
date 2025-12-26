'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/components/intl-provider';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  notificationsApi,
  Notification,
  NotificationType,
} from '@/lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const notificationIcons: Record<NotificationType, string> = {
  course_enrolled: '📚',
  course_completed: '🎉',
  quiz_passed: '✅',
  quiz_failed: '❌',
  certificate_issued: '🏆',
  license_assigned: '🔑',
  invitation_received: '✉️',
  system: '🔔',
};

export default function NotificationsPage() {
  const t = useTranslations();
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const hasTenant = user?.tenantId;

  useEffect(() => {
    if (!authLoading && hasTenant) {
      fetchNotifications();
    } else if (!authLoading && !hasTenant) {
      setLoading(false);
    }
  }, [authLoading, hasTenant, showUnreadOnly]);

  async function fetchNotifications() {
    if (!hasTenant) return;
    try {
      setLoading(true);
      const data = await notificationsApi.getNotifications({
        limit: 100,
        unreadOnly: showUnreadOnly,
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await notificationsApi.deleteNotification(notificationId);
      const wasUnread = notifications.find(
        (n) => n.id === notificationId && !n.isRead
      );
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <p className="text-muted-foreground">
            {t('notifications.description') || 'View and manage your notifications'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCheck className="mr-2 h-4 w-4" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showUnreadOnly ? 'default' : 'outline'}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? 'Show All' : 'Show Unread Only'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">
                {showUnreadOnly
                  ? t('notifications.noUnread')
                  : t('notifications.empty')}
              </h3>
              <p className="text-muted-foreground">
                {showUnreadOnly
                  ? t('notifications.allCaughtUp')
                  : t('notifications.noNotifications')}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                      !notification.isRead && 'bg-muted/50 border-primary/20'
                    )}
                  >
                    <div className="text-2xl flex-shrink-0">
                      {notificationIcons[notification.type] || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                'text-sm font-medium',
                                !notification.isRead && 'font-semibold'
                              )}
                            >
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <Badge variant="default" className="h-4 px-1.5 text-xs">
                                {t('notifications.new') || 'New'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          View details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

