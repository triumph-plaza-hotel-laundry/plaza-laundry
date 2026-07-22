import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AdminOnlyGuard } from '@/features/admin/guards/AdminOnlyGuard';
import {
  createDepartmentItemCategory,
  deleteDepartmentItemCategory,
  isCustomCategoryKey,
  renameDepartmentItemCategory,
} from '@/features/inventory/department-item-categories-service';
import { resolveCategoryLabel } from '@/features/inventory/department-items-catalog';
import type {
  DepartmentItem,
  DepartmentItemCategory,
} from '@/features/inventory/department-items-types';
import {
  createDepartmentItem,
  deleteDepartmentItem,
  updateDepartmentItem,
} from '@/features/inventory/department-items-service';
import { InventorySearchCombobox } from '@/features/inventory/components/InventorySearchCombobox';
import {
  PLAN_DEPARTMENTS,
  PLAN_DEPARTMENT_ITEMS,
  PLAN_DEPARTMENT_LABEL_KEYS,
  type PlanDepartmentId,
} from '@/features/inventory/inventory-plan-schema';
import { useDepartmentItemsCatalog } from '@/hooks/useDepartmentItems';
import { dictionaries } from '@/i18n/dictionaries';
import { useAuth, useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/features/admin/admin-editor.css';

type VariantFormState = {
  departmentId: PlanDepartmentId;
  itemKey: string;
  itemName: string;
  unit: string;
  newCategoryName: string;
};
type CategoryFormState = {
  departmentId: PlanDepartmentId;
  categoryName: string;
};

const NEW_CATEGORY_VALUE = '__new_category__';

type ItemCategoryGroup = {
  itemKey: string;
  label: string;
  variants: DepartmentItem[];
  isCustom: boolean;
};

type DepartmentTreeNode = {
  departmentId: PlanDepartmentId;
  label: string;
  categories: ItemCategoryGroup[];
  variantCount: number;
};

type VariantEditorTarget = {
  departmentId: PlanDepartmentId;
  itemKey: string;
  item: DepartmentItem | null;
};

type CategoryEditorTarget = {
  departmentId: PlanDepartmentId;
  itemKey?: string;
  categoryName: string;
  allowDepartmentChange?: boolean;
};

type DeleteCategoryTarget = {
  departmentId: PlanDepartmentId;
  itemKey: string;
  label: string;
};

const emptyVariantForm = (
  departmentId: PlanDepartmentId = PLAN_DEPARTMENTS[0],
  itemKey = '',
): VariantFormState => ({
  departmentId,
  itemKey,
  itemName: '',
  unit: 'قطعة',
  newCategoryName: '',
});
const emptyCategoryForm = (
  departmentId: PlanDepartmentId = PLAN_DEPARTMENTS[0],
): CategoryFormState => ({
  departmentId,
  categoryName: '',
});

function getCategoryOptionsForDepartment(
  departmentId: PlanDepartmentId,
  items: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
  t: (key: TranslationKey) => string,
) {
  const departmentItems = items.filter(
    (item) => item.departmentId === departmentId,
  );
  return buildCategoryGroups(departmentId, departmentItems, categories, t).map(
    (category) => ({
      value: category.itemKey,
      label: category.label,
    }),
  );
}

function categoryKey(departmentId: PlanDepartmentId, itemKey: string) {
  return `${departmentId}:${itemKey}`;
}

function getDepartmentItemNameOptions(
  items: readonly DepartmentItem[],
  departmentId: PlanDepartmentId,
  itemKey: string,
): string[] {
  if (!departmentId || itemKey === NEW_CATEGORY_VALUE) {
    return [];
  }

  const seen = new Set<string>();
  const orderedNames: string[] = [];

  const departmentItems = items
    .filter((item) => item.departmentId === departmentId)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      return left.itemName.localeCompare(right.itemName, 'ar');
    });

  for (const item of departmentItems) {
    const name = item.itemName.trim();
    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    orderedNames.push(name);
  }

  return orderedNames;
}

function getDepartmentLabel(
  departmentId: PlanDepartmentId,
  language: 'ar' | 'en',
) {
  return dictionaries[language][PLAN_DEPARTMENT_LABEL_KEYS[departmentId]];
}

