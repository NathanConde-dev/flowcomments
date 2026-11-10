import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, UserPlus, Instagram } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getContacts(userId: string) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      igUsername: true,
      igUserId: true,
      createdAt: true,
      // TODO: Add subscription status, tags, etc.
    },
  });

  return contacts;
}

export default async function ContactsPage() {
  const session = await requireAuth();
  const contacts = await getContacts(session.userId);

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Contatos</h1>
          <Button className="bg-neutral-900 hover:bg-neutral-800">
            <UserPlus className="mr-2 h-4 w-4" />
            Criar Contato
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Pesquisar"
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="border-neutral-300">
            <Filter className="mr-2 h-4 w-4" />
            Filtro
          </Button>
        </div>

        {/* Contacts Table */}
        <Card>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                <Instagram className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                Nenhum contato ainda
              </h3>
              <p className="mb-4 text-sm text-neutral-600">
                Seus contatos aparecerão aqui quando você começar a interagir via Instagram
              </p>
              <Link href="/automations">
                <Button className="bg-neutral-900 hover:bg-neutral-800">
                  Criar Automação
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-600">
                      Perfil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-600">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-600">
                      Inscrito há
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {contacts.map((contact) => {
                    const inscritoHa = Math.floor(
                      (Date.now() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <tr key={contact.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
                              <Instagram className="h-5 w-5 text-neutral-600" />
                            </div>
                            <span className="text-sm font-medium text-neutral-900">
                              @{contact.igUsername || contact.igUserId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-900">—</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Inscrito
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600">
                          {inscritoHa === 0
                            ? 'hoje'
                            : inscritoHa === 1
                              ? 'há 1 dia'
                              : `há ${inscritoHa} dias`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Tags Sidebar */}
      <aside className="hidden w-64 border-l border-neutral-200 bg-white p-6 lg:block">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Tags</h3>
        <p className="text-sm text-neutral-500">Em breve: organize seus contatos com tags personalizadas</p>
      </aside>
    </div>
  );
}
