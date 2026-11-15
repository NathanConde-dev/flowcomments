const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
/** Instagram Login user tokens must hit graph.instagram.com for messaging. */
const IG_GRAPH_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

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
  private accessToken: string;

  constructor(accessToken: string, private igUserId?: string) {
    this.accessToken = accessToken.trim();
  }

  /** Instagram Login tokens start with IG*; Facebook Login / Page tokens usually EAA*. */
  private isInstagramLoginToken() {
    return this.accessToken.startsWith('IG');
  }

  /**
   * Instagram Login → graph.instagram.com
   * Facebook Login / Page token → graph.facebook.com
   * Mixing hosts causes Meta "Cannot parse access token".
   */
  private messagingBaseUrl() {
    return this.isInstagramLoginToken() ? IG_GRAPH_API_BASE : GRAPH_API_BASE;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    baseUrl: string = GRAPH_API_BASE
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;

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

  private requireIgUserId(): string {
    if (!this.igUserId) {
      throw new InstagramAPIError(
        'IG user id ausente — reconecte a conta Instagram para enviar DMs/private replies'
      );
    }
    return this.igUserId;
  }

  private messagesPath() {
    // Both Instagram Login and Facebook tokens use the IG professional account id.
    // /me fails for System User tokens (Unsupported post request on 'me').
    return `/${this.requireIgUserId()}/messages`;
  }

  private messagingHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private messengerProfilePath() {
    return `/${this.requireIgUserId()}/messenger_profile?platform=instagram`;
  }

  async getProfile(userId: string): Promise<InstagramProfile> {
    return this.request<InstagramProfile>(
      `/${userId}?fields=id,username,name,profile_picture_url&access_token=${this.accessToken}`
    );
  }

  /** Best-effort profile for a scoped Instagram user (commenter / DM sender). */
  async getScopedUserProfile(
    igsId: string
  ): Promise<{ username?: string; name?: string; profilePic?: string } | null> {
    try {
      const data = await this.request<{
        username?: string;
        name?: string;
        profile_pic?: string;
        profile_picture_url?: string;
      }>(
        `/${igsId}?fields=name,username,profile_pic&access_token=${this.accessToken}`,
        {},
        IG_GRAPH_API_BASE
      );
      return {
        username: data.username,
        name: data.name,
        profilePic: data.profile_pic || data.profile_picture_url,
      };
    } catch {
      try {
        const data = await this.request<{
          username?: string;
          name?: string;
          profile_pic?: string;
          profile_picture_url?: string;
        }>(`/${igsId}?fields=name,username,profile_pic,profile_picture_url&access_token=${this.accessToken}`);
        return {
          username: data.username,
          name: data.name,
          profilePic: data.profile_pic || data.profile_picture_url,
        };
      } catch {
        return null;
      }
    }
  }

  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    // Instagram Login tokens: prefer IG graph; fall back to Facebook graph for Page tokens.
    const body = JSON.stringify({ message });
    const headers = { 'Content-Type': 'application/json' };
    if (this.igUserId) {
      try {
        return await this.request<{ id: string }>(
          `/${commentId}/replies?access_token=${encodeURIComponent(this.accessToken)}`,
          { method: 'POST', headers, body },
          IG_GRAPH_API_BASE
        );
      } catch (error) {
        if (!(error instanceof InstagramAPIError)) throw error;
      }
    }
    return this.request<{ id: string }>(
      `/${commentId}/replies?access_token=${encodeURIComponent(this.accessToken)}`,
      { method: 'POST', headers, body }
    );
  }

  async sendMessage(recipientId: string, message: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.messagesPath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      },
      this.messagingBaseUrl()
    );
  }

  /**
   * Upload a reusable messaging attachment (image/audio/video/file) to Meta.
   * Returns attachment_id for sendAttachment().
   */
  async uploadMessageAttachment(params: {
    type: 'image' | 'audio' | 'video' | 'file';
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }): Promise<{ attachment_id: string }> {
    const igUserId = this.requireIgUserId();
    const form = new FormData();
    form.append(
      'message',
      JSON.stringify({
        attachment: {
          type: params.type,
          payload: { is_reusable: true },
        },
      })
    );
    form.append(
      'filedata',
      new Blob([new Uint8Array(params.buffer)], { type: params.mimeType }),
      params.filename
    );

    const url = `${this.messagingBaseUrl()}/${igUserId}/message_attachments`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    });
    const data = await response.json();
    if (!response.ok || !data.attachment_id) {
      throw new InstagramAPIError(
        data.error?.message || 'Falha ao enviar anexo',
        data.error?.code,
        data.error?.error_subcode,
        data
      );
    }
    return { attachment_id: String(data.attachment_id) };
  }

  async sendMediaAttachment(
    recipientId: string,
    type: 'image' | 'audio' | 'video' | 'file',
    attachmentId: string
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.messagesPath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type,
              payload: { attachment_id: attachmentId },
            },
          },
        }),
      },
      this.messagingBaseUrl()
    );
  }

  /** Send an image/audio/video by public HTTPS URL (Meta downloads it). */
  async sendMediaByUrl(
    recipientId: string,
    type: 'image' | 'audio' | 'video' | 'file',
    url: string
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.messagesPath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type,
              payload: { url, is_reusable: true },
            },
          },
        }),
      },
      this.messagingBaseUrl()
    );
  }

  async sendPrivateReply(
    commentId: string,
    message: string
  ): Promise<{ id: string }> {
    const body = JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: message },
    });
    const primary = this.messagingBaseUrl();
    const fallback =
      primary === IG_GRAPH_API_BASE ? GRAPH_API_BASE : IG_GRAPH_API_BASE;
    try {
      return await this.request<{ id: string }>(
        this.messagesPath(),
        { method: 'POST', headers: this.messagingHeaders(), body },
        primary
      );
    } catch (error) {
      if (!(error instanceof InstagramAPIError)) throw error;
      console.warn('sendPrivateReply primary host failed, trying fallback', {
        commentId,
        primary,
        fallback,
        code: error.code,
        subcode: error.subcode,
        message: error.message,
      });
      return this.request<{ id: string }>(
        this.messagesPath(),
        { method: 'POST', headers: this.messagingHeaders(), body },
        fallback
      );
    }
  }

  private mapTemplateButtons(
    buttons: Array<{ title: string; payload?: string; url?: string }>
  ) {
    return buttons.slice(0, 3).map((button) => {
      const title = button.title.slice(0, 20);
      const url = button.url?.trim();
      if (url) {
        return { type: 'web_url' as const, title, url };
      }
      return {
        type: 'postback' as const,
        title,
        payload: button.payload || '',
      };
    });
  }

  async sendPrivateReplyWithButtons(
    commentId: string,
    text: string,
    buttons: Array<{ title: string; payload?: string; url?: string }>
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.messagesPath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text,
                buttons: this.mapTemplateButtons(buttons),
              },
            },
          },
        }),
      },
      this.messagingBaseUrl()
    );
  }

  async sendMessageWithButtons(
    recipientId: string,
    text: string,
    buttons: Array<{ title: string; payload?: string; url?: string }>
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.messagesPath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text,
                buttons: this.mapTemplateButtons(buttons),
              },
            },
          },
        }),
      },
      this.messagingBaseUrl()
    );
  }

  async sendMessageWithQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.messagesPath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
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
        }),
      },
      this.messagingBaseUrl()
    );
  }

  async setIceBreakers(
    items: Array<{ question: string; payload: string }>
  ): Promise<{ success?: boolean }> {
    return this.request<{ success?: boolean }>(
      this.messengerProfilePath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(),
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
      },
      this.messagingBaseUrl()
    );
  }

  async clearIceBreakers(): Promise<{ success?: boolean }> {
    return this.request<{ success?: boolean }>(
      this.messengerProfilePath(),
      {
        method: 'DELETE',
        headers: this.messagingHeaders(),
        body: JSON.stringify({
          platform: 'instagram',
          fields: ['ice_breakers'],
        }),
      },
      this.messagingBaseUrl()
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

export function createInstagramClient(
  accessToken: string,
  igUserId?: string
): InstagramClient {
  return new InstagramClient(accessToken, igUserId);
}
