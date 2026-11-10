'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsGeneralPage() {
  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-600">
            Configurações gerais do aplicativo serão adicionadas aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
