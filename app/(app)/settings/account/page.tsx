'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountSettingsPage() {
  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Sobre o Flowcomments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Versão:</span> 0.1.0
            </div>
            <div>
              <span className="font-medium">Licença:</span> Flowcomments Sustainable Use License
            </div>
            <div className="flex items-start gap-2 mt-4">
              <div className="h-8 w-8 rounded bg-zinc-900 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Powered by Flowcomments</p>
                <p className="text-zinc-600">© 2026 Nathan Condé</p>
                <div className="mt-2 flex gap-3">
                  <a href="/licenca" className="text-zinc-600 hover:underline">
                    Ver Licença
                  </a>
                  <a
                    href="https://github.com/NathanConde-dev/flowcomments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:underline"
                  >
                    GitHub
                  </a>
                  <a href="mailto:contato@nathanconde.com" className="text-zinc-600 hover:underline">
                    Contato
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
