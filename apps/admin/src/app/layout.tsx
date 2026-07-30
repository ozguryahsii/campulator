import type { Metadata } from 'next';
import { t, type DictionaryKey } from '@/lib/dictionary';
import './globals.css';

export const metadata: Metadata = {
  title: t('app.title'),
  description: t('app.subtitle'),
};

const NAV_ITEMS: DictionaryKey[] = [
  'nav.dashboard',
  'nav.moderation',
  'nav.places',
  'nav.duplicates',
  'nav.changeRequests',
  'nav.reports',
  'nav.reviewsPhotos',
  'nav.users',
  'nav.trust',
  'nav.businesses',
  'nav.scoreConfig',
  'nav.amenities',
  'nav.notifications',
  'nav.localization',
  'nav.auditLogs',
  'nav.settings',
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="w-64 shrink-0 border-r border-border-soft bg-surface p-4">
            <div className="mb-6 flex items-center gap-2 px-2">
              <span className="inline-block h-3 w-3 rounded-full bg-primary" />
              <span className="text-lg font-bold">{t('app.title')}</span>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((key) => (
                <div
                  key={key}
                  className="cursor-default rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
                >
                  {t(key)}
                </div>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
