import { InventoryManagementPage } from '@/features/inventory/components/InventoryManagementPage';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useLanguage } from '@/hooks';
import '@/features/admin/admin-editor.css';

export function AdminInventoryEditorPage() {
  const { t } = useLanguage();

  return (
    <section className="admin-editor-page mx-auto">
      <AdminPageHeader
        subtitle={t('admin.editor.inventorySubtitle')}
        titleAr="إدارة المخزون"
        titleEn="Manage Inventory"
      />
      <InventoryManagementPage showHeader={false} />
    </section>
  );
}
