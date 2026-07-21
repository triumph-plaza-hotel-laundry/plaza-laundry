import { X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  computeLeaveTotalDays,
  type LeaveEntry,
  type LeaveStatus,
  type LeaveType,
} from '@/data/laundry-leaves';
import { useLanguage, useEmployees } from '@/hooks';
import type { TranslationKey } from '@/types/language';

type LeaveModalProps = {
  isOpen: boolean;
  slotId: string;
  entry: LeaveEntry | null;
  canManage: boolean;
  onClose: () => void;
  onSave: (input: {
    slotId: string;
    employeeId: string;
    employeeName: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
    status?: LeaveStatus;
    entryId?: string;
  }) => void;
};

const leaveTypeKeys: Record<LeaveType, TranslationKey> = {
  annual: 'shifts.leaves.types.annual',
  sick: 'shifts.leaves.types.sick',
  emergency: 'shifts.leaves.types.emergency',
  unpaid: 'shifts.leaves.types.unpaid',
  other: 'shifts.leaves.types.other',
};

const statusKeys: Record<LeaveStatus, TranslationKey> = {
  pending: 'shifts.leaves.status.pending',
  approved: 'shifts.leaves.status.approved',
  rejected: 'shifts.leaves.status.rejected',
};

function formatDateTime(value: string, language: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function LeaveModal({
  isOpen,
  slotId,
  entry,
  canManage,
  onClose,
  onSave,
}: LeaveModalProps) {
  const { language, t } = useLanguage();
  const { employees } = useEmployees();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeaveStatus>('pending');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEmployeeId(entry?.employeeId ?? employees[0]?.id ?? '');
    setLeaveType(entry?.leaveType ?? 'annual');
    setStartDate(entry?.startDate ?? '');
    setEndDate(entry?.endDate ?? '');
    setReason(entry?.reason ?? '');
    setNotes(entry?.notes ?? '');
    setStatus(entry?.status ?? 'pending');
    setError('');
  }, [employees, entry, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const totalDays = computeLeaveTotalDays(startDate, endDate);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const employee = employees.find((item) => item.id === employeeId);
    if (!employee || !startDate || !endDate || !reason.trim()) {
      setError(t('shifts.leaves.validationRequired'));
      return;
    }

    if (totalDays <= 0) {
      setError(t('shifts.leaves.validationDates'));
      return;
    }

    const employeeName =
      language === 'ar' ? employee.name.ar : employee.name.en;
    onSave({
      slotId,
      employeeId: employee.id,
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      notes: notes.trim(),
      status: canManage ? status : undefined,
      entryId: entry?.id,
    });
    onClose();
  };

  return (
    <div
      className="leave-modal__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby="leave-modal-title"
        aria-modal="true"
        className="leave-modal"
        role="dialog"
      >
        <header className="leave-modal__header">
          <h2 id="leave-modal-title">
            {entry ? t('shifts.leaves.editLeave') : t('shifts.leaves.addLeave')}
          </h2>
          <button
            aria-label={t('shifts.closeSchedule')}
            className="leave-modal__close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <form className="leave-modal__form" onSubmit={handleSubmit}>
          <label className="leave-modal__field">
            <span>{t('shifts.leaves.employeeName')}</span>
            <select
              disabled={!canManage}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              value={employeeId}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {language === 'ar' ? employee.name.ar : employee.name.en}
                </option>
              ))}
            </select>
          </label>

          <label className="leave-modal__field">
            <span>{t('shifts.leaves.leaveType')}</span>
            <select
              disabled={!canManage}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              value={leaveType}
            >
              {(Object.keys(leaveTypeKeys) as LeaveType[]).map((type) => (
                <option key={type} value={type}>
                  {t(leaveTypeKeys[type])}
                </option>
              ))}
            </select>
          </label>

          <div className="leave-modal__row">
            <label className="leave-modal__field">
              <span>{t('shifts.leaves.startDate')}</span>
              <input
                disabled={!canManage}
                onChange={(e) => setStartDate(e.target.value)}
                required
                type="date"
                value={startDate}
              />
            </label>
            <label className="leave-modal__field">
              <span>{t('shifts.leaves.endDate')}</span>
              <input
                disabled={!canManage}
                onChange={(e) => setEndDate(e.target.value)}
                required
                type="date"
                value={endDate}
              />
            </label>
          </div>

          <p className="leave-modal__hint">
            {t('shifts.leaves.totalDays')}: {totalDays > 0 ? totalDays : '—'}
          </p>

          <label className="leave-modal__field">
            <span>{t('shifts.leaves.reason')}</span>
            <textarea
              disabled={!canManage}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              value={reason}
            />
          </label>

          <label className="leave-modal__field">
            <span>{t('shifts.leaves.notes')}</span>
            <textarea
              disabled={!canManage}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              value={notes}
            />
          </label>

          {canManage ? (
            <label className="leave-modal__field">
              <span>{t('shifts.leaves.statusLabel')}</span>
              <select
                onChange={(e) => setStatus(e.target.value as LeaveStatus)}
                value={status}
              >
                {(Object.keys(statusKeys) as LeaveStatus[]).map((item) => (
                  <option key={item} value={item}>
                    {t(statusKeys[item])}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {entry ? (
            <>
              <p className="leave-modal__meta">
                {t('shifts.leaves.approvedBy')}: {entry.approvedBy || '—'}
              </p>
              <p className="leave-modal__meta">
                {t('shifts.leaves.approvalDate')}:{' '}
                {formatDateTime(entry.approvalDate, language)}
              </p>
            </>
          ) : null}

          {error ? <p className="leave-modal__error">{error}</p> : null}

          {canManage ? (
            <button className="leave-modal__submit" type="submit">
              {t('shifts.leaves.save')}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
