import { useRef, useState, useEffect, useCallback } from 'preact/hooks';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  htmlFor?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  class?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
}

const SEARCH_THRESHOLD = 6;

export function Select({
  label,
  htmlFor,
  options,
  value,
  onChange,
  disabled = false,
  searchable,
  class: className,
  'aria-required': ariaRequired,
}: SelectProps) {
  // Alphabetically sort options (keep placeholder at top)
  const sorted = sortOptions(options);
  const useSearch = searchable ?? sorted.length > SEARCH_THRESHOLD;

  if (!useSearch) {
    return (
      <NativeSelect
        selectId={htmlFor}
        label={label}
        options={sorted}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className ?? ''}
        ariaRequired={ariaRequired}
      />
    );
  }

  return (
    <SearchableSelect
      selectId={htmlFor}
      label={label}
      options={sorted}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className ?? ''}
      ariaRequired={ariaRequired}
    />
  );
}

/* ─── helpers ─── */

function sortOptions(options: SelectOption[]): SelectOption[] {
  const placeholder = options.filter((o) => o.value === '');
  const rest = options
    .filter((o) => o.value !== '')
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return [...placeholder, ...rest];
}

/* ─── native select (few options) ─── */

function NativeSelect({
  selectId,
  label,
  options,
  value,
  onChange,
  disabled,
  className,
  ariaRequired,
}: {
  selectId?: string;
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  className: string;
  ariaRequired?: boolean;
}) {
  return (
    <div class="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} class="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        disabled={disabled}
        aria-required={ariaRequired}
        class={[
          'w-full rounded-md border border-gray-200 px-3 min-h-[44px] bg-white text-sm text-gray-700 transition-colors',
          'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── searchable select (many options) ─── */

function SearchableSelect({
  selectId,
  label,
  options,
  value,
  onChange,
  disabled,
  className,
  ariaRequired,
}: {
  selectId?: string;
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  className: string;
  ariaRequired?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  const filtered = query
    ? options.filter(
        (o) => o.value !== '' && o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options.filter((o) => o.value !== '');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  const selectOption = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIdx]) selectOption(filtered[highlightIdx].value);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        break;
    }
  };

  return (
    <div class="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label htmlFor={selectId} class="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div class="relative">
        {/* Trigger button */}
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen(!open);
            setQuery('');
            setHighlightIdx(0);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-required={ariaRequired}
          class={[
            'w-full rounded-md border border-gray-200 px-3 min-h-[36px] bg-white text-sm text-left transition-colors flex items-center justify-between',
            'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
            disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-700',
            open ? 'border-blue-500 outline-2 outline-blue-500' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span class={value ? '' : 'text-gray-400'}>
            {selectedLabel || 'Select...'}
          </span>
          <svg
            class={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div class="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            {/* Search input */}
            <div class="p-1.5 border-b border-gray-100">
              <input
                ref={inputRef}
                type="text"
                value={query}
                placeholder="Search..."
                onInput={(e) => {
                  setQuery((e.target as HTMLInputElement).value);
                  setHighlightIdx(0);
                }}
                onKeyDown={handleKeyDown}
                class="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* Options list */}
            <ul
              ref={listRef}
              class="max-h-[180px] overflow-y-auto py-1"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li class="px-3 py-2 text-sm text-gray-400">No results</li>
              ) : (
                filtered.map((opt, idx) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onClick={() => selectOption(opt.value)}
                    class={[
                      'px-3 py-1.5 text-sm cursor-pointer',
                      idx === highlightIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                      opt.value === value ? 'font-medium' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
