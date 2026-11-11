export type InboxListItem = {
  id: string;
  status: string;
  unreadCount: number;
  isFavorite: boolean;
  reminderAt: string | null;
  lastMessageAt: string | null;
  preview: string | null;
  previewFromPage: boolean;
  contact: {
    id: string;
    igUsername: string;
    fullName: string | null;
    profilePic: string | null;
    tags: string[];
    automationPaused: boolean;
  };
  igAccount: { id: string; igUsername: string };
};

export type InboxMessage = {
  id: string;
  messageType: string;
  text: string | null;
  attachments: string | null;
  automationId: string | null;
  automationName: string | null;
  buttons: Array<{ title: string }>;
  isNote: boolean;
  isFromPage: boolean;
  sentAt: string;
  fromIgUserId: string;
  toIgUserId: string;
};

export type InboxConversationDetail = {
  id: string;
  status: string;
  unreadCount: number;
  isFavorite: boolean;
  reminderAt: string | null;
  lastMessageAt: string | null;
  contact: {
    id: string;
    igUserId: string;
    igUsername: string;
    fullName: string | null;
    profilePic: string | null;
    tags: string[];
    customData: Record<string, unknown>;
    automationPaused: boolean;
    lastSeenAt: string | null;
  };
  igAccount: {
    id: string;
    igUsername: string;
    igUserId: string | null;
    profilePictureUrl: string | null;
  };
  messages: InboxMessage[];
};

export type InboxFilter = 'open' | 'closed' | 'unread' | 'reminders' | 'favorites' | 'all';
