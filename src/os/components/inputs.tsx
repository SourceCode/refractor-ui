import React, { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Check, Clock, Eye, EyeOff, Minus, Plus, Search, Star, Upload, X } from 'lucide-react';
import { buildMonthGrid, formatFileSize } from '../../system/storage';

/* 1. Text Input Field */
export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  helperText,
  errorText,
  leadingIcon,
  type = 'text',
  className = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 ml-1"
        >
          {label}
        </label>
      )}
      <div
        className={`prism-crystal rounded-full p-1 transition-all ${
          errorText ? 'ring-2 ring-red-500/70' : 'focus-within:ring-2 focus-within:ring-sky-400/70'
        }`}
      >
        <div className="prism-well rounded-full h-11 px-4 flex items-center gap-2.5">
          {leadingIcon && <span className="text-slate-500 dark:text-slate-400 shrink-0">{leadingIcon}</span>}
          <input
            id={inputId}
            type={effectiveType}
            aria-invalid={Boolean(errorText)}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((s) => !s)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      {(errorText || helperText) && (
        <p
          className={`mt-1.5 ml-2 text-xs ${
            errorText ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {errorText || helperText}
        </p>
      )}
    </div>
  );
};

/* 2. Multi-Line Text Area */
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  maxCharacters?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  helperText,
  maxCharacters,
  value,
  className = '',
  id,
  ...rest
}) => {
  const generatedId = useId();
  const areaId = id || generatedId;
  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1.5 px-1">
        {label && (
          <label htmlFor={areaId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        {maxCharacters && (
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {charCount} / {maxCharacters}
          </span>
        )}
      </div>
      <div className="prism-crystal rounded-[22px] p-1.5 focus-within:ring-2 focus-within:ring-sky-400/70">
        <textarea
          id={areaId}
          value={value}
          maxLength={maxCharacters}
          className="prism-well w-full min-h-[104px] rounded-[17px] px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-y block"
          {...rest}
        />
      </div>
      {helperText && <p className="mt-1.5 ml-2 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
};

/* 3. Search Bar with Suggestions (Exact match to "With suggestions +" in attached specimen) */
export interface SearchSuggestion {
  id: string;
  label: string;
  category?: string;
}

export interface SearchWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchSuggestion[];
  onSelectSuggestion: (item: SearchSuggestion) => void;
  onQuickAdd?: (currentQuery: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export const SearchWithSuggestions: React.FC<SearchWithSuggestionsProps> = ({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
  onQuickAdd,
  placeholder = 'With suggestions',
  ariaLabel = 'Search with suggestions',
}) => {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = suggestions.filter((s) =>
    s.label.toLowerCase().includes(value.trim().toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="prism-crystal rounded-full p-1 flex items-center">
        <div className="prism-well flex-1 h-12 rounded-l-full rounded-r-[10px] pl-4 pr-3 flex items-center gap-3">
          <Search className="w-[19px] h-[19px] text-slate-700 dark:text-slate-200 stroke-[2]" />
          <input
            type="search"
            aria-label={ariaLabel}
            value={value}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              onChange(e.target.value);
              setFocused(true);
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
          />
          {value && (
            <button
              type="button"
              aria-label="Clear search query"
              onClick={() => onChange('')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Add search item"
          onClick={() => onQuickAdd?.(value)}
          className="w-14 h-12 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:scale-105 transition-transform cursor-pointer shrink-0 focus-visible:outline-none"
        >
          <Plus className="w-5 h-5 stroke-[1.9]" />
        </button>
      </div>

      {focused && filtered.length > 0 && (
        <div
          role="listbox"
          aria-label="Search suggestions"
          className="prism-slab absolute left-0 right-0 mt-2 p-1.5 z-40 max-h-60 overflow-y-auto"
        >
          {filtered.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                onSelectSuggestion(item);
                setFocused(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-left hover:bg-white/65 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
              {item.category && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.category}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* 4. Dropdown Select Menu (Exact match to "C Select [✓]" in attached specimen) */
export interface SelectOption {
  value: string;
  label: string;
}

export interface DropdownSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 ml-1">
          {label}
        </span>
      )}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="prism-crystal w-full h-14 rounded-full pl-5 pr-2.5 flex items-center justify-between gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <span className="flex items-center gap-3 min-w-0">
          {/* Iconic 3/4 optical C-ring from reference */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-slate-800 dark:text-slate-100 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M18.36 6.64A9 9 0 1 0 18.36 17.36" />
          </svg>
          <span className="text-[15px] font-medium text-slate-800 dark:text-slate-100 truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        {/* Recessed right tray with emerald glass check square */}
        <span className="h-10 pl-5 pr-1.5 rounded-full bg-slate-900/[0.03] dark:bg-white/[0.04] border border-white/50 dark:border-white/10 flex items-center justify-end shrink-0">
          <span className="prism-emerald w-7 h-7 rounded-[8px] flex items-center justify-center text-white">
            <Check className="w-4 h-4 stroke-[2.6]" />
          </span>
        </span>
      </button>

      {open && (
        <div role="listbox" className="prism-slab absolute left-0 right-0 mt-2 p-1.5 z-40">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 rounded-2xl flex items-center justify-between text-left hover:bg-white/65 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {opt.label}
                </span>
                {isSelected && (
                  <span className="prism-emerald w-5 h-5 rounded-md flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* 5. Checkbox */
export interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  label,
  description,
}) => {
  return (
    <label className="inline-flex items-start gap-3 cursor-pointer select-none group">
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500 ${
          checked || indeterminate ? 'prism-emerald text-white' : 'prism-crystal text-transparent'
        }`}
      >
        {indeterminate ? (
          <Minus className="w-4 h-4 stroke-[2.8] text-white" />
        ) : (
          <Check className={`w-4 h-4 stroke-[2.8] ${checked ? 'opacity-100' : 'opacity-0'}`} />
        )}
      </button>
      <span className="pt-0.5">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        {description && (
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
        )}
      </span>
    </label>
  );
};

