import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { employeesRepository } from '@/data/repositories/employees-repository';
import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  buildEmployeeDepartmentTargets,
  type StaffDepartmentGroup,
} from '@/lib/employees-org-chart';
import {
  getEmployeesForShiftTomorrow,
  getTomorrowCairoDateKey,
} from '@/lib/shift-reminders';
import { listPushNotificationHistory } from '@/lib/shift-reminders/push-history-repository';
import {
  sendManualShiftPush,
  type ManualPushAudience,
} from '@/lib/shift-reminders/shift-push-service';
import { shiftsRepository } from '@/data/repositories/shifts-repository';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

const AUDIENCE_OPTIONS: Array<{
  value: ManualPushAudience;
  labelEn: string;
  labelAr: string;
}> = [
  {
    value: 'shift_tomorrow',
    labelEn: 'Tomorrow shift employees',
    labelAr: 'موظفو شفت الغد',
  },
  {
    value: 'everyone',
    labelEn: 'Everyone',
    labelAr: 'الجميع',
  },
  {
    value: 'department',
    labelEn: 'Department',
    labelAr: 'قسم',
  },
  {
    value: 'employee',
    labelEn: 'Individual employee',
    labelAr: 'موظف محدد',
  },
];

function formatHistoryTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminOwnerPushPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<LaundryEmployee[]>([]);
  const [shiftTomorrowCount, setShiftTomorrowCount] = useState(0);
  const [history, setHistory] = useState<
    Awaited<ReturnType<typeof listPushNotificationHistory>>
  >([]);
  const [audience, setAudience] = useState<ManualPushAudience>('shift_tomorrow');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const tomorrowKey = useMemo(() => getTomorrowCairoDateKey(), []);

  const departmentTargets = useMemo(
    (): StaffDepartmentGroup[] => buildEmployeeDepartmentTargets(employees),
    [employees],
  );

  const getDepartmentLabel = useCallback(
    (department: StaffDepartmentGroup) =>
      language === 'ar' ? department.titleAr : department.titleEn,
    [language],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        employeesRepository.reloadFromStorage(),
        shiftsRepository.reloadFromStorage(),
      ]);
      const [employeeList, shifts] = await Promise.all([
        Promise.resolve(employeesRepository.getSnapshot()),
        Promise.resolve(shiftsRepository.getSnapshot()),
      ]);
      setEmployees(employeeList);
      setShiftTomorrowCount(
        getEmployeesForShiftTomorrow(shifts, employeeList).length,
      );
      try {
        const historyRows = await listPushNotificationHistory();
        setHistory(historyRows);
        setError(null);
      } catch (historyError) {
        setHistory([]);
        setError(
          historyError instanceof Error
            ? historyError.message
            : t('admin.push.saveFailed'),
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t('admin.push.saveFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSend = async () => {
    if (!user) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsSending(true);

    try {
      const result = await sendManualShiftPush({
        ownerId: user.id,
        audience,
        departmentId: audience === 'department' ? departmentId : undefined,
        employeeId: audience === 'employee' ? employeeId : undefined,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });

      if (!result.ok) {
        throw new Error(result.error ?? t('admin.push.saveFailed'));
      }

      setMessage(
        t('admin.push.sendSuccess')
          .replace('{sent}', String(result.sent ?? 0))
          .replace('{failed}', String(result.failed ?? 0))
          .replace('{skipped}', String(result.skipped ?? 0)),
      );
      await refresh();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : t('admin.push.saveFailed'),
      );
    } finally {
      setIsSending(false);
    }
  };

  const useCustomMessage =
    audience === 'everyone' ||
    audience === 'department' ||
    audience === 'employee';

  return (
    <section className="admin-editor-page mx-auto">
      <AdminPageHeader
        backFallbackPath="/admin"
        showBack
        subtitle={t('admin.push.subtitle')}
        titleAr={t('admin.push.titleAr')}
        titleEn={t('admin.push.titleEn')}
      />

      <div className="admin-editor-panel">
        <h2>{t('admin.push.automaticTitle')}</h2>
        <p>{t('admin.push.automaticHint')}</p>
        <ul>
          <li>
            {t('admin.push.tomorrowDate')}: <strong>{tomorrowKey}</strong>
          </li>
          <li>
            {t('admin.push.tomorrowShiftCount')}:{' '}
            <strong>{shiftTomorrowCount}</strong>
          </li>
          <li>
            {t('admin.push.cronSchedule')}: <strong>22:00 Africa/Cairo</strong>
          </li>
        </ul>
      </div>

      <div className="admin-editor-panel">
        <h2>{t('admin.push.manualTitle')}</h2>
        <p>{t('admin.push.manualHint')}</p>

        <div className="admin-editor-field">
          <label htmlFor="push-audience">{t('admin.push.audience')}</label>
          <select
            id="push-audience"
            onChange={(event) =>
              setAudience(event.target.value as ManualPushAudience)
            }
            value={audience}
          >
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelEn}
              </option>
            ))}
          </select>
        </div>

        {audience === 'department' ? (
          <div className="admin-editor-field">
            <label htmlFor="push-department">{t('admin.push.department')}</label>
            <select
              id="push-department"
              onChange={(event) => setDepartmentId(event.target.value)}
              value={departmentId}
            >
              <option value="">{t('admin.push.selectDepartment')}</option>
              {departmentTargets.map((department) => (
                <option key={department.id} value={department.id}>
                  {getDepartmentLabel(department)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {audience === 'employee' ? (
          <div className="admin-editor-field">
            <label htmlFor="push-employee">{t('admin.push.employee')}</label>
            <select
              id="push-employee"
              onChange={(event) => setEmployeeId(event.target.value)}
              value={employeeId}
            >
              <option value="">{t('admin.push.selectEmployee')}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name.en}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {useCustomMessage ? (
          <>
            <div className="admin-editor-field">
              <label htmlFor="push-title">{t('admin.push.customTitle')}</label>
              <input
                id="push-title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('admin.push.customTitlePlaceholder')}
                type="text"
                value={title}
              />
            </div>
            <div className="admin-editor-field">
              <label htmlFor="push-body">{t('admin.push.customBody')}</label>
              <textarea
                id="push-body"
                onChange={(event) => setBody(event.target.value)}
                placeholder={t('admin.push.customBodyPlaceholder')}
                rows={5}
                value={body}
              />
            </div>
            <p>{t('admin.push.nameTokenHint')}</p>
          </>
        ) : (
          <p>{t('admin.push.shiftTemplateHint')}</p>
        )}

        {error ? <p role="alert">{error}</p> : null}
        {message ? <p>{message}</p> : null}

        <button
          className="admin-editor-btn"
          disabled={isSending || isLoading}
          onClick={() => void handleSend()}
          type="button"
        >
          {isSending ? t('common.loading') : t('admin.push.sendNow')}
        </button>
      </div>

      <div className="admin-editor-panel">
        <h2>{t('admin.push.historyTitle')}</h2>
        {isLoading ? (
          <p>{t('common.loading')}</p>
        ) : history.length === 0 ? (
          <p>{t('admin.push.historyEmpty')}</p>
        ) : (
          <table className="admin-editor-table">
            <thead>
              <tr>
                <th>{t('admin.push.colEmployee')}</th>
                <th>{t('admin.push.colDate')}</th>
                <th>{t('admin.push.colTime')}</th>
                <th>{t('admin.push.colShift')}</th>
                <th>{t('admin.push.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.employee_name_en ?? row.laundry_employee_id ?? '—'}</td>
                  <td>{row.target_date}</td>
                  <td>{formatHistoryTime(row.sent_at ?? row.created_at)}</td>
                  <td>
                    {[row.shift_period, row.department_en, row.start_time]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td>
                    {row.status === 'sent'
                      ? t('admin.push.statusSent')
                      : row.status === 'failed'
                        ? t('admin.push.statusFailed')
                        : row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