function buildCategoryGroups(
  departmentId: PlanDepartmentId,
  items: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
  t: (key: TranslationKey) => string,
): ItemCategoryGroup[] {
  const byKey = new Map<string, DepartmentItem[]>();

  for (const item of items) {
    const key = item.itemKey || '__uncategorized__';
    const group = byKey.get(key);
    if (group) {
      group.push(item);
    } else {
      byKey.set(key, [item]);
    }
  }

  const builtInKeys = PLAN_DEPARTMENT_ITEMS[departmentId];
  const customKeys = categories
    .filter(
      (category) =>
        category.departmentId === departmentId &&
        isCustomCategoryKey(category.itemKey),
    )
    .map((category) => category.itemKey);
  const extraKeys = [...byKey.keys()].filter(
    (key) => !builtInKeys.includes(key as never) && !customKeys.includes(key),
  );

  const orderedKeys = [...builtInKeys, ...customKeys, ...extraKeys];

  return orderedKeys.map((itemKey) => ({
    itemKey,
    label: resolveCategoryLabel(itemKey, departmentId, categories, t),
    isCustom: isCustomCategoryKey(itemKey),
    variants: (byKey.get(itemKey) ?? []).slice().sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.itemName.localeCompare(right.itemName, 'ar');
    }),
  }));
}

function buildDepartmentTree(
  items: readonly DepartmentItem[],
  categories: readonly DepartmentItemCategory[],
  searchQuery: string,
  language: 'ar' | 'en',
  t: (key: TranslationKey) => string,
): DepartmentTreeNode[] {
  const normalized = searchQuery.trim().toLowerCase();
  const byDepartment = new Map<PlanDepartmentId, DepartmentItem[]>();

  for (const item of items) {
    const list = byDepartment.get(item.departmentId) ?? [];
    list.push(item);
    byDepartment.set(item.departmentId, list);
  }

  return PLAN_DEPARTMENTS.map((departmentId) => {
    const departmentItems = byDepartment.get(departmentId) ?? [];
    const categoryGroups = buildCategoryGroups(
      departmentId,
      departmentItems,
      categories,
      t,
    );

    return {
      departmentId,
      label: getDepartmentLabel(departmentId, language),
      categories: categoryGroups,
      variantCount: departmentItems.length,
    };
  }).filter((department) => {
    if (!normalized) {
      return (
        department.categories.length > 0 ||
        categories.some((c) => c.departmentId === department.departmentId)
      );
    }

    if (department.label.toLowerCase().includes(normalized)) {
      return true;
    }

    return department.categories.some(
      (category) =>
        category.label.toLowerCase().includes(normalized) ||
        category.variants.some(
          (variant) =>
            variant.itemName.toLowerCase().includes(normalized) ||
            variant.unit.toLowerCase().includes(normalized),
        ),
    );
  });
}

function filterTreeBySearch(tree: DepartmentTreeNode[], searchQuery: string) {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) {
    return tree;
  }

  return tree
    .map((department) => {
      if (department.label.toLowerCase().includes(normalized)) {
        return department;
      }

      const categories = department.categories
        .map((category) => {
          if (category.label.toLowerCase().includes(normalized)) {
            return category;
          }

          const variants = category.variants.filter(
            (variant) =>
              variant.itemName.toLowerCase().includes(normalized) ||
              variant.unit.toLowerCase().includes(normalized),
          );

          return variants.length > 0 ? { ...category, variants } : null;
        })
        .filter((category): category is ItemCategoryGroup => category !== null);

      return categories.length > 0 ? { ...department, categories } : null;
    })
    .filter(
      (department): department is DepartmentTreeNode => department !== null,
    );
}

export function AdminDepartmentItemsPage() {
  return (
    <AdminOnlyGuard>
      <AdminDepartmentItemsContent />
    </AdminOnlyGuard>
  );
}