/* 6. Radio Button Group */
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ name, options, value, onChange }) => {
  return (
    <div role="radiogroup" aria-label={name} className="space-y-2.5">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <label
            key={opt.value}
            className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              onClick={() => onChange(opt.value)}
              className="prism-crystal w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              {selected && <span className="prism-emerald w-3.5 h-3.5 rounded-full block" />}
            </button>
            <span>
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                {opt.label}
              </span>
              {opt.description && (
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
};

/* 7. Toggle Switch (Exact match to emerald liquid glass toggle in specimen) */
export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  ariaLabel,
}) => {
  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || 'Toggle setting'}
        onClick={() => onChange(!checked)}
        className={`relative w-[78px] h-[42px] rounded-full p-1 transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
          checked ? 'prism-emerald' : 'prism-crystal'
        }`}
      >
        <span
          className={`prism-thumb block w-[34px] h-[34px] rounded-full transition-transform duration-200 ${
            checked ? 'translate-x-[36px]' : 'translate-x-0'
          }`}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
      )}
    </div>
  );
};

/* 8. Range Slider */
export interface RangeSliderProps {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  unit = '%',
  onChange,
}) => {
  const id = useId();
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <span className="text-xs font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-8 flex items-center">
        <div className="prism-crystal w-full h-3.5 rounded-full overflow-hidden p-0.5">
          <div
            className="prism-emerald h-full rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          aria-hidden="true"
          className="prism-thumb w-6 h-6 rounded-full pointer-events-none absolute -ml-3 transition-transform duration-75"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/* 9. Date & Time Picker */
export interface DateTimePickerProps {
  dateIso: string;
  timeSlot: string;
  onChangeDate: (dateIso: string) => void;
  onChangeTime: (timeSlot: string) => void;
}

const TIME_SLOTS = ['09:00 AM', '10:30 AM', '01:00 PM', '03:30 PM', '05:00 PM'];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  dateIso,
  timeSlot,
  onChangeDate,
  onChangeTime,
}) => {
  const [open, setOpen] = useState(false);
  const cells = buildMonthGrid(2026, 10); // November 2026

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="prism-crystal w-full h-12 rounded-full px-4 flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span className="tabular-nums">{dateIso}</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          {timeSlot}
        </span>
      </button>

      {open && (
        <div className="prism-slab mt-2.5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              November 2026
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">UTC-8</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500 font-medium">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.slice(0, 35).map((cell) => {
              const selected = cell.dateIso === dateIso;
              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  onClick={() => onChangeDate(cell.dateIso)}
                  className={`h-8 rounded-xl text-xs tabular-nums cursor-pointer transition-colors ${
                    selected
                      ? 'prism-btn-primary font-semibold'
                      : cell.inCurrentMonth
                        ? 'text-slate-800 dark:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {cell.dayOfMonth}
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/50 flex flex-wrap gap-1.5">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onChangeTime(slot)}
                className={`px-2.5 py-1 rounded-full text-xs tabular-nums cursor-pointer transition-colors ${
                  slot === timeSlot
                    ? 'prism-emerald text-white font-medium'
                    : 'prism-well text-slate-700 dark:text-slate-200'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* 10. File Uploader / Dropzone */
export interface UploadedFileSummary {
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface FileDropzoneProps {
  files: UploadedFileSummary[];
  onUploadFiles: (files: UploadedFileSummary[]) => void;
  onRemoveFile?: (name: string) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onUploadFiles,
  onRemoveFile,
}) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileList = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const mapped: UploadedFileSummary[] = Array.from(list).map((f) => ({
      name: f.name,
      sizeBytes: f.size,
      mimeType: f.type || 'application/octet-stream',
    }));
    onUploadFiles(mapped);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFileList(e.dataTransfer.files);
        }}
        className={`prism-slab p-6 text-center transition-all border-2 border-dashed ${
          dragging
            ? 'border-emerald-500 scale-[1.01]'
            : 'border-slate-300/70 dark:border-slate-600/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label="Upload files"
          onChange={(e) => handleFileList(e.target.files)}
          className="hidden"
        />
        <div className="prism-crystal w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-3 text-slate-700 dark:text-slate-200">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          Drop design assets here or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-orange-600 dark:text-orange-400 underline underline-offset-2 font-semibold cursor-pointer"
          >
            browse device
          </button>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports SVG, PNG, JSON tokens, or TypeScript specs up to 25 MB
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.slice(0, 4).map((f) => (
            <li
              key={f.name}
              className="prism-crystal rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs"
            >
              <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{f.name}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatFileSize(f.sizeBytes)}
                </span>
                {onRemoveFile && (
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => onRemoveFile(f.name)}
                    className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* 11. Rating Control */
export interface RatingControlProps {
  value: number;
  max?: number;
  onChange: (rating: number) => void;
  label?: string;
}

export const RatingControl: React.FC<RatingControlProps> = ({
  value,
  max = 5,
  onChange,
  label = 'Optical Clarity Score',
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeScore = hovered ?? value;

  return (
    <div className="inline-flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>}
      <div className="prism-crystal rounded-full px-3.5 py-2 inline-flex items-center gap-1.5">
        {Array.from({ length: max }, (_, idx) => {
          const score = idx + 1;
          const filled = score <= activeScore;
          return (
            <button
              key={score}
              type="button"
              aria-label={`Rate ${score} out of ${max} stars`}
              onMouseEnter={() => setHovered(score)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(score)}
              className="p-1 cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-orange-500 rounded-full"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-orange-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.45)]'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
          {value}.0 / {max}
        </span>
      </div>
    </div>
  );
};
