const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  from: {
    id: string;
    username: string;
  };
  timestamp: string;
}

export class InstagramAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public subcode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'InstagramAPIError';
  }
}

export class InstagramClient {
  constructor(private accessToken: string) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${GRAPH_API_BASE}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new InstagramAPIError(
          data.error?.message || 'Instagram API error',
          data.error?.code,
          data.error?.error_subcode,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof InstagramAPIError) {
        throw error;
      }
      throw new InstagramAPIError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined,
        error
      );
    }
  }

  async getProfile(userId: string): Promise<InstagramProfile> {
    return this.request<InstagramProfile>(
      `/${userId}?fields=id,username,name,profile_picture_url&access_token=${this.accessToken}`
    );
  }

  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/${commentId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        access_token: this.accessToken,
      }),
    });
  }

  async sendMessage(recipientId: string, message: string): Promise<{ id: string }> {
    return this.request<{ id: string }>('/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: this.accessToken,
      }),
    });
  }

  async sendPrivateReply(
    commentId: string,
    message: string
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>('/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: message },
        access_token: this.accessToken,
      }),
    });
  }

  async sendPrivateReplyWithButtons(
    commentId: string,
    text: string,
    buttons: Array<{ title: string; payload: string }>
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>('/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons: buttons.slice(0, 3).map((button) => ({
                type: 'postback',
                title: button.title.slice(0, 20),
                payload: button.payload,
              })),
            },
          },
        },
        access_token: this.accessToken,
      }),
    });
  }

  async sendMessageWithButtons(
    recipientId: string,
    text: string,
    buttons: Array<{ title: string; payload: string }>
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>('/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons: buttons.slice(0, 3).map((button) => ({
                type: 'postback',
                title: button.title.slice(0, 20),
                payload: button.payload,
              })),
            },
          },
        },
        access_token: this.accessToken,
      }),
    });
  }

  async sendMessageWithQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>('/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          text,
          quick_replies: quickReplies.slice(0, 13).map((item) => ({
            content_type: 'text',
            title: item.title.slice(0, 20),
            payload: item.payload,
          })),
        },
        access_token: this.accessToken,
      }),
    });
  }

  async setIceBreakers(
    items: Array<{ question: string; payload: string }>
  ): Promise<{ success?: boolean }> {
    return this.request<{ success?: boolean }>(
      `/me/messenger_profile?platform=instagram&access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          ice_breakers: [
            {
              locale: 'default',
              call_to_actions: items.slice(0, 4).map((item) => ({
                question: item.question.slice(0, 80),
                payload: item.payload,
              })),
            },
          ],
        }),
      }
    );
  }

  async clearIceBreakers(): Promise<{ success?: boolean }> {
    return this.request<{ success?: boolean }>(
      `/me/messenger_profile?platform=instagram&access_token=${this.accessToken}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          fields: ['ice_breakers'],
        }),
      }
    );
  }

  async isUserFollowBusiness(igsId: string): Promise<boolean | null> {
    try {
      const data = await this.request<{ is_user_follow_business?: boolean }>(
        `/${igsId}?fields=is_user_follow_business&access_token=${this.accessToken}`
      );
      if (typeof data.is_user_follow_business === 'boolean') {
        return data.is_user_follow_business;
      }
      return null;
    } catch (error) {
      console.warn('is_user_follow_business check failed:', error);
      return null;
    }
  }

  async getMedia(
    igUserId: string,
    limit = 24
  ): Promise<{ data: InstagramPost[]; paging?: { cursors?: { after?: string } } }> {
    const fields = [
      'id',
      'caption',
      'media_type',
      'media_url',
      'thumbnail_url',
      'permalink',
      'timestamp',
    ].join(',');

    return this.request(
      `/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${this.accessToken}`
    );
  }

  async getConversations(pageId: string): Promise<any> {
    return this.request(
      `/${pageId}/conversations?fields=id,updated_time,participants,unread_count&access_token=${this.accessToken}`
    );
  }

  async getMessages(conversationId: string): Promise<any> {
    return this.request(
      `/${conversationId}?fields=messages{id,created_time,from,to,message}&access_token=${this.accessToken}`
    );
  }
}

export function createInstagramClient(accessToken: string): InstagramClient {
  return new InstagramClient(accessToken);
}
