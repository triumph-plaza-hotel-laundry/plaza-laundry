import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import type { InventoryItem } from '@/features/inventory';
import { useLanguage } from '@/hooks';

type InventoryItemActionsMenuProps = {
  item: InventoryItem;
  canEdit: boolean;
  canEnableDisable: boolean;
  canDelete: boolean;
  onEdit: (item: InventoryItem) => void;
  onToggleEnabled: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
};

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_OFFSET_PX = 4;
const MENU_MIN_WIDTH_PX = 168;
const MENU_ESTIMATED_HEIGHT_PX = 132;

function getMenuPosition(trigger: HTMLButtonElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const isRtl = document.documentElement.dir === 'rtl';
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const left = isRtl
    ? Math.min(Math.max(8, rect.left), viewportWidth - MENU_MIN_WIDTH_PX - 8)
    : Math.min(
        Math.max(8, rect.right - MENU_MIN_WIDTH_PX),
        viewportWidth - MENU_MIN_WIDTH_PX - 8,
      );

  let top = rect.bottom + MENU_OFFSET_PX;
  if (top + MENU_ESTIMATED_HEIGHT_PX > viewportHeight - 8) {
    top = Math.max(8, rect.top - MENU_ESTIMATED_HEIGHT_PX - MENU_OFFSET_PX);
  }

  return {
    top,
    left,
    minWidth: MENU_MIN_WIDTH_PX,
  };
}

export function InventoryItemActionsMenu({
  item,
  canEdit,
  canEnableDisable,
  canDelete,
  onEdit,
  onToggleEnabled,
  onDelete,
}: InventoryItemActionsMenuProps) {
  const { t } = useLanguage();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const isDisabled = Boolean(item.disabledAt);
  const hasAnyAction = canEdit || canEnableDisable || canDelete;

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    setMenuPosition(getMenuPosition(trigger));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  if (!hasAnyAction) {
    return null;
  }

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            className="inv-row-actions__menu inv-row-actions__menu--portal"
            ref={menuRef}
            role="menu"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
            }}
          >
            {canEdit ? (
              <button
                className="inv-row-actions__item"
                onClick={() => {
                  setIsOpen(false);
                  onEdit(item);
                }}
                role="menuitem"
                type="button"
              >
                {t('inventory.actions.edit')}
              </button>
            ) : null}
            {canEnableDisable ? (
              <button
                className="inv-row-actions__item"
                onClick={() => {
                  setIsOpen(false);
                  onToggleEnabled(item);
                }}
                role="menuitem"
                type="button"
              >
                {isDisabled
                  ? t('inventory.actions.enable')
                  : t('inventory.actions.disable')}
              </button>
            ) : null}
            {canDelete ? (
              <button
                className="inv-row-actions__item inv-row-actions__item--danger"
                onClick={() => {
                  setIsOpen(false);
                  onDelete(item);
                }}
                role="menuitem"
                type="button"
              >
                {t('inventory.actions.permanentDelete')}
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="inv-row-actions">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('inventory.actions.rowMenu')}
        className="inv-row-actions__trigger"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <MoreVertical aria-hidden="true" size={16} />
      </button>
      {menu}
    </div>
  );
}
