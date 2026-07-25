import { ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { LaundryEmployee } from '@/data/laundry-employees';
import { sortNotificationEmployees } from '@/features/notifications/ui/notification-employee-order';
import '@/features/notifications/ui/notification-employee-picker.css';

type NotificationEmployeePickerProps = {
  employees: readonly LaundryEmployee[];
  value: string;
  language: 'ar' | 'en';
  onChange: (employeeId: string) => void;
  disabled?: boolean;
  label?: string;
};

function displayName(employee: LaundryEmployee, language: 'ar' | 'en') {
  return language === 'ar' ? employee.name.ar : employee.name.en;
}

function formatEmployeeLabel(employee: LaundryEmployee, language: 'ar' | 'en') {
  return `${displayName(employee, language)} (${employee.id})`;
}

export function NotificationEmployeePicker({
  employees,
  value,
  language,
  onChange,
  disabled = false,
  label = 'Employee',
}: NotificationEmployeePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const orderedEmployees = useMemo(
    () => sortNotificationEmployees(employees),
    [employees],
  );

  const selected = useMemo(
    () => orderedEmployees.find((employee) => employee.id === value) ?? null,
    [orderedEmployees, value],
  );

  const closeList = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const selectedIndex = orderedEmployees.findIndex(
      (employee) => employee.id === value,
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, orderedEmployees, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeList();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closeList, isOpen]);

  const selectEmployee = useCallback(
    (employeeId: string) => {
      onChange(employeeId);
      closeList();
    },
    [closeList, onChange],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    if (!isOpen) {
      if (
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.key === 'ArrowDown'
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => {
        if (orderedEmployees.length === 0) return -1;
        return current >= orderedEmployees.length - 1 ? 0 : current + 1;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => {
        if (orderedEmployees.length === 0) return -1;
        return current <= 0 ? orderedEmployees.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const employee = orderedEmployees[activeIndex];
      if (employee) {
        selectEmployee(employee.id);
      }
    }
  };

  const triggerLabel = selected
    ? formatEmployeeLabel(selected, language)
    : 'Select employee…';

  return (
    <div
      className={`notif-employee-picker${isOpen ? ' is-open' : ''}${
        disabled ? ' is-disabled' : ''
      }`}
      onKeyDown={handleKeyDown}
      ref={rootRef}
    >
      {label ? (
        <span className="notif-employee-picker__label">{label}</span>
      ) : null}

      <div className="notif-employee-picker__shell">
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="notif-employee-picker__trigger"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setIsOpen((open) => !open);
          }}
          type="button"
        >
          <span
            className={`notif-employee-picker__value${
              selected ? '' : ' is-placeholder'
            }`}
          >
            {triggerLabel}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="notif-employee-picker__chevron"
            size={18}
            strokeWidth={1.75}
          />
        </button>

        <div
          aria-hidden={!isOpen}
          className="notif-employee-picker__expand"
        >
          <ul
            className="notif-employee-picker__list"
            id={listboxId}
            role="listbox"
          >
            {orderedEmployees.map((employee, index) => {
              const isActive = activeIndex === index;
              const isSelected = employee.id === value;
              return (
                <li key={employee.id} role="none">
                  <button
                    aria-selected={isSelected}
                    className={`notif-employee-picker__option${
                      isActive ? ' is-active' : ''
                    }${isSelected ? ' is-selected' : ''}`}
                    onClick={() => selectEmployee(employee.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className="notif-employee-picker__option-name">
                      {displayName(employee, language)}
                    </span>
                    <span className="notif-employee-picker__option-code">
                      ({employee.id})
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
