import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db/client';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

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

  const session = await getSession();
  if (session.isLoggedIn) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <nav className="border-b border-primary-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary-600"></div>
            <span className="text-xl font-bold text-gray-900">Flowcomments</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/licenca" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Licença
            </Link>
            <Link href="/login">
              <Button variant="outline">Entrar</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            Automatize Comentários e DMs do Instagram
          </h1>
          <p className="mb-8 text-xl text-gray-700">
            Responda automaticamente comentários, envie mensagens diretas e 
            gerencie contatos sem esforço. Self-hosted e código aberto.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Começar Agora</Button>
            </Link>
            <a 
              href="https://github.com/NathanConde-dev/flowcomments" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline">
                Ver no GitHub
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Automações Inteligentes</h3>
            <p className="text-gray-600">
              Configure automações baseadas em palavras-chave para responder comentários 
              e enviar DMs automaticamente.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Gestão de Contatos</h3>
            <p className="text-gray-600">
              Organize seus seguidores, adicione tags e acompanhe todas as interações 
              em um só lugar.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Self-Hosted</h3>
            <p className="text-gray-600">
              Mantenha controle total dos seus dados. Deploy com Docker, Railway 
              ou qualquer VPS.
            </p>
          </div>
        </div>

        <footer className="mt-20 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>
            Powered by Flowcomments © 2026 Nathan Condé
          </p>
          <p className="mt-2">
            <Link href="/licenca" className="text-primary-600 hover:underline">
              Licença Sustainable Use
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
          </p>
        </footer>
      </main>
    </div>
  );
}
