'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CircleStop,
  ImageIcon,
  Mic,
  Paperclip,
  Send,
  Smile,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/lib/ui/toast';

type Mode = 'reply' | 'note';

const MAX_AUDIO_SECONDS = 120;

function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, Math.min(MAX_AUDIO_SECONDS, Math.floor(totalSeconds)));
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function Composer({
  conversationId,
  disabled,
  conversationStatus,
  onSent,
}: {
  conversationId: string;
  disabled?: boolean;
  conversationStatus?: string;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<Mode>('reply');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pendingAudio, setPendingAudio] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const elapsedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const resetRecordingState = () => {
    clearTimer();
    stopTracks();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);
    setRecording(false);
    discardRef.current = false;
  };

  useEffect(() => {
    setText('');
    setMode('reply');
    setPendingAudio(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardRef.current = true;
      mediaRecorderRef.current.stop();
    } else {
      resetRecordingState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
    };
  }, []);

  const submitReply = async (file?: File | null, closeAfter = false) => {
    if (sending || disabled) return;
    const audio = file || pendingAudio;
    if (!text.trim() && !audio) return;
    setSending(true);
    try {
      let res: Response;
      if (audio) {
        const form = new FormData();
        if (text.trim()) form.append('text', text.trim());
        form.append('file', audio);
        if (closeAfter) form.append('closeAfter', 'true');
        res = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: form,
        });
      } else {
        res = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim(), closeAfter }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao enviar');
      setText('');
      setPendingAudio(null);
      onSent();
      if (closeAfter) toast.success('Enviado e conversa fechada');
      else if (conversationStatus === 'closed') toast.success('Conversa reaberta');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  };

  const submitNote = async () => {
    if (sending || !text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar');
      setText('');
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (recording || sending || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;
      elapsedRef.current = 0;
      setElapsed(0);
      setPendingAudio(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearTimer();
        stopTracks();
        const shouldDiscard = discardRef.current;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        setRecording(false);

        if (shouldDiscard || blob.size === 0) {
          discardRef.current = false;
          elapsedRef.current = 0;
          setElapsed(0);
          return;
        }

        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setPendingAudio(file);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_AUDIO_SECONDS && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
      }, 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone');
      resetRecordingState();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    discardRef.current = false;
    mediaRecorderRef.current.stop();
  };

  const discardRecording = () => {
    if (recording && mediaRecorderRef.current) {
      discardRef.current = true;
      mediaRecorderRef.current.stop();
      return;
    }
    setPendingAudio(null);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const canSend =
    !sending &&
    !disabled &&
    !recording &&
    (Boolean(text.trim()) || Boolean(pendingAudio));

  return (
    <div className="border-t border-border bg-white">
      <div className="flex gap-4 border-b border-border px-4">
        <button
          type="button"
          onClick={() => setMode('reply')}
          className={cn(
            'border-b-2 py-2.5 text-sm font-medium',
            mode === 'reply'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground'
          )}
        >
          Responder
        </button>
        <button
          type="button"
          onClick={() => setMode('note')}
          disabled={recording}
          className={cn(
            'border-b-2 py-2.5 text-sm font-medium',
            mode === 'note'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground'
          )}
        >
          Observação
        </button>
      </div>

      <div className={cn('p-3', mode === 'note' ? 'bg-amber-50/60' : 'bg-white')}>
        {mode === 'reply' && (recording || pendingAudio) && (
          <div className="mb-3 flex items-center gap-2">
            <WithTooltip label="Descartar áudio">
              <button
                type="button"
                aria-label="Descartar áudio"
                onClick={discardRecording}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </WithTooltip>

            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                {recording ? (
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                ) : (
                  <Mic className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-medium tabular-nums">
                  {formatTimer(elapsed)}
                  <span className="text-muted-foreground"> / {formatTimer(MAX_AUDIO_SECONDS)}</span>
                </span>
                {!recording && pendingAudio && (
                  <span className="truncate text-xs text-muted-foreground">Áudio pronto</span>
                )}
              </div>

              {recording && (
                <WithTooltip label="Parar gravação">
                  <button
                    type="button"
                    aria-label="Parar gravação"
                    onClick={stopRecording}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
                  >
                    <CircleStop className="h-5 w-5" />
                  </button>
                </WithTooltip>
              )}
            </div>
          </div>
        )}

        {!recording && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={pendingAudio ? 2 : 3}
            placeholder={
              mode === 'reply'
                ? 'Responda aqui'
                : 'Deixe uma mensagem para seus colegas de equipe ou lembrete para você mesmo'
            }
            className="w-full resize-none rounded-xl border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (mode === 'reply') void submitReply();
                else void submitNote();
              }
            }}
          />
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {mode === 'reply' ? (
            <div className="flex items-center gap-0.5">
              <WithTooltip label="Emoji" disabled={recording}>
                <button
                  type="button"
                  aria-label="Emoji"
                  disabled={recording}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                  onClick={() => setText((prev) => `${prev}🙂`)}
                >
                  <Smile className="h-4 w-4" />
                </button>
              </WithTooltip>
              <WithTooltip label="Imagem" disabled={recording}>
                <button
                  type="button"
                  aria-label="Imagem"
                  disabled={recording}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </WithTooltip>
              <WithTooltip label="Anexo" disabled={recording}>
                <button
                  type="button"
                  aria-label="Anexo"
                  disabled={recording}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                  onClick={() => attachRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </WithTooltip>
              <WithTooltip
                label="Gravar áudio"
                disabled={recording || Boolean(pendingAudio)}
              >
                <button
                  type="button"
                  aria-label="Gravar áudio"
                  disabled={recording || Boolean(pendingAudio)}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40',
                    (recording || pendingAudio) && 'text-foreground'
                  )}
                  onClick={() => void startRecording()}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </WithTooltip>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void submitReply(file);
                }}
              />
              <input
                ref={attachRef}
                type="file"
                accept="image/*,audio/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void submitReply(file);
                }}
              />
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {mode === 'reply' && (
              <Button
                type="button"
                variant="outline"
                disabled={!canSend}
                onClick={() => void submitReply(null, true)}
              >
                Enviar e Fechar
              </Button>
            )}
            <Button
              type="button"
              disabled={mode === 'note' ? !text.trim() || sending : !canSend}
              onClick={() => {
                if (mode === 'reply') void submitReply();
                else void submitNote();
              }}
              className="bg-black text-white hover:bg-zinc-800"
            >
              <Send className="mr-2 h-4 w-4" />
              {mode === 'reply' ? 'Enviar para o Instagram' : 'Adicionar observação'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
