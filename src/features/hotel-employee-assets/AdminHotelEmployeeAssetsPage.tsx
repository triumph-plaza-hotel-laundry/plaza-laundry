import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  createAssetEmployee,
  createAssetReceipt,
  deleteAssetEmployee,
  deleteAssetReceipt,
  listAssetDepartments,
  listAssetEmployeesByDepartment,
  listAssetItems,
  listAssetReceiptsByEmployee,
  updateAssetReceipt,
} from '@/features/hotel-employee-assets/asset-service';
import {
  displayAssetDepartmentName,
  displayAssetItemName,
} from '@/features/hotel-employee-assets/display-labels';
import { ReceiptHistorySection } from '@/features/hotel-employee-assets/ReceiptHistorySection';
import {
  formatAssetEmployeeNumber,
  type AssetDepartment,
  type AssetEmployee,
  type AssetItem,
  type AssetReceipt,
  type AssetReceiptItemInput,
} from '@/features/hotel-employee-assets/types';
import { getErrorMessage } from '@/lib/supabase/errors';
import {
  getHotelAssetsTotal,
  setHotelAssetsTotal,
} from '@/data/repositories/app-settings-repository';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/features/admin/admin-editor.css';
import '@/features/hotel-employee-assets/hotel-employee-assets.css';

type ReceiptDraft = {
  receiptDate: string;
  notes: string;
  items: AssetReceiptItemInput[];
};

const emptyDraft = (): ReceiptDraft => ({
  receiptDate: new Date().toISOString().slice(0, 10),
  notes: '',
  items: [{ itemId: '', quantity: 1 }],
});

