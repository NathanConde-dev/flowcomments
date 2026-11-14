'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Mic, Square, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/ui/toast';
import type { AutomationDraft } from './types';
import { InspectorAccordion } from './InspectorAccordion';

const MAX_AUDIO_SECONDS = 60;

type DmMediaFieldsProps = {
  draft: AutomationDraft;
  disabled?: boolean;
  onChange: (next: AutomationDraft) => void;
};

export function DmMediaFields({ draft, disabled, onChange }: DmMediaFieldsProps) {
  const [uploading, setUploading] = useState<'image' | 'audio' | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const discardRef = useRef(false);

  const hasImage = Boolean(draft.dmImageUrl.trim() || draft.dmImageAttachmentId.trim());
  const hasAudio = Boolean(draft.dmAudioUrl.trim() || draft.dmAudioAttachmentId.trim());

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      if (mediaRecorderRef.current?.state === 'recording') {
        discardRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const uploadFile = async (file: File, kind: 'image' | 'audio') => {
    if (!draft.igAccountId) {
      toast.error('Selecione a conta Instagram antes de enviar mídia');
      return;
    }
    setUploading(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('accountId', draft.igAccountId);
      const res = await fetch('/api/media/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha no upload');

      if (kind === 'image') {
        onChange({
          ...draft,
          dmImageUrl: data.url || '',
          dmImageAttachmentId: data.attachmentId || '',
        });
      } else {
        onChange({
          ...draft,
          dmAudioUrl: data.url || '',
          dmAudioAttachmentId: data.attachmentId || '',
          dmAudioName: data.filename || file.name,
        });
      }
      toast.success(kind === 'image' ? 'Imagem pronta' : 'Áudio pronto');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no upload');
    } finally {
      setUploading(null);
    }
  };

  const startRecording = async () => {
    if (recording || disabled || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;
      elapsedRef.current = 0;
      setElapsed(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearTimer();
        stopTracks();
        const shouldDiscard = discardRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        setRecording(false);

        if (shouldDiscard || blob.size === 0) {
          discardRef.current = false;
          elapsedRef.current = 0;
          setElapsed(0);
          return;
        }

        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: blob.type || 'audio/webm',
        });
        void uploadFile(file, 'audio');
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
      clearTimer();
      stopTracks();
      setRecording(false);
    }
  };

  const stopRecording = (discard = false) => {
    discardRef.current = discard;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-2">
      <InspectorAccordion
        title="Imagem"
        summary={hasImage ? 'Anexada · enviada antes do texto' : 'Opcional · upload ou URL'}
        defaultOpen={hasImage}
      >
        <div className="flex flex-wrap gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || Boolean(uploading)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploadFile(file, 'image');
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || Boolean(uploading)}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-4 w-4" />
            {uploading === 'image' ? 'Enviando…' : 'Subir imagem'}
          </Button>
          {hasImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...draft,
                  dmImageUrl: '',
                  dmImageAttachmentId: '',
                })
              }
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>
        {draft.dmImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.dmImageUrl}
            alt=""
            className="max-h-36 rounded-lg border border-border object-cover"
          />
        ) : null}
        <Input
          disabled={disabled}
          value={draft.dmImageUrl}
          onChange={(e) =>
            onChange({
              ...draft,
              dmImageUrl: e.target.value,
              dmImageAttachmentId: e.target.value.trim() ? draft.dmImageAttachmentId : '',
            })
          }
          placeholder="Ou cole uma URL HTTPS…"
        />
        <p className="text-xs text-muted-foreground">
          Enviada antes do texto. Upload gera anexo reutilizável na Meta.
        </p>
      </InspectorAccordion>

      <InspectorAccordion
        title="Áudio"
        summary={
          hasAudio
            ? draft.dmAudioName || 'Anexado'
            : 'Opcional · subir, gravar ou URL'
        }
        defaultOpen={hasAudio}
      >
        <div className="flex flex-wrap gap-2">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
            className="hidden"
            disabled={disabled || Boolean(uploading) || recording}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploadFile(file, 'audio');
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || Boolean(uploading) || recording}
            onClick={() => audioInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading === 'audio' ? 'Enviando…' : 'Subir áudio'}
          </Button>
          {!recording ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || Boolean(uploading)}
              onClick={startRecording}
            >
              <Mic className="mr-1.5 h-4 w-4" />
              Gravar
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => stopRecording(false)}
              >
                <Square className="mr-1.5 h-4 w-4" />
                Parar {formatElapsed(elapsed)}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => stopRecording(true)}>
                Cancelar
              </Button>
            </>
          )}
          {hasAudio ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...draft,
                  dmAudioUrl: '',
                  dmAudioAttachmentId: '',
                  dmAudioName: '',
                })
              }
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>
        {hasAudio ? (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="truncate text-xs font-medium text-foreground">
              {draft.dmAudioName || 'Áudio anexado'}
            </p>
            {draft.dmAudioUrl ? (
              <audio controls preload="metadata" className="mt-2 w-full">
                <source src={draft.dmAudioUrl} />
              </audio>
            ) : null}
          </div>
        ) : null}
        <Input
          disabled={disabled}
          value={draft.dmAudioUrl}
          onChange={(e) =>
            onChange({
              ...draft,
              dmAudioUrl: e.target.value,
              dmAudioAttachmentId: e.target.value.trim() ? draft.dmAudioAttachmentId : '',
              dmAudioName: e.target.value.trim()
                ? draft.dmAudioName || 'Áudio (URL)'
                : '',
            })
          }
          placeholder="Ou cole uma URL HTTPS de áudio…"
        />
      </InspectorAccordion>
    </div>
  );
}
