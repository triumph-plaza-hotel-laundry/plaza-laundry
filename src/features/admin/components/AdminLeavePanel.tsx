import { useMemo, useState } from 'react';
import { CalendarOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { LeaveModal } from '@/components/leaves/LeaveModal';
import {
  computeLeaveTotalDays,
  LEAVE_SLOT_COUNT,
  type LeaveEntry,
  type LeaveSlot,
  type LeaveStatus,
  type LeavesState,
} from '@/data/laundry-leaves';
import type { SaveLeaveInput } from '@/data/repositories';
import { useLanguage, usePermissions } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/shifts/shifts-page.css';

const statusKeys: Record<LeaveStatus, TranslationKey> = {
  pending: 'shifts.leaves.status.pending',
  approved: 'shifts.leaves.status.approved',
  rejected: 'shifts.leaves.status.rejected',
};

const leaveTypeKeys: Record<LeaveEntry['leaveType'], TranslationKey> = {
  annual: 'shifts.leaves.types.annual',
  sick: 'shifts.leaves.types.sick',
  emergency: 'shifts.leaves.types.emergency',
  unpaid: 'shifts.leaves.types.unpaid',
  other: 'shifts.leaves.types.other',
};

function formatDate(value: string, language: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string, language: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

type AdminLeavePanelProps = {
  draft: LeavesState;
  onDraftChange: (next: LeavesState) => void;
  actorName: string;
  actorId?: string;
};

function saveLeaveToDraft(
  draft: LeavesState,
  input: SaveLeaveInput,
  actor: { id?: string; displayName?: string; username?: string },
): LeavesState {
  const totalDays = computeLeaveTotalDays(input.startDate, input.endDate);
  if (totalDays <= 0) {
    throw new Error('Invalid leave dates');
  }

  const existingSlot = draft.slots.find((slot) => slot.slotId === input.slotId);
  if (!existingSlot) {
    throw new Error('Leave slot not found');
  }

  const nextStatus = input.status ?? existingSlot.entry?.status ?? 'pending';
  const wasApproved = existingSlot.entry?.status === 'approved';
  const isNowApproved = nextStatus === 'approved';

  const entry: LeaveEntry = {
    id: input.entryId ?? crypto.randomUUID(),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    totalDays,
    reason: input.reason.trim(),
    notes: (input.notes ?? existingSlot.entry?.notes ?? '').trim(),
    status: nextStatus,
    approvedBy:
      isNowApproved && !wasApproved
        ? actor.displayName || actor.username || 'Admin'
        : (existingSlot.entry?.approvedBy ?? ''),
    approvalDate:
      isNowApproved && !wasApproved
        ? new Date().toISOString()
        : nextStatus === 'pending'
          ? ''
          : (existingSlot.entry?.approvalDate ?? ''),
    requesterUserId: existingSlot.entry?.requesterUserId ?? actor.id ?? '',
    createdAt: existingSlot.entry?.createdAt ?? new Date().toISOString(),
  };

  return {
    slots: draft.slots.map((slot) => (slot.slotId === input.slotId ? { ...slot, entry } : slot)),
  };
}

function setLeaveStatusInDraft(
  draft: LeavesState,
  slotId: string,
  status: LeaveStatus,
  actor: { displayName?: string; username?: string },
): LeavesState {
  const slot = draft.slots.find((item) => item.slotId === slotId);
  if (!slot?.entry) {
    return draft;
  }

  const approver = actor.displayName || actor.username || 'Admin';
  const entry: LeaveEntry = {
    ...slot.entry,
    status,
    approvedBy: status === 'pending' ? '' : approver,
    approvalDate: status === 'pending' ? '' : new Date().toISOString(),
  };

  return {
    slots: draft.slots.map((item) => (item.slotId === slotId ? { ...item, entry } : item)),
  };
}

function deleteLeaveFromDraft(draft: LeavesState, slotId: string): LeavesState {
  return {
    slots: draft.slots.map((item) => (item.slotId === slotId ? { ...item, entry: null } : item)),
  };
}

export function AdminLeavePanel({ draft, onDraftChange, actorName, actorId }: AdminLeavePanelProps) {
  const { language, t } = useLanguage();
  const canManage = usePermissions().forResource('leaves').canManage;
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const displaySlots = useMemo(() => draft.slots.slice(0, LEAVE_SLOT_COUNT), [draft.slots]);
  const activeSlot = draft.slots.find((slot) => slot.slotId === activeSlotId) ?? null;
  const actor = { id: actorId, displayName: actorName, username: actorName };

  const openAdd = (slotId: string) => {
    setActiveSlotId(slotId);
    setModalOpen(true);
  };

  const openEdit = (slotId: string) => {
    setActiveSlotId(slotId);
    setModalOpen(true);
  };

  const handleDelete = (slotId: string) => {
    onDraftChange(deleteLeaveFromDraft(draft, slotId));
  };

  const handleApprove = (slotId: string) => {
    onDraftChange(setLeaveStatusInDraft(draft, slotId, 'approved', actor));
  };

  const handleReject = (slotId: string) => {
    onDraftChange(setLeaveStatusInDraft(draft, slotId, 'rejected', actor));
  };

  const handleSave = (input: SaveLeaveInput) => {
    try {
      onDraftChange(saveLeaveToDraft(draft, input, actor));
    } catch {
      return;
    }
  };

  return (
    <section aria-label={t('admin.leaves.title')} className="leave-panel admin-leaves">
      <header className="leave-panel__header">
        <div className="leave-panel__title-wrap">
          <CalendarOff aria-hidden="true" className="leave-panel__icon" size={20} strokeWidth={1.5} />
          <div>
            <h2 className="leave-panel__title-en">{t('admin.leaves.title')}</h2>
            <p className="leave-panel__subtitle">{t('admin.leaves.subtitle')}</p>
          </div>
        </div>
        <span className="leave-panel__count">
          {t('shifts.leaves.slots')}: {LEAVE_SLOT_COUNT}
        </span>
      </header>

      <div className="leave-panel__grid">
        {displaySlots.map((slot, index) => (
          <AdminLeaveCard
            canManage={canManage}
            index={index}
            key={slot.slotId}
            language={language}
            onAdd={() => openAdd(slot.slotId)}
            onApprove={() => handleApprove(slot.slotId)}
            onDelete={() => handleDelete(slot.slotId)}
            onEdit={() => openEdit(slot.slotId)}
            onReject={() => handleReject(slot.slotId)}
            slot={slot}
            t={t}
          />
        ))}
      </div>

      <LeaveModal
        canManage={canManage}
        entry={activeSlot?.entry ?? null}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveSlotId(null);
        }}
        onSave={handleSave}
        slotId={activeSlotId ?? ''}
      />
    </section>
  );
}

