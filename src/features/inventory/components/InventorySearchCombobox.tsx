import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChevronDown } from 'lucide-react';

type InventorySearchComboboxProps = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  clearLabel: string;
  noResultsLabel: string;
  onChange: (value: string) => void;
};

type ListItem = {
  id: string;
  label: string;
  value: string;
};

export function InventorySearchCombobox({
  label,
  placeholder,
  value,
  options,
  clearLabel,
  noResultsLabel,
  onChange,
}: InventorySearchComboboxProps) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];

    if (value.trim()) {
      items.push({ id: 'clear', label: clearLabel, value: '' });
    }

    filteredOptions.forEach((option, index) => {
      items.push({ id: `option-${index}`, label: option, value: option });
    });

    return items;
  }, [clearLabel, filteredOptions, value]);

  const closeList = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const selectItem = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      closeList();
      inputRef.current?.focus();
    },
    [closeList, onChange],
  );

  const openList = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(value.trim() ? 0 : filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions.length, value]);

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

  const handleInputChange = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }

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
      if (!isOpen) {
        openList();
        return;
      }

      setActiveIndex((current) => {
        if (listItems.length === 0) {
          return -1;
        }
        return current <= 0 ? listItems.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (!isOpen || activeIndex < 0 || !listItems[activeIndex]) {
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
    activeIndex >= 0 && listItems[activeIndex] ? `${listboxId}-${listItems[activeIndex].id}` : undefined;

  return (
    <div className="inv-field inv-combobox" ref={rootRef}>
      <label htmlFor={inputId}>{label}</label>

      <div className={`inv-combobox__control${isOpen ? ' inv-combobox__control--open' : ''}`}>
        <input
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          autoComplete="off"
          className="inv-combobox__input"
          id={inputId}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          role="combobox"
          spellCheck={false}
          type="search"
          value={value}
        />
        <button
          aria-label={placeholder}
          className="inv-combobox__toggle"
          onClick={() => {
            if (isOpen) {
              closeList();
              return;
            }
            openList();
            inputRef.current?.focus();
          }}
          tabIndex={-1}
          type="button"
        >
          <ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </div>

      {isOpen ? (
        <ul
          className="inv-combobox__list"
          id={listboxId}
          role="listbox"
        >
          {listItems.length === 0 ? (
            <li className="inv-combobox__empty" role="presentation">
              {noResultsLabel}
            </li>
          ) : (
            listItems.map((item, index) => (
              <li
                aria-selected={activeIndex === index}
                className={`inv-combobox__option${
                  item.id === 'clear' ? ' inv-combobox__option--clear' : ''
                }${activeIndex === index ? ' inv-combobox__option--active' : ''}`}
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
      ) : null}
    </div>
  );
}
