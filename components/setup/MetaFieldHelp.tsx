'use client';

import { HelpCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type MetaHelpField =
  | 'appId'
  | 'appSecret'
  | 'configId'
  | 'igAppId'
  | 'igAppSecret'
  | 'webhookToken'
  | 'webhookUrl'
  | 'oauthCallback';

interface MetaFieldHelpProps {
  field: MetaHelpField;
  appId?: string;
  onGenerate?: () => void;
  /** Só o ícone de ajuda (sem botão "Abrir na Meta" ao lado) */
  compact?: boolean;
}

const APPS_HOME = 'https://developers.facebook.com/apps/';

const helpContent: Record<
  MetaHelpField,
  {
    title: string;
    description: string;
    steps: string[];
    tips: string[];
  }
> = {
  appId: {
    title: 'Meta App ID',
    description: 'Identificador do aplicativo no Meta for Developers.',
    steps: [
      'Abra o painel de apps do Meta for Developers.',
      'Selecione seu app (tipo Business) ou crie um novo.',
      'Vá em Configurações → Básico.',
      'Copie o "ID do aplicativo" no topo da página.',
    ],
    tips: [
      'O app deve ser do tipo Business (não Consumer).',
      'Adicione os produtos Instagram, Facebook Login for Business e Webhooks.',
      'O App ID costuma ter cerca de 15 dígitos.',
    ],
  },
  appSecret: {
    title: 'Meta App Secret',
    description: 'Chave secreta do aplicativo. Nunca compartilhe publicamente.',
    steps: [
      'No mesmo app, vá em Configurações → Básico.',
      'Localize "Chave secreta do aplicativo".',
      'Clique em Mostrar e confirme sua senha do Facebook.',
      'Copie a chave e cole aqui.',
    ],
    tips: [
      'Se vazou, regenere imediatamente e atualize em todos os lugares.',
      'Não commite esse valor em repositórios públicos.',
    ],
  },
  configId: {
    title: 'Meta Config ID',
    description: 'ID da configuração do Facebook Login for Business.',
    steps: [
      'No app, abra Facebook Login for Business.',
      'Vá em Configurations / Configurações.',
      'Crie uma configuração (User access token) se ainda não existir.',
      'Inclua na Login Configuration: instagram_basic, instagram_manage_comments, instagram_manage_messages, pages_show_list, pages_read_engagement, business_management. Com config_id, as permissões vêm só daqui — não peça scopes extras na URL.',
      'Copie o ID da configuração.',
    ],
    tips: [
      'A conta Instagram precisa ser Profissional (Business/Creator).',
      'O Instagram deve estar vinculado a uma Página do Facebook.',
      'Selecione Página + Instagram explicitamente no diálogo de login.',
    ],
  },
  igAppId: {
    title: 'Instagram App ID',
    description: 'ID do Instagram no produto Instagram do seu Meta App (opcional).',
    steps: [
      'No app, abra o produto Instagram.',
      'Vá em API setup / Configuração da API.',
      'Copie o Instagram App ID exibido na página.',
      'Use apenas se o fluxo exigir o ID específico do Instagram (além do Meta App ID).',
    ],
    tips: [
      'Na maioria dos fluxos com Facebook Login for Business, o Meta App ID basta.',
      'Preencha se estiver usando Instagram API with Instagram Login.',
    ],
  },
  igAppSecret: {
    title: 'Instagram App Secret',
    description: 'Secret do Instagram Business App vinculado (opcional).',
    steps: [
      'No app, abra o produto Instagram.',
      'Vá em API setup / Configuração da API.',
      'Copie o Instagram App Secret (Mostrar / revelar).',
      'Cole aqui apenas se o fluxo OAuth do Instagram exigir.',
    ],
    tips: [
      'Trate como segredo. Nunca exponha em frontend ou repos públicos.',
      'Se não usar Instagram Login direto, pode deixar em branco.',
    ],
  },
  webhookToken: {
    title: 'Webhook Verify Token',
    description: 'Token compartilhado entre o Flowcomments e a inscrição de webhook no Meta.',
    steps: [
      'Crie um token aleatório seguro (mínimo 20 caracteres) ou use Gerar.',
      'Salve o mesmo valor aqui no Flowcomments.',
      'No Meta, vá em Webhooks → Instagram.',
      'Em Edit Subscription, cole a Callback URL e este mesmo Verify Token.',
      'Inscreva nos campos: comments, messages, mentions.',
    ],
    tips: [
      'O token no Flowcomments e no Meta deve ser idêntico.',
      'Trocar o token exige atualizar os dois lados.',
    ],
  },
  webhookUrl: {
    title: 'Webhook URL',
    description: 'Callback HTTPS que o Meta chama quando chegam eventos.',
    steps: [
      'Copie a URL do webhook do Flowcomments.',
      'No Meta, vá em Webhooks → produto Instagram.',
      'Cole a URL em Callback URL.',
      'Cole o mesmo Verify Token configurado no Flowcomments.',
      'Clique em Verify and Save e inscreva comments, messages e mentions.',
    ],
    tips: [
      'Webhooks exigem HTTPS (localhost sem túnel não funciona).',
      'Railway já fornece HTTPS automaticamente.',
    ],
  },
  oauthCallback: {
    title: 'OAuth Callback URL',
    description: 'Redirect URI válida para o fluxo de autenticação Instagram.',
    steps: [
      'Copie a Callback URL do Flowcomments.',
      'No Meta, abra Facebook Login for Business → Settings.',
      'Em Valid OAuth Redirect URIs, cole a URL.',
      'Salve as alterações antes de testar a conexão.',
    ],
    tips: [
      'A URL precisa bater exatamente (incluindo https e path).',
      'Depois de salvar, teste o fluxo Conectar Instagram.',
    ],
  },
};

function resolveMetaUrl(field: MetaHelpField, appId?: string): string {
  const id = appId?.trim();

  if (!id) {
    return APPS_HOME;
  }

  switch (field) {
    case 'appId':
    case 'appSecret':
      return `https://developers.facebook.com/apps/${id}/settings/basic/`;
    case 'configId':
      return `https://developers.facebook.com/apps/${id}/fb-login/configurations/`;
    case 'igAppId':
    case 'igAppSecret':
      return `https://developers.facebook.com/apps/${id}/instagram-business/API-Setup/`;
    case 'webhookToken':
    case 'webhookUrl':
      return `https://developers.facebook.com/apps/${id}/webhooks/`;
    case 'oauthCallback':
      return `https://developers.facebook.com/apps/${id}/fb-login/settings/`;
    default:
      return APPS_HOME;
  }
}

export function MetaFieldHelp({ field, appId, onGenerate, compact = false }: MetaFieldHelpProps) {
  const content = helpContent[field];
  const metaUrl = resolveMetaUrl(field, appId);

  return (
    <div className="flex items-center gap-1.5">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
            title={content.title}
            aria-label={`Ajuda: ${content.title}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Como configurar</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-700">
                {content.steps.map((step) => (
                  <li key={step} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
              <h4 className="text-sm font-medium text-amber-900 mb-2">Dicas</h4>
              <ul className="space-y-1.5 text-sm text-amber-900/90">
                {content.tips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => window.open(metaUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir página correta na Meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!compact && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.open(metaUrl, '_blank', 'noopener,noreferrer')}
          className="h-7 text-xs px-2"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Abrir na Meta
        </Button>
      )}

      {field === 'webhookToken' && onGenerate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGenerate}
          className="h-7 text-xs px-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Gerar
        </Button>
      )}
    </div>
  );
}

export function getMetaFieldUrl(field: MetaHelpField, appId?: string) {
  return resolveMetaUrl(field, appId);
}
