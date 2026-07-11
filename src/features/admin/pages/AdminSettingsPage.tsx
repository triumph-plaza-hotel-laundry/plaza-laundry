import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { isPrimaryAdminAccount } from '@/features/auth/owner-protection';
import type { AdminType, AuthUser } from '@/features/auth/types';
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
  allInventoryPermissions,
  listInventoryPermissions,
  setInventoryPermissions as saveInventoryPermissions,
  type InventoryPermission,
} from '@/features/inventory/inventory-permissions-service';
import { useInventoryPermissions } from '@/hooks/useInventoryPermissions';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';
import '@/features/admin/admin-settings.css';

type AdminFormState = {
  displayName: string;
  username: string;
  password: string;
  confirmPassword: string;
  adminType: AdminType;
  isActive: boolean;
};

const emptyForm = (): AdminFormState => ({
  displayName: '',
  username: '',
  password: '',
  confirmPassword: '',
  adminType: 'Admin',
  isActive: true,
});

export function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user, logAction } = useAuth();
  const [admins, setAdmins] = useState<AuthUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminFormState>(emptyForm());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [inventoryPermissions, setInventoryPermissions] = useState<
    InventoryPermission[]
  >([]);

  const inventoryPermissionFlags = useInventoryPermissions();

  const selected = useMemo(
    () => admins.find((admin) => admin.id === selectedId) ?? null,
    [admins, selectedId],
  );
  const canManageAdminAccounts = user ? isPrimaryAdminAccount(user) : false;

  const refreshAdmins = async () => {
    await ensureUsersStoreReady();
    setAdmins(await listAdminManagedUsers());
  };

  useEffect(() => {
    void refreshAdmins();
  }, []);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm());
      setInventoryPermissions([]);
      return;
    }

    setForm({
      displayName: selected.displayName,
      username: selected.username,
      password: '',
      confirmPassword: '',
      adminType: selected.adminType,
      isActive: selected.isActive,
    });

    void listInventoryPermissions(selected.id)
      .then(setInventoryPermissions)
      .catch(() => setInventoryPermissions([]));
  }, [selected]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (form.password !== form.confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createStoredAdminUser(user, {
        displayName: form.displayName,
        username: form.username,
        password: form.password,
        adminType: form.adminType,
      });
      logAction({
        action: 'admin.createUser',
        page: 'admin/settings',
        newValue: created,
      });
      setMessage(t('admin.settings.adminCreated'));
      setIsCreating(false);
      setForm(emptyForm());
      await refreshAdmins();
      setSelectedId(created.id);
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

  const handleUpdate = async () => {
    if (!user || !selected) return;

    if (form.password && form.password !== form.confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateStoredAdminUser(user, selected.id, {
        displayName: form.displayName,
        username: isPrimaryAdminAccount(selected) ? undefined : form.username,
        adminType: form.adminType,
        isActive: form.isActive,
        password: form.password || undefined,
      });
      logAction({
        action: 'admin.updateUser',
        page: 'admin/settings',
        oldValue: selected,
        newValue: updated,
      });
      setMessage(t('admin.settings.adminUpdated'));
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
      setSelectedId(null);
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

  const handleResetPassword = async () => {
    if (!user || !selected || !form.password) return;

    if (form.password !== form.confirmPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await resetStoredAdminPassword(user, selected.id, form.password);
      logAction({
        action: 'admin.resetPassword',
        page: 'admin/settings',
        newValue: { id: selected.id },
      });
      setMessage(t('admin.settings.passwordReset'));
      setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
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

  const handleToggleActive = async () => {
    if (!user || !selected || isPrimaryAdminAccount(selected)) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateStoredAdminUser(user, selected.id, {
        isActive: !selected.isActive,
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

  const handleChangeOwnPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (newPassword !== confirmNewPassword) {
      setError(t('admin.settings.passwordMismatch'));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await changeStoredOwnPassword(user, currentPassword, newPassword);
      logAction({ action: 'admin.changeOwnPassword', page: 'admin/settings' });
      setMessage(t('admin.settings.ownPasswordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
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

  const handleSaveInventoryPermissions = async () => {
    if (!user || !selected) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await saveInventoryPermissions(
        user.id,
        selected.id,
        inventoryPermissions,
        user,
      );
      logAction({
        action: 'admin.updateInventoryPermissions',
        page: 'admin/settings',
        newValue: { userId: selected.id, permissions: inventoryPermissions },
      });
      setMessage(t('admin.settings.inventoryPermissionsSaved'));
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

  const toggleInventoryPermission = (permission: InventoryPermission) => {
    setInventoryPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  };

  return (
    <section className="admin-settings-page admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.settings.subtitle')}
        titleAr="إعدادات التطبيق"
        titleEn="Application Settings"
      />

      <section className="admin-settings-section">
        <div className="admin-settings-section__head">
          <h2>{t('admin.settings.adminManagement')}</h2>
          <button
            className="admin-editor-btn"
            disabled={!canManageAdminAccounts}
            onClick={() => {
              setIsCreating(true);
              setSelectedId(null);
              setForm(emptyForm());
            }}
            type="button"
          >
            {t('admin.settings.addAdmin')}
          </button>
        </div>

        {error ? (
          <p className="admin-settings-message admin-settings-message--error">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="admin-settings-message admin-settings-message--success">
            {message}
          </p>
        ) : null}

        <div className="admin-editor-grid admin-editor-grid--2">
          <div className="admin-editor-panel">
            <table className="admin-editor-table admin-editor-table--responsive">
              <thead>
                <tr>
                  <th>{t('admin.settings.fullName')}</th>
                  <th>{t('admin.settings.status')}</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td data-label={t('admin.settings.fullName')}>
                      <button
                        className="admin-editor-btn"
                        onClick={() => {
                          setSelectedId(admin.id);
                          setIsCreating(false);
                        }}
                        type="button"
                      >
                        {admin.displayName}
                        {isPrimaryAdminAccount(admin)
                          ? ` (${t('admin.settings.primary')})`
                          : ''}
                      </button>
                    </td>
                    <td data-label={t('admin.settings.status')}>
                      {admin.isActive
                        ? t('admin.settings.active')
                        : t('admin.settings.disabled')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isCreating ? (
            <form
              className="admin-editor-panel admin-editor-grid"
              onSubmit={handleCreate}
            >
              <AdminUserFields
                form={form}
                isPrimary={false}
                onChange={setForm}
                t={t}
              />
              <div className="admin-editor-actions-row">
                <button
                  className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
                  disabled={isSaving}
                  type="submit"
                >
                  {t('admin.settings.addAdmin')}
                </button>
              </div>
            </form>
          ) : selected ? (
            <div className="admin-editor-panel admin-editor-grid">
              <AdminUserFields
                form={form}
                isPrimary={isPrimaryAdminAccount(selected)}
                onChange={setForm}
                t={t}
              />
              <div className="admin-editor-actions-row">
                <button
                  className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
                  disabled={isSaving || !canManageAdminAccounts}
                  onClick={() => void handleUpdate()}
                  type="button"
                >
                  {t('admin.editor.save')}
                </button>
                <button
                  className="admin-edit-toolbar__btn admin-edit-toolbar__btn--cancel"
                  disabled={
                    isSaving || !canManageAdminAccounts || !form.password
                  }
                  onClick={() => void handleResetPassword()}
                  type="button"
                >
                  {t('admin.settings.resetPassword')}
                </button>
                {!isPrimaryAdminAccount(selected) ? (
                  <>
                    <button
                      className="admin-editor-btn admin-editor-btn--danger"
                      disabled={isSaving || !canManageAdminAccounts}
                      onClick={() => void handleDelete()}
                      type="button"
                    >
                      {t('admin.editor.delete')}
                    </button>
                    <button
                      className="admin-editor-btn"
                      disabled={isSaving || !canManageAdminAccounts}
                      onClick={() => void handleToggleActive()}
                      type="button"
                    >
                      {selected.isActive
                        ? t('admin.settings.disableAdmin')
                        : t('admin.settings.enableAdmin')}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {inventoryPermissionFlags.canManagePermissions ? (
        <section className="admin-settings-section">
          <div className="admin-settings-section__head">
            <div>
              <h2>{t('admin.settings.inventoryPermissions')}</h2>
              <p>{t('admin.settings.inventoryPermissionsSubtitle')}</p>
            </div>
          </div>

          {selected && !isCreating ? (
            <div className="admin-editor-panel admin-editor-grid">
              <p className="admin-settings-section__selected">
                {selected.displayName}
                {isPrimaryAdminAccount(selected)
                  ? ` (${t('admin.settings.primary')})`
                  : ''}
              </p>
              {allInventoryPermissions().map((permission) => (
                <label
                  className="admin-editor-field admin-editor-field--checkbox"
                  key={permission}
                >
                  <input
                    checked={inventoryPermissions.includes(permission)}
                    onChange={() => toggleInventoryPermission(permission)}
                    type="checkbox"
                  />
                  <span>
                    {permission === 'inventory.add'
                      ? t('admin.settings.inventoryPermAdd')
                      : permission === 'inventory.edit'
                        ? t('admin.settings.inventoryPermEdit')
                        : permission === 'inventory.enable_disable'
                          ? t('admin.settings.inventoryPermEnableDisable')
                          : t('admin.settings.inventoryPermDelete')}
                  </span>
                </label>
              ))}
              <button
                className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
                disabled={isSaving}
                onClick={() => void handleSaveInventoryPermissions()}
                type="button"
              >
                {t('admin.editor.save')}
              </button>
            </div>
          ) : (
            <p className="admin-settings-message">
              {t('admin.settings.adminManagement')}
            </p>
          )}
        </section>
      ) : null}

      <section className="admin-settings-section">
        <h2>{t('admin.settings.changeOwnPassword')}</h2>
        <form
          className="admin-editor-panel admin-editor-grid"
          onSubmit={handleChangeOwnPassword}
        >
          <div className="admin-editor-field">
            <label>{t('admin.settings.currentPassword')}</label>
            <input
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </div>
          <div className="admin-editor-field">
            <label>{t('admin.settings.newPassword')}</label>
            <input
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </div>
          <div className="admin-editor-field">
            <label>{t('admin.settings.confirmPassword')}</label>
            <input
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              type="password"
              value={confirmNewPassword}
            />
          </div>
          <button
            className="admin-edit-toolbar__btn admin-edit-toolbar__btn--save"
            disabled={isSaving}
            type="submit"
          >
            {t('admin.settings.changeOwnPassword')}
          </button>
        </form>
      </section>
    </section>
  );
}

type AdminUserFieldsProps = {
  form: AdminFormState;
  isPrimary: boolean;
  onChange: (
    next: AdminFormState | ((current: AdminFormState) => AdminFormState),
  ) => void;
  t: (key: import('@/types/language').TranslationKey) => string;
};

function AdminUserFields({
  form,
  isPrimary,
  onChange,
  t,
}: AdminUserFieldsProps) {
  return (
    <>
      <div className="admin-editor-field">
        <label>{t('admin.settings.fullName')}</label>
        <input
          disabled={isPrimary}
          onChange={(event) =>
            onChange({ ...form, displayName: event.target.value })
          }
          value={form.displayName}
        />
      </div>
      <div className="admin-editor-field">
        <label>{t('admin.settings.username')}</label>
        <input
          disabled={isPrimary}
          onChange={(event) =>
            onChange({ ...form, username: event.target.value })
          }
          value={form.username}
        />
      </div>
      <div className="admin-editor-field">
        <label>{t('admin.settings.adminType')}</label>
        <select
          disabled={isPrimary}
          onChange={(event) =>
            onChange({ ...form, adminType: event.target.value as AdminType })
          }
          value={form.adminType}
        >
          <option value="Admin">{t('admin.settings.adminTypeAdmin')}</option>
        </select>
      </div>
      <div className="admin-editor-field">
        <label>{t('admin.settings.password')}</label>
        <input
          onChange={(event) =>
            onChange({ ...form, password: event.target.value })
          }
          type="password"
          value={form.password}
        />
      </div>
      <div className="admin-editor-field">
        <label>{t('admin.settings.confirmPassword')}</label>
        <input
          onChange={(event) =>
            onChange({ ...form, confirmPassword: event.target.value })
          }
          type="password"
          value={form.confirmPassword}
        />
      </div>
      {!isPrimary ? (
        <div className="admin-editor-field">
          <label>{t('admin.settings.status')}</label>
          <select
            onChange={(event) =>
              onChange({ ...form, isActive: event.target.value === 'active' })
            }
            value={form.isActive ? 'active' : 'disabled'}
          >
            <option value="active">{t('admin.settings.active')}</option>
            <option value="disabled">{t('admin.settings.disabled')}</option>
          </select>
        </div>
      ) : null}
    </>
  );
}
