import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { StatusBadge } from '@/components/ui/status-badge';
import { Check, Github, Scale, X } from 'lucide-react';

const allowed = [
  'Usar gratuitamente para suas próprias contas pessoais ou comerciais',
  'Hospedar em seu próprio servidor (VPS, Railway, Docker, etc.)',
  'Estudar e modificar o código-fonte conforme suas necessidades',
  'Usar em sua empresa para automatizar as contas Instagram da empresa',
  'Agências: gerenciar contas de clientes como parte do seu serviço (desde que não cobre pelo acesso ao software em si)',
  'Compartilhar modificações e melhorias com a comunidade',
];

const forbidden = [
  'Vender ou revender o Flowcomments como produto ou serviço',
  'Oferecer o Flowcomments como SaaS/serviço hospedado para terceiros',
  'White-label (remover nossa marca e vender como se fosse seu)',
  'Cobrar de outras pessoas especificamente pelo acesso ao software',
  'Remover ou modificar o logo “Flowcomments” e o texto “Powered by Flowcomments” da interface',
  'Criar um produto concorrente usando nosso código',
];

const faqs = [
  {
    q: 'Posso usar o Flowcomments na minha empresa?',
    a: (
      <>
        <strong>Sim.</strong> Você pode instalar e usar gratuitamente para automatizar as contas do
        Instagram da sua própria empresa, sem limites. Isso é considerado uso interno.
      </>
    ),
  },
  {
    q: 'Sou agência/freelancer. Posso usar para gerenciar contas de clientes?',
    a: (
      <>
        <strong>Sim, com uma condição:</strong> você pode usar o Flowcomments para gerenciar as contas
        Instagram dos seus clientes como parte do seu serviço de gestão de redes sociais, desde que
        você hospede na sua infraestrutura, não cobre pelo acesso ao software em si e cobre apenas
        pelo serviço de gestão/estratégia. O Flowcomments é uma ferramenta interna e não pode ser
        revendido como produto separado.
      </>
    ),
  },
  {
    q: 'Posso vender acesso ao Flowcomments?',
    a: (
      <>
        <strong>Não.</strong> Oferecer como SaaS, serviço hospedado ou produto vendável requer
        licença comercial. Entre em contato para discutir opções.
      </>
    ),
  },
  {
    q: 'Posso remover a logo e o “Powered by Flowcomments”?',
    a: (
      <>
        <strong>Não sem licença comercial.</strong> A atribuição (logo, nome e link) deve permanecer
        visível. Isso ajuda a manter o projeto gratuito para uso próprio.
      </>
    ),
  },
  {
    q: 'Posso modificar o código?',
    a: (
      <>
        <strong>Sim.</strong> Você pode estudar, modificar e adaptar o código, desde que respeite as
        demais cláusulas (não revenda, mantenha atribuição, etc.).
      </>
    ),
  },
  {
    q: 'E se eu não quiser hospedar eu mesmo?',
    a: (
      <>
        Estamos desenvolvendo uma versão hospedada oficial na nuvem, mais acessível e sem cuidar de
        servidor. {' '}
        <a
          href="mailto:contato@nathanconde.com?subject=Interesse%20em%20Flowcomments%20Cloud"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Fale conosco
        </a>{' '}
        para saber mais.
      </>
    ),
  },
  {
    q: 'Tenho uma necessidade comercial diferente. Como proceder?',
    a: (
      <>
        Para white-label, SaaS, remoção de atribuição ou outros usos comerciais, escreva para{' '}
        <a
          href="mailto:contato@nathanconde.com"
          className="font-medium text-foreground underline underline-offset-2"
        >
          contato@nathanconde.com
        </a>
        .
      </>
    ),
  },
];

export default function LicencaPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-foreground">
      <nav className="sticky top-0 z-30 border-b border-border/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo href="/" className="text-[24px] leading-none" />
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm font-medium text-foreground sm:inline">Licença</span>
            <Link href="/login">
              <Button variant="outline" className="rounded-full px-5">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 bg-[#F7F7F7]">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center fc-animate-in">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl sm:leading-[1.08]">
            <span className="text-zinc-400">Licença e uso.</span> Sustentável e justo.
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Código disponível · Uso sustentável · Comercialmente justo
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Source-available / fair-code, não é licença OSI open source.
          </p>
        </div>

        <div className="mt-10 fc-soft-panel rounded-3xl border border-white/80 p-6 shadow-float sm:p-8 fc-animate-in">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-soft">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Nossa filosofia</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                O Flowcomments foi criado para ajudar todos a automatizarem o Instagram sem custos
                proibitivos. Você pode usar, estudar, modificar e hospedar gratuitamente para o seu
                próprio uso. Pedimos apenas que respeite a sustentabilidade: não revenda o software
                como serviço e mantenha nossa atribuição visível.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 fc-stagger">
          <section className="fc-soft-panel rounded-3xl border border-white/80 p-6 shadow-float sm:p-7">
            <div className="mb-5 flex items-center gap-2">
              <StatusBadge tone="success">Permitido</StatusBadge>
            </div>
            <h2 className="text-xl font-bold tracking-tight">O que você pode fazer</h2>
            <ul className="mt-4 space-y-3">
              {allowed.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="fc-soft-panel rounded-3xl border border-white/80 p-6 shadow-float sm:p-7">
            <div className="mb-5 flex items-center gap-2">
              <StatusBadge tone="failed">Não permitido</StatusBadge>
            </div>
            <h2 className="text-xl font-bold tracking-tight">O que você não pode fazer</h2>
            <ul className="mt-4 space-y-3">
              {forbidden.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-6 fc-soft-panel rounded-3xl border border-white/80 p-6 shadow-float sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight">Perguntas frequentes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Respostas diretas sobre uso interno, agências, atribuição e cloud.
          </p>
          <div className="mt-8 space-y-6">
            {faqs.map((item) => (
              <div key={item.q} className="border-t border-border/70 pt-6 first:border-t-0 first:pt-0">
                <h3 className="font-semibold tracking-tight text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 fc-soft-panel rounded-3xl border border-white/80 p-6 shadow-float sm:p-7">
          <StatusBadge tone="pending">Resumo legal</StatusBadge>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Esta página é um resumo em linguagem simples. Para os termos completos, consulte o arquivo{' '}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">LICENSE</code> no
            repositório; ele prevalece em caso de conflito. A licença é a{' '}
            <strong className="text-foreground">Flowcomments Sustainable Use License</strong> © 2026
            Nathan Condé.
          </p>
        </div>

        <section className="fc-grain-cta relative mt-10 overflow-hidden rounded-3xl px-6 py-12 text-center shadow-float sm:px-10">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pronto para começar?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
              O Flowcomments é gratuito para self-hosting. Clone, configure e rode na sua infra.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/NathanConde-dev/flowcomments"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="rounded-full bg-white px-8 text-foreground hover:bg-zinc-100">
                  <Github className="h-4 w-4" />
                  Ver no GitHub
                </Button>
              </a>
              <a href="mailto:contato@nathanconde.com?subject=Interesse%20em%20Flowcomments%20Cloud">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/20 bg-white/10 px-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md hover:border-white/30 hover:bg-white/15 hover:text-white"
                >
                  Lista de espera (Cloud)
                </Button>
              </a>
            </div>
          </div>
        </section>

      </main>
      </div>

      <SiteFooter description="Sustainable Use License · Código disponível para uso próprio, com atribuição." />
    </div>
  );
}
