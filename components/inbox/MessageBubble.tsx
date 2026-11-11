'use client';

import { Bot, StickyNote } from 'lucide-react';
import { formatBrasiliaDateTime } from '@/lib/utils/datetime';
import type { InboxMessage } from './types';

function parseAttachment(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { type?: string; filename?: string; mimeType?: string };
  } catch {
    return null;
  }
}

export function MessageBubble({ message }: { message: InboxMessage }) {
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

  return (
    <div className={`mb-3 flex ${fromPage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${fromPage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            fromPage
              ? 'border-border bg-white text-foreground'
              : 'border-transparent bg-muted text-foreground'
          }`}
        >
          {attachment?.type === 'image' && (
            <p className="mb-2 text-xs text-muted-foreground">🖼 Imagem enviada</p>
          )}
          {attachment?.type === 'audio' && (
            <p className="mb-2 text-xs text-muted-foreground">🎤 Áudio enviado</p>
          )}
          {message.text && !message.text.startsWith('[') && (
            <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          )}
          {message.buttons.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.buttons.map((button) => (
                <div
                  key={button.title}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-center text-sm font-medium text-sky-700"
                >
                  {button.title}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          {isAutomation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800">
              <Bot className="h-3 w-3" />
              {message.automationName || 'Automação'}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatBrasiliaDateTime(message.sentAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
