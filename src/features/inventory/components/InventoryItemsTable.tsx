import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  InventoryItem,
  InventoryQuantityField,
} from '@/features/inventory';
import { InventoryItemActionsMenu } from '@/features/inventory/components/InventoryItemActionsMenu';
import { InventorySearchCombobox } from '@/features/inventory/components/InventorySearchCombobox';
import { useLanguage } from '@/hooks';

const PAGE_SIZE = 12;

type SortKey =
  | 'code'
  | 'name'
  | 'totalQuantity'
  | 'issuedQuantity'
  | 'remainingQuantity';

type InventoryItemsTableProps = {
  items: InventoryItem[];
  editable?: boolean;
  showActions?: boolean;
  canEdit?: boolean;
  canEnableDisable?: boolean;
  canDelete?: boolean;
  onQuantityChange?: (
    itemId: string,
    field: InventoryQuantityField,
    value: number,
  ) => Promise<void>;
  onEditItem?: (item: InventoryItem) => void;
  onToggleItemEnabled?: (item: InventoryItem) => void;
  onDeleteItem?: (item: InventoryItem) => void;
  toolbarAction?: ReactNode;
};

const quantityInputStyle = {
  width: '100%',
  minWidth: 0,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'center' as const,
  outline: 'none',
};

type EditableQuantityCellProps = {
  className: string;
  editable: boolean;
  field: InventoryQuantityField;
  itemId: string;
  onQuantityChange?: (
    itemId: string,
    field: InventoryQuantityField,
    value: number,
  ) => Promise<void>;
  value: number;
};

function EditableQuantityCell({
  className,
  editable,
  field,
  itemId,
  onQuantityChange,
  value,
}: EditableQuantityCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing) {
      committedRef.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const cancelEdit = () => {
    setDraft(String(value));
    setIsEditing(false);
  };

  const commitEdit = async () => {
    if (committedRef.current || !onQuantityChange) {
      setIsEditing(false);
      return;
    }

    committedRef.current = true;

    const trimmed = draft.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      cancelEdit();
      return;
    }

    if (parsed === value) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);

    try {
      await onQuantityChange(itemId, field, parsed);
    } catch {
      setDraft(String(value));
    }
  };

  const startEdit = () => {
    if (!editable || !onQuantityChange) {
      return;
    }
    setDraft(String(value));
    setIsEditing(true);
  };

  if (!editable) {
    return <td className={className}>{value}</td>;
  }

  if (isEditing) {
    return (
      <td className={className}>
        <input
          aria-label={`Edit ${field}`}
          inputMode="numeric"
          onBlur={() => {
            void commitEdit();
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void commitEdit();
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              cancelEdit();
            }
          }}
          ref={inputRef}
          style={quantityInputStyle}
          type="text"
          value={draft}
        />
      </td>
    );
  }

  return (
    <td
      className={className}
      onClick={startEdit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          startEdit();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {value}
    </td>
  );
}

