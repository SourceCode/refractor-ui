'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { formatFileSize } from '../utils/dateGrid';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface UploadedFileSummary {
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface FileDropzoneProps extends BaseProps<HTMLDivElement> {
  /** Currently uploaded file summaries displayed beneath the dropzone. */
  files: ReadonlyArray<UploadedFileSummary>;
  /** Callback invoked with normalized file summaries on drop or file input selection. */
  onUploadFiles: (files: UploadedFileSummary[]) => void;
  /** Optional callback to remove an uploaded file by name. */
  onRemoveFile?: (name: string) => void;
  /** Optional native file input accept filter (e.g. ".svg,.png,.json"). */
  accept?: string;
  /** Maximum number of file chips rendered in the list (defaults to 4). */
  maxVisibleFiles?: number;
  /** Disables drag-and-drop, browsing, and file removal. */
  disabled?: boolean;
}

export function FileDropzone({
  files,
  onUploadFiles,
  onRemoveFile,
  accept,
  maxVisibleFiles = 4,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const override = useComponentOverride('FileDropzone');

  const safeVisibleLimit = Math.max(1, Math.round(clampNumber(maxVisibleFiles, 1, 50, 4)));

  const handleFileList = (list: FileList | null) => {
    if (disabled || !list || list.length === 0) return;
    const mapped: UploadedFileSummary[] = Array.from(list).map((file) => ({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
    }));
    onUploadFiles(mapped);
  };

  const merged = mergeProps({
    themeTarget: themeProps('file-dropzone', { dragging, disabled }),
    baseClassName: 'space-y-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) {
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) {
            handleFileList(e.dataTransfer?.files ?? null);
          }
        }}
        className={`prism-slab p-6 text-center transition-all border-2 border-dashed ${
          disabled
            ? 'opacity-50 border-slate-300/70 dark:border-slate-600/60'
            : dragging
              ? 'border-emerald-500 scale-[1.01]'
              : 'border-slate-300/70 dark:border-slate-600/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          aria-label="Upload files"
          onChange={(e) => handleFileList(e.target.files)}
          className="hidden"
        />
        <div className="prism-crystal w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-3 text-slate-700 dark:text-slate-200">
          <Upload className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          Drop design assets here or{' '}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="prism-focus-ring text-orange-600 dark:text-orange-400 underline underline-offset-2 font-semibold cursor-pointer disabled:cursor-not-allowed rounded-sm"
          >
            browse device
          </button>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports SVG, PNG, JSON tokens, or TypeScript specs up to 25 MB
        </p>
      </div>

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.slice(0, safeVisibleLimit).map((file) => (
            <li
              key={file.name}
              className="prism-crystal rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs"
            >
              <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                {file.name}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatFileSize(file.sizeBytes)}
                </span>
                {onRemoveFile ? (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemoveFile(file.name)}
                    className="prism-focus-ring text-slate-400 enabled:hover:text-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

FileDropzone.displayName = 'FileDropzone';
