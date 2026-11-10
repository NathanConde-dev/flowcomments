import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Info } from 'lucide-react';

export default function LicencaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <nav className="border-b border-primary-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary-600"></div>
            <span className="text-xl font-bold text-gray-900">Flowcomments</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/licenca" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Licença
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Licença e Uso do Flowcomments
          </h1>
          <p className="text-lg text-gray-700">
            Código disponível • Uso sustentável • Comercialmente justo
          </p>
          <p className="mt-2 text-sm text-gray-600">
            (Source-available / fair-code, não é licença OSI open source)
          </p>
        </div>

        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-2">
                  Nossa Filosofia
                </p>
                <p className="text-sm text-blue-800">
                  O Flowcomments foi criado para ajudar todos a automatizarem suas contas do Instagram,
                  sem custos proibitivos. Você pode usar, estudar, modificar e hospedar gratuitamente
                  para seu próprio uso. Pedimos apenas que respeite nossa sustentabilidade: não revenda
                  o software como serviço e mantenha nossa atribuição visível.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                O Que Você PODE Fazer ✓
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Usar gratuitamente para suas próprias contas pessoais ou comerciais</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Hospedar em seu próprio servidor (VPS, Railway, Docker, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Estudar e modificar o código-fonte conforme suas necessidades</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Usar em sua empresa para automatizar as contas Instagram da empresa</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Agências: gerenciar contas de clientes como parte do seu serviço (desde que não cobre pelo acesso ao software em si)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Compartilhar modificações e melhorias com a comunidade</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <X className="h-5 w-5" />
                O Que Você NÃO PODE Fazer ✗
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Vender ou revender o Flowcomments como produto ou serviço</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Oferecer o Flowcomments como SaaS/serviço hospedado para terceiros</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>White-label (remover nossa marca e vender como se fosse seu)</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Cobrar de outras pessoas especificamente pelo acesso ao software</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Remover ou modificar o logo &ldquo;Flowcomments&rdquo; e o texto &ldquo;Powered by Flowcomments&rdquo; da interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Criar um produto concorrente usando nosso código</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Perguntas Frequentes (FAQ)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                📱 Posso usar o Flowcomments na minha empresa?
              </h3>
              <p className="text-sm text-gray-700">
                <strong>Sim!</strong> Você pode instalar e usar gratuitamente para automatizar as contas
                do Instagram da sua própria empresa, sem limites. Isso é considerado uso interno.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                🏢 Sou agência/freelancer. Posso usar para gerenciar contas de clientes?
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Sim, com uma condição:</strong> Você pode usar o Flowcomments para gerenciar as
                contas Instagram dos seus clientes como parte do seu serviço de gestão de redes sociais,
                desde que você:
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 ml-4">
                <li>Hospede em sua própria infraestrutura</li>
                <li>NÃO cobre dos clientes especificamente pelo acesso ao software Flowcomments</li>
                <li>Cobre apenas pelo seu serviço de gestão/criação de conteúdo/estratégia</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2 italic">
                O Flowcomments é uma ferramenta interna sua. Você não pode revendê-lo como um produto
                separado ou oferecer &ldquo;acesso ao Flowcomments&rdquo; como serviço.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                💰 Posso vender acesso ao Flowcomments?
              </h3>
              <p className="text-sm text-gray-700">
                <strong>Não.</strong> Oferecer o Flowcomments como SaaS, serviço hospedado ou produto
                vendável requer uma licença comercial. Entre em contato conosco para discutir opções.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                🎨 Posso remover a logo e o &ldquo;Powered by Flowcomments&rdquo;?
              </h3>
              <p className="text-sm text-gray-700">
                <strong>Não sem licença comercial.</strong> Nossa atribuição (logo, nome e link no rodapé
                e configurações) deve permanecer visível. Isso nos ajuda a crescer e continuar mantendo
                o projeto gratuito para uso próprio. Para remover, adquira uma licença comercial.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                🔧 Posso modificar o código?
              </h3>
              <p className="text-sm text-gray-700">
                <strong>Sim!</strong> Você pode estudar, modificar e adaptar o código para suas necessidades,
                desde que respeite as outras cláusulas da licença (não revenda, mantenha atribuição, etc.).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ☁️ E se eu não quiser hospedar eu mesmo?
              </h3>
              <p className="text-sm text-gray-700">
                Estamos desenvolvendo uma versão hospedada oficial na nuvem, <strong>mais barata que o
                ManyChat</strong>, sem se preocupar com servidores, atualizações ou configurações.
                <br />
                <a href="mailto:contato@nathanconde.com?subject=Interesse%20em%20Flowcomments%20Cloud" className="text-primary-600 hover:underline font-medium">
                  → Entre em contato
                </a> para saber mais
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                📧 Tenho uma necessidade comercial diferente. Como proceder?
              </h3>
              <p className="text-sm text-gray-700">
                Para casos como white-label, oferecê-lo como SaaS, remover atribuição ou outros usos
                comerciais, entre em contato para licenciamento comercial:<br />
                <strong>E-mail:</strong>{' '}
                <a href="mailto:contato@nathanconde.com" className="text-primary-600 hover:underline">
                  contato@nathanconde.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">
              ⚖️ Resumo Legal
            </h3>
            <p className="text-sm text-yellow-800">
              Esta página é um resumo em linguagem simples. Para termos legais completos, consulte o
              arquivo <code className="bg-yellow-100 px-1 py-0.5 rounded">LICENSE</code> no repositório,
              que prevalece em caso de conflito. A licença é a{' '}
              <strong>Flowcomments Sustainable Use License</strong> © 2026 Nathan Condé.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pronto para Começar?
          </h2>
          <p className="text-gray-700 mb-6">
            O Flowcomments é gratuito para self-hosting. Comece agora!
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/NathanConde-dev/flowcomments"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg">
                Ver no GitHub
              </Button>
            </a>
            <a href="#" className="inline-block">
              <Button size="lg" variant="outline">
                Lista de Espera (Cloud)
              </Button>
            </a>
          </div>
        </div>

        <footer className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>
            Flowcomments © 2026 Nathan Condé • Licença: Sustainable Use License
          </p>
          <div className="mt-2">
            <Link href="/licenca" className="text-primary-600 hover:underline">
              Licença
            </Link>
            {' • '}
            <a
              href="https://github.com/NathanConde-dev/flowcomments"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              GitHub
            </a>
            {' • '}
            <a
              href="mailto:contato@nathanconde.com"
              className="text-primary-600 hover:underline"
            >
              Contato
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
