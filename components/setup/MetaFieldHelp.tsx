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

interface MetaFieldHelpProps {
  field: 'appId' | 'appSecret' | 'configId' | 'webhookToken' | 'webhookUrl';
  appId?: string;
  onGenerate?: () => void;
}

const helpContent = {
  appId: {
    title: 'App ID - Identificador do Aplicativo',
    steps: [
      '1. Acesse https://developers.facebook.com/apps/',
      '2. Selecione seu aplicativo (ou crie um novo do tipo "Business")',
      '3. Na barra lateral, clique em "Configurações" → "Básico"',
      '4. Copie o "ID do aplicativo" no topo da página',
    ],
    tips: [
      '⚠️ O app DEVE ser do tipo "Business" (não Consumer)',
      '✓ Adicione os produtos: Instagram + Facebook Login for Business + Webhooks',
      '✓ O App ID tem 15 dígitos',
    ],
    metaUrl: 'https://developers.facebook.com/apps/',
  },
  appSecret: {
    title: 'App Secret - Chave Secreta',
    steps: [
      '1. Na mesma página "Configurações" → "Básico"',
      '2. Localize o campo "Chave secreta do aplicativo"',
      '3. Clique em "Mostrar" e digite sua senha do Facebook',
      '4. Copie a chave (NUNCA compartilhe publicamente)',
    ],
    tips: [
      '🔒 Mantenha em segredo! Se vazou, regenere imediatamente',
      '⚠️ Se regenerar, atualize em todos os lugares que usa',
    ],
    metaUrl: '',
  },
  configId: {
    title: 'Config ID - ID da Configuração do Facebook Login',
    steps: [
      '1. No seu app, vá em "Facebook Login for Business"',
      '2. Clique em "Configurações" ou "Configurations"',
      '3. Crie uma nova configuração se não existir',
      '4. Escolha "User access token" (token de acesso do usuário)',
      '5. Adicione as permissões necessárias:',
      '   • instagram_basic',
      '   • instagram_manage_comments',
      '   • instagram_manage_messages',
      '   • pages_show_list',
      '   • pages_read_engagement',
      '   • pages_manage_metadata',
      '   • business_management',
      '6. Copie o ID da configuração',
    ],
    tips: [
      '⚠️ ARMADILHA: app e Instagram no mesmo portfolio retornam token SEM conta IG',
      '✓ Solução: selecione a Página + IG explicitamente no diálogo de login',
      '✓ A conta Instagram deve ser Profissional (Business/Creator)',
      '✓ Instagram vinculado a uma Página do Facebook',
    ],
    metaUrl: '',
  },
  webhookToken: {
    title: 'Webhook Verify Token - Token de Verificação',
    steps: [
      '1. Crie um token aleatório seguro (mínimo 20 caracteres)',
      '2. Copie e guarde bem (vai precisar no passo seguinte)',
      '3. No app Meta, vá em "Webhooks" → "Instagram"',
      '4. Clique em "Edit Subscription" ou "Subscribe"',
      '5. Cole a URL do webhook e ESTE MESMO TOKEN no campo "Verify Token"',
      '6. Selecione os campos: comments, messages, mentions',
    ],
    tips: [
      '✓ Use o botão "Gerar" para criar um token seguro',
      '⚠️ O token aqui e no Meta devem ser IDÊNTICOS',
    ],
    metaUrl: '',
  },
  webhookUrl: {
    title: 'Webhook URL - URL de Retorno de Chamada',
    steps: [
      '1. Copie esta URL (já está pronta)',
      '2. No app Meta, vá em "Webhooks" → produto "Instagram"',
      '3. Cole a URL no campo "Callback URL"',
      '4. Cole o Verify Token (mesmo que digitou acima)',
      '5. Clique em "Verify and Save"',
      '6. Depois, clique em "Manage" e inscreva nos campos:',
      '   • comments',
      '   • messages', 
      '   • mentions',
    ],
    tips: [
      '⚠️ O webhook só funciona com HTTPS (não http://localhost)',
      '✓ Railway fornece HTTPS automaticamente',
    ],
    metaUrl: '',
  },
};

export function MetaFieldHelp({ field, appId, onGenerate }: MetaFieldHelpProps) {
  const content = helpContent[field];
  
  const getMetaUrl = () => {
    if (field === 'appId' && appId) {
      return `https://developers.facebook.com/apps/${appId}/settings/basic/`;
    }
    if (field === 'appId') {
      return 'https://developers.facebook.com/apps/';
    }
    if (field === 'appSecret' && appId) {
      return `https://developers.facebook.com/apps/${appId}/settings/basic/`;
    }
    if (field === 'configId' && appId) {
      return `https://developers.facebook.com/apps/${appId}/fb-login/`;
    }
    if (field === 'webhookToken' && appId) {
      return `https://developers.facebook.com/apps/${appId}/webhooks/`;
    }
    if (field === 'webhookUrl' && appId) {
      return `https://developers.facebook.com/apps/${appId}/webhooks/`;
    }
    return content.metaUrl;
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-primary-600"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">Ajuda</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>
              Passo a passo detalhado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Como configurar:</h4>
              <ol className="space-y-2 text-sm">
                {content.steps.map((step, idx) => (
                  <li key={idx} className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Dicas importantes:</h4>
              <ul className="space-y-1 text-sm">
                {content.tips.map((tip, idx) => (
                  <li key={idx} className="text-yellow-800">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {getMetaUrl() && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.open(getMetaUrl(), '_blank')}
          className="text-xs"
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
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Gerar
        </Button>
      )}
    </div>
  );
}
