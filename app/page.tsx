import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db/client';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { ScrollAtmosphere, ScrollReveal } from '@/components/landing/ScrollEffects';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Check, Github, Server, Sparkles, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function checkSetupStatus() {
  try {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });
    return { needsSetup: adminCount === 0 };
  } catch {
    return { needsSetup: true };
  }
}

export default async function HomePage() {
  const { needsSetup } = await checkSetupStatus();

  if (needsSetup) {
    redirect('/setup');
  }

  const session = await readSession();
  if (session.isLoggedIn) {
    redirect('/dashboard');
  }

  return (
    <ScrollAtmosphere>
      <div className="min-h-screen bg-[#F7F7F7] text-foreground">
        <div className="relative z-10 bg-[#F7F7F7]">
          <nav className="sticky top-0 z-30 border-b border-border/60 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
              <BrandLogo className="text-[24px] leading-none" />
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/licenca"
                  className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                >
                  Licença
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="rounded-full px-5">
                    Entrar
                  </Button>
                </Link>
              </div>
            </div>
          </nav>

          <main>
            <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-20">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 fc-canvas-dot opacity-70"
                style={{
                  maskImage:
                    'radial-gradient(ellipse 75% 65% at 50% 35%, #000 20%, transparent 75%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse 75% 65% at 50% 35%, #000 20%, transparent 75%)',
                }}
              />
              <div className="relative mx-auto max-w-6xl">
                <ScrollReveal className="mx-auto max-w-3xl text-center" y={18}>
                  <BrandLogo
                    as="p"
                    className="mb-5 justify-center text-4xl sm:text-5xl"
                    speedMs={38}
                  />
                  <h1 className="text-balance text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
                    <span className="text-zinc-400">Comentários viram conversa.</span>{' '}
                    Automação vira resultado.
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg sm:leading-[1.7]">
                    Responda comentários, envie DMs e organize leads no Instagram. Rode self-hosted,
                    minimalista e sob o seu controle.
                  </p>
                  <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full rounded-full px-8 shadow-float sm:w-auto">
                        Começar agora
                      </Button>
                    </Link>
                    <a
                      href="https://github.com/NathanConde-dev/flowcomments"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto"
                    >
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full rounded-full bg-white/80 px-8 sm:w-auto"
                      >
                        <Github className="h-4 w-4" />
                        Ver no GitHub
                      </Button>
                    </a>
                  </div>
                </ScrollReveal>

                <ScrollReveal className="mt-14 sm:mt-16" delayMs={120} y={36}>
                  <ProductPreview />
                </ScrollReveal>
              </div>
            </section>

            <section className="px-4 py-16 sm:px-6 sm:py-20">
              <div className="mx-auto max-w-6xl">
                <ScrollReveal className="mx-auto mb-10 max-w-2xl text-center">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Feito para converter atenção em ação
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    Menos ruído visual. Mais fluxo: comentário, resposta, DM e contato no mesmo ritmo.
                  </p>
                </ScrollReveal>

                <div className="grid gap-5 lg:grid-cols-3">
                  <ScrollReveal delayMs={40}>
                    <article className="fc-soft-panel group h-full rounded-3xl border border-white/80 p-2 shadow-float fc-hover-lift">
                      <div className="flex h-40 items-end justify-center overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#fff_0%,#f4f4f5_100%)] px-6 pb-6">
                        <div className="w-full rounded-2xl border border-border/60 bg-white p-4 shadow-soft">
                          <div className="mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-foreground" />
                            <span className="text-xs font-semibold">palavra-chave</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {['preço', 'quero', 'link'].map((k) => (
                              <span
                                key={k}
                                className="rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold text-foreground"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="px-5 pb-6 pt-4">
                        <h3 className="text-lg font-bold tracking-tight">Automações por palavra-chave</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          Dispare respostas e DMs no momento em que o comentário aparece.
                        </p>
                      </div>
                    </article>
                  </ScrollReveal>

                  <ScrollReveal delayMs={100}>
                    <article className="fc-soft-panel group h-full rounded-3xl border border-white/80 p-2 shadow-float fc-hover-lift">
                      <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#fff_0%,#f4f4f5_100%)] px-6">
                        <div className="flex -space-x-3">
                          {['A', 'B', 'C'].map((letter, i) => (
                            <div
                              key={letter}
                              className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-zinc-900 text-sm font-bold text-white shadow-float"
                              style={{ zIndex: 3 - i }}
                            >
                              {letter}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="px-5 pb-6 pt-4">
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide">
                            Contatos
                          </span>
                        </div>
                        <h3 className="text-lg font-bold tracking-tight">Inbox e tags em um lugar</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          Organize quem comentou, quem respondeu e quem está pronto para comprar.
                        </p>
                      </div>
                    </article>
                  </ScrollReveal>

                  <ScrollReveal delayMs={160}>
                    <article className="fc-soft-panel group h-full rounded-3xl border border-white/80 p-2 shadow-float fc-hover-lift">
                      <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#fff_0%,#f4f4f5_100%)] px-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-float">
                          <Server className="h-7 w-7" />
                        </div>
                      </div>
                      <div className="px-5 pb-6 pt-4">
                        <h3 className="text-lg font-bold tracking-tight">Self-hosted de verdade</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          Seus dados ficam com você. Deploy com Docker, Railway ou qualquer VPS.
                        </p>
                      </div>
                    </article>
                  </ScrollReveal>
                </div>
              </div>
            </section>

            <section className="px-4 pb-10 sm:px-6">
              <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
                <ScrollReveal delayMs={40}>
                  <div className="fc-soft-panel h-full rounded-3xl border border-white/80 p-7 shadow-float sm:p-8">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-soft">
                      <Server className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                      <h3 className="text-2xl font-bold tracking-tight">Self-host</h3>
                      <p className="pb-0.5 text-sm font-medium text-muted-foreground">R$ 0 / mês</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Código aberto para rodar na sua infra, com licença Sustainable Use.
                    </p>
                    <Link href="/login" className="mt-6 block">
                      <Button className="w-full rounded-full" size="lg">
                        Começar grátis
                      </Button>
                    </Link>
                    <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                        Automações de comentário e DM
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                        Controle total dos dados
                      </li>
                    </ul>
                  </div>
                </ScrollReveal>

                <ScrollReveal delayMs={120}>
                  <div className="fc-soft-panel h-full rounded-3xl border border-white/80 p-7 shadow-float sm:p-8">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-soft">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                      <h3 className="text-2xl font-bold tracking-tight">Cloud</h3>
                      <p className="pb-0.5 text-sm font-medium text-muted-foreground">Sob consulta</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Prefere não hospedar? Fale sobre a versão gerenciada do Flowcomments.
                    </p>
                    <a
                      href="mailto:contato@nathanconde.com?subject=Interesse%20em%20Flowcomments%20Cloud"
                      className="mt-6 block"
                    >
                      <Button variant="outline" className="w-full rounded-full bg-white/80" size="lg">
                        Agendar conversa
                      </Button>
                    </a>
                    <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                        Setup assistido
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                        Sem cuidar de servidor
                      </li>
                    </ul>
                  </div>
                </ScrollReveal>
              </div>
            </section>
          </main>
        </div>

        <SiteFooter />
      </div>
    </ScrollAtmosphere>
  );
}
