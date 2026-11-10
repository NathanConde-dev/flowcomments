'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface IGAccount {
  id: string;
  igUsername: string;
}

export default function NewAutomationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<IGAccount[]>([]);
  const [error, setError] = useState('');
  
  const [automation, setAutomation] = useState({
    name: '',
    igAccountId: '',
    keywords: [''],
    matchType: 'contains' as 'exact' | 'contains' | 'starts_with' | 'ends_with',
    caseSensitive: false,
    replyComment: '',
    sendDm: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/instagram/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const addKeyword = () => {
    setAutomation({
      ...automation,
      keywords: [...automation.keywords, ''],
    });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...automation.keywords];
    newKeywords[index] = value;
    setAutomation({ ...automation, keywords: newKeywords });
  };

  const removeKeyword = (index: number) => {
    const newKeywords = automation.keywords.filter((_, i) => i !== index);
    setAutomation({ ...automation, keywords: newKeywords });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validKeywords = automation.keywords.filter(k => k.trim() !== '');
      
      if (validKeywords.length === 0) {
        throw new Error('Adicione pelo menos uma palavra-chave');
      }

      const actions = [];
      if (automation.replyComment.trim()) {
        actions.push({ type: 'reply_comment', text: automation.replyComment });
      }
      if (automation.sendDm.trim()) {
        actions.push({ type: 'send_dm', text: automation.sendDm, delay: 1 });
      }

      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: automation.name,
          igAccountId: automation.igAccountId,
          triggerConfig: {
            trigger: {
              keywords: validKeywords,
              matchType: automation.matchType,
              caseSensitive: automation.caseSensitive,
            },
          },
          actionsConfig: { actions },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar automação');
      }

      router.push('/automations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/automations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nova Automação</h1>
        <p className="text-gray-600">
          Configure uma automação para responder comentários
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome da Automação</label>
              <Input
                value={automation.name}
                onChange={(e) => setAutomation({ ...automation, name: e.target.value })}
                placeholder="Ex: Resposta para 'preço'"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Conta do Instagram</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={automation.igAccountId}
                onChange={(e) => setAutomation({ ...automation, igAccountId: e.target.value })}
                required
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    @{account.igUsername}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gatilho: Comentário com Palavras-chave</CardTitle>
            <CardDescription>
              A automação será executada quando um comentário contiver uma das palavras-chave
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Palavras-chave</label>
              <div className="space-y-2">
                {automation.keywords.map((keyword, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                      placeholder="Ex: preço, valor, quanto custa"
                    />
                    {automation.keywords.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeKeyword(index)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyword}
                className="mt-2"
              >
                + Adicionar Palavra-chave
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Correspondência</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={automation.matchType}
                onChange={(e) => setAutomation({ ...automation, matchType: e.target.value as any })}
              >
                <option value="contains">Contém</option>
                <option value="exact">Exato</option>
                <option value="starts_with">Começa com</option>
                <option value="ends_with">Termina com</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="caseSensitive"
                checked={automation.caseSensitive}
                onChange={(e) => setAutomation({ ...automation, caseSensitive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="caseSensitive" className="text-sm">
                Diferenciar maiúsculas de minúsculas
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>
              O que fazer quando a automação for acionada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Responder Comentário (opcional)
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={automation.replyComment}
                onChange={(e) => setAutomation({ ...automation, replyComment: e.target.value })}
                placeholder="Ex: Olá! Enviei os detalhes no seu direct 😊"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Enviar DM (opcional)
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={automation.sendDm}
                onChange={(e) => setAutomation({ ...automation, sendDm: e.target.value })}
                placeholder="Ex: Oi! O preço do produto é R$ 99,90. Para comprar, acesse: [link]"
              />
              <p className="mt-1 text-xs text-gray-500">
                A mensagem será enviada 1 segundo após responder o comentário
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/automations">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Automação'}
          </Button>
        </div>
      </form>
    </div>
  );
}
