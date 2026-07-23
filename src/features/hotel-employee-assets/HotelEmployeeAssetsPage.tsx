import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InventoryLoginPage } from '@/features/inventory/components/InventoryLoginPage';
import {
  listAssetDepartments,
  listAssetEmployeesByDepartment,
  listAssetReceiptsByEmployee,
} from '@/features/hotel-employee-assets/asset-service';
import { displayAssetDepartmentName } from '@/features/hotel-employee-assets/display-labels';
import { ReceiptHistorySection } from '@/features/hotel-employee-assets/ReceiptHistorySection';
import {
  formatAssetEmployeeNumber,
  type AssetDepartment,
  type AssetEmployee,
  type AssetReceipt,
} from '@/features/hotel-employee-assets/types';
import {
  getHotelAssetsTotal,
} from '@/data/repositories/app-settings-repository';
import { getErrorMessage } from '@/lib/supabase/errors';
import { useInventoryAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';
import '@/features/hotel-employee-assets/hotel-employee-assets.css';

/**
 * Read-only Hotel Employee Assets view.
 * Reuses Inventory View session authentication (no separate password system).
 */
export function HotelEmployeeAssetsPage() {
  const { t, language } = useLanguage();
  const { isAuthenticated, login } = useInventoryAuth();
  const [departments, setDepartments] = useState<AssetDepartment[]>([]);
  const [employeesByDept, setEmployeesByDept] = useState<
    Record<string, AssetEmployee[]>
  >({});
  const [receiptsByEmployee, setReceiptsByEmployee] = useState<
    Record<string, AssetReceipt[]>
  >({});
  const [openDeptId, setOpenDeptId] = useState<string | null>(null);
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [nextDepartments, persistedTotal] = await Promise.all([
      listAssetDepartments(),
      getHotelAssetsTotal(),
    ]);
    setDepartments(nextDepartments);
    setTotalAssets(persistedTotal);

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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void (async () => {
      try {
        await loadAll();
      } catch (caught) {
        setError(getErrorMessage(caught, t('hotelAssets.loadFailed')));
      } finally {
        setReady(true);
      }
    })();
  }, [isAuthenticated, loadAll, t]);

  const query = search.trim().toLowerCase();
  const allEmployees = useMemo(
    () => Object.values(employeesByDept).flat(),
    [employeesByDept],
  );

  const visibleDepartments = useMemo(() => {
    if (!query) {
      return departments;
    }
    return departments.filter((department) => {
      const deptLabel = displayAssetDepartmentName(
        department.name,
        language,
      ).toLowerCase();
      if (deptLabel.includes(query)) {
        return true;
      }
      return (employeesByDept[department.id] ?? []).some((employee) => {
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

  if (!isAuthenticated) {
    return <InventoryLoginPage onLogin={login} />;
  }

  return (
    <section className="hotel-assets admin-editor-page mx-auto" aria-live="polite">
      <header className="admin-page-header">
        <div className="admin-page-header__titles">
          <span aria-hidden="true" className="admin-page-header__emoji">
            ✦
          </span>
          <h1 className="admin-page-header__title-en">Hotel Employee Assets</h1>
          <h1 className="admin-page-header__title-ar">عهدة موظفي الفندق</h1>
          <p className="admin-page-header__subtitle">
            {t('hotelAssets.viewSubtitle')}
          </p>
        </div>
      </header>

      <div className="hotel-assets__stats">
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsDepartments')}</p>
          <p className="hotel-assets__stat-value">{departments.length}</p>
        </article>
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsEmployees')}</p>
          <p className="hotel-assets__stat-value">{allEmployees.length}</p>
        </article>
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsReceipts')}</p>
          <p className="hotel-assets__stat-value">{totalAssets}</p>
        </article>
        <article className="hotel-assets__stat">
          <p className="hotel-assets__stat-label">{t('hotelAssets.statsLastActivity')}</p>
          <p className="hotel-assets__stat-value">
            {lastActivityAt
              ? formatActivityDate(lastActivityAt, language)
              : t('hotelAssets.statsNone')}
          </p>
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

      {!ready ? (
        <div className="hotel-assets__loading">
          <span className="hotel-assets__spinner" />
          {t('common.loading')}
        </div>
      ) : (
        <div className="hotel-assets__accordion">
          {visibleDepartments.map((department) => {
            const isOpen = openDeptId === department.id;
            const deptName = displayAssetDepartmentName(
              department.name,
              language,
            );
            const employees = (employeesByDept[department.id] ?? []).filter(
              (employee) => {
                if (!query) {
                  return true;
                }
                const numberLabel = formatAssetEmployeeNumber(
                  employee.employeeNumber,
                ).toLowerCase();
                return (
                  employee.employeeName.toLowerCase().includes(query) ||
                  numberLabel.includes(query) ||
                  String(employee.employeeNumber).includes(query)
                );
              },
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
                  onClick={() => {
                    setOpenDeptId(isOpen ? null : department.id);
                    setOpenEmployeeId(null);
                  }}
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
                                onClick={() =>
                                  setOpenEmployeeId(
                                    employeeOpen ? null : employee.id,
                                  )
                                }
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

                                  <ReceiptHistorySection
                                    key={employee.id}
                                    language={language}
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
    </section>
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