export function AdminHotelEmployeeAssetsPage() {
  const { t, language } = useLanguage();
  const [departments, setDepartments] = useState<AssetDepartment[]>([]);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [employeesByDept, setEmployeesByDept] = useState<
    Record<string, AssetEmployee[]>
  >({});
  const [receiptsByEmployee, setReceiptsByEmployee] = useState<
    Record<string, AssetReceipt[]>
  >({});
  const [openDeptId, setOpenDeptId] = useState<string | null>(null);
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [addingEmployeeForDept, setAddingEmployeeForDept] = useState<
    string | null
  >(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [search, setSearch] = useState('');
  const [receiptMode, setReceiptMode] = useState<{
    employeeId: string;
    receiptId?: string;
  } | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft>(emptyDraft);
  const [receiptFormError, setReceiptFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalAssetsDraft, setTotalAssetsDraft] = useState('0');
  const [isSavingTotal, setIsSavingTotal] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(null);

  const itemOptions = useMemo(
    () =>
      [...items].sort((a, b) =>
        displayAssetItemName(a.name, language).localeCompare(
          displayAssetItemName(b.name, language),
          language === 'ar' ? 'ar' : 'en',
        ),
      ),
    [items, language],
  );

  const allEmployees = useMemo(
    () => Object.values(employeesByDept).flat(),
    [employeesByDept],
  );

  const stats = useMemo(() => {
    return {
      departments: departments.length,
      employees: allEmployees.length,
      lastActivity: lastActivityAt
        ? formatActivityDate(lastActivityAt, language)
        : t('hotelAssets.statsNone'),
    };
  }, [
    allEmployees.length,
    departments.length,
    language,
    lastActivityAt,
    t,
  ]);

  const refreshBase = useCallback(async () => {
    const [nextDepartments, nextItems, persistedTotal] = await Promise.all([
      listAssetDepartments(),
      listAssetItems(),
      getHotelAssetsTotal(),
    ]);
    setDepartments(nextDepartments);
    setItems(nextItems);
    setTotalAssets(persistedTotal);
    setTotalAssetsDraft(String(persistedTotal));

    const employeeGroups = await Promise.all(
      nextDepartments.map(async (department) => {
        const list = await listAssetEmployeesByDepartment(department.id);
        return [department.id, list] as const;
      }),
    );

    const nextEmployees: Record<string, AssetEmployee[]> = {};
    let latest: string | null = null;
    for (const [departmentId, list] of employeeGroups) {
      nextEmployees[departmentId] = list;
      for (const employee of list) {
        if (!latest || employee.createdAt > latest) {
          latest = employee.createdAt;
        }
      }
    }
    setEmployeesByDept(nextEmployees);

    const receiptGroups = await Promise.all(
      Object.values(nextEmployees)
        .flat()
        .map(async (employee) => {
          const list = await listAssetReceiptsByEmployee(employee.id);
          return [employee.id, list] as const;
        }),
    );

    const nextReceipts: Record<string, AssetReceipt[]> = {};
    for (const [employeeId, list] of receiptGroups) {
      nextReceipts[employeeId] = list;
      for (const receipt of list) {
        if (!latest || receipt.createdAt > latest) {
          latest = receipt.createdAt;
        }
      }
    }
    setReceiptsByEmployee(nextReceipts);
    setLastActivityAt(latest);
  }, []);

  const loadEmployees = useCallback(async (departmentId: string) => {
    const list = await listAssetEmployeesByDepartment(departmentId);
    setEmployeesByDept((current) => ({ ...current, [departmentId]: list }));
    return list;
  }, []);

  const loadReceipts = useCallback(async (employeeId: string) => {
    const list = await listAssetReceiptsByEmployee(employeeId);
    setReceiptsByEmployee((current) => ({ ...current, [employeeId]: list }));
    return list;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshBase();
      } catch (caught) {
        setError(getErrorMessage(caught, t('hotelAssets.loadFailed')));
      } finally {
        setReady(true);
      }
    })();
  }, [refreshBase, t]);

  const saveTotalAssets = async () => {
    setIsSavingTotal(true);
    setError(null);
    try {
      const saved = await setHotelAssetsTotal(Number(totalAssetsDraft));
      setTotalAssets(saved);
      setTotalAssetsDraft(String(saved));
      setMessage(t('hotelAssets.totalAssetsSaved'));
    } catch (caught) {
      setError(getErrorMessage(caught, t('hotelAssets.saveFailed')));
    } finally {
      setIsSavingTotal(false);
    }
  };

  const query = search.trim().toLowerCase();

  const visibleDepartments = useMemo(() => {
    if (!query) {
      return departments;
    }

    return departments.filter((department) => {
      const deptLabel = displayAssetDepartmentName(
        department.name,
        language,
      ).toLowerCase();
      const employees = employeesByDept[department.id] ?? [];
      if (deptLabel.includes(query)) {
        return true;
      }
      return employees.some((employee) => {
        const numberLabel = formatAssetEmployeeNumber(
          employee.employeeNumber,
        ).toLowerCase();
        return (
          employee.employeeName.toLowerCase().includes(query) ||
          numberLabel.includes(query) ||
          String(employee.employeeNumber).includes(query)
        );
      });
    });
  }, [departments, employeesByDept, language, query]);

  const employeesForDepartment = (departmentId: string) => {
    const employees = employeesByDept[departmentId] ?? [];
    if (!query) {
      return employees;
    }
    return employees.filter((employee) => {
      const numberLabel = formatAssetEmployeeNumber(
        employee.employeeNumber,
      ).toLowerCase();
      return (
        employee.employeeName.toLowerCase().includes(query) ||
        numberLabel.includes(query) ||
        String(employee.employeeNumber).includes(query)
      );
    });
  };

  const openDepartment = async (departmentId: string) => {
    const next = openDeptId === departmentId ? null : departmentId;
    setOpenDeptId(next);
    setOpenEmployeeId(null);
    setAddingEmployeeForDept(null);
    setReceiptMode(null);
    if (next) {
      try {
        await loadEmployees(next);
      } catch (caught) {
        setError(getErrorMessage(caught, t('hotelAssets.loadFailed')));
      }
    }
  };

  const openEmployee = async (employeeId: string) => {
    const next = openEmployeeId === employeeId ? null : employeeId;
    setOpenEmployeeId(next);
    setReceiptMode(null);
    if (next) {
      try {
        await loadReceipts(next);
      } catch (caught) {
        setError(getErrorMessage(caught, t('hotelAssets.loadFailed')));
      }
    }
  };

  const handleCreateEmployee = async (departmentId: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createAssetEmployee({
        departmentId,
        employeeName: newEmployeeName,
      });
      setNewEmployeeName('');
      setAddingEmployeeForDept(null);
      await refreshBase();
      setOpenDeptId(departmentId);
      setMessage(t('hotelAssets.employeeCreated'));
    } catch (caught) {
      setError(getErrorMessage(caught, t('hotelAssets.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (
    departmentId: string,
    employee: AssetEmployee,
  ) => {
    const label = `${formatAssetEmployeeNumber(employee.employeeNumber)} ${employee.employeeName}`;
    if (
      !window.confirm(
        t('hotelAssets.confirmDeleteEmployee').replace('{name}', label),
      )
    ) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await deleteAssetEmployee(employee.id);
      if (openEmployeeId === employee.id) {
        setOpenEmployeeId(null);
      }
      await refreshBase();
      setOpenDeptId(departmentId);
      setMessage(t('hotelAssets.employeeDeleted'));
    } catch (caught) {
      setError(getErrorMessage(caught, t('hotelAssets.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  const beginAddReceipt = (employeeId: string) => {
    setReceiptFormError(null);
    setReceiptMode({ employeeId });
    setDraft(emptyDraft());
  };

  const beginEditReceipt = (receipt: AssetReceipt) => {
    setReceiptFormError(null);
    setReceiptMode({ employeeId: receipt.employeeId, receiptId: receipt.id });
    setDraft({
      receiptDate: receipt.receiptDate,
      notes: receipt.notes ?? '',
      items:
        receipt.items.length > 0
          ? receipt.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
            }))
          : [{ itemId: '', quantity: 1 }],
    });
  };

  const closeReceiptModal = () => {
    setReceiptMode(null);
    setReceiptFormError(null);
  };

  const handleSaveReceipt = async () => {
    if (!receiptMode) {
      return;
    }

    if (!draft.receiptDate.trim()) {
      setReceiptFormError(t('hotelAssets.receiptDateRequired'));
      return;
    }

    const validItems = draft.items.filter(
      (item) => item.itemId && item.quantity > 0,
    );
    if (validItems.length === 0) {
      setReceiptFormError(t('hotelAssets.receiptItemsRequired'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setReceiptFormError(null);
    try {
      if (receiptMode.receiptId) {
        await updateAssetReceipt({
          receiptId: receiptMode.receiptId,
          employeeId: receiptMode.employeeId,
          receiptDate: draft.receiptDate,
          notes: draft.notes,
          items: draft.items,
        });
        setMessage(t('hotelAssets.receiptUpdated'));
      } else {
        await createAssetReceipt({
          employeeId: receiptMode.employeeId,
          receiptDate: draft.receiptDate,
          notes: draft.notes,
          items: draft.items,
        });
        setMessage(t('hotelAssets.receiptCreated'));
      }
      const employeeId = receiptMode.employeeId;
      closeReceiptModal();
      await refreshBase();
      setOpenEmployeeId(employeeId);
      await loadReceipts(employeeId);
    } catch (caught) {
      setReceiptFormError(getErrorMessage(caught, t('hotelAssets.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReceipt = async (receipt: AssetReceipt) => {
    if (!window.confirm(t('hotelAssets.confirmDeleteReceipt'))) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await deleteAssetReceipt(receipt.id);
      await refreshBase();
      setOpenEmployeeId(receipt.employeeId);
      setMessage(t('hotelAssets.receiptDeleted'));
    } catch (caught) {
      setError(getErrorMessage(caught, t('hotelAssets.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="hotel-assets admin-editor-page">
      <AdminPageHeader
        subtitle={t('hotelAssets.adminSubtitle')}
        titleAr="عهدة موظفي الفندق"
        titleEn="Hotel Employee Assets"
      />

      <div className="hotel-assets__stats">
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsDepartments')}</p>
          <p className="hotel-assets__stat-value">{stats.departments}</p>
        </article>
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsEmployees')}</p>
          <p className="hotel-assets__stat-value">{stats.employees}</p>
        </article>
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsReceipts')}</p>
          <div className="hotel-assets__stat-edit">
            <input
              aria-label={t('hotelAssets.statsReceipts')}
              className="hotel-assets__stat-input"
              inputMode="numeric"
              min={0}
              onChange={(event) => setTotalAssetsDraft(event.target.value)}
              step={1}
              type="number"
              value={totalAssetsDraft}
            />
            <button
              className="hotel-assets__stat-save"
              disabled={
                isSavingTotal ||
                String(totalAssets) === String(Number(totalAssetsDraft) || 0)
              }
              onClick={() => void saveTotalAssets()}
              type="button"
            >
              {t('hotelAssets.saveTotalAssets')}
            </button>
          </div>
        </article>
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsLastActivity')}</p>
          <p className="hotel-assets__stat-value">{stats.lastActivity}</p>
        </article>
      </div>

      <div className="hotel-assets__toolbar-bar">
        <label className="hotel-assets__search">
          <input
            aria-label={t('hotelAssets.search')}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('hotelAssets.searchPlaceholder')}
            type="search"
            value={search}
          />
        </label>
      </div>

      {error ? (
        <p className="hotel-assets__message hotel-assets__message--error">{error}</p>
      ) : null}
      {message ? (
        <p className="hotel-assets__message hotel-assets__message--success">
          {message}
        </p>
      ) : null}

      {!ready ? (
        <div className="hotel-assets__loading">
          <span className="hotel-assets__spinner" />
          {t('common.loading')}
        </div>
      ) : visibleDepartments.length === 0 ? (
        <p className="hotel-assets__empty">
          <span className="hotel-assets__empty-icon" aria-hidden="true">
            🔍
          </span>
          {t('hotelAssets.noSearchResults')}
        </p>
      ) : (
        <div className="hotel-assets__accordion">
          {visibleDepartments.map((department) => {
            const isOpen = openDeptId === department.id;
            const employees = employeesForDepartment(department.id);
            const deptName = displayAssetDepartmentName(
              department.name,
              language,
            );

            return (
              <article
                className={
                  isOpen ? 'hotel-assets__dept is-open' : 'hotel-assets__dept'
                }
                key={department.id}
              >
                <button
                  aria-expanded={isOpen}
                  className="hotel-assets__dept-trigger"
                  onClick={() => void openDepartment(department.id)}
                  type="button"
                >
                  <span className="hotel-assets__dept-title">{deptName}</span>
                  <span className="hotel-assets__dept-meta">
                    <span className="hotel-assets__count">
                      {(employeesByDept[department.id] ?? []).length}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="hotel-assets__chevron"
                      size={18}
                      strokeWidth={1.75}
                    />
                  </span>
                </button>

                {isOpen ? (
                  <div className="hotel-assets__dept-panel">
                    <div className="hotel-assets__add-wrap">
                      <button
                        className="hotel-assets__btn"
                        onClick={() => {
                          setAddingEmployeeForDept(department.id);
                          setNewEmployeeName('');
                        }}
                        type="button"
                      >
                        <Plus size={15} strokeWidth={1.75} />
                        {t('hotelAssets.addEmployee')}
                      </button>
                    </div>

                    {addingEmployeeForDept === department.id ? (
                      <div className="hotel-assets__form">
                        <div className="admin-editor-field">
                          <label htmlFor={`asset-emp-name-${department.id}`}>
                            {t('hotelAssets.employeeName')}
                          </label>
                          <input
                            id={`asset-emp-name-${department.id}`}
                            onChange={(event) =>
                              setNewEmployeeName(event.target.value)
                            }
                            value={newEmployeeName}
                          />
                        </div>
                        <p className="hotel-assets__empty" style={{ padding: 0 }}>
                          {t('hotelAssets.employeeNumberAuto')}
                        </p>
                        <div className="hotel-assets__actions">
                          <button
                            className="hotel-assets__btn"
                            disabled={isSaving || !newEmployeeName.trim()}
                            onClick={() =>
                              void handleCreateEmployee(department.id)
                            }
                            type="button"
                          >
                            {t('admin.editor.save')}
                          </button>
                          <button
                            className="hotel-assets__btn hotel-assets__btn--ghost"
                            disabled={isSaving}
                            onClick={() => setAddingEmployeeForDept(null)}
                            type="button"
                          >
                            {t('admin.editor.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="hotel-assets__employee-list">
                      {employees.length === 0 ? (
                        <p className="hotel-assets__empty">
                          <span
                            aria-hidden="true"
                            className="hotel-assets__empty-icon"
                          >
                            👤
                          </span>
                          {t('hotelAssets.noEmployees')}
                        </p>
                      ) : (
                        employees.map((employee) => {
                          const employeeOpen = openEmployeeId === employee.id;
                          const receipts =
                            receiptsByEmployee[employee.id] ?? [];

                          return (
                            <article
                              className={
                                employeeOpen
                                  ? 'hotel-assets__employee is-open'
                                  : 'hotel-assets__employee'
                              }
                              key={employee.id}
                            >
                              <button
                                aria-expanded={employeeOpen}
                                className="hotel-assets__employee-trigger"
                                onClick={() => void openEmployee(employee.id)}
                                type="button"
                              >
                                <span className="hotel-assets__employee-number">
                                  {formatAssetEmployeeNumber(
                                    employee.employeeNumber,
                                  )}
                                </span>
                                <span className="hotel-assets__employee-name">
                                  {employee.employeeName}
                                </span>
                                <ChevronDown
                                  aria-hidden="true"
                                  className="hotel-assets__chevron"
                                  size={18}
                                  strokeWidth={1.75}
                                />
                              </button>

                              {employeeOpen ? (
                                <div className="hotel-assets__employee-panel">
                                  <dl className="hotel-assets__details">
                                    <div>
                                      <dt>{t('hotelAssets.employeeNumber')}</dt>
                                      <dd>
                                        {formatAssetEmployeeNumber(
                                          employee.employeeNumber,
                                        )}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>{t('hotelAssets.employeeName')}</dt>
                                      <dd>{employee.employeeName}</dd>
                                    </div>
                                    <div>
                                      <dt>{t('hotelAssets.department')}</dt>
                                      <dd>{deptName}</dd>
                                    </div>
                                  </dl>

                                  <div className="hotel-assets__actions">
                                    <button
                                      className="hotel-assets__btn"
                                      onClick={() =>
                                        beginAddReceipt(employee.id)
                                      }
                                      type="button"
                                    >
                                      <Plus size={15} strokeWidth={1.75} />
                                      {t('hotelAssets.addReceipt')}
                                    </button>
                                    <button
                                      className="hotel-assets__btn hotel-assets__btn--danger"
                                      disabled={isSaving}
                                      onClick={() =>
                                        void handleDeleteEmployee(
                                          department.id,
                                          employee,
                                        )
                                      }
                                      type="button"
                                    >
                                      {t('hotelAssets.deleteEmployee')}
                                    </button>
                                  </div>

                                  <ReceiptHistorySection
                                    canManage
                                    isSaving={isSaving}
                                    key={employee.id}
                                    language={language}
                                    onDelete={(receipt) =>
                                      void handleDeleteReceipt(receipt)
                                    }
                                    onEdit={beginEditReceipt}
                                    receipts={receipts}
                                    t={t}
                                  />
                                </div>
                              ) : null}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <ReceiptEditorModal
        draft={draft}
        formError={receiptFormError}
        isEditing={Boolean(receiptMode?.receiptId)}
        isOpen={Boolean(receiptMode)}
        isSaving={isSaving}
        itemOptions={itemOptions}
        language={language}
        onCancel={closeReceiptModal}
        onChange={setDraft}
        onSave={() => void handleSaveReceipt()}
        t={t}
      />
    </section>
  );
}

function ReceiptEditorModal({
  draft,
  formError,
  isEditing,
  isOpen,
  itemOptions,
  language,
  isSaving,
  onChange,
  onSave,
  onCancel,
  t,
}: {
  draft: ReceiptDraft;
  formError: string | null;
  isEditing: boolean;
  isOpen: boolean;
  itemOptions: AssetItem[];
  language: string;
  isSaving: boolean;
  onChange: (next: ReceiptDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  t: (key: TranslationKey) => string;
}) {
  const titleId = useId();
  const dateId = useId();
  const notesId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSaving, onCancel]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return createPortal(
    <>
      <button
        aria-label={t('admin.editor.cancel')}
        className="hotel-assets-modal__backdrop"
        disabled={isSaving}
        onClick={onCancel}
        type="button"
      />
      <div className="hotel-assets-modal__viewport">
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="hotel-assets-modal"
          role="dialog"
        >
          <header className="hotel-assets-modal__header">
            <h2 className="hotel-assets-modal__title" id={titleId}>
              {isEditing
                ? t('hotelAssets.editReceipt')
                : t('hotelAssets.addReceipt')}
            </h2>
            <button
              aria-label={t('admin.editor.cancel')}
              className="hotel-assets-modal__close"
              disabled={isSaving}
              onClick={onCancel}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={1.75} />
            </button>
          </header>

          <form className="hotel-assets-modal__body" onSubmit={handleSubmit}>
            {formError ? (
              <p className="hotel-assets__message hotel-assets__message--error">
                {formError}
              </p>
            ) : null}

            <div className="hotel-assets-modal__field">
              <label htmlFor={dateId}>{t('hotelAssets.receiptDate')}</label>
              <input
                id={dateId}
                onChange={(event) =>
                  onChange({ ...draft, receiptDate: event.target.value })
                }
                required
                type="date"
                value={draft.receiptDate}
              />
            </div>

            <div className="hotel-assets-modal__items">
              <div className="hotel-assets-modal__items-head" aria-hidden="true">
                <span>{t('hotelAssets.item')}</span>
                <span>{t('hotelAssets.quantity')}</span>
                <span />
              </div>

              <div className="hotel-assets-modal__items-list">
                {draft.items.map((row, index) => (
                  <div className="hotel-assets-modal__item-row" key={`row-${index}`}>
                    <label className="hotel-assets-modal__item-field hotel-assets-modal__item-field--item">
                      <span className="hotel-assets-modal__mobile-label">
                        {t('hotelAssets.item')}
                      </span>
                      <select
                        aria-label={t('hotelAssets.item')}
                        onChange={(event) => {
                          const nextItems = [...draft.items];
                          nextItems[index] = {
                            ...nextItems[index],
                            itemId: event.target.value,
                          };
                          onChange({ ...draft, items: nextItems });
                        }}
                        value={row.itemId}
                      >
                        <option value="">{t('hotelAssets.selectItem')}</option>
                        {itemOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {displayAssetItemName(item.name, language)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="hotel-assets-modal__item-field hotel-assets-modal__item-field--qty">
                      <span className="hotel-assets-modal__mobile-label">
                        {t('hotelAssets.quantity')}
                      </span>
                      <input
                        aria-label={t('hotelAssets.quantity')}
                        min={1}
                        onChange={(event) => {
                          const nextItems = [...draft.items];
                          nextItems[index] = {
                            ...nextItems[index],
                            quantity: Math.max(
                              1,
                              Number(event.target.value) || 1,
                            ),
                          };
                          onChange({ ...draft, items: nextItems });
                        }}
                        type="number"
                        value={row.quantity}
                      />
                    </label>

                    <button
                      aria-label={t('hotelAssets.removeItem')}
                      className="hotel-assets-modal__remove"
                      disabled={draft.items.length <= 1 || isSaving}
                      onClick={() =>
                        onChange({
                          ...draft,
                          items: draft.items.filter((_, i) => i !== index),
                        })
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="hotel-assets__btn hotel-assets__btn--ghost hotel-assets-modal__add-item"
                disabled={isSaving}
                onClick={() =>
                  onChange({
                    ...draft,
                    items: [...draft.items, { itemId: '', quantity: 1 }],
                  })
                }
                type="button"
              >
                <Plus size={15} strokeWidth={1.75} />
                {t('hotelAssets.addItem')}
              </button>
            </div>

            <div className="hotel-assets-modal__field">
              <label htmlFor={notesId}>{t('hotelAssets.notes')}</label>
              <textarea
                id={notesId}
                onChange={(event) =>
                  onChange({ ...draft, notes: event.target.value })
                }
                placeholder={t('hotelAssets.notesPlaceholder')}
                rows={3}
                value={draft.notes}
              />
            </div>

            <div className="hotel-assets-modal__footer">
              <button
                className="hotel-assets__btn hotel-assets__btn--ghost"
                disabled={isSaving}
                onClick={onCancel}
                type="button"
              >
                {t('admin.editor.cancel')}
              </button>
              <button
                className="hotel-assets__btn"
                disabled={isSaving}
                type="submit"
              >
                {t('hotelAssets.saveReceipt')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

function formatActivityDate(value: string, language: string) {
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
