import type { Metadata } from 'next';
import { AdminShell } from '@/components/AdminShell';
import { t } from '@/lib/dictionary';
import './globals.css';

export const metadata: Metadata = {
  title: t('app.title'),
  description: t('app.subtitle'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
