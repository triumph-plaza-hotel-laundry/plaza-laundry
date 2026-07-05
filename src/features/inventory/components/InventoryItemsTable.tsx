import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { InventoryItem } from '@/features/inventory';
import { InventorySearchCombobox } from '@/features/inventory/components/InventorySearchCombobox';
import { useLanguage } from '@/hooks';

const PAGE_SIZE = 12;

type SortKey = 'code' | 'name' | 'totalQuantity' | 'issuedQuantity' | 'remainingQuantity';

type InventoryItemsTableProps = {
  items: InventoryItem[];
};

export function InventoryItemsTable({ items }: InventoryItemsTableProps) {
  const { language, t } = useLanguage();
  const [codeQuery, setCodeQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const codeOptions = useMemo(() => {
    const locale = language === 'ar' ? 'ar' : 'en';
    return [...new Set(items.map((item) => item.code.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right, locale),
    );
  }, [items, language]);

  const nameOptions = useMemo(() => {
    const locale = language === 'ar' ? 'ar' : 'en';
    return [...new Set(items.map((item) => item.name))].sort((left, right) =>
      left.localeCompare(right, locale),
    );
  }, [items, language]);

  const handleCodeChange = (value: string) => {
    setPage(0);
    setCodeQuery(value);
  };

  const handleNameChange = (value: string) => {
    setPage(0);
    setNameQuery(value);
  };

  const filtered = useMemo(() => {
    const code = codeQuery.trim().toLowerCase();
    const name = nameQuery.trim().toLowerCase();

    const next = items.filter((item) => {
      const matchesCode = !code || item.code.toLowerCase().includes(code);
      const matchesName = !name || item.name.toLowerCase().includes(name);
      return matchesCode && matchesName;
    });

    next.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), language === 'ar' ? 'ar' : 'en');
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return next;
  }, [codeQuery, items, language, nameQuery, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, page * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return null;
    }
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (items.length === 0) {
    return (
      <div className="inv-empty">
        <p>{t('inventory.empty.title')}</p>
        <p>{t('inventory.empty.titleAr')}</p>
      </div>
    );
  }

  return (
    <section aria-label={t('inventory.sections.table')} className="inv-warehouse">
      <div className="inv-warehouse__search">
        <InventorySearchCombobox
          clearLabel={t('inventory.search.clearFilter')}
          label={t('inventory.search.namePlaceholder')}
          noResultsLabel={t('inventory.search.noResults')}
          onChange={handleNameChange}
          options={nameOptions}
          placeholder={t('inventory.search.namePlaceholder')}
          value={nameQuery}
        />
        <InventorySearchCombobox
          clearLabel={t('inventory.search.clearFilter')}
          label={t('inventory.search.codePlaceholder')}
          noResultsLabel={t('inventory.search.noResults')}
          onChange={handleCodeChange}
          options={codeOptions}
          placeholder={t('inventory.search.codePlaceholder')}
          value={codeQuery}
        />
      </div>

      <div className="inv-warehouse__table-block">
        <header className="inv-warehouse__table-toolbar">
          <h2 className="inv-warehouse__table-title">{t('inventory.sections.table')}</h2>
          <p className="inv-warehouse__table-meta">
            {filtered.length} {t('inventory.table.name')}
          </p>
        </header>

        <div className="inv-table-wrap inv-table-wrap--erp">
          <table className="luxury-table inv-erp-table">
            <colgroup>
              <col className="inv-erp-col inv-erp-col--code" />
              <col className="inv-erp-col inv-erp-col--name" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--actions" />
            </colgroup>
            <thead>
              <tr>
                <th
                  aria-sort={sortKey === 'code' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="inv-erp-table__sortable inv-erp-table__code"
                  onClick={() => toggleSort('code')}
                  scope="col"
                >
                  {t('inventory.table.code')}
                  {sortIndicator('code')}
                </th>
                <th
                  aria-sort={sortKey === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="inv-erp-table__sortable inv-erp-table__name"
                  onClick={() => toggleSort('name')}
                  scope="col"
                >
                  {t('inventory.table.name')}
                  {sortIndicator('name')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'totalQuantity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__num"
                  onClick={() => toggleSort('totalQuantity')}
                  scope="col"
                >
                  {t('inventory.v2.totalStock')}
                  {sortIndicator('totalQuantity')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'issuedQuantity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__num"
                  onClick={() => toggleSort('issuedQuantity')}
                  scope="col"
                >
                  {t('inventory.table.issued')}
                  {sortIndicator('issuedQuantity')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'remainingQuantity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__num"
                  onClick={() => toggleSort('remainingQuantity')}
                  scope="col"
                >
                  {t('inventory.table.remaining')}
                  {sortIndicator('remainingQuantity')}
                </th>
                <th className="inv-erp-table__actions" scope="col">
                  {t('inventory.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td className="inv-erp-table__empty" colSpan={6}>
                    {t('inventory.search.noResults')}
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr key={item.id}>
                    <td className="inv-erp-table__code">{item.code || '—'}</td>
                    <td className="inv-erp-table__name" title={item.name}>
                      {item.name}
                    </td>
                    <td className="inv-erp-table__num">{item.totalQuantity}</td>
                    <td className="inv-erp-table__num">{item.issuedQuantity}</td>
                    <td className="inv-erp-table__num inv-erp-table__remaining">{item.remainingQuantity}</td>
                    <td className="inv-erp-table__actions">
                      <span className="inv-erp-table__status">{t('inventory.v2.viewOnly')}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="inv-pagination inv-pagination--erp">
          <p className="inv-pagination__summary">
            {rangeStart}–{rangeEnd} / {filtered.length}
          </p>
          <div className="inv-pagination__controls">
            <button
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              aria-label="Next page"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((value) => value + 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
