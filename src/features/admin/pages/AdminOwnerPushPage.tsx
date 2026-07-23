import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Filter,
  Info,
  MessageSquarePlus,
  Power,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { employeesRepository } from '@/data/repositories/employees-repository';
import {
  getShiftReminderTime,
  setShiftReminderTime,
} from '@/data/repositories/app-settings-repository';
import type { LaundryEmployee } from '@/data/laundry-employees';
import {
  buildEmployeeDepartmentTargets,
  type StaffDepartmentGroup,
} from '@/lib/employees-org-chart';
import {
  DEFAULT_SHIFT_REMINDER_TIME,
  SHIFT_REMINDER_TIMEZONE,
} from '@/lib/app-settings/constants';
import {
  getEmployeesForShiftTomorrow,
  getTomorrowCairoDateKey,
} from '@/lib/shift-reminders';
import {
  deleteAllPushNotificationHistory,
  deletePushNotificationHistoryByIds,
  listPushNotificationHistory,
  type PushNotificationHistoryRow,
} from '@/lib/shift-reminders/push-history-repository';
import {
  sendManualShiftPush,
  type ManualPushAudience,
} from '@/lib/shift-reminders/shift-push-service';
import { shiftsRepository } from '@/data/repositories/shifts-repository';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-owner-push.css';

const AUDIENCE_OPTIONS: Array<{
  value: ManualPushAudience;
  label: string;
}> = [
  { value: 'everyone', label: 'الجميع' },
  { value: 'department', label: 'قسم' },
  { value: 'employee', label: 'موظف' },
  { value: 'shift_tomorrow', label: 'موظفو شفت الغد' },
];

function formatCairoDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: SHIFT_REMINDER_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatCairoTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: SHIFT_REMINDER_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCairoDayKey(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHIFT_REMINDER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function statusBadge(status: string, sentLabel: string, failedLabel: string) {
  if (status === 'sent') {
    return <span className="ap-badge ap-badge--sent">{sentLabel}</span>;
  }
  if (status === 'failed') {
    return <span className="ap-badge ap-badge--failed">{failedLabel}</span>;
  }
  return <span className="ap-badge ap-badge--pending">{status}</span>;
}

function GoldIcon({ children }: { children: ReactNode }) {
  return <span className="ap-icon-wrap">{children}</span>;
}

export function AdminOwnerPushPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [employees, setEmployees] = useState<LaundryEmployee[]>([]);
  const [shiftTomorrowCount, setShiftTomorrowCount] = useState(0);
  const [history, setHistory] = useState<PushNotificationHistoryRow[]>([]);
  const [audience, setAudience] = useState<ManualPushAudience>('everyone');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>(
    'all',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [scheduleInfoOpen, setScheduleInfoOpen] = useState(false);
  const [viewRow, setViewRow] = useState<PushNotificationHistoryRow | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<
    null | 'selected' | 'all' | string
  >(null);
  const [autoEnabledUi, setAutoEnabledUi] = useState(true);
  const [reminderTime, setReminderTime] = useState(DEFAULT_SHIFT_REMINDER_TIME);
  const [draftReminderTime, setDraftReminderTime] = useState(
    DEFAULT_SHIFT_REMINDER_TIME,
  );
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      const [employeeList, shifts, loadedReminderTime] = await Promise.all([
        Promise.resolve(employeesRepository.getSnapshot()),
        Promise.resolve(shiftsRepository.getSnapshot()),
        getShiftReminderTime(),
      ]);
      setEmployees(employeeList);
      setReminderTime(loadedReminderTime);
      setDraftReminderTime(loadedReminderTime);
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
        loadError instanceof Error
          ? loadError.message
          : t('admin.push.saveFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openScheduleDialog = useCallback(() => {
    setDraftReminderTime(reminderTime);
    setScheduleError(null);
    setScheduleInfoOpen(true);
  }, [reminderTime]);

  const handleSaveReminderTime = useCallback(async () => {
    setIsSavingSchedule(true);
    setScheduleError(null);
    try {
      const saved = await setShiftReminderTime(draftReminderTime);
      setReminderTime(saved);
      setDraftReminderTime(saved);
      setScheduleInfoOpen(false);
      setToast('Notification send time updated successfully.');
    } catch (saveError) {
      setScheduleError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to update send time.',
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }, [draftReminderTime]);

  const visibleHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        row.employee_name_en,
        row.employee_name_ar,
        row.title_en,
        row.body_en,
        row.department_en,
        row.audience,
        row.status,
        row.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [history, search, statusFilter]);

  const todaySentCount = useMemo(() => {
    const todayKey = formatCairoDayKey(new Date().toISOString());
    return history.filter((row) => {
      const stamp = row.sent_at ?? row.created_at;
      return (
        row.status === 'sent' && stamp && formatCairoDayKey(stamp) === todayKey
      );
    }).length;
  }, [history]);

  const lastSuccessful = useMemo(() => {
    const sent = history.find((row) => row.status === 'sent' && row.sent_at);
    return sent?.sent_at ?? null;
  }, [history]);

  const recipientCount = useMemo(() => {
    if (audience === 'everyone') return employees.length;
    if (audience === 'shift_tomorrow') return shiftTomorrowCount;
    if (audience === 'employee') return employeeId ? 1 : 0;
    if (audience === 'department') {
      const dept = departmentTargets.find((item) => item.id === departmentId);
      return dept?.employees.length ?? 0;
    }
    return 0;
  }, [
    audience,
    employees.length,
    shiftTomorrowCount,
    employeeId,
    departmentId,
    departmentTargets,
  ]);

  const timelineItems = useMemo(() => {
    const groups = new Map<string, { label: string; count: number; manual: number }>();
    const todayKey = formatCairoDayKey(new Date().toISOString());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatCairoDayKey(yesterday.toISOString());

    for (const row of history) {
      if (row.status !== 'sent') continue;
      const stamp = row.sent_at ?? row.created_at;
      if (!stamp) continue;
      const key = formatCairoDayKey(stamp);
      const current = groups.get(key) ?? { label: key, count: 0, manual: 0 };
      current.count += 1;
      if (row.type === 'shift_manual') current.manual += 1;
      groups.set(key, current);
    }

        return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 6)
      .map(([key, value]) => {
        let label = key;
        if (key === todayKey) label = 'اليوم';
        else if (key === yesterdayKey) label = 'أمس';
        else {
          label = formatCairoDate(`${key}T12:00:00`);
        }
        const text =
          value.manual > 0 && value.manual === value.count
            ? `تم إرسال إشعار يدوي (${value.count})`
            : `تم إرسال ${value.count} إشعار`;
        return { key, label, text };
      });
  }, [history]);

  const useCustomMessage =
    audience === 'everyone' ||
    audience === 'department' ||
    audience === 'employee';

  const previewTitle =
    title.trim() ||
    (audience === 'shift_tomorrow'
      ? '📅 تذكير بشفت الغد'
      : 'إشعار من الإدارة');
  const previewBody =
    body.trim() ||
    (audience === 'shift_tomorrow'
      ? 'رسالة تذكير شفت الغد حسب القالب التلقائي'
      : '—');

  const handleSend = async () => {
    if (!user) return;
    setError(null);
    setMessage(null);
    setIsSending(true);
    setConfirmSendOpen(false);

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
        sendError instanceof Error
          ? sendError.message
          : t('admin.push.saveFailed'),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (row: PushNotificationHistoryRow) => {
    if (!user) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await sendManualShiftPush({
        ownerId: user.id,
        audience: row.laundry_employee_id ? 'employee' : 'shift_tomorrow',
        employeeId: row.laundry_employee_id ?? undefined,
        title: row.title_en || undefined,
        body: row.body_en || undefined,
      });
      if (!result.ok) {
        throw new Error(result.error ?? t('admin.push.saveFailed'));
      }
      setMessage('تمت إعادة الإرسال');
      await refresh();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : t('admin.push.saveFailed'),
      );
    } finally {
      setIsSending(false);
    }
  };

  const refreshHistoryOnly = useCallback(async () => {
    try {
      const historyRows = await listPushNotificationHistory();
      setHistory(historyRows);
      setError(null);
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : t('admin.push.saveFailed'),
      );
    }
  }, [t]);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setError(null);
    setMessage(null);
    const mode = deleteConfirm;
    setDeleteConfirm(null);

    try {
      if (mode === 'all') {
        await deleteAllPushNotificationHistory();
        setSelectedIds([]);
        setMessage('تم حذف السجل نهائيًا.');
      } else if (mode === 'selected') {
        await deletePushNotificationHistoryByIds(selectedIds);
        setSelectedIds([]);
        setMessage('تم حذف السجلات المحددة نهائيًا.');
      } else {
        await deletePushNotificationHistoryByIds([mode]);
        setSelectedIds((prev) => prev.filter((id) => id !== mode));
        setMessage('تم حذف السجل نهائيًا.');
      }
      await refreshHistoryOnly();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'تعذر حذف سجل الإشعارات.',
      );
    }
  };

  const exportCsv = () => {
    const headers = [
      'date',
      'time',
      'recipient',
      'type',
      'status',
      'title',
    ];
    const lines = visibleHistory.map((row) => {
      const stamp = row.sent_at ?? row.created_at;
      return [
        formatCairoDate(stamp),
        formatCairoTime(stamp),
        row.employee_name_ar || row.employee_name_en || row.audience || '',
        row.type,
        row.status,
        `"${(row.title_en || '').replaceAll('"', '""')}"`,
      ].join(',');
    });
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `push-history-${tomorrowKey}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const canSend =
    !isSending &&
    !isLoading &&
    (audience !== 'department' || Boolean(departmentId)) &&
    (audience !== 'employee' || Boolean(employeeId));

  return (
    <section className="admin-push-page mx-auto" dir="rtl" lang="ar">
      {toast ? (
        <div className="ap-toast" role="status">
          <CheckCircle2 className="ap-icon" size={18} strokeWidth={1.75} />
          <span>{toast}</span>
        </div>
      ) : null}
      <header className="ap-hero">
        <div className="ap-hero__icon">
          <GoldIcon>
            <Bell className="ap-icon" size={20} strokeWidth={1.75} />
          </GoldIcon>
        </div>
        <div className="ap-hero__text">
          <h1>إدارة إشعارات الشفتات</h1>
          <p>إدارة وإرسال إشعارات الموظفين بسهولة واحترافية.</p>
        </div>
      </header>

      <div className="ap-stats">
        <article className="ap-stat">
          <div className="ap-stat__top">
            <Users className="ap-icon" size={18} strokeWidth={1.75} />
            <p className="ap-stat__label">إجمالي الموظفين</p>
          </div>
          <p className="ap-stat__value">{employees.length}</p>
          <p className="ap-stat__hint">المسجلون في النظام</p>
        </article>
        <article className="ap-stat">
          <div className="ap-stat__top">
            <Send className="ap-icon" size={18} strokeWidth={1.75} />
            <p className="ap-stat__label">إشعارات اليوم</p>
          </div>
          <p className="ap-stat__value">{todaySentCount}</p>
          <p className="ap-stat__hint">عمليات إرسال ناجحة اليوم</p>
        </article>
        <article className="ap-stat">
          <div className="ap-stat__top">
            <Clock3 className="ap-icon" size={18} strokeWidth={1.75} />
            <p className="ap-stat__label">موعد الإرسال التلقائي</p>
          </div>
          <p className="ap-stat__value">{reminderTime}</p>
          <p className="ap-stat__hint">{SHIFT_REMINDER_TIMEZONE}</p>
        </article>
        <article className="ap-stat">
          <div className="ap-stat__top">
            <CheckCircle2 className="ap-icon" size={18} strokeWidth={1.75} />
            <p className="ap-stat__label">آخر إرسال ناجح</p>
          </div>
          <p className="ap-stat__value ap-stat__value--compact">
            {lastSuccessful ? formatCairoTime(lastSuccessful) : '—'}
          </p>
          <p className="ap-stat__hint">
            {lastSuccessful ? formatCairoDate(lastSuccessful) : 'لا يوجد بعد'}
          </p>
        </article>
      </div>

      <div className="ap-grid">
        <section className="ap-card">
          <div className="ap-card__head">
            <Clock3 className="ap-icon" size={24} strokeWidth={1.75} />
            <h2>الإشعارات التلقائية</h2>
          </div>
          <div className="ap-meta">
            <div className="ap-meta__row">
              <span>الحالة</span>
              {autoEnabledUi ? (
                <span className="ap-badge ap-badge--ok">نشط</span>
              ) : (
                <span className="ap-badge ap-badge--off">متوقف (واجهة)</span>
              )}
            </div>
            <div className="ap-meta__row">
              <span>وقت الإرسال</span>
              <strong>{reminderTime}</strong>
            </div>
            <div className="ap-meta__row">
              <span>المنطقة الزمنية</span>
              <strong>{SHIFT_REMINDER_TIMEZONE}</strong>
            </div>
            <div className="ap-meta__row">
              <span>شفت الغد</span>
              <strong>
                {shiftTomorrowCount} · {tomorrowKey}
              </strong>
            </div>
          </div>
          <div className="ap-actions">
            <button
              className="ap-btn"
              onClick={() => {
                setAutoEnabledUi((value) => !value);
                openScheduleDialog();
              }}
              type="button"
            >
              <Power className="ap-icon" size={22} strokeWidth={1.75} />
              {autoEnabledUi ? 'إيقاف' : 'تشغيل'}
            </button>
            <button
              className="ap-btn"
              onClick={openScheduleDialog}
              type="button"
            >
              <Calendar className="ap-icon" size={22} strokeWidth={1.75} />
              تغيير وقت الإرسال
            </button>
          </div>
        </section>

        <section className="ap-card">
          <div className="ap-card__head">
            <MessageSquarePlus className="ap-icon" size={24} strokeWidth={1.75} />
            <h2>إشعار يدوي</h2>
          </div>

          <div className="ap-audience" role="group" aria-label="المستلم">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                className={`ap-audience__chip${audience === option.value ? ' is-active' : ''}`}
                key={option.value}
                onClick={() => setAudience(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {audience === 'department' ? (
            <div className="ap-field">
              <label htmlFor="push-department">القسم</label>
              <select
                id="push-department"
                onChange={(event) => setDepartmentId(event.target.value)}
                value={departmentId}
              >
                <option value="">اختر القسم…</option>
                {departmentTargets.map((department) => (
                  <option key={department.id} value={department.id}>
                    {getDepartmentLabel(department)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {audience === 'employee' ? (
            <div className="ap-field">
              <label htmlFor="push-employee">الموظف</label>
              <select
                id="push-employee"
                onChange={(event) => setEmployeeId(event.target.value)}
                value={employeeId}
              >
                <option value="">اختر الموظف…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {language === 'ar' ? employee.name.ar : employee.name.en}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {useCustomMessage ? (
            <>
              <div className="ap-field">
                <label htmlFor="push-title">العنوان</label>
                <input
                  id="push-title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="عنوان الإشعار"
                  type="text"
                  value={title}
                />
              </div>
              <div className="ap-field">
                <label htmlFor="push-body">الرسالة</label>
                <textarea
                  id="push-body"
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="نص الإشعار… يمكنك استخدام {name}"
                  rows={4}
                  value={body}
                />
              </div>
            </>
          ) : null}

          {error ? (
            <p className="ap-alert ap-alert--error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="ap-alert ap-alert--ok">{message}</p> : null}

          <button
            className="ap-btn ap-btn--gold"
            disabled={!canSend}
            onClick={() => setConfirmSendOpen(true)}
            type="button"
          >
            <Send className="ap-icon" size={22} strokeWidth={1.75} />
            {isSending ? 'جاري الإرسال…' : 'إرسال الإشعار'}
          </button>
        </section>
      </div>

      <section className="ap-card">
        <div className="ap-card__head">
          <Bell className="ap-icon" size={24} strokeWidth={1.75} />
          <h2>سجل الإشعارات</h2>
        </div>

        <div className="ap-toolbar">
          <label className="ap-toolbar__search">
            <Search className="ap-icon" size={22} strokeWidth={1.75} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث…"
              value={search}
            />
          </label>
          <label className="ap-field" style={{ margin: 0, minWidth: '9rem' }}>
            <span style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
              <Filter className="ap-icon" size={22} strokeWidth={1.75} />
              <select
                aria-label="فلترة الحالة"
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | 'sent' | 'failed')
                }
                value={statusFilter}
              >
                <option value="all">الكل</option>
                <option value="sent">أُرسل</option>
                <option value="failed">فشل</option>
              </select>
            </span>
          </label>
          <button className="ap-btn" onClick={exportCsv} type="button">
            <Download className="ap-icon" size={22} strokeWidth={1.75} />
            تصدير
          </button>
          <button
            className="ap-btn ap-btn--danger"
            disabled={selectedIds.length === 0}
            onClick={() => setDeleteConfirm('selected')}
            type="button"
          >
            <Trash2 className="ap-icon" size={22} strokeWidth={1.75} />
            حذف المحدد
          </button>
          <button
            className="ap-btn ap-btn--danger"
            disabled={visibleHistory.length === 0}
            onClick={() => setDeleteConfirm('all')}
            type="button"
          >
            <Trash2 className="ap-icon" size={22} strokeWidth={1.75} />
            حذف كل السجل
          </button>
        </div>

        {isLoading ? (
          <p className="ap-empty">جاري التحميل…</p>
        ) : visibleHistory.length === 0 ? (
          <p className="ap-empty">{t('admin.push.historyEmpty')}</p>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="تحديد الكل"
                      checked={
                        visibleHistory.length > 0 &&
                        visibleHistory.every((row) =>
                          selectedIds.includes(row.id),
                        )
                      }
                      onChange={(event) => {
                        setSelectedIds(
                          event.target.checked
                            ? visibleHistory.map((row) => row.id)
                            : [],
                        );
                      }}
                      type="checkbox"
                    />
                  </th>
                  <th>التاريخ</th>
                  <th>الوقت</th>
                  <th>المستلم</th>
                  <th>نوع الإشعار</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((row) => {
                  const stamp = row.sent_at ?? row.created_at;
                  return (
                    <tr key={row.id}>
                      <td>
                        <input
                          aria-label="تحديد الصف"
                          checked={selectedIds.includes(row.id)}
                          onChange={(event) => {
                            setSelectedIds((prev) =>
                              event.target.checked
                                ? [...prev, row.id]
                                : prev.filter((id) => id !== row.id),
                            );
                          }}
                          type="checkbox"
                        />
                      </td>
                      <td>{formatCairoDate(stamp)}</td>
                      <td>{formatCairoTime(stamp)}</td>
                      <td>
                        {row.employee_name_ar ||
                          row.employee_name_en ||
                          row.audience ||
                          '—'}
                      </td>
                      <td>
                        {row.type === 'shift_manual' ? 'يدوي' : 'تلقائي'}
                      </td>
                      <td>
                        {statusBadge(
                          row.status,
                          t('admin.push.statusSent'),
                          t('admin.push.statusFailed'),
                        )}
                      </td>
                      <td>
                        <div className="ap-table__actions">
                          <button
                            aria-label="عرض"
                            className="ap-icon-btn"
                            onClick={() => setViewRow(row)}
                            type="button"
                          >
                            <Eye className="ap-icon" size={22} strokeWidth={1.75} />
                          </button>
                          <button
                            aria-label="إعادة إرسال"
                            className="ap-icon-btn"
                            disabled={isSending}
                            onClick={() => void handleResend(row)}
                            type="button"
                          >
                            <RotateCcw
                              className="ap-icon"
                              size={22}
                              strokeWidth={1.75}
                            />
                          </button>
                          <button
                            aria-label="حذف"
                            className="ap-icon-btn"
                            onClick={() => setDeleteConfirm(row.id)}
                            type="button"
                          >
                            <Trash2
                              className="ap-icon"
                              size={22}
                              strokeWidth={1.75}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ap-timeline">
        <div className="ap-card__head">
          <Clock3 className="ap-icon" size={24} strokeWidth={1.75} />
          <h2>الخط الزمني</h2>
        </div>
        {timelineItems.length === 0 ? (
          <p className="ap-empty">لا أحداث بعد.</p>
        ) : (
          <ul className="ap-timeline__list">
            {timelineItems.map((item) => (
              <li className="ap-timeline__item" key={item.key}>
                <span className="ap-timeline__dot" />
                <p className="ap-timeline__day">{item.label}</p>
                <p className="ap-timeline__meta">{item.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmSendOpen ? (
        <div className="ap-backdrop" role="dialog" aria-modal="true">
          <div className="ap-dialog">
            <h3>تأكيد الإرسال</h3>
            <div className="ap-dialog__preview">
              <p>
                العنوان: <strong>{previewTitle}</strong>
              </p>
              <p>
                الرسالة: <strong>{previewBody}</strong>
              </p>
              <p>
                عدد المستلمين: <strong>{recipientCount}</strong>
              </p>
            </div>
            <div className="ap-dialog__actions">
              <button
                className="ap-btn ap-btn--ghost"
                onClick={() => setConfirmSendOpen(false)}
                type="button"
              >
                إلغاء
              </button>
              <button
                className="ap-btn ap-btn--gold"
                disabled={isSending}
                onClick={() => void handleSend()}
                type="button"
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleInfoOpen ? (
        <div className="ap-backdrop" role="dialog" aria-modal="true">
          <div className="ap-dialog ap-dialog--schedule">
            <h3>جدولة الإرسال التلقائي</h3>
            <div className="ap-dialog__preview ap-dialog__schedule-card">
              <div className="ap-dialog__schedule-row">
                <span className="ap-dialog__schedule-label">
                  <Info className="ap-icon" size={16} strokeWidth={1.75} />
                  وقت الإرسال الحالي
                </span>
                <span className="ap-dialog__time-badge">{reminderTime}</span>
              </div>
              <p className="ap-dialog__tz">{SHIFT_REMINDER_TIMEZONE}</p>
              <label className="ap-dialog__time-field">
                <span>اختر وقتًا جديدًا</span>
                <input
                  type="time"
                  value={draftReminderTime}
                  onChange={(event) => setDraftReminderTime(event.target.value)}
                />
              </label>
              <p className="ap-dialog__schedule-note">
                يتم حفظ الوقت في Supabase ويُطبَّق تلقائيًا على جدولة إشعارات
                شفت الغد دون تعديل الكود.
              </p>
              {scheduleError ? (
                <p className="ap-alert ap-alert--error" role="alert">
                  {scheduleError}
                </p>
              ) : null}
            </div>
            <div className="ap-dialog__actions ap-dialog__actions--center">
              <button
                className="ap-btn ap-btn--ghost"
                disabled={isSavingSchedule}
                onClick={() => setScheduleInfoOpen(false)}
                type="button"
              >
                إلغاء
              </button>
              <button
                className="ap-btn ap-btn--gold ap-btn--dialog-ok"
                disabled={isSavingSchedule || !draftReminderTime}
                onClick={() => void handleSaveReminderTime()}
                type="button"
              >
                {isSavingSchedule ? 'جاري الحفظ…' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewRow ? (
        <div className="ap-backdrop" role="dialog" aria-modal="true">
          <div className="ap-dialog">
            <h3>تفاصيل الإشعار</h3>
            <div className="ap-dialog__preview">
              <p>
                المستلم:{' '}
                <strong>
                  {viewRow.employee_name_ar ||
                    viewRow.employee_name_en ||
                    '—'}
                </strong>
              </p>
              <p>
                العنوان: <strong>{viewRow.title_en || '—'}</strong>
              </p>
              <p>
                الرسالة: <strong>{viewRow.body_en || '—'}</strong>
              </p>
              <p>
                الحالة: <strong>{viewRow.status}</strong>
              </p>
              {viewRow.error_message ? (
                <p>
                  الخطأ: <strong>{viewRow.error_message}</strong>
                </p>
              ) : null}
            </div>
            <div className="ap-dialog__actions">
              <button
                className="ap-btn ap-btn--gold"
                onClick={() => setViewRow(null)}
                type="button"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <div className="ap-backdrop" role="dialog" aria-modal="true">
          <div className="ap-dialog">
            <h3>تأكيد الحذف</h3>
            <div className="ap-dialog__preview">
              <p>
                {deleteConfirm === 'all'
                  ? 'هل تريد حذف كل سجل إشعارات الشفت نهائيًا من قاعدة البيانات؟'
                  : deleteConfirm === 'selected'
                    ? 'هل تريد حذف السجلات المحددة نهائيًا من قاعدة البيانات؟'
                    : 'هل تريد حذف هذا السجل نهائيًا من قاعدة البيانات؟'}
              </p>
            </div>
            <div className="ap-dialog__actions">
              <button
                className="ap-btn ap-btn--ghost"
                onClick={() => setDeleteConfirm(null)}
                type="button"
              >
                إلغاء
              </button>
              <button
                className="ap-btn ap-btn--danger"
                onClick={() => void confirmDelete()}
                type="button"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
