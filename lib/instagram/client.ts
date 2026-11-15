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
  private messagingAuthCache: {
    token: string;
    path: string;
    baseUrl: string;
  } | null = null;

  constructor(
    accessToken: string,
    private igUserId?: string,
    /** Facebook Page id — required for private replies when using Facebook Login (EAA tokens). */
    private pageId?: string | null
  ) {
    this.accessToken = accessToken.trim();
  }

  /** Instagram Login tokens start with IG*; Facebook Login / Page tokens usually EAA*. */
  private isInstagramLoginToken() {
    return this.accessToken.startsWith('IG');
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

  /**
   * Facebook Login private replies / DMs require PAGE_ID + Page access token.
   * User long-lived tokens are kept for Graph calls; messaging resolves Page creds.
   */
  private async messagingAuth(): Promise<{
    token: string;
    path: string;
    baseUrl: string;
  }> {
    if (this.messagingAuthCache) return this.messagingAuthCache;

    if (this.isInstagramLoginToken()) {
      this.messagingAuthCache = {
        token: this.accessToken,
        path: `/${this.requireIgUserId()}/messages`,
        baseUrl: IG_GRAPH_API_BASE,
      };
      return this.messagingAuthCache;
    }

    const resolved = await resolveFacebookPageMessaging({
      accessToken: this.accessToken,
      igUserId: this.requireIgUserId(),
      facebookPageId: this.pageId,
    });

    if (!resolved.pageId) {
      console.warn(
        'Facebook Login messaging without pageId — Meta expects /{PAGE_ID}/messages'
      );
    }

    this.pageId = resolved.pageId || this.pageId;
    this.messagingAuthCache = {
      token: resolved.accessToken,
      path: `/${resolved.pageId || this.requireIgUserId()}/messages`,
      baseUrl: GRAPH_API_BASE,
    };
    return this.messagingAuthCache;
  }

  private messagingHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
    const auth = await this.messagingAuth();
    return this.request<{ id: string }>(
      auth.path,
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      },
      auth.baseUrl
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
    const auth = await this.messagingAuth();
    const ownerId = this.pageId || this.requireIgUserId();
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

    const url = `${auth.baseUrl}/${ownerId}/message_attachments`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
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
    const auth = await this.messagingAuth();
    return this.request<{ id: string }>(
      auth.path,
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
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
      auth.baseUrl
    );
  }

  /** Send an image/audio/video by public HTTPS URL (Meta downloads it). */
  async sendMediaByUrl(
    recipientId: string,
    type: 'image' | 'audio' | 'video' | 'file',
    url: string
  ): Promise<{ id: string }> {
    const auth = await this.messagingAuth();
    return this.request<{ id: string }>(
      auth.path,
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
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
      auth.baseUrl
    );
  }

  async sendPrivateReply(
    commentId: string,
    message: string
  ): Promise<{ id: string }> {
    const auth = await this.messagingAuth();
    const body = JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: message },
    });
    const fallback =
      auth.baseUrl === IG_GRAPH_API_BASE ? GRAPH_API_BASE : IG_GRAPH_API_BASE;
    try {
      return await this.request<{ id: string }>(
        auth.path,
        { method: 'POST', headers: this.messagingHeaders(auth.token), body },
        auth.baseUrl
      );
    } catch (error) {
      if (!(error instanceof InstagramAPIError)) throw error;
      console.warn('sendPrivateReply primary host failed, trying fallback', {
        commentId,
        primary: auth.baseUrl,
        fallback,
        path: auth.path,
        code: error.code,
        subcode: error.subcode,
        message: error.message,
      });
      return this.request<{ id: string }>(
        auth.path,
        { method: 'POST', headers: this.messagingHeaders(auth.token), body },
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
    const auth = await this.messagingAuth();
    return this.request<{ id: string }>(
      auth.path,
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
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
      auth.baseUrl
    );
  }

  async sendMessageWithButtons(
    recipientId: string,
    text: string,
    buttons: Array<{ title: string; payload?: string; url?: string }>
  ): Promise<{ id: string }> {
    const auth = await this.messagingAuth();
    return this.request<{ id: string }>(
      auth.path,
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
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
      auth.baseUrl
    );
  }

  async sendMessageWithQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: Array<{ title: string; payload: string }>
  ): Promise<{ id: string }> {
    const auth = await this.messagingAuth();
    return this.request<{ id: string }>(
      auth.path,
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
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
      auth.baseUrl
    );
  }

  async setIceBreakers(
    items: Array<{ question: string; payload: string }>
  ): Promise<{ success?: boolean }> {
    const auth = await this.messagingAuth();
    return this.request<{ success?: boolean }>(
      this.messengerProfilePath(),
      {
        method: 'POST',
        headers: this.messagingHeaders(auth.token),
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
      auth.baseUrl
    );
  }

  async clearIceBreakers(): Promise<{ success?: boolean }> {
    const auth = await this.messagingAuth();
    return this.request<{ success?: boolean }>(
      this.messengerProfilePath(),
      {
        method: 'DELETE',
        headers: this.messagingHeaders(auth.token),
        body: JSON.stringify({
          platform: 'instagram',
          fields: ['ice_breakers'],
        }),
      },
      auth.baseUrl
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
  igUserId?: string,
  pageId?: string | null
): InstagramClient {
  return new InstagramClient(accessToken, igUserId, pageId);
}

/**
 * Resolve Page id + Page token for Facebook Login messaging / private replies.
 * Instagram Login tokens are returned unchanged.
 * Always prefers Page access_token from /me/accounts — user tokens fail on /messages.
 */
export async function resolveFacebookPageMessaging(params: {
  accessToken: string;
  igUserId: string;
  facebookPageId?: string | null;
}): Promise<{ accessToken: string; pageId: string | null }> {
  const token = params.accessToken.trim();
  if (token.startsWith('IG')) {
    return { accessToken: token, pageId: null };
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=instagram_business_account,access_token&access_token=${encodeURIComponent(token)}`
    );
    if (response.ok) {
      const data = await response.json();
      const pages: Array<{
        id?: string;
        access_token?: string;
        instagram_business_account?: { id?: string };
      }> = data.data || [];

      const matched =
        pages.find((item) => item.instagram_business_account?.id === params.igUserId) ||
        (params.facebookPageId
          ? pages.find((item) => item.id === params.facebookPageId)
          : undefined);

      if (matched?.id && matched?.access_token) {
        return { accessToken: matched.access_token, pageId: matched.id };
      }
    }
  } catch (error) {
    console.warn('resolveFacebookPageMessaging failed', error);
  }

  return {
    accessToken: token,
    pageId: params.facebookPageId || null,
  };
}
