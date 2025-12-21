'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Plus,
  Search,
  Users,
  User,
  BookOpen,
} from 'lucide-react';
import {
  getConversations,
  getAvailableUsers,
  startDirectConversation,
  Conversation,
  ConversationType,
  User as UserType,
} from '@/lib/api/messaging';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchConversations();
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (newMessageDialogOpen) {
      searchUsers('');
    }
  }, [newMessageDialogOpen]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (newMessageDialogOpen) {
        searchUsers(userSearch);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [userSearch, newMessageDialogOpen]);

  async function fetchConversations() {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(search: string) {
    try {
      setLoadingUsers(true);
      console.log('Searching users with:', search);
      const users = await getAvailableUsers(search);
      console.log('Found users:', users);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleStartConversation(userId: string) {
    try {
      const conversation = await startDirectConversation(userId);
      setNewMessageDialogOpen(false);
      router.push(`/dashboard/messages/${conversation.id}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }

  function getConversationName(conversation: Conversation, currentUserId?: string): string {
    if (conversation.title) {
      return conversation.title;
    }

    if (conversation.type === ConversationType.DIRECT) {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== currentUserId && !p.hasLeft
      );
      return otherParticipant?.user?.name || 'Unknown User';
    }

    if (conversation.type === ConversationType.COURSE && conversation.course) {
      return conversation.course.title;
    }

    if (conversation.type === ConversationType.GROUP && conversation.group) {
      return conversation.group.name;
    }

    return 'Conversation';
  }

  function getConversationIcon(type: ConversationType) {
    switch (type) {
      case ConversationType.DIRECT:
        return <User className="h-4 w-4" />;
      case ConversationType.GROUP:
        return <Users className="h-4 w-4" />;
      case ConversationType.COURSE:
        return <BookOpen className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48 mt-2" />
                  </div>
                  <Skeleton className="h-3 w-16" />
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
          <h1 className="text-2xl font-bold">{t('messages.title')}</h1>
          <p className="text-muted-foreground">{t('messages.description')}</p>
        </div>
        <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('messages.newMessage')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('messages.startConversation')}</DialogTitle>
              <DialogDescription>
                {t('messages.selectUser')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('messages.searchUsers')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-64">
                {loadingUsers ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : availableUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t('messages.noUsersFound')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleStartConversation(user.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('messages.searchConversations')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t('messages.noConversations')}</h3>
              <p className="text-muted-foreground">{t('messages.startFirst')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => router.push(`/dashboard/messages/${conversation.id}`)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {getConversationIcon(conversation.type)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {getConversationName(conversation)}
                        </p>
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessagePreview && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessagePreview}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
