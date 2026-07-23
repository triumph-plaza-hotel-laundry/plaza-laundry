import {
  ChevronDown,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { isPrimaryAdminAccount } from '@/features/auth/owner-protection';
import {
  listSpecialPermissionsForUser,
  setSpecialPermission,
  specialAdminPermissionsRepository,
  type SpecialAdminPermission,
} from '@/features/auth/special-admin-permissions';
import type { AuthUser } from '@/features/auth/types';
import {
  changeStoredOwnPassword,
  createStoredAdminUser,
  deleteStoredUser,
  ensureUsersStoreReady,
  listAdminManagedUsers,
  resetStoredAdminPassword,
  updateStoredAdminUser,
} from '@/features/auth/users';
import {
  hasDevicePermission,
  setDevicePermissions as saveDevicePermissions,
} from '@/features/employee-devices/device-permissions-service';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-settings.css';

type DialogMode =
  | null
  | 'add'
  | 'edit-name'
  | 'change-password'
  | 'delete'
  | 'own-password';

export function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user, logAction } = useAuth();
  const [admins, setAdmins] = useState<AuthUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [specialGrants, setSpecialGrants] = useState<
    Record<string, SpecialAdminPermission[]>
  >({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSuperAdmin = user ? isPrimaryAdminAccount(user) : false;
  const canManageAdminAccounts = isSuperAdmin;

  const selected = useMemo(
    () => admins.find((admin) => admin.id === selectedId) ?? null,
    [admins, selectedId],
  );

  const refreshAdmins = async () => {
    await ensureUsersStoreReady();
    setAdmins(await listAdminManagedUsers());
  };

  const refreshSpecialGrants = async () => {
    await specialAdminPermissionsRepository.hydrate();
    const listed = await listAdminManagedUsers();
    const next: Record<string, SpecialAdminPermission[]> = {};
    await Promise.all(
      listed.map(async (admin) => {
        const grants = new Set(listSpecialPermissionsForUser(admin.id));
        try {
          if (await hasDevicePermission(admin.id, 'devices.manage')) {
            grants.add('employee_devices');
          }
        } catch {
          // ignore legacy lookup failures
        }
        next[admin.id] = [...grants];
      }),
    );
    setSpecialGrants(next);
  };

  useEffect(() => {
    void refreshAdmins();
    void refreshSpecialGrants();
  }, []);

  useEffect(() => {
    return specialAdminPermissionsRepository.subscribe(() => {
      void refreshSpecialGrants();
    });
  }, []);

  const clearFormSecrets = () => {
    setPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
  };

  const openDialog = (mode: DialogMode, admin?: AuthUser) => {
    setError(null);
    setMessage(null);
    clearFormSecrets();
    if (admin) {
      setSelectedId(admin.id);
      setDisplayName(admin.displayName);
      setUsername(admin.username);
    } else {
      setSelectedId(null);
      setDisplayName('');
      setUsername('');
    }
    setDialog(mode);
  };

  const closeDialog = () => {
    setDialog(null);
    clearFormSecrets();
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (password !== confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createStoredAdminUser(user, {
        displayName,
        username,
        password,
        adminType: 'Admin',
      });
      logAction({
        action: 'admin.createUser',
        page: 'admin/settings',
        newValue: created,
      });
      setMessage(t('admin.settings.adminCreated'));
      closeDialog();
      await refreshAdmins();
      await refreshSpecialGrants();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditName = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selected) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateStoredAdminUser(user, selected.id, {
        displayName,
        username: isPrimaryAdminAccount(selected) ? undefined : username,
      });
      logAction({
        action: 'admin.updateUser',
        page: 'admin/settings',
        oldValue: selected,
        newValue: updated,
      });
      setMessage(t('admin.settings.adminUpdated'));
      closeDialog();
      await refreshAdmins();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selected) return;
    if (password !== confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await resetStoredAdminPassword(user, selected.id, password);
      logAction({
        action: 'admin.resetPassword',
        page: 'admin/settings',
        newValue: { id: selected.id },
      });
      setMessage(t('admin.settings.passwordReset'));
      closeDialog();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !selected || isPrimaryAdminAccount(selected)) return;

    setIsSaving(true);
    setError(null);
    try {
      await deleteStoredUser(user, selected.id);
      logAction({
        action: 'admin.deleteUser',
        page: 'admin/settings',
        oldValue: selected,
      });
      setMessage(t('admin.settings.adminDeleted'));
      closeDialog();
      setSelectedId(null);
      await refreshAdmins();
      await refreshSpecialGrants();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (admin: AuthUser) => {
    if (!user || isPrimaryAdminAccount(admin)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateStoredAdminUser(user, admin.id, {
        isActive: !admin.isActive,
      });
      logAction({
        action: updated.isActive ? 'admin.enableUser' : 'admin.disableUser',
        page: 'admin/settings',
        newValue: updated,
      });
      setMessage(
        updated.isActive
          ? t('admin.settings.enableAdmin')
          : t('admin.settings.disableAdmin'),
      );
      await refreshAdmins();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSpecial = async (
    admin: AuthUser,
    permission: SpecialAdminPermission,
    enabled: boolean,
  ) => {
    if (!user || !isSuperAdmin || isPrimaryAdminAccount(admin)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await setSpecialPermission(user, admin.id, permission, enabled);

      if (permission === 'employee_devices') {
        await saveDevicePermissions(
          user.id,
          admin.id,
          enabled ? ['devices.manage'] : [],
          user,
        );
      }

      logAction({
        action: 'admin.updateSpecialPermission',
        page: 'admin/settings',
        newValue: { userId: admin.id, permission, enabled },
      });
      setMessage(t('admin.settings.specialPermissionsSaved'));
      await refreshSpecialGrants();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeOwnPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (password !== confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await changeStoredOwnPassword(user, currentPassword, password);
      logAction({ action: 'admin.changeOwnPassword', page: 'admin/settings' });
      setMessage(t('admin.settings.ownPasswordChanged'));
      closeDialog();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t('admin.settings.saveFailed'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasGrant = (adminId: string, permission: SpecialAdminPermission) => {
    if (admins.find((a) => a.id === adminId && isPrimaryAdminAccount(a))) {
      return true;
    }
    return (specialGrants[adminId] ?? []).includes(permission);
  };

  return (
    <section className="admin-mgmt mx-auto" dir="auto">
      <header className="admin-mgmt__hero">
        <div className="admin-mgmt__hero-icon">
          <Shield size={22} strokeWidth={1.7} />
        </div>
        <div>
          <h1>{t('admin.settings.adminManagement')}</h1>
          <p>{t('admin.settings.subtitle')}</p>
        </div>
      </header>

      {error ? (
        <p className="admin-mgmt__alert admin-mgmt__alert--error">{error}</p>
      ) : null}
      {message ? (
        <p className="admin-mgmt__alert admin-mgmt__alert--ok">{message}</p>
      ) : null}

      <div className="admin-mgmt__toolbar">
        <button
          className="admin-mgmt__btn admin-mgmt__btn--gold"
          disabled={!canManageAdminAccounts}
          onClick={() => openDialog('add')}
          type="button"
        >
          <Plus size={18} strokeWidth={1.75} />
          {t('admin.settings.addAdmin')}
        </button>
      </div>

      <div className="admin-mgmt__accordion">
        {admins.map((admin) => {
          const primary = isPrimaryAdminAccount(admin);
          const expanded = expandedId === admin.id;
          return (
            <article
              className={
                expanded
                  ? 'admin-mgmt__acc-item is-open'
                  : 'admin-mgmt__acc-item'
              }
              key={admin.id}
            >
              <button
                aria-expanded={expanded}
                className="admin-mgmt__acc-row"
                onClick={() =>
                  setExpandedId((current) =>
                    current === admin.id ? null : admin.id,
                  )
                }
                type="button"
              >
                <div className="admin-mgmt__acc-main">
                  <span className="admin-mgmt__acc-name">
                    {admin.displayName}
                    {primary ? (
                      <span className="admin-mgmt__primary-tag">
                        {t('admin.settings.primary')}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={
                      admin.isActive
                        ? 'admin-mgmt__status admin-mgmt__status--on'
                        : 'admin-mgmt__status admin-mgmt__status--off'
                    }
                  >
                    {admin.isActive
                      ? t('admin.settings.active')
                      : t('admin.settings.disabled')}
                  </span>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  className="admin-mgmt__acc-chevron"
                  size={18}
                  strokeWidth={1.75}
                />
              </button>

              <div className="admin-mgmt__acc-panel">
                <div className="admin-mgmt__acc-panel-inner">
                  <div className="admin-mgmt__acc-card">
                    <div className="admin-mgmt__actions">
                      <button
                        className="admin-mgmt__action"
                        disabled={!canManageAdminAccounts}
                        onClick={() => openDialog('edit-name', admin)}
                        type="button"
                      >
                        <Pencil size={15} strokeWidth={1.75} />
                        {t('admin.settings.editName')}
                      </button>
                      <button
                        className="admin-mgmt__action"
                        disabled={!canManageAdminAccounts}
                        onClick={() => openDialog('change-password', admin)}
                        type="button"
                      >
                        <KeyRound size={15} strokeWidth={1.75} />
                        {t('admin.settings.changePassword')}
                      </button>
                      {!primary ? (
                        <>
                          <button
                            className="admin-mgmt__action"
                            disabled={!canManageAdminAccounts || isSaving}
                            onClick={() => void handleToggleActive(admin)}
                            type="button"
                          >
                            <Power size={15} strokeWidth={1.75} />
                            {admin.isActive
                              ? t('admin.settings.disableAdmin')
                              : t('admin.settings.enableAdmin')}
                          </button>
                          <button
                            className="admin-mgmt__action admin-mgmt__action--danger"
                            disabled={!canManageAdminAccounts || isSaving}
                            onClick={() => openDialog('delete', admin)}
                            type="button"
                          >
                            <Trash2 size={15} strokeWidth={1.75} />
                            {t('admin.editor.delete')}
                          </button>
                        </>
                      ) : null}
                    </div>

                    {isSuperAdmin ? (
                      <div className="admin-mgmt__perms">
                        <p className="admin-mgmt__perms-title">
                          {t('admin.settings.specialPermissions')}
                        </p>
                        <label className="admin-mgmt__switch">
                          <span>{t('admin.settings.permEmployeeDevices')}</span>
                          <input
                            checked={hasGrant(admin.id, 'employee_devices')}
                            disabled={primary || isSaving}
                            onChange={(event) =>
                              void handleToggleSpecial(
                                admin,
                                'employee_devices',
                                event.target.checked,
                              )
                            }
                            type="checkbox"
                          />
                        </label>
                        <label className="admin-mgmt__switch">
                          <span>
                            {t('admin.settings.permShiftNotifications')}
                          </span>
                          <input
                            checked={hasGrant(admin.id, 'shift_notifications')}
                            disabled={primary || isSaving}
                            onChange={(event) =>
                              void handleToggleSpecial(
                                admin,
                                'shift_notifications',
                                event.target.checked,
                              )
                            }
                            type="checkbox"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {dialog ? (
        <div className="admin-mgmt__backdrop" role="dialog" aria-modal="true">
          <div className="admin-mgmt__dialog">
            <div className="admin-mgmt__dialog-head">
              <h3>
                {dialog === 'add'
                  ? t('admin.settings.addAdmin')
                  : dialog === 'edit-name'
                    ? t('admin.settings.editName')
                    : dialog === 'change-password'
                      ? t('admin.settings.changePassword')
                      : dialog === 'own-password'
                        ? t('admin.settings.changeOwnPassword')
                        : t('admin.editor.delete')}
              </h3>
              <button
                aria-label="Close"
                className="admin-mgmt__icon-btn"
                onClick={closeDialog}
                type="button"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {dialog === 'add' ? (
              <form className="admin-mgmt__form" onSubmit={handleCreate}>
                <Field
                  label={t('admin.settings.fullName')}
                  onChange={setDisplayName}
                  value={displayName}
                />
                <Field
                  label={t('admin.settings.username')}
                  onChange={setUsername}
                  value={username}
                />
                <Field
                  label={t('admin.settings.password')}
                  onChange={setPassword}
                  type="password"
                  value={password}
                />
                <Field
                  label={t('admin.settings.confirmPassword')}
                  onChange={setConfirmPassword}
                  type="password"
                  value={confirmPassword}
                />
                <DialogActions
                  cancelLabel={t('admin.editor.cancel')}
                  onCancel={closeDialog}
                  saving={isSaving}
                  submitLabel={t('admin.settings.addAdmin')}
                />
              </form>
            ) : null}

            {dialog === 'edit-name' && selected ? (
              <form className="admin-mgmt__form" onSubmit={handleEditName}>
                <Field
                  disabled={isPrimaryAdminAccount(selected)}
                  label={t('admin.settings.fullName')}
                  onChange={setDisplayName}
                  value={displayName}
                />
                <Field
                  disabled={isPrimaryAdminAccount(selected)}
                  label={t('admin.settings.username')}
                  onChange={setUsername}
                  value={username}
                />
                <DialogActions
                  cancelLabel={t('admin.editor.cancel')}
                  onCancel={closeDialog}
                  saving={isSaving}
                  submitLabel={t('admin.editor.save')}
                />
              </form>
            ) : null}

            {dialog === 'change-password' && selected ? (
              <form className="admin-mgmt__form" onSubmit={handleChangePassword}>
                <Field
                  label={t('admin.settings.password')}
                  onChange={setPassword}
                  type="password"
                  value={password}
                />
                <Field
                  label={t('admin.settings.confirmPassword')}
                  onChange={setConfirmPassword}
                  type="password"
                  value={confirmPassword}
                />
                <DialogActions
                  cancelLabel={t('admin.editor.cancel')}
                  onCancel={closeDialog}
                  saving={isSaving}
                  submitLabel={t('admin.settings.changePassword')}
                />
              </form>
            ) : null}

            {dialog === 'own-password' ? (
              <form
                className="admin-mgmt__form"
                onSubmit={handleChangeOwnPassword}
              >
                <Field
                  label={t('admin.settings.currentPassword')}
                  onChange={setCurrentPassword}
                  type="password"
                  value={currentPassword}
                />
                <Field
                  label={t('admin.settings.newPassword')}
                  onChange={setPassword}
                  type="password"
                  value={password}
                />
                <Field
                  label={t('admin.settings.confirmPassword')}
                  onChange={setConfirmPassword}
                  type="password"
                  value={confirmPassword}
                />
                <DialogActions
                  cancelLabel={t('admin.editor.cancel')}
                  onCancel={closeDialog}
                  saving={isSaving}
                  submitLabel={t('admin.settings.changeOwnPassword')}
                />
              </form>
            ) : null}

            {dialog === 'delete' && selected ? (
              <div className="admin-mgmt__form">
                <p className="admin-mgmt__confirm-copy">
                  {t('admin.settings.confirmDelete').replace(
                    '{name}',
                    selected.displayName,
                  )}
                </p>
                <div className="admin-mgmt__dialog-actions">
                  <button
                    className="admin-mgmt__btn"
                    onClick={closeDialog}
                    type="button"
                  >
                    {t('admin.editor.cancel')}
                  </button>
                  <button
                    className="admin-mgmt__btn admin-mgmt__btn--danger"
                    disabled={isSaving}
                    onClick={() => void handleDelete()}
                    type="button"
                  >
                    {t('admin.editor.delete')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="admin-mgmt__field">
      <span>{label}</span>
      <input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function DialogActions({
  submitLabel,
  cancelLabel,
  onCancel,
  saving,
}: {
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="admin-mgmt__dialog-actions">
      <button className="admin-mgmt__btn" onClick={onCancel} type="button">
        {cancelLabel}
      </button>
      <button
        className="admin-mgmt__btn admin-mgmt__btn--gold"
        disabled={saving}
        type="submit"
      >
        {submitLabel}
      </button>
    </div>
  );
}
