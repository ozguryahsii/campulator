'use client';

/**
 * Liste sayfalarında ortak sayfalama. API tek istekte en fazla 100 kayıt döner
 * (docs/02 §6), bu yüzden binlerce kayıtlı listeler sayfalanarak gezilir.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  if (total <= pageSize) {
    return <p className="mt-4 text-xs text-text-secondary">Toplam {total} kayıt</p>;
  }

  const button = (label: string, targetPage: number, disabled: boolean) => (
    <button
      onClick={() => onPageChange(targetPage)}
      disabled={disabled}
      className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-text-primary disabled:opacity-40"
    >
      {label}
    </button>
  );

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {button('« İlk', 1, page <= 1)}
      {button('‹ Önceki', page - 1, page <= 1)}
      <span className="px-2 text-xs text-text-secondary">
        {first}–{last} / {total} · sayfa {page}/{lastPage}
      </span>
      {button('Sonraki ›', page + 1, page >= lastPage)}
      {button('Son »', lastPage, page >= lastPage)}
    </div>
  );
}
