import { t } from '@/lib/dictionary';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>
      <p className="mt-2 text-text-secondary">{t('dashboard.welcome')}</p>
      <div className="mt-8 rounded-2xl border border-border-soft bg-surface p-6">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          {t('common.comingSoon')}
        </span>
        <p className="mt-2 text-sm text-text-secondary">{t('dashboard.phase')}</p>
      </div>
    </div>
  );
}