type AdminLeaveCardProps = {
  canManage: boolean;
  index: number;
  language: string;
  onAdd: () => void;
  onApprove: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReject: () => void;
  slot: LeaveSlot;
  t: (key: TranslationKey) => string;
};

function AdminLeaveCard({
  canManage,
  index,
  language,
  onAdd,
  onApprove,
  onDelete,
  onEdit,
  onReject,
  slot,
  t,
}: AdminLeaveCardProps) {
  const entry = slot.entry;

  if (!entry) {
    return (
      <article className="leave-card leave-card--empty">
        <p className="leave-card__slot-label">
          {t('shifts.leaves.slot')} {index + 1}
        </p>
        <p className="leave-card__empty-text">{t('shifts.leaves.emptySlot')}</p>
        {canManage ? (
          <button className="leave-card__add-btn" onClick={onAdd} type="button">
            <Plus size={14} />
            {t('shifts.leaves.addLeave')}
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <article className={`leave-card leave-card--${entry.status}`}>
      <div className="leave-card__top">
        <p className="leave-card__slot-label">
          {t('shifts.leaves.slot')} {index + 1}
        </p>
        <span className={`leave-card__status leave-card__status--${entry.status}`}>
          {t(statusKeys[entry.status])}
        </span>
      </div>

      <dl className="leave-card__details">
        <div>
          <dt>{t('shifts.leaves.employeeName')}</dt>
          <dd>{entry.employeeName}</dd>
        </div>
        <div>
          <dt>{t('shifts.leaves.leaveType')}</dt>
          <dd>{t(leaveTypeKeys[entry.leaveType])}</dd>
        </div>
        <div>
          <dt>{t('shifts.leaves.startDate')}</dt>
          <dd>{formatDate(entry.startDate, language)}</dd>
        </div>
        <div>
          <dt>{t('shifts.leaves.endDate')}</dt>
          <dd>{formatDate(entry.endDate, language)}</dd>
        </div>
        <div>
          <dt>{t('shifts.leaves.totalDays')}</dt>
          <dd>{entry.totalDays}</dd>
        </div>
        <div className="leave-card__wide">
          <dt>{t('shifts.leaves.reason')}</dt>
          <dd>{entry.reason}</dd>
        </div>
        <div className="leave-card__wide">
          <dt>{t('shifts.leaves.notes')}</dt>
          <dd>{entry.notes || '—'}</dd>
        </div>
        <div>
          <dt>{t('shifts.leaves.approvedBy')}</dt>
          <dd>{entry.approvedBy || '—'}</dd>
        </div>
        <div>
          <dt>{t('shifts.leaves.approvalDate')}</dt>
          <dd>{formatDateTime(entry.approvalDate, language)}</dd>
        </div>
      </dl>

      {canManage ? (
        <div className="leave-card__actions">
          <button className="leave-card__action" onClick={onEdit} type="button">
            <Pencil size={14} />
            {t('shifts.leaves.edit')}
          </button>
          <button className="leave-card__action leave-card__action--danger" onClick={onDelete} type="button">
            <Trash2 size={14} />
            {t('shifts.leaves.delete')}
          </button>
          {entry.status === 'pending' ? (
            <>
              <button className="leave-card__action leave-card__action--approve" onClick={onApprove} type="button">
                {t('shifts.leaves.approve')}
              </button>
              <button className="leave-card__action leave-card__action--reject" onClick={onReject} type="button">
                {t('shifts.leaves.reject')}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
