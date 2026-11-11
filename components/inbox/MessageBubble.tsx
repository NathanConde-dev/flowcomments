'use client';

import { Bot, ExternalLink, StickyNote } from 'lucide-react';
import { formatBrasiliaDateTime } from '@/lib/utils/datetime';
import { cn } from '@/lib/utils/cn';
import type { InboxMessage } from './types';

type AttachmentMeta = {
  type?: string;
  filename?: string;
  mimeType?: string;
  url?: string;
  attachmentId?: string;
};

function parseAttachment(raw: string | null): AttachmentMeta | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AttachmentMeta;
  } catch {
    return null;
  }
}

function InstagramButtons({
  buttons,
  variant,
}: {
  buttons: InboxMessage['buttons'];
  variant: 'template' | 'quick_reply';
}) {
  if (!buttons.length) return null;

  if (variant === 'quick_reply') {
    return (
      <div className="mt-2 flex max-w-full flex-wrap justify-end gap-1.5">
        {buttons.map((button, index) => (
          <span
            key={`${button.title}-${index}`}
            className="inline-flex max-w-full items-center rounded-full border border-[#0095F6]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#0095F6]"
          >
            <span className="truncate">{button.title}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1.5 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {buttons.map((button, index) => {
        const isLink = button.type === 'web_url' && button.url;
        const content = (
          <>
            <span className="truncate">{button.title}</span>
            {isLink && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />}
          </>
        );

        return (
          <div
            key={`${button.title}-${index}`}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-2.5 text-center text-sm font-semibold text-[#0095F6]',
              index > 0 && 'border-t border-border'
            )}
          >
            {isLink ? (
              <a
                href={button.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center justify-center gap-1.5 hover:underline"
              >
                {content}
              </a>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MessageBubble({ message }: { message: InboxMessage }) {
  if (message.messageType === 'system') {
    return (
      <div className="my-5 flex items-center gap-3 px-2">
        <div className="h-px flex-1 border-t border-dashed border-border" />
        <p className="max-w-[min(100%,28rem)] shrink-0 text-center text-xs leading-relaxed text-muted-foreground">
          {message.text || 'Atualização da conversa'}
        </p>
        <div className="h-px flex-1 border-t border-dashed border-border" />
      </div>
    );
  }

  if (message.isNote) {
    return (
      <div className="mx-auto my-3 max-w-lg rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <StickyNote className="h-3.5 w-3.5" />
          Observação interna
        </div>
        <p className="whitespace-pre-wrap">{message.text}</p>
        <p className="mt-2 text-[11px] text-amber-700/80">
          {formatBrasiliaDateTime(message.sentAt)}
        </p>
      </div>
    );
  }

  const fromPage = message.isFromPage;
  const attachment = parseAttachment(message.attachments);
  const isAutomation = Boolean(message.automationId || message.automationName);
  const buttons = message.buttons;
  const hasButtons = buttons.length > 0;
  const isQuickReplies =
    message.messageType === 'quick_replies' ||
    buttons.every((b) => b.type === 'quick_reply');
  const isPostback = message.messageType === 'postback' && !fromPage;
  const text =
    message.text && !/^\[(image|audio|video|file)\]$/i.test(message.text.trim())
      ? message.text
      : null;
  const showPlaceholderMedia =
    !attachment?.url &&
    (attachment?.type === 'image' ||
      attachment?.type === 'audio' ||
      attachment?.type === 'video' ||
      attachment?.type === 'file' ||
      message.messageType === 'image' ||
      message.messageType === 'audio' ||
      message.messageType === 'video');

  return (
    <div className={cn('mb-3 flex', fromPage ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-1 sm:max-w-[min(70%,22rem)]',
          fromPage ? 'items-end' : 'items-start'
        )}
      >
        {isPostback ? (
          <div className="rounded-2xl border border-[#0095F6]/25 bg-[#E8F6FF] px-4 py-2.5 text-sm text-[#05557A] shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#0095F6]/80">
              Resposta do botão
            </p>
            <p className="mt-0.5 font-medium">{text || 'Botão'}</p>
          </div>
        ) : (
          <>
            {(text || attachment || showPlaceholderMedia) && (
              <div
                className={cn(
                  'w-full overflow-hidden rounded-2xl border text-sm shadow-sm',
                  fromPage
                    ? 'border-border bg-white text-foreground'
                    : 'border-transparent bg-muted text-foreground'
                )}
              >
                {attachment?.type === 'image' && attachment.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachment.url}
                    alt=""
                    className="max-h-72 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                {attachment?.type === 'audio' && attachment.url && (
                  <div className="px-3 pt-3">
                    <audio controls preload="metadata" className="w-full">
                      <source src={attachment.url} type={attachment.mimeType || 'audio/mpeg'} />
                    </audio>
                  </div>
                )}
                {attachment?.type === 'video' && attachment.url && (
                  <video
                    controls
                    preload="metadata"
                    className="max-h-72 w-full bg-black object-contain"
                    src={attachment.url}
                  />
                )}
                {showPlaceholderMedia && (
                  <p className="px-4 pt-3 text-xs text-muted-foreground">
                    {attachment?.type === 'image' || message.messageType === 'image'
                      ? '🖼 Imagem'
                      : attachment?.type === 'audio' || message.messageType === 'audio'
                        ? '🎤 Áudio'
                        : attachment?.type === 'video' || message.messageType === 'video'
                          ? '🎬 Vídeo'
                          : '📎 Anexo'}
                    {attachment?.filename ? ` · ${attachment.filename}` : ''}
                  </p>
                )}
                {text && (
                  <p
                    className={cn(
                      'whitespace-pre-wrap leading-relaxed',
                      attachment || showPlaceholderMedia ? 'px-4 py-3' : 'px-4 py-3'
                    )}
                  >
                    {text}
                  </p>
                )}
              </div>
            )}

            {hasButtons && (
              <div className="w-full">
                <InstagramButtons
                  buttons={buttons}
                  variant={isQuickReplies ? 'quick_reply' : 'template'}
                />
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2 px-1">
          {isAutomation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800">
              <Bot className="h-3 w-3" />
              {message.automationName || 'Automação'}
            </span>
          )}
          {hasButtons && !isQuickReplies && (
            <span className="text-[10px] font-medium text-muted-foreground">Botões</span>
          )}
          {hasButtons && isQuickReplies && (
            <span className="text-[10px] font-medium text-muted-foreground">Respostas rápidas</span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatBrasiliaDateTime(message.sentAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
