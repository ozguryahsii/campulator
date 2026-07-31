'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminApi, getToken, setToken } from '@/lib/api';
import { t, type DictionaryKey } from '@/lib/dictionary';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });

const NAV: { key: DictionaryKey; href: string }[] = [
  { key: 'nav.dashboard', href: '/' },
  { key: 'nav.moderation', href: '/moderation' },
  { key: 'nav.places', href: '/places' },
  { key: 'nav.reports', href: '/reports' },
  { key: 'nav.photos', href: '/photos' },
  { key: 'nav.users', href: '/users' },
  { key: 'nav.businesses', href: '/businesses' },
  { key: 'nav.localization', href: '/localization' },
  { key: 'nav.scoreConfig', href: '/score-config' },
  { key: 'nav.auditLogs', href: '/audit-logs' },
];

/** Yalnızca MODERATOR ve üzeri roller panele girebilir (docs/06) */
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.login(email, password);
      if (!['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(result.user.role)) {
        setError(t('login.notAuthorized'));
        return;
      }
      setToken(result.accessToken);
      onSuccess();
    } catch {
      setError(t('login.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border-soft bg-surface p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-primary" />
          <h1 className="text-lg font-bold">{t('app.title')}</h1>
        </div>
        <input
          type="email"
          placeholder={t('login.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border-soft bg-elevated px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-border-soft bg-elevated px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-background disabled:opacity-50"
        >
          {busy ? '...' : t('login.submit')}
        </button>
      </form>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  if (authed === null) return <div className="p-8 text-text-secondary">…</div>;
  if (!authed) {
    return (
      <QueryClientProvider client={queryClient}>
        <LoginForm onSuccess={() => setAuthed(true)} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-border-soft bg-surface p-4">
          <div className="mb-6 flex items-center gap-2 px-2">
            <span className="inline-block h-3 w-3 rounded-full bg-primary" />
            <span className="text-lg font-bold">{t('app.title')}</span>
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-elevated font-semibold text-primary'
                      : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => {
              setToken(null);
              setAuthed(false);
            }}
            className="mt-8 w-full rounded-lg border border-border-soft px-3 py-2 text-sm text-text-secondary hover:text-danger"
          >
            {t('login.logout')}
          </button>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </QueryClientProvider>
  );
}
