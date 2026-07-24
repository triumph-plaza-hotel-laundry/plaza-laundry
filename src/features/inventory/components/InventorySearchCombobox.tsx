import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
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

type ListPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'above' | 'below';
};

const VIEWPORT_PADDING_PX = 8;
const MAX_VISIBLE_RESULTS = 9;
const OPTION_HEIGHT_PX = 40;
const LIST_PADDING_PX = 12;
const MOBILE_MEDIA_QUERY = '(max-width: 639px)';

function idealListHeight(): number {
  return MAX_VISIBLE_RESULTS * OPTION_HEIGHT_PX + LIST_PADDING_PX;
}

function getListPosition(control: HTMLElement): ListPosition {
  const rect = control.getBoundingClientRect();
  const visualViewport = window.visualViewport;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;

  const spaceBelow =
    viewportTop + viewportHeight - rect.bottom - VIEWPORT_PADDING_PX;
  const spaceAbove = rect.top - viewportTop - VIEWPORT_PADDING_PX;
  const preferred = idealListHeight();

  let maxHeight: number;
  let placement: 'above' | 'below' = 'below';

  if (isMobile) {
    const mobileCap = Math.min(preferred, Math.floor(viewportHeight * 0.34));
    const canOpenBelow = spaceBelow >= Math.min(140, mobileCap * 0.55);

    if (canOpenBelow || spaceBelow >= spaceAbove) {
      maxHeight = Math.max(96, Math.min(mobileCap, spaceBelow));
      placement = 'below';
    } else {
      maxHeight = Math.max(96, Math.min(mobileCap, spaceAbove));
      placement = 'above';
    }
  } else {
    maxHeight = Math.max(120, Math.min(preferred, Math.max(spaceBelow, 120)));
    placement = 'below';
  }

  const top =
    placement === 'below'
      ? rect.bottom - 1
      : rect.top - maxHeight + 1;

  let left = rect.left;
  const width = rect.width;
  const maxLeft =
    viewportLeft + viewportWidth - width - VIEWPORT_PADDING_PX;
  if (left > maxLeft) {
    left = Math.max(viewportLeft + VIEWPORT_PADDING_PX, maxLeft);
  }
  if (left < viewportLeft + VIEWPORT_PADDING_PX) {
    left = viewportLeft + VIEWPORT_PADDING_PX;
  }

  return {
    top,
    left,
    width,
    maxHeight,
    placement,
  };
}

function highlightMatch(label: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) {
    return label;
  }

  const lowerLabel = label.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const matchIndex = lowerLabel.indexOf(lowerQuery);

  if (matchIndex < 0) {
    return label;
  }

  const matchEnd = matchIndex + trimmed.length;

  return (
    <>
      {label.slice(0, matchIndex)}
      <mark className="inv-combobox__mark">
        {label.slice(matchIndex, matchEnd)}
      </mark>
      {label.slice(matchEnd)}
    </>
  );
}

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
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);

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

  const selectedValue = value.trim();

  const closeList = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    setListPosition(null);
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

    if (selectedValue) {
      const selectedIndex = listItems.findIndex(
        (item) => item.id !== 'clear' && item.value === selectedValue,
      );
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions.length, listItems, selectedValue]);

  const updateListPosition = useCallback(() => {
    if (!controlRef.current) {
      return;
    }

    setListPosition(getListPosition(controlRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateListPosition();
  }, [isOpen, updateListPosition, value, listItems.length]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) {
      return;
    }

    const activeOption = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    activeOption?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, listItems.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }

      closeList();
    };

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeList();
        inputRef.current?.focus();
      }
    };

    const visualViewport = window.visualViewport;

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('resize', updateListPosition);
    window.addEventListener('scroll', updateListPosition, true);
    visualViewport?.addEventListener('resize', updateListPosition);
    visualViewport?.addEventListener('scroll', updateListPosition);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('resize', updateListPosition);
      window.removeEventListener('scroll', updateListPosition, true);
      visualViewport?.removeEventListener('resize', updateListPosition);
      visualViewport?.removeEventListener('scroll', updateListPosition);
    };
  }, [closeList, isOpen, updateListPosition]);

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
    activeIndex >= 0 && listItems[activeIndex]
      ? `${listboxId}-${listItems[activeIndex].id}`
      : undefined;

  const showNoResults = filteredOptions.length === 0;

  const listbox =
    isOpen && listPosition
      ? createPortal(
          <ul
            className={`inv-combobox__list inv-combobox__list--portal${
              listPosition.placement === 'above'
                ? ' inv-combobox__list--above'
                : ''
            }`}
            id={listboxId}
            ref={listRef}
            role="listbox"
            style={{
              top: listPosition.top,
              left: listPosition.left,
              width: listPosition.width,
              maxHeight: listPosition.maxHeight,
            }}
          >
            {showNoResults ? (
              <>
                {selectedValue ? (
                  <li
                    aria-selected={activeIndex === 0}
                    className={`inv-combobox__option inv-combobox__option--clear${
                      activeIndex === 0 ? ' inv-combobox__option--active' : ''
                    }`}
                    data-option-index={0}
                    id={`${listboxId}-clear`}
                    onClick={() => selectItem('')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectItem('');
                      }
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(0)}
                    role="option"
                    tabIndex={-1}
                  >
                    {clearLabel}
                  </li>
                ) : null}
                <li className="inv-combobox__empty" role="presentation">
                  {noResultsLabel}
                </li>
              </>
            ) : (
              listItems.map((item, index) => {
                const isSelected =
                  item.id !== 'clear' && item.value === selectedValue;

                return (
                  <li
                    aria-selected={activeIndex === index}
                    className={`inv-combobox__option${
                      item.id === 'clear' ? ' inv-combobox__option--clear' : ''
                    }${
                      isSelected ? ' inv-combobox__option--selected' : ''
                    }${
                      activeIndex === index
                        ? ' inv-combobox__option--active'
                        : ''
                    }`}
                    data-option-index={index}
                    id={`${listboxId}-${item.id}`}
                    key={item.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectItem(item.value);
                      }
                    }}
                    role="option"
                    tabIndex={-1}
                  >
                    {item.id === 'clear'
                      ? item.label
                      : highlightMatch(item.label, value)}
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="inv-field inv-combobox" ref={rootRef}>
      <label htmlFor={inputId}>{label}</label>

      <div
        className={`inv-combobox__control${isOpen ? ' inv-combobox__control--open' : ''}`}
        ref={controlRef}
      >
        <input
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          autoComplete="off"
          className="inv-combobox__input"
          id={inputId}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setIsOpen(true);
            if (selectedValue) {
              const selectedIndex = listItems.findIndex(
                (item) => item.id !== 'clear' && item.value === selectedValue,
              );
              setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
            }
          }}
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

      {listbox}
    </div>
  );
}
