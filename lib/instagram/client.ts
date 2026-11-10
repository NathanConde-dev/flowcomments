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
