'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Mic, Send, Smile, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';

type Mode = 'reply' | 'note';

export function Composer({
  conversationId,
  disabled,
  onSent,
}: {
  conversationId: string;
  disabled?: boolean;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<Mode>('reply');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText('');
    setMode('reply');
  }, [conversationId]);

  const submitReply = async (file?: File | null) => {
    if (sending || disabled) return;
    if (!text.trim() && !file) return;
    setSending(true);
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        if (text.trim()) form.append('text', text.trim());
        form.append('file', file);
        res = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: form,
        });
      } else {
        res = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao enviar');
      setText('');
      onSent();
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

  const toggleRecording = async () => {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        await submitReply(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const canSend = Boolean(text.trim()) && !sending && !disabled;

  return (
    <div className="border-t border-border bg-white">
      <div className="flex gap-4 border-b border-border px-4">
        <button
          type="button"
          onClick={() => setMode('reply')}
          className={`border-b-2 py-2.5 text-sm font-medium ${
            mode === 'reply'
              ? 'border-sky-500 text-sky-700'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          Responder
        </button>
        <button
          type="button"
          onClick={() => setMode('note')}
          className={`border-b-2 py-2.5 text-sm font-medium ${
            mode === 'note'
              ? 'border-sky-500 text-sky-700'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          Observação
        </button>
      </div>

      <div className={`p-3 ${mode === 'note' ? 'bg-amber-50/60' : 'bg-white'}`}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
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

        <div className="mt-2 flex items-center justify-between gap-2">
          {mode === 'reply' ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Emoji"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => setText((prev) => `${prev}🙂`)}
              >
                <Smile className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Imagem"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                title={recording ? 'Parar gravação' : 'Gravar áudio'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted ${
                  recording ? 'text-red-600' : 'text-muted-foreground'
                }`}
                onClick={() => void toggleRecording()}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,audio/*"
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

          <Button
            type="button"
            disabled={!canSend}
            onClick={() => {
              if (mode === 'reply') void submitReply();
              else void submitNote();
            }}
            className="bg-sky-500 text-white hover:bg-sky-600"
          >
            <Send className="mr-2 h-4 w-4" />
            {mode === 'reply' ? 'Enviar para o Instagram' : 'Adicionar observação'}
          </Button>
        </div>
      </div>
    </div>
  );
}
