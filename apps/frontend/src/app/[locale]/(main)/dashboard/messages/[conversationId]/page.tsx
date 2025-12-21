'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from '@/components/intl-provider';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  Reply,
  Bell,
  BellOff,
  LogOut,
  Users,
  Check,
  CheckCheck,
} from 'lucide-react';
import {
  getConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  toggleMute,
  leaveConversation,
  Conversation,
  Message,
  ConversationType,
} from '@/lib/api/messaging';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ConversationPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && conversationId) {
      fetchConversationAndMessages();
    }
  }, [authLoading, isAuthenticated, conversationId]);

  useEffect(() => {
    if (messages.length > 0 && !loadingMore) {
      scrollToBottom();
    }
  }, [messages, loadingMore, scrollToBottom]);

  // Poll for new messages
  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const data = await getMessages(conversationId, { limit: 10 });
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = data.messages.filter((m) => !existingIds.has(m.id));
            if (newMessages.length > 0) {
              return [...prev, ...newMessages];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Failed to poll messages:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, isAuthenticated]);

  async function fetchConversationAndMessages() {
    try {
      setLoading(true);
      const [convData, msgData] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ]);
      setConversation(convData);
      setMessages(msgData.messages);
      setHasMore(msgData.hasMore);
      
      // Mark as read
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      router.push('/dashboard/messages');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!hasMore || loadingMore || messages.length === 0) return;

    try {
      setLoadingMore(true);
      const oldestMessage = messages[0];
      const data = await getMessages(conversationId, { before: oldestMessage.id });
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;

    try {
      setSending(true);
      
      if (editingMessage) {
        const updated = await editMessage(editingMessage.id, messageInput.trim());
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
        setEditingMessage(null);
      } else {
        const message = await sendMessage(conversationId, {
          content: messageInput.trim(),
          replyToId: replyingTo?.id,
        });
        setMessages((prev) => [...prev, message]);
        setReplyingTo(null);
      }
      
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: '[Message deleted]' }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }

  async function handleToggleMute() {
    try {
      const result = await toggleMute(conversationId);
      setConversation((prev) => {
        if (!prev) return prev;
        const participants = prev.participants.map((p) =>
          p.userId === user?.id ? { ...p, isMuted: result.isMuted } : p
        );
        return { ...prev, participants };
      });
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  }

  async function handleLeaveConversation() {
    try {
      await leaveConversation(conversationId);
      router.push('/dashboard/messages');
    } catch (error) {
      console.error('Failed to leave conversation:', error);
    }
  }

  function getConversationName(): string {
    if (!conversation) return '';
    
    if (conversation.title) {
      return conversation.title;
    }

    if (conversation.type === ConversationType.DIRECT) {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== user?.id && !p.hasLeft
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

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  function formatMessageDate(date: Date): string {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'MMM d, HH:mm');
  }

  function shouldShowDateDivider(currentMsg: Message, prevMsg?: Message): boolean {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt);
    const prevDate = new Date(prevMsg.createdAt);
    return currentDate.toDateString() !== prevDate.toDateString();
  }

  const currentParticipant = conversation?.participants.find(
    (p) => p.userId === user?.id
  );
  const isMuted = currentParticipant?.isMuted || false;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        <div className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn('flex gap-3', i % 2 === 0 ? '' : 'justify-end')}
              >
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                <Skeleton className={cn('h-16', i % 2 === 0 ? 'w-48' : 'w-56')} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar>
          <AvatarFallback>{getInitials(getConversationName())}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{getConversationName()}</h2>
          {conversation && conversation.type !== ConversationType.DIRECT && (
            <p className="text-sm text-muted-foreground">
              {conversation.participants.filter((p) => !p.hasLeft).length}{' '}
              {t('messages.participants')}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation?.type !== ConversationType.DIRECT && (
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                {t('messages.viewParticipants')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleToggleMute}>
              {isMuted ? (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  {t('messages.unmute')}
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  {t('messages.mute')}
                </>
              )}
            </DropdownMenuItem>
            {conversation?.type !== ConversationType.DIRECT && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLeaveConversation}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('messages.leave')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {hasMore && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? t('common.loading') : t('messages.loadMore')}
            </Button>
          </div>
        )}
        
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.senderId === user?.id;
            const prevMessage = messages[index - 1];
            const showDateDivider = shouldShowDateDivider(message, prevMessage);

            return (
              <div key={message.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
                      {isToday(new Date(message.createdAt))
                        ? t('messages.today')
                        : isYesterday(new Date(message.createdAt))
                        ? t('messages.yesterday')
                        : format(new Date(message.createdAt), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div
                  className={cn(
                    'flex gap-3',
                    isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(message.sender?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn('max-w-[70%]', isOwn && 'order-first')}>
                    {/* Reply preview */}
                    {message.replyTo && (
                      <div className="mb-1 px-3 py-1.5 text-xs bg-muted rounded-t-lg border-l-2 border-primary">
                        <p className="font-medium text-muted-foreground">
                          {message.replyTo.sender?.name}
                        </p>
                        <p className="truncate text-muted-foreground">
                          {message.replyTo.content}
                        </p>
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        'group relative px-4 py-2 rounded-2xl',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md',
                        message.replyTo && 'rounded-t-none'
                      )}
                    >
                      {!isOwn && conversation?.type !== ConversationType.DIRECT && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {message.sender?.name}
                        </p>
                      )}
                      
                      <p className={cn(
                        'whitespace-pre-wrap break-words',
                        message.isDeleted && 'italic opacity-60'
                      )}>
                        {message.content}
                      </p>
                      
                      <div className={cn(
                        'flex items-center gap-1 mt-1',
                        isOwn ? 'justify-end' : 'justify-start'
                      )}>
                        <span className={cn(
                          'text-xs',
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {formatMessageDate(new Date(message.createdAt))}
                        </span>
                        {message.isEdited && (
                          <span className={cn(
                            'text-xs',
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}>
                            ({t('messages.edited')})
                          </span>
                        )}
                      </div>
                      
                      {/* Message actions */}
                      {!message.isDeleted && (
                        <div className={cn(
                          'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity',
                          isOwn ? '-left-24' : '-right-12'
                        )}>
                          <div className="flex items-center gap-1 bg-background border rounded-lg shadow-sm p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setReplyingTo(message)}
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                            {isOwn && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditingMessage(message);
                                    setMessageInput(message.content);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Reply/Edit indicator */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            {replyingTo && (
              <>
                <Reply className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t('messages.replyingTo')}{' '}
                  <strong>{replyingTo.sender?.name}</strong>
                </span>
              </>
            )}
            {editingMessage && (
              <>
                <Edit className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('messages.editingMessage')}</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setMessageInput('');
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={t('messages.typeMessage')}
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!messageInput.trim() || sending}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
