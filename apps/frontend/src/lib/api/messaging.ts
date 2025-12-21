import { apiClient } from './client';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  COURSE = 'course',
  ANNOUNCEMENT = 'announcement',
}

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Participant {
  id: string;
  userId: string;
  user: User;
  role: ParticipantRole;
  lastReadAt: string | null;
  isMuted: boolean;
  hasLeft: boolean;
  joinedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string;
  attachments?: { type: string; url: string; name: string; size?: number }[];
  replyToId?: string;
  replyTo?: Message;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  type: ConversationType;
  title?: string;
  description?: string;
  courseId?: string;
  course?: { id: string; title: string };
  groupId?: string;
  group?: { id: string; name: string };
  createdById: string;
  createdBy?: User;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  isActive: boolean;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

// Conversation APIs
export async function getConversations(options?: {
  type?: ConversationType;
  limit?: number;
  offset?: number;
}): Promise<ConversationsResponse> {
  const params = new URLSearchParams();
  if (options?.type) params.append('type', options.type);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const queryString = params.toString();
  const url = `/api/messages/conversations${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get<ConversationsResponse>(url);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load conversations');
  }
  return response.data;
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await apiClient.get<Conversation>(`/api/messages/conversations/${conversationId}`);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load conversation');
  }
  return response.data;
}

export async function createConversation(data: {
  type: ConversationType;
  title?: string;
  description?: string;
  participantIds: string[];
  courseId?: string;
  groupId?: string;
}): Promise<Conversation> {
  const response = await apiClient.post<Conversation>('/api/messages/conversations', data);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create conversation');
  }
  return response.data;
}

export async function startDirectConversation(userId: string): Promise<Conversation> {
  const response = await apiClient.post<Conversation>('/api/messages/conversations/direct', { userId });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to start conversation');
  }
  return response.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const response = await apiClient.get<{ count: number }>('/api/messages/unread-count');
  if (!response.success || !response.data) {
    return { count: 0 };
  }
  return response.data;
}

// Message APIs
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.before) params.append('before', options.before);

  const queryString = params.toString();
  const url = `/api/messages/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient.get<MessagesResponse>(url);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to load messages');
  }
  return response.data;
}

export async function sendMessage(
  conversationId: string,
  data: {
    content: string;
    attachments?: { type: string; url: string; name: string; size?: number }[];
    replyToId?: string;
  }
): Promise<Message> {
  const response = await apiClient.post<Message>(`/api/messages/conversations/${conversationId}/messages`, data);
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to send message');
  }
  return response.data;
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  const response = await apiClient.post(`/api/messages/conversations/${conversationId}/read`, {});
  if (!response.success) {
    throw new Error(response.error || 'Failed to mark as read');
  }
}

export async function editMessage(messageId: string, content: string): Promise<Message> {
  const response = await apiClient.put<Message>(`/api/messages/messages/${messageId}`, { content });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to edit message');
  }
  return response.data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const response = await apiClient.delete(`/api/messages/messages/${messageId}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete message');
  }
}

// Participant APIs
export async function addParticipants(
  conversationId: string,
  userIds: string[]
): Promise<void> {
  const response = await apiClient.post(`/api/messages/conversations/${conversationId}/participants`, {
    userIds,
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to add participants');
  }
}

export async function removeParticipant(
  conversationId: string,
  userId: string
): Promise<void> {
  const response = await apiClient.delete(
    `/api/messages/conversations/${conversationId}/participants/${userId}`
  );
  if (!response.success) {
    throw new Error(response.error || 'Failed to remove participant');
  }
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const response = await apiClient.post(`/api/messages/conversations/${conversationId}/leave`, {});
  if (!response.success) {
    throw new Error(response.error || 'Failed to leave conversation');
  }
}

export async function toggleMute(conversationId: string): Promise<{ isMuted: boolean }> {
  const response = await apiClient.post<{ isMuted: boolean }>(`/api/messages/conversations/${conversationId}/mute`, {});
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to toggle mute');
  }
  return response.data;
}

// User search
export async function getAvailableUsers(search?: string): Promise<User[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const queryString = params.toString();
  const url = `/api/messages/users${queryString ? `?${queryString}` : ''}`;
  
  console.log('API: getAvailableUsers url:', url);
  const response = await apiClient.get<User[]>(url);
  console.log('API: getAvailableUsers response:', response);
  
  if (!response.success || !response.data) {
    console.log('API: getAvailableUsers failed or no data');
    return [];
  }
  return response.data;
}