function AdminDepartmentItemsContent() {
  const { t, language } = useLanguage();
  const { assertCan, logAction } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { items, categories, isReady, error, refresh } =
    useDepartmentItemsCatalog();
  const [variantEditor, setVariantEditor] =
    useState<VariantEditorTarget | null>(null);
  const [categoryEditor, setCategoryEditor] =
    useState<CategoryEditorTarget | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormState>(() =>
    emptyVariantForm(),
  );
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() =>
    emptyCategoryForm(),
  );
  const [deleteVariantTarget, setDeleteVariantTarget] =
    useState<DepartmentItem | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<DeleteCategoryTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<
    Set<PlanDepartmentId>
  >(() => new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(),
  );

  const departmentTree = useMemo(() => {
    const tree = buildDepartmentTree(
      items,
      categories,
      searchQuery,
      language,
      t,
    );
    return filterTreeBySearch(tree, searchQuery);
  }, [items, categories, searchQuery, language, t]);

  const treeStats = useMemo(() => {
    const categoryCount = departmentTree.reduce(
      (sum, dept) => sum + dept.categories.length,
      0,
    );
    return {
      departments: departmentTree.length,
      categories: categoryCount,
      variants: items.length,
    };
  }, [departmentTree, items.length]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const nextDepartments = new Set<PlanDepartmentId>();
    const nextCategories = new Set<string>();

    for (const department of departmentTree) {
      nextDepartments.add(department.departmentId);
      for (const category of department.categories) {
        nextCategories.add(
          categoryKey(department.departmentId, category.itemKey),
        );
      }
    }

    setExpandedDepartments(nextDepartments);
    setExpandedCategories(nextCategories);
  }, [departmentTree, searchQuery]);

  const toggleDepartment = useCallback((departmentId: PlanDepartmentId) => {
    setExpandedDepartments((current) => {
      const next = new Set(current);
      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback(
    (departmentId: PlanDepartmentId, itemKey: string) => {
      const key = categoryKey(departmentId, itemKey);
      setExpandedCategories((current) => {
        const next = new Set(current);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const showNotice = useCallback((message: string, isError = false) => {
    setNotice(message);
    setNoticeIsError(isError);
    window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const openAddCategory = useCallback(
    (departmentId: PlanDepartmentId) => {
      assertCan('admin', 'create');
      setCategoryEditor({
        departmentId,
        categoryName: '',
        allowDepartmentChange: true,
      });
      setCategoryForm(emptyCategoryForm(departmentId));
      setExpandedDepartments((current) => new Set(current).add(departmentId));
    },
    [assertCan],
  );

  const openRenameCategory = useCallback(
    (departmentId: PlanDepartmentId, itemKey: string, categoryName: string) => {
      assertCan('admin', 'update');
      setCategoryEditor({ departmentId, itemKey, categoryName });
      setCategoryForm({ departmentId, categoryName });
    },
    [assertCan],
  );

  const openAddVariant = useCallback(
    (departmentId: PlanDepartmentId, itemKey: string) => {
      assertCan('admin', 'create');
      setVariantEditor({ departmentId, itemKey, item: null });
      setVariantForm(emptyVariantForm(departmentId, itemKey));
      setExpandedCategories((current) =>
        new Set(current).add(categoryKey(departmentId, itemKey)),
      );
    },
    [assertCan],
  );

  const openEditVariant = useCallback(
    (item: DepartmentItem) => {
      assertCan('admin', 'update');
      setVariantEditor({
        departmentId: item.departmentId,
        itemKey: item.itemKey,
        item,
      });
      setVariantForm({
        departmentId: item.departmentId,
        itemKey: item.itemKey,
        itemName: item.itemName,
        unit: item.unit,
        newCategoryName: '',
      });
    },
    [assertCan],
  );

  const categoryOptionsForVariant = useMemo(() => {
    if (!variantEditor) {
      return [];
    }
    return getCategoryOptionsForDepartment(
      variantForm.departmentId,
      items,
      categories,
      t,
    );
  }, [variantEditor, variantForm.departmentId, items, categories, t]);

  const variantItemNameOptions = useMemo(
    () =>
      getDepartmentItemNameOptions(
        items,
        variantForm.departmentId,
        variantForm.itemKey,
      ),
    [items, variantForm.departmentId, variantForm.itemKey],
  );

  const isAddingVariant = Boolean(variantEditor && !variantEditor.item);

  useEffect(() => {
    if (!isAddingVariant || !variantForm.itemName) {
      return;
    }

    if (!variantItemNameOptions.includes(variantForm.itemName)) {
      setVariantForm((current) => ({ ...current, itemName: '' }));
    }
  }, [isAddingVariant, variantForm.itemName, variantItemNameOptions]);

  const handleSaveCategory = async () => {
    if (!categoryEditor || !categoryForm.categoryName.trim()) {
      showNotice(t('admin.departmentItems.validation.nameRequired'), true);
      return;
    }

    const departmentId = categoryEditor.allowDepartmentChange
      ? categoryForm.departmentId
      : categoryEditor.departmentId;

    setIsSaving(true);
    try {
      if (categoryEditor.itemKey) {
        assertCan('admin', 'update');
        await renameDepartmentItemCategory(
          departmentId,
          categoryEditor.itemKey,
          categoryForm.categoryName,
        );
        logAction({
          action: 'departmentItems.renameCategory',
          page: '/admin/department-items',
          oldValue: categoryEditor.categoryName,
          newValue: categoryForm.categoryName,
        });
        showNotice(t('admin.departmentItems.updatedCategory'));
      } else {
        assertCan('admin', 'create');
        const created = await createDepartmentItemCategory(
          departmentId,
          categoryForm.categoryName,
        );
        logAction({
          action: 'departmentItems.createCategory',
          page: '/admin/department-items',
          newValue: created.categoryName,
        });
        showNotice(t('admin.departmentItems.createdCategory'));
        setExpandedDepartments((current) =>
          new Set(current).add(created.departmentId),
        );
        setExpandedCategories((current) =>
          new Set(current).add(
            categoryKey(created.departmentId, created.itemKey),
          ),
        );
      }

      setCategoryEditor(null);
      setCategoryForm(emptyCategoryForm());
      await refresh();
    } catch (caught) {
      showNotice(
        caught instanceof Error ? caught.message : t('admin.editor.saveError'),
        true,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVariant = async () => {
    if (!variantEditor || !variantForm.itemName.trim()) {
      showNotice(t('admin.departmentItems.validation.nameRequired'), true);
      return;
    }

    if (!variantForm.itemKey) {
      showNotice(t('admin.departmentItems.validation.nameRequired'), true);
      return;
    }

    if (
      variantForm.itemKey === NEW_CATEGORY_VALUE &&
      !variantForm.newCategoryName.trim()
    ) {
      showNotice(t('admin.departmentItems.validation.nameRequired'), true);
      return;
    }

    setIsSaving(true);
    try {
      let itemKey = variantForm.itemKey;
      if (itemKey === NEW_CATEGORY_VALUE) {
        assertCan('admin', 'create');
        const created = await createDepartmentItemCategory(
          variantForm.departmentId,
          variantForm.newCategoryName,
        );
        itemKey = created.itemKey;
      }

      if (variantEditor.item) {
        assertCan('admin', 'update');
        await updateDepartmentItem(variantEditor.item.id, {
          itemKey,
          itemName: variantForm.itemName,
          unit: variantForm.unit,
        });
        logAction({
          action: 'departmentItems.update',
          page: '/admin/department-items',
          oldValue: variantEditor.item.itemName,
          newValue: variantForm.itemName,
        });
        showNotice(t('admin.departmentItems.updated'));
      } else {
        assertCan('admin', 'create');
        await createDepartmentItem({
          departmentId: variantForm.departmentId,
          itemKey,
          itemName: variantForm.itemName,
          unit: variantForm.unit,
        });
        logAction({
          action: 'departmentItems.create',
          page: '/admin/department-items',
          newValue: variantForm.itemName,
        });
        showNotice(t('admin.departmentItems.created'));
      }

      setVariantEditor(null);
      setVariantForm(emptyVariantForm());
      await refresh();
    } catch (caught) {
      showNotice(
        caught instanceof Error ? caught.message : t('admin.editor.saveError'),
        true,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantTarget) {
      return;
    }

    setIsSaving(true);
    try {
      assertCan('admin', 'delete');
      await deleteDepartmentItem(deleteVariantTarget.id);
      logAction({
        action: 'departmentItems.delete',
        page: '/admin/department-items',
        oldValue: deleteVariantTarget.itemName,
      });
      setDeleteVariantTarget(null);
      showNotice(t('admin.departmentItems.deleted'));
      await refresh();
    } catch (caught) {
      showNotice(
        caught instanceof Error ? caught.message : t('admin.editor.saveError'),
        true,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) {
      return;
    }

    setIsSaving(true);
    try {
      assertCan('admin', 'delete');
      await deleteDepartmentItemCategory(
        deleteCategoryTarget.departmentId,
        deleteCategoryTarget.itemKey,
      );
      logAction({
        action: 'departmentItems.deleteCategory',
        page: '/admin/department-items',
        oldValue: deleteCategoryTarget.label,
      });
      setDeleteCategoryTarget(null);
      showNotice(t('admin.departmentItems.deletedCategory'));
      await refresh();
    } catch (caught) {
      showNotice(
        caught instanceof Error ? caught.message : t('admin.editor.saveError'),
        true,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-label={t('admin.departmentItems.titleAr')}
      className="admin-editor-page mx-auto"
    >
      <header className="admin-page-header">
        <div className="admin-page-header__titles">
          <span aria-hidden="true" className="admin-page-header__emoji">
            ✦
          </span>
          <h1 className="admin-page-header__title-en">
            {t('admin.departmentItems.titleEn')}
          </h1>
          <h1 className="admin-page-header__title-ar">
            {t('admin.departmentItems.titleAr')}
          </h1>
          <p className="admin-page-header__subtitle">
            {t('admin.departmentItems.subtitle')}
          </p>
        </div>
      </header>

      <div className="admin-employees-dashboard__toolbar">
        <label className="admin-editor-field admin-editor-field--search">
          <span>{t('admin.departmentItems.search')}</span>
          <div className="admin-editor-search">
            <Search aria-hidden="true" size={16} strokeWidth={1.75} />
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('admin.departmentItems.searchPlaceholder')}
              type="search"
              value={searchQuery}
            />
          </div>
        </label>
      </div>

      {error ? <p className="inv-error">{error}</p> : null}

      <div className="admin-employees-dashboard__panel">
        <div className="admin-employees-dashboard__panel-header">
          <p className="admin-employees-dashboard__panel-meta">
            {treeStats.departments} · {treeStats.categories} ·{' '}
            {treeStats.variants}
          </p>
        </div>

        {!isReady ? (
          <p className="admin-inventory-plan__loading">
            {t('inventory.plan.loading')}
          </p>
        ) : departmentTree.length === 0 ? (
          <p className="admin-inventory-plan__loading">
            {t('admin.departmentItems.empty')}
          </p>
        ) : (
          <div className="admin-inventory-plan__table-wrap">
            <table className="admin-inventory-plan__table" dir="rtl">
              <thead>
                <tr>
                  <th className="admin-inventory-plan__th" scope="col">
                    {t('admin.departmentItems.table.category')}
                  </th>
                  <th className="admin-inventory-plan__th" scope="col">
                    {t('admin.departmentItems.table.name')}
                  </th>
                  <th className="admin-inventory-plan__th" scope="col">
                    {t('admin.departmentItems.table.unit')}
                  </th>
                  <th className="admin-inventory-plan__th" scope="col">
                    {t('admin.departmentItems.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {departmentTree.map((department) => (
                  <DepartmentTreeSection
                    key={department.departmentId}
                    department={department}
                    expandedCategories={expandedCategories}
                    isExpanded={expandedDepartments.has(
                      department.departmentId,
                    )}
                    onAddCategory={openAddCategory}
                    onAddVariant={openAddVariant}
                    onDeleteCategory={setDeleteCategoryTarget}
                    onDeleteVariant={setDeleteVariantTarget}
                    onEditVariant={openEditVariant}
                    onRenameCategory={openRenameCategory}
                    onToggleCategory={toggleCategory}
                    onToggleDepartment={toggleDepartment}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {variantEditor ? (
          <EditorModal
            isSaving={isSaving}
            onCancel={() => setVariantEditor(null)}
            onSave={() => void handleSaveVariant()}
            t={t}
            title={
              variantEditor.item
                ? t('admin.departmentItems.edit')
                : t('admin.departmentItems.addVariant')
            }
          >
            <label className="admin-editor-field">
              <span>{t('admin.departmentItems.department')}</span>
              <select
                onChange={(event) => {
                  const departmentId = event.target.value as PlanDepartmentId;
                  const nextOptions = getCategoryOptionsForDepartment(
                    departmentId,
                    items,
                    categories,
                    t,
                  );
                  setVariantForm((current) => ({
                    ...current,
                    departmentId,
                    itemKey: nextOptions[0]?.value ?? NEW_CATEGORY_VALUE,
                    itemName: '',
                    newCategoryName: '',
                  }));
                }}
                value={variantForm.departmentId}
              >
                <option value="">
                  {t('admin.departmentItems.selectDepartment')}
                </option>
                {PLAN_DEPARTMENTS.map((departmentId) => (
                  <option key={departmentId} value={departmentId}>
                    {getDepartmentLabel(departmentId, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-editor-field">
              <span>{t('admin.departmentItems.table.category')}</span>
              <select
                onChange={(event) =>
                  setVariantForm((current) => ({
                    ...current,
                    itemKey: event.target.value,
                    itemName: '',
                    newCategoryName:
                      event.target.value === NEW_CATEGORY_VALUE
                        ? current.newCategoryName
                        : '',
                  }))
                }
                value={variantForm.itemKey}
              >
                <option value="">
                  {t('admin.departmentItems.selectCategory')}
                </option>
                {categoryOptionsForVariant.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>
                  {t('admin.departmentItems.createNewCategory')}
                </option>
              </select>
            </label>
            {variantForm.itemKey === NEW_CATEGORY_VALUE ? (
              <label className="admin-editor-field">
                <span>{t('admin.departmentItems.categoryName')}</span>
                <input
                  onChange={(event) =>
                    setVariantForm((current) => ({
                      ...current,
                      newCategoryName: event.target.value,
                    }))
                  }
                  value={variantForm.newCategoryName}
                />
              </label>
            ) : null}
            {isAddingVariant ? (
              <InventorySearchCombobox
                clearLabel={t('inventory.search.clearFilter')}
                label={t('admin.departmentItems.table.name')}
                noResultsLabel={t('admin.departmentItems.noItemsAvailable')}
                onChange={(nextValue) =>
                  setVariantForm((current) => ({
                    ...current,
                    itemName: nextValue,
                  }))
                }
                options={variantItemNameOptions}
                placeholder={t('admin.departmentItems.itemNamePlaceholder')}
                value={variantForm.itemName}
              />
            ) : (
              <label className="admin-editor-field">
                <span>{t('admin.departmentItems.table.name')}</span>
                <input
                  onChange={(event) =>
                    setVariantForm((current) => ({
                      ...current,
                      itemName: event.target.value,
                    }))
                  }
                  value={variantForm.itemName}
                />
              </label>
            )}
            <label className="admin-editor-field">
              <span>{t('admin.departmentItems.table.unit')}</span>
              <input
                onChange={(event) =>
                  setVariantForm((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
                value={variantForm.unit}
              />
            </label>
          </EditorModal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {categoryEditor ? (
          <EditorModal
            isSaving={isSaving}
            onCancel={() => setCategoryEditor(null)}
            onSave={() => void handleSaveCategory()}
            t={t}
            title={
              categoryEditor.itemKey
                ? t('admin.departmentItems.editCategory')
                : t('admin.departmentItems.addCategory')
            }
          >
            {categoryEditor.allowDepartmentChange ? (
              <label className="admin-editor-field">
                <span>{t('admin.departmentItems.department')}</span>
                <select
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      departmentId: event.target.value as PlanDepartmentId,
                    }))
                  }
                  value={categoryForm.departmentId}
                >
                  <option value="">
                    {t('admin.departmentItems.selectDepartment')}
                  </option>
                  {PLAN_DEPARTMENTS.map((departmentId) => (
                    <option key={departmentId} value={departmentId}>
                      {getDepartmentLabel(departmentId, language)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="admin-editor-field">
                <span>{t('admin.departmentItems.department')}</span>
                <p className="admin-department-items__modal-value">
                  {getDepartmentLabel(categoryEditor.departmentId, language)}
                </p>
              </div>
            )}
            <label className="admin-editor-field">
              <span>{t('admin.departmentItems.categoryName')}</span>
              <input
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    categoryName: event.target.value,
                  }))
                }
                value={categoryForm.categoryName}
              />
            </label>
          </EditorModal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteVariantTarget ? (
          <ConfirmModal
            isSaving={isSaving}
            message={t('admin.editor.deleteConfirm').replace(
              '{name}',
              deleteVariantTarget.itemName,
            )}
            onCancel={() => setDeleteVariantTarget(null)}
            onConfirm={() => void handleDeleteVariant()}
            t={t}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteCategoryTarget ? (
          <ConfirmModal
            isSaving={isSaving}
            message={t('admin.departmentItems.deleteCategoryConfirm').replace(
              '{name}',
              deleteCategoryTarget.label,
            )}
            onCancel={() => setDeleteCategoryTarget(null)}
            onConfirm={() => void handleDeleteCategory()}
            t={t}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {notice ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`admin-employees-dashboard__toast admin-employees-dashboard__toast--${noticeIsError ? 'error' : 'success'}`}
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
            role="status"
          >
            {notice}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function EditorModal({
  children,
  isSaving,
  onCancel,
  onSave,
  t,
  title,
}: {
  children: ReactNode;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  t: (key: TranslationKey) => string;
  title: string;
}) {
  return (
    <>
      <motion.button
        aria-label={t('admin.editor.cancel')}
        className="admin-employee-modal__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        type="button"
      />
      <div className="admin-employee-modal__viewport">
        <motion.div
          aria-modal="true"
          className="admin-employee-modal"
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          role="dialog"
        >
          <h3 className="admin-employee-modal__title">{title}</h3>
          {children}
          <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
            <button
              className="admin-editor-btn"
              disabled={isSaving}
              onClick={onCancel}
              type="button"
            >
              {t('admin.editor.cancel')}
            </button>
            <button
              className="admin-editor-btn admin-editor-btn--primary"
              disabled={isSaving}
              onClick={onSave}
              type="button"
            >
              {isSaving ? t('admin.editor.saving') : t('admin.editor.save')}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function ConfirmModal({
  isSaving,
  message,
  onCancel,
  onConfirm,
  t,
}: {
  isSaving: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <motion.button
        aria-label={t('admin.editor.cancel')}
        className="admin-employee-modal__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        type="button"
      />
      <div className="admin-employee-modal__viewport">
        <motion.div
          aria-modal="true"
          className="admin-employee-modal admin-employees-dashboard__confirm"
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          role="dialog"
        >
          <h3 className="admin-employees-dashboard__confirm-title">
            {t('admin.editor.delete')}
          </h3>
          <p className="admin-employees-dashboard__confirm-text">{message}</p>
          <div className="admin-employee-modal__actions admin-employee-modal__actions--save">
            <button
              className="admin-editor-btn"
              disabled={isSaving}
              onClick={onCancel}
              type="button"
            >
              {t('admin.editor.cancel')}
            </button>
            <button
              className="admin-editor-btn admin-editor-btn--danger-solid"
              disabled={isSaving}
              onClick={onConfirm}
              type="button"
            >
              {t('admin.editor.delete')}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

const DepartmentTreeSection = memo(function DepartmentTreeSection({
  department,
  expandedCategories,
  isExpanded,
  onAddCategory,
  onAddVariant,
  onDeleteCategory,
  onDeleteVariant,
  onEditVariant,
  onRenameCategory,
  onToggleCategory,
  onToggleDepartment,
  t,
}: {
  department: DepartmentTreeNode;
  expandedCategories: Set<string>;
  isExpanded: boolean;
  onAddCategory: (departmentId: PlanDepartmentId) => void;
  onAddVariant: (departmentId: PlanDepartmentId, itemKey: string) => void;
  onDeleteCategory: (target: DeleteCategoryTarget) => void;
  onDeleteVariant: (item: DepartmentItem) => void;
  onEditVariant: (item: DepartmentItem) => void;
  onRenameCategory: (
    departmentId: PlanDepartmentId,
    itemKey: string,
    categoryName: string,
  ) => void;
  onToggleCategory: (departmentId: PlanDepartmentId, itemKey: string) => void;
  onToggleDepartment: (departmentId: PlanDepartmentId) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <tr className="admin-inventory-plan__row admin-department-items__dept-row">
        <td className="admin-inventory-plan__td" colSpan={4}>
          <button
            aria-expanded={isExpanded}
            className="admin-department-items__group-toggle admin-department-items__group-toggle--dept"
            onClick={() => onToggleDepartment(department.departmentId)}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`admin-department-items__chevron${isExpanded ? 'admin-department-items__chevron--open' : ''}`}
              size={18}
              strokeWidth={1.75}
            />
            <span className="admin-department-items__group-label">
              {department.label}
            </span>
            <span className="admin-department-items__group-count">
              {department.variantCount}
            </span>
          </button>
        </td>
      </tr>

      {isExpanded ? (
        <>
          {department.categories.map((category) => (
            <CategoryTreeSection
              key={categoryKey(department.departmentId, category.itemKey)}
              category={category}
              departmentId={department.departmentId}
              isExpanded={expandedCategories.has(
                categoryKey(department.departmentId, category.itemKey),
              )}
              onAddVariant={onAddVariant}
              onDelete={() =>
                onDeleteCategory({
                  departmentId: department.departmentId,
                  itemKey: category.itemKey,
                  label: category.label,
                })
              }
              onDeleteVariant={onDeleteVariant}
              onEditVariant={onEditVariant}
              onRename={() =>
                onRenameCategory(
                  department.departmentId,
                  category.itemKey,
                  category.label,
                )
              }
              onToggle={() =>
                onToggleCategory(department.departmentId, category.itemKey)
              }
              t={t}
            />
          ))}
          <tr className="admin-inventory-plan__row admin-department-items__add-category-row">
            <td
              className="admin-inventory-plan__td admin-department-items__indent--1"
              colSpan={4}
            >
              <button
                className="admin-editor-btn admin-editor-btn--ghost"
                onClick={() => onAddCategory(department.departmentId)}
                type="button"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
                <span>{t('admin.departmentItems.addCategory')}</span>
              </button>
            </td>
          </tr>
        </>
      ) : null}
    </>
  );
});

const CategoryTreeSection = memo(function CategoryTreeSection({
  category,
  departmentId,
  isExpanded,
  onAddVariant,
  onDelete,
  onDeleteVariant,
  onEditVariant,
  onRename,
  onToggle,
  t,
}: {
  category: ItemCategoryGroup;
  departmentId: PlanDepartmentId;
  isExpanded: boolean;
  onAddVariant: (departmentId: PlanDepartmentId, itemKey: string) => void;
  onDelete: () => void;
  onDeleteVariant: (item: DepartmentItem) => void;
  onEditVariant: (item: DepartmentItem) => void;
  onRename: () => void;
  onToggle: () => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <>
      <tr className="admin-inventory-plan__row admin-department-items__category-row">
        <td
          className="admin-inventory-plan__td admin-department-items__indent--1"
          colSpan={2}
        >
          <button
            aria-expanded={isExpanded}
            className="admin-department-items__group-toggle"
            onClick={onToggle}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`admin-department-items__chevron${isExpanded ? 'admin-department-items__chevron--open' : ''}`}
              size={18}
              strokeWidth={1.75}
            />
            <span className="admin-department-items__group-label">
              {category.label}
            </span>
            <span className="admin-department-items__group-count">
              {category.variants.length}
            </span>
          </button>
        </td>
        <td className="admin-inventory-plan__td" />
        <td className="admin-inventory-plan__td">
          <div className="admin-editor-inline-actions">
            <button
              aria-label={t('admin.departmentItems.addVariant')}
              className="admin-editor-btn admin-editor-btn--ghost"
              onClick={() => onAddVariant(departmentId, category.itemKey)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
            <button
              aria-label={t('admin.departmentItems.editCategory')}
              className="admin-editor-btn admin-editor-btn--ghost"
              onClick={onRename}
              type="button"
            >
              <Pencil aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
            <button
              aria-label={t('admin.editor.delete')}
              className="admin-editor-btn admin-editor-btn--ghost admin-editor-btn--danger"
              onClick={onDelete}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded
        ? category.variants.map((variant) => (
            <VariantTreeRow
              key={variant.id}
              onDelete={onDeleteVariant}
              onEdit={onEditVariant}
              t={t}
              variant={variant}
            />
          ))
        : null}
    </>
  );
});

const VariantTreeRow = memo(function VariantTreeRow({
  variant,
  onDelete,
  onEdit,
  t,
}: {
  variant: DepartmentItem;
  onDelete: (item: DepartmentItem) => void;
  onEdit: (item: DepartmentItem) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <tr className="admin-inventory-plan__row admin-department-items__variant-row">
      <td className="admin-inventory-plan__td admin-department-items__indent--2">
        <span
          aria-hidden="true"
          className="admin-department-items__variant-marker"
        >
          └
        </span>
      </td>
      <td className="admin-inventory-plan__td">{variant.itemName}</td>
      <td className="admin-inventory-plan__td">{variant.unit}</td>
      <td className="admin-inventory-plan__td">
        <div className="admin-editor-inline-actions">
          <button
            aria-label={t('admin.editor.edit')}
            className="admin-editor-btn admin-editor-btn--ghost"
            onClick={() => onEdit(variant)}
            type="button"
          >
            <Pencil aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
          <button
            aria-label={t('admin.editor.delete')}
            className="admin-editor-btn admin-editor-btn--ghost admin-editor-btn--danger"
            onClick={() => onDelete(variant)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
  );
});
