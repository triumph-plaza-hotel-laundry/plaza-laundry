import { ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { LaundryEmployee } from '@/data/laundry-employees';

type ShiftEmployeeComboboxProps = {
  employeeId: string;
  employees: readonly LaundryEmployee[];
  selectableEmployees: readonly LaundryEmployee[];
  language: 'ar' | 'en';
  searchPlaceholder: string;
  noResultsLabel: string;
  clearLabel: string;
  onChange: (employeeId: string) => void;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  maxListHeight: number;
};

const POPOVER_WIDTH_PX = 256;
const POPOVER_GAP_PX = 6;
const VIEWPORT_PADDING_PX = 8;

function resolveEmployeeName(
  id: string,
  employees: readonly LaundryEmployee[],
  language: 'ar' | 'en',
): string {
  if (!id.trim()) {
    return '—';
  }

  const employee = employees.find((entry) => entry.id === id);
  if (!employee) {
    return '—';
  }

  return language === 'ar' ? employee.name.ar : employee.name.en;
}

function matchesEmployeeQuery(
  employee: LaundryEmployee,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    employee.name.en.toLowerCase().includes(normalized) ||
    employee.name.ar.includes(query.trim()) ||
    employee.name.ar.toLowerCase().includes(normalized)
  );
}

function getPopoverPosition(trigger: HTMLButtonElement): PopoverPosition {
  const rect = trigger.getBoundingClientRect();
  const isRtl = document.documentElement.dir === 'rtl';
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(
    POPOVER_WIDTH_PX,
    viewportWidth - VIEWPORT_PADDING_PX * 2,
  );

  const left = isRtl
    ? Math.min(
        Math.max(VIEWPORT_PADDING_PX, rect.right - width),
        viewportWidth - width - VIEWPORT_PADDING_PX,
      )
    : Math.min(
        Math.max(VIEWPORT_PADDING_PX, rect.left),
        viewportWidth - width - VIEWPORT_PADDING_PX,
      );

  const top = rect.bottom + POPOVER_GAP_PX;
  const searchHeight = 44;
  const maxListHeight = Math.max(
    120,
    viewportHeight - top - searchHeight - VIEWPORT_PADDING_PX,
  );

  return { top, left, width, maxListHeight };
}

export function ShiftEmployeeCombobox({
  employeeId,
  employees,
  selectableEmployees,
  language,
  searchPlaceholder,
  noResultsLabel,
  clearLabel,
  onChange,
}: ShiftEmployeeComboboxProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popoverPosition, setPopoverPosition] =
    useState<PopoverPosition | null>(null);

  const sortedEmployees = useMemo(
    () =>
      [...selectableEmployees].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
    [selectableEmployees],
  );

  const filteredEmployees = useMemo(
    () =>
      sortedEmployees.filter((employee) =>
        matchesEmployeeQuery(employee, query),
      ),
    [query, sortedEmployees],
  );

  const listItems = useMemo(() => {
    const items: Array<{ id: string; label: string; value: string }> = [];

    if (employeeId.trim()) {
      items.push({ id: 'clear', label: clearLabel, value: '' });
    }

    filteredEmployees.forEach((employee) => {
      items.push({
        id: employee.id,
        label: language === 'ar' ? employee.name.ar : employee.name.en,
        value: employee.id,
      });
    });

    return items;
  }, [clearLabel, employeeId, filteredEmployees, language]);

  const closeList = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
    setPopoverPosition(null);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    setPopoverPosition(getPopoverPosition(trigger));
  }, []);

  const openList = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverPosition(null);
      return;
    }

    updatePopoverPosition();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(listItems.length > 0 ? 0 : -1);
  }, [isOpen, listItems.length]);

  const selectItem = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      closeList();
    },
    [closeList, onChange],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      closeList();
    };

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeList();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [closeList, isOpen, updatePopoverPosition]);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => {
        if (listItems.length === 0) {
          return -1;
        }
        return current >= listItems.length - 1 ? 0 : current + 1;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => {
        if (listItems.length === 0) {
          return -1;
        }
        return current <= 0 ? listItems.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (activeIndex < 0 || !listItems[activeIndex]) {
        return;
      }

      event.preventDefault();
      selectItem(listItems[activeIndex].value);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
    }
  };

  const activeOptionId =
    activeIndex >= 0 && listItems[activeIndex]
      ? `${listboxId}-${listItems[activeIndex].id}`
      : undefined;

  const popover =
    isOpen && popoverPosition
      ? createPortal(
          <div
            className="shift-schedule-employee-combobox__popover shift-schedule-employee-combobox__popover--portal"
            ref={popoverRef}
            style={{
              top: popoverPosition.top,
              left: popoverPosition.left,
              width: popoverPosition.width,
            }}
          >
            <input
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={isOpen}
              autoComplete="off"
              className="shift-schedule-employee-combobox__search"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder}
              ref={inputRef}
              role="combobox"
              spellCheck={false}
              type="search"
              value={query}
            />

            <ul
              className="shift-schedule-employee-combobox__list"
              id={listboxId}
              role="listbox"
              style={{ maxHeight: popoverPosition.maxListHeight }}
            >
              {listItems.length === 0 ? (
                <li
                  className="shift-schedule-employee-combobox__empty"
                  role="presentation"
                >
                  {noResultsLabel}
                </li>
              ) : (
                listItems.map((item, index) => (
                  <li
                    aria-selected={activeIndex === index}
                    className={`shift-schedule-employee-combobox__option${
                      item.id === 'clear'
                        ? 'shift-schedule-employee-combobox__option--clear'
                        : ''
                    }${activeIndex === index ? 'shift-schedule-employee-combobox__option--active' : ''}${
                      item.value && item.value === employeeId
                        ? 'shift-schedule-employee-combobox__option--selected'
                        : ''
                    }`}
                    id={`${listboxId}-${item.id}`}
                    key={item.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item.value)}
                    role="option"
                  >
                    {item.label}
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`shift-schedule-employee-combobox${isOpen ? 'shift-schedule-employee-combobox--open' : ''}`}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="shift-schedule-employee-badge shift-schedule-employee-combobox__trigger"
        onClick={() => {
          if (isOpen) {
            closeList();
            return;
          }
          openList();
        }}
        ref={triggerRef}
        type="button"
      >
        <span>{resolveEmployeeName(employeeId, employees, language)}</span>
        <ChevronDown
          aria-hidden="true"
          className="shift-schedule-employee-combobox__chevron"
          strokeWidth={1.75}
        />
      </button>

      {popover}
    </div>
  );
}