export function InventoryItemsTable({
  items,
  editable = false,
  showActions = false,
  canEdit = false,
  canEnableDisable = false,
  canDelete = false,
  onQuantityChange,
  onEditItem,
  onToggleItemEnabled,
  onDeleteItem,
  toolbarAction,
}: InventoryItemsTableProps) {
  const { language, t } = useLanguage();
  const [codeQuery, setCodeQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const codeOptions = useMemo(() => {
    const locale = language === 'ar' ? 'ar' : 'en';
    return [
      ...new Set(items.map((item) => item.code.trim()).filter(Boolean)),
    ].sort((left, right) => left.localeCompare(right, locale));
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
          : String(leftValue).localeCompare(
              String(rightValue),
              language === 'ar' ? 'ar' : 'en',
            );
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return next;
  }, [codeQuery, items, language, nameQuery, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );
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

  const handleSortKeyDown = (
    event: KeyboardEvent<HTMLTableCellElement>,
    key: SortKey,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleSort(key);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return null;
    }
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const showActionsColumn =
    showActions &&
    (canEdit || canEnableDisable || canDelete) &&
    onEditItem &&
    onToggleItemEnabled &&
    onDeleteItem;

  if (items.length === 0) {
    return (
      <section
        aria-label={t('inventory.sections.table')}
        className="inv-warehouse"
      >
        {toolbarAction ? (
          <header className="inv-warehouse__table-toolbar">
            <h2 className="inv-warehouse__table-title">
              {t('inventory.sections.table')}
            </h2>
            <div className="inv-warehouse__table-toolbar-actions">
              {toolbarAction}
            </div>
          </header>
        ) : null}
        <div className="inv-empty">
          <p>{t('inventory.empty.title')}</p>
          <p>{t('inventory.empty.titleAr')}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t('inventory.sections.table')}
      className="inv-warehouse"
    >
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
          <h2 className="inv-warehouse__table-title">
            {t('inventory.sections.table')}
          </h2>
          <div className="inv-warehouse__table-toolbar-actions">
            {toolbarAction}
            <p className="inv-warehouse__table-meta">
              {filtered.length} {t('inventory.table.name')}
            </p>
          </div>
        </header>

        <div className="inv-table-wrap inv-table-wrap--erp">
          <table className="luxury-table inv-erp-table">
            <colgroup>
              <col className="inv-erp-col inv-erp-col--code" />
              <col className="inv-erp-col inv-erp-col--name" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--num" />
              <col className="inv-erp-col inv-erp-col--num" />
              {showActionsColumn ? (
                <col className="inv-erp-col inv-erp-col--actions" />
              ) : null}
            </colgroup>
            <thead>
              <tr>
                <th
                  aria-sort={
                    sortKey === 'code'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__code"
                  onClick={() => toggleSort('code')}
                  onKeyDown={(event) => handleSortKeyDown(event, 'code')}
                  scope="col"
                  tabIndex={0}
                >
                  {t('inventory.table.code')}
                  {sortIndicator('code')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'name'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__name"
                  onClick={() => toggleSort('name')}
                  onKeyDown={(event) => handleSortKeyDown(event, 'name')}
                  scope="col"
                  tabIndex={0}
                >
                  {t('inventory.table.name')}
                  {sortIndicator('name')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'totalQuantity'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__num"
                  onClick={() => toggleSort('totalQuantity')}
                  onKeyDown={(event) =>
                    handleSortKeyDown(event, 'totalQuantity')
                  }
                  scope="col"
                  tabIndex={0}
                >
                  {t('inventory.table.incoming')}
                  {sortIndicator('totalQuantity')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'issuedQuantity'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__num"
                  onClick={() => toggleSort('issuedQuantity')}
                  onKeyDown={(event) =>
                    handleSortKeyDown(event, 'issuedQuantity')
                  }
                  scope="col"
                  tabIndex={0}
                >
                  {t('inventory.table.issued')}
                  {sortIndicator('issuedQuantity')}
                </th>
                <th
                  aria-sort={
                    sortKey === 'remainingQuantity'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="inv-erp-table__sortable inv-erp-table__num"
                  onClick={() => toggleSort('remainingQuantity')}
                  onKeyDown={(event) =>
                    handleSortKeyDown(event, 'remainingQuantity')
                  }
                  scope="col"
                  tabIndex={0}
                >
                  {t('inventory.table.remaining')}
                  {sortIndicator('remainingQuantity')}
                </th>
                {showActionsColumn ? (
                  <th className="inv-erp-table__actions" scope="col">
                    {t('inventory.table.actions')}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    className="inv-erp-table__empty"
                    colSpan={showActionsColumn ? 6 : 5}
                  >
                    {t('inventory.search.noResults')}
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => (
                  <tr
                    className={
                      item.disabledAt
                        ? 'inv-erp-table__row--disabled'
                        : undefined
                    }
                    key={item.id}
                  >
                    <td className="inv-erp-table__code">
                      {item.code || '—'}
                      {item.disabledAt ? (
                        <span className="inv-erp-table__badge">
                          {t('inventory.table.disabled')}
                        </span>
                      ) : null}
                    </td>
                    <td className="inv-erp-table__name" title={item.name}>
                      {item.name}
                    </td>
                    <EditableQuantityCell
                      className="inv-erp-table__num"
                      editable={editable}
                      field="totalQuantity"
                      itemId={item.id}
                      onQuantityChange={onQuantityChange}
                      value={item.totalQuantity}
                    />
                    <EditableQuantityCell
                      className="inv-erp-table__num"
                      editable={editable}
                      field="issuedQuantity"
                      itemId={item.id}
                      onQuantityChange={onQuantityChange}
                      value={item.issuedQuantity}
                    />
                    <EditableQuantityCell
                      className="inv-erp-table__num inv-erp-table__remaining"
                      editable={editable}
                      field="remainingQuantity"
                      itemId={item.id}
                      onQuantityChange={onQuantityChange}
                      value={item.remainingQuantity}
                    />
                    {showActionsColumn ? (
                      <td className="inv-erp-table__actions">
                        <InventoryItemActionsMenu
                          canDelete={canDelete}
                          canEdit={canEdit}
                          canEnableDisable={canEnableDisable}
                          item={item}
                          onDelete={onDeleteItem}
                          onEdit={onEditItem}
                          onToggleEnabled={onToggleItemEnabled}
                        />
                      </td>
                    ) : null}
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
