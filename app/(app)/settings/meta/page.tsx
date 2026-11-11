'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Dices,
  Eye,
  EyeOff,
  ExternalLink,
  LoaderCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetaFieldHelp, getMetaFieldUrl } from '@/components/setup/MetaFieldHelp';
import { SettingsFormSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/lib/ui/toast';

const DRAFT_KEY = 'fc-meta-settings-draft';

function generateWebhookToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function mergePreferPlain(prev: string, next?: string) {
  if (!next) return prev;
  if (next.includes('••••') && prev && !prev.includes('••••')) return prev;
  return next;
}

interface MetaConfig {
  metaAppId: string;
  metaAppSecret: string;
  metaConfigId: string;
  igAppId: string;
  igAppSecret: string;
  webhookVerifyToken: string;
}

type MetaField = Parameters<typeof getMetaFieldUrl>[0];

function ConfigField({
  label,
  helpField,
  appId,
  value,
  onChange,
  placeholder,
  secret,
  readOnly,
  onOpenMeta,
  onGenerate,
  hint,
}: {
  label: string;
  helpField?: MetaField;
  appId?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  readOnly?: boolean;
  onOpenMeta?: () => void;
  onGenerate?: () => void;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(value) && !value.includes('••••');

  const copy = async () => {
    if (!canCopy) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copiado');
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          {label}
          {helpField ? <MetaFieldHelp field={helpField} appId={appId} compact /> : null}
        </label>
        <div className="flex items-center gap-1">
          {onGenerate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-600"
              onClick={onGenerate}
            >
              <Dices className="mr-1 h-3 w-3" />
              Gerar
            </Button>
          ) : null}
          {onOpenMeta ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-600"
              onClick={onOpenMeta}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Abrir
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            type={secret && !visible ? 'password' : 'text'}
            value={value}
            readOnly={readOnly}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            placeholder={placeholder}
            className={secret ? 'pr-10' : undefined}
          />
          {secret ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Ocultar valor' : 'Mostrar valor'}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
        <Button type="button" variant="outline" disabled={!canCopy} onClick={copy}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>

      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function MetaAppSettingsPage() {
  const [config, setConfig] = useState<MetaConfig>({
    metaAppId: '',
    metaAppSecret: '',
    metaConfigId: '',
    igAppId: '',
    igAppSecret: '',
    webhookVerifyToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [hasActiveIgAccount, setHasActiveIgAccount] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const hydratedRef = useRef(false);
  const skipAutosaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook`
      : process.env.NEXT_PUBLIC_URL
        ? `${process.env.NEXT_PUBLIC_URL}/api/webhook`
        : 'https://seu-dominio.com/api/webhook';

  const oauthCallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/instagram/callback`
      : process.env.NEXT_PUBLIC_URL
        ? `${process.env.NEXT_PUBLIC_URL}/api/instagram/callback`
        : 'https://seu-dominio.com/api/instagram/callback';

  const appId = config.metaAppId;

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    fetchConfig();
    void fetch('/api/instagram/accounts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const accounts = data.accounts || [];
        setHasActiveIgAccount(accounts.some((a: { isActive?: boolean }) => a.isActive !== false));
      })
      .catch(() => {});
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('needConfig') === '1') {
        toast.warning(
          params.get('missing') === 'configId'
            ? 'Preencha o Meta Config ID (Facebook Login for Business) antes de conectar o Instagram.'
            : 'Configure o Meta App antes de conectar o Instagram.'
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
    } catch {
      // ignore quota / private mode
    }

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (!config.metaAppId.trim()) {
      setSaveState('idle');
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(() => {
      void persistConfig(configRef.current, { silent: true });
    }, 650);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config]);

  const fetchConfig = async () => {
    try {
      let draft: Partial<MetaConfig> | null = null;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) draft = JSON.parse(raw);
      } catch {
        draft = null;
      }

      const res = await fetch('/api/settings/meta');
      if (res.ok) {
        const data = await res.json();
        const next = data.config || {};
        setConfig({
          metaAppId: draft?.metaAppId || next.metaAppId || '',
          metaAppSecret:
            draft?.metaAppSecret && !draft.metaAppSecret.includes('••••')
              ? draft.metaAppSecret
              : next.metaAppSecret || '',
          metaConfigId: draft?.metaConfigId || next.metaConfigId || '',
          igAppId: draft?.igAppId || next.igAppId || '',
          igAppSecret:
            draft?.igAppSecret && !draft.igAppSecret.includes('••••')
              ? draft.igAppSecret
              : next.igAppSecret || '',
          webhookVerifyToken:
            (draft?.webhookVerifyToken && !draft.webhookVerifyToken.includes('••••')
              ? draft.webhookVerifyToken
              : next.webhookVerifyToken) || generateWebhookToken(),
        });
      } else {
        setConfig((prev) => ({
          metaAppId: draft?.metaAppId || prev.metaAppId,
          metaAppSecret: draft?.metaAppSecret || prev.metaAppSecret,
          metaConfigId: draft?.metaConfigId || prev.metaConfigId,
          igAppId: draft?.igAppId || prev.igAppId,
          igAppSecret: draft?.igAppSecret || prev.igAppSecret,
          webhookVerifyToken:
            draft?.webhookVerifyToken || prev.webhookVerifyToken || generateWebhookToken(),
        }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setConfig((prev) => ({
        ...prev,
        webhookVerifyToken: prev.webhookVerifyToken || generateWebhookToken(),
      }));
    } finally {
      setLoading(false);
      // Enable autosave after paint so hydration itself does not POST
      requestAnimationFrame(() => {
        hydratedRef.current = true;
      });
    }
  };

  const persistConfig = async (
    payload: MetaConfig,
    options?: { silent?: boolean }
  ) => {
    const silent = options?.silent ?? false;
    setSaving(true);

    try {
      const res = await fetch('/api/settings/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSaveState('saved');
        if (!silent) {
          toast.success('Configurações salvas', 'Agora conecte o Instagram.');
        }
        if (data.config) {
          skipAutosaveRef.current = true;
          setConfig((prev) => ({
            ...prev,
            metaAppId: data.config.metaAppId || prev.metaAppId,
            metaConfigId: data.config.metaConfigId || prev.metaConfigId,
            igAppId: data.config.igAppId || prev.igAppId,
            metaAppSecret: mergePreferPlain(prev.metaAppSecret, data.config.metaAppSecret),
            igAppSecret: mergePreferPlain(prev.igAppSecret, data.config.igAppSecret),
            webhookVerifyToken: mergePreferPlain(
              prev.webhookVerifyToken,
              data.config.webhookVerifyToken
            ),
          }));
        }
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(configRef.current));
        } catch {
          // ignore
        }
      } else {
        setSaveState('error');
        toast.error(
          data.error ||
            (res.status === 404
              ? 'API de configuração indisponível. Faça redeploy da versão mais recente.'
              : 'Erro ao salvar configurações')
        );
      }
    } catch {
      setSaveState('error');
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => persistConfig(configRef.current, { silent: false });

  const handleTest = async () => {
    if (!config.metaAppId || !config.metaAppSecret || config.metaAppSecret.includes('••••')) {
      toast.error('Preencha App ID e App Secret (sem máscara) para testar');
      return;
    }

    setTesting(true);

    try {
      const res = await fetch('/api/instagram/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: config.metaAppId, appSecret: config.metaAppSecret }),
      });

      const data = await res.json();
      if (data.valid) toast.success('Credenciais válidas!');
      else toast.error(data.error || 'Credenciais inválidas');
    } catch {
      toast.error('Erro ao testar credenciais');
    } finally {
      setTesting(false);
    }
  };

  const handleResubscribeWebhooks = async () => {
    setResubscribing(true);
    try {
      const res = await fetch('/api/instagram/resubscribe-webhooks', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Falha ao reativar webhooks');
        return;
      }
      toast.success('Webhooks reativados — comente de novo no post pra testar');
    } catch (error) {
      console.error('Error resubscribing webhooks:', error);
      toast.error('Erro ao reativar webhooks');
    } finally {
      setResubscribing(false);
    }
  };

  const openMeta = (field: MetaField) => {
    window.open(getMetaFieldUrl(field, appId), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <SettingsFormSkeleton />;
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>1. Credenciais do Meta App</CardTitle>
              <CardDescription className="mt-1">
                Copie App ID e App Secret do Meta for Developers e cole aqui.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => openMeta('appId')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConfigField
            label="Meta App ID"
            helpField="appId"
            appId={appId}
            value={config.metaAppId}
            onChange={(v) => setConfig({ ...config, metaAppId: v })}
            placeholder="123456789012345"
            onOpenMeta={() => openMeta('appId')}
          />
          <ConfigField
            label="Meta App Secret"
            helpField="appSecret"
            appId={appId}
            value={config.metaAppSecret}
            onChange={(v) => setConfig({ ...config, metaAppSecret: v })}
            placeholder="Cole o App Secret"
            secret
            onOpenMeta={() => openMeta('appSecret')}
          />
          <ConfigField
            label="Meta Config ID (opcional)"
            helpField="configId"
            appId={appId}
            value={config.metaConfigId}
            onChange={(v) => setConfig({ ...config, metaConfigId: v })}
            placeholder="Se usar Facebook Login for Business"
            onOpenMeta={() => openMeta('configId')}
          />
          <ConfigField
            label="Instagram App ID (opcional)"
            helpField="igAppId"
            appId={appId}
            value={config.igAppId}
            onChange={(v) => setConfig({ ...config, igAppId: v })}
            placeholder="Só se o produto Instagram tiver ID separado"
            onOpenMeta={() => openMeta('igAppId')}
          />
          <ConfigField
            label="Instagram App Secret (opcional)"
            helpField="igAppSecret"
            appId={appId}
            value={config.igAppSecret}
            onChange={(v) => setConfig({ ...config, igAppSecret: v })}
            placeholder="Opcional"
            secret
            onOpenMeta={() => openMeta('igAppSecret')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>2. Webhook (URL + Verify Token)</CardTitle>
              <CardDescription className="mt-1">
                No Meta → Webhooks → Instagram, cole a URL e o mesmo token gerado abaixo.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => openMeta('webhookUrl')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Webhooks
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
            <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
              <li>Copie a URL do webhook</li>
              <li>Gere/copie o Verify Token</li>
              <li>Cole os dois no Meta e ative: comments, mentions, messages</li>
              <li>Os campos salvam sozinhos ao colar/digitar</li>
            </ol>
          </div>

          <ConfigField
            label="URL do Webhook"
            helpField="webhookUrl"
            appId={appId}
            value={webhookUrl}
            readOnly
            hint="Callback URL HTTPS do produto Instagram no Meta."
          />

          <ConfigField
            label="Verify Token"
            helpField="webhookToken"
            appId={appId}
            value={config.webhookVerifyToken}
            onChange={(v) => setConfig({ ...config, webhookVerifyToken: v })}
            placeholder="Gere e cole o mesmo valor no Meta"
            secret
            onGenerate={() =>
              setConfig({
                ...config,
                webhookVerifyToken: generateWebhookToken(),
              })
            }
            onOpenMeta={() => openMeta('webhookToken')}
            hint="Tem que ser exatamente igual no Flowcomments e no campo Verify Token da Meta."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Assinatura da conta</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reativa comments/messages nas contas Instagram já conectadas.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleResubscribeWebhooks}
              disabled={resubscribing || !hasActiveIgAccount}
            >
              {resubscribing ? 'Reativando...' : 'Reativar webhooks'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>3. OAuth Callback URL</CardTitle>
              <CardDescription className="mt-1">
                Cole em Facebook Login for Business → Valid OAuth Redirect URIs.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => openMeta('oauthCallback')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir OAuth
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ConfigField
            label="Callback URL"
            helpField="oauthCallback"
            appId={appId}
            value={oauthCallbackUrl}
            readOnly
            hint="Sem essa URL, o botão Conectar Instagram falha no retorno da Meta."
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-white/95 p-3 shadow-float backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          {saveState === 'saving' || saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Salvando automaticamente...
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Salvo automaticamente
            </>
          ) : saveState === 'error' ? (
            'Falha ao salvar. Use o botão Salvar ou tente de novo.'
          ) : config.metaAppId.trim() ? (
            'Alterações salvam sozinhas ao colar/digitar'
          ) : (
            'Cole o Meta App ID para começar o autosave'
          )}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleSave} disabled={saving} className="sm:min-w-[160px]">
            {saving ? 'Salvando...' : 'Salvar agora'}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? 'Testando...' : 'Testar credenciais'}
          </Button>
        </div>
      </div>
    </div>
  );
}
