import type { Metadata, Viewport } from 'next';
import { Nunito_Sans } from 'next/font/google';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { LocaleBootstrap } from '@/components/i18n/LocaleBootstrap';
import './globals.css';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: t('title'),
    description: t('description'),
    // Self-host installs must not compete with flowcomments.com for Google / AI discovery.
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Flowcomments',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F7F7',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale === 'pt' ? 'pt-BR' : 'en'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Asimovian&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${nunitoSans.variable} font-sans antialiased`}>
        <LocaleProvider locale={locale} messages={messages}>
          <LocaleBootstrap />
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
