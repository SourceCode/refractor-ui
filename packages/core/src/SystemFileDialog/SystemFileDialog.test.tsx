import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_FILE_DIALOG_ENTRIES,
  DEFAULT_FILE_DIALOG_FORMATS,
  DEFAULT_FILE_DIALOG_PLACES,
  SystemFileDialog,
  type SystemFileDialogKind,
  type SystemFileDialogKindMap,
  type SystemFileDialogMode,
  type SystemFileDialogModeMap,
  type SystemFileFormatFilter,
  type SystemFileNode,
} from './index';

function dispatchComposingKeyDown(
  target: Element | Node | Document | Window,
  key: string
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  fireEvent(target, event);
  return event;
}

describe('SystemFileDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders inline prism-slab defaults, exported constants, type maps, ref passthrough, optical tokens, and theme overrides', () => {
    const modeMap: SystemFileDialogModeMap = { inline: true, modal: true };
    const modes: ReadonlyArray<SystemFileDialogMode> = ['inline', 'modal'];
    for (const mode of modes) {
      expect(modeMap[mode]).toBe(true);
    }

    const kindMap: SystemFileDialogKindMap = { open: true, save: true };
    const kinds: ReadonlyArray<SystemFileDialogKind> = ['open', 'save'];
    for (const kind of kinds) {
      expect(kindMap[kind]).toBe(true);
    }

    expect(SystemFileDialog.displayName).toBe('SystemFileDialog');
    expect(DEFAULT_FILE_DIALOG_PLACES).toHaveLength(5);
    expect(DEFAULT_FILE_DIALOG_FORMATS).toHaveLength(4);
    expect(DEFAULT_FILE_DIALOG_ENTRIES.length).toBeGreaterThanOrEqual(15);

    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SystemFileDialog: {
              className: 'theme-file-dialog-override',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <SystemFileDialog
          ref={ref}
          className="local-file-dialog-class"
          style={{ letterSpacing: '0.01em' }}
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="file-dialog-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('file-dialog-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-system-file-dialog',
      'prism-slab',
      'theme-file-dialog-override',
      'local-file-dialog-class'
    );
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-kind', 'open');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root.style.letterSpacing).toBe('0.01em');
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('22px');

    expect(
      screen.getByRole('heading', { name: 'Open File' })
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('system-file-dialog-kind-switcher')
    ).toBeInTheDocument();

    // Folders listed first, then files alphabetically
    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'false');
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Refractor');
    expect(options[0]).toHaveAttribute('data-kind', 'folder');
    expect(options[1]).toHaveTextContent('caustic-preview.png');
    expect(options[2]).toHaveTextContent('optical-theme.json');

    // Confirm button starts disabled until a file is selected
    const confirmBtn = screen.getByTestId('system-file-dialog-confirm');
    expect(confirmBtn).toBeDisabled();
    expect(
      screen.getByTestId('system-file-dialog-selected-preview')
    ).toHaveTextContent('Select a file to open');

    // Clicking a folder selects it, but Open button stays disabled for non-files
    fireEvent.click(screen.getByTestId('system-file-dialog-row-proj-refractor'));
    expect(confirmBtn).toBeDisabled();
  });

  it('supports custom title and aria-label override', () => {
    render(
      <SystemFileDialog
        title="Import Optical Preset"
        aria-label="Custom preset picker"
        data-testid="custom-root"
      />
    );

    const root = screen.getByTestId('custom-root');
    expect(root).toHaveAttribute('aria-label', 'Custom preset picker');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(
      screen.getByRole('heading', { name: 'Import Optical Preset' })
    ).toBeInTheDocument();
  });

  it('selects and confirms single files on click or double-click in open mode', () => {
    const onConfirm = vi.fn();
    render(<SystemFileDialog onConfirm={onConfirm} />);

    const jsonRow = screen.getByTestId('system-file-dialog-row-proj-theme-json');
    fireEvent.click(jsonRow);
    expect(jsonRow).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTestId('system-file-dialog-selected-preview')
    ).toHaveTextContent('optical-theme.json');

    const confirmBtn = screen.getByTestId('system-file-dialog-confirm');
    expect(confirmBtn).toBeEnabled();
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      dialogKind: 'open',
      directoryPath: '/Projects',
      fileName: 'optical-theme.json',
      fullPath: '/Projects/optical-theme.json',
      formatId: 'all',
      selectedIds: ['proj-theme-json'],
    });
    expect(screen.getByTestId('system-file-dialog-status')).toHaveTextContent(
      'Opened /Projects/optical-theme.json.'
    );

    // Double-click confirms another file immediately
    fireEvent.doubleClick(
      screen.getByTestId('system-file-dialog-row-proj-dialog-tsx')
    );
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onConfirm).toHaveBeenLastCalledWith({
      dialogKind: 'open',
      directoryPath: '/Projects',
      fileName: 'SystemFileDialog.tsx',
      fullPath: '/Projects/SystemFileDialog.tsx',
      formatId: 'all',
      selectedIds: ['proj-dialog-tsx'],
    });
  });

  it('supports multi-select in open mode via Ctrl/Meta+Click, Shift+Click, checkbox toggle, and Space', () => {
    const onConfirm = vi.fn();
    render(<SystemFileDialog allowMultiple onConfirm={onConfirm} />);

    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');

    const causticRow = screen.getByTestId(
      'system-file-dialog-row-proj-caustic-png'
    );
    const jsonRow = screen.getByTestId('system-file-dialog-row-proj-theme-json');
    const tokensRow = screen.getByTestId(
      'system-file-dialog-row-proj-tokens-ts'
    );

    // Single click selects first file
    fireEvent.click(causticRow);
    // Ctrl+Click adds second file
    fireEvent.click(tokensRow, { ctrlKey: true });
    expect(causticRow).toHaveAttribute('aria-selected', 'true');
    expect(tokensRow).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTestId('system-file-dialog-selected-preview')
    ).toHaveTextContent('2 files selected');

    // Meta+Click toggles off causticRow
    fireEvent.click(causticRow, { metaKey: true });
    expect(causticRow).toHaveAttribute('aria-selected', 'false');
    expect(tokensRow).toHaveAttribute('aria-selected', 'true');

    // Checkbox span toggles jsonRow cleanly
    fireEvent.click(
      screen.getByTestId('system-file-dialog-check-proj-theme-json')
    );
    expect(jsonRow).toHaveAttribute('aria-selected', 'true');
    expect(tokensRow).toHaveAttribute('aria-selected', 'true');

    // Confirm returns both selected files
    fireEvent.click(screen.getByTestId('system-file-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      dialogKind: 'open',
      directoryPath: '/Projects',
      fileName: 'optical-theme.json',
      fullPath: '/Projects/optical-theme.json',
      formatId: 'all',
      selectedIds: ['proj-theme-json', 'proj-tokens-ts'],
    });
    expect(screen.getByTestId('system-file-dialog-status')).toHaveTextContent(
      'Opened 2 files in /Projects.'
    );

    // Shift+Click range selection across folder + files selects only files in range
    fireEvent.click(screen.getByTestId('system-file-dialog-row-proj-refractor'));
    fireEvent.click(tokensRow, { shiftKey: true });
    expect(causticRow).toHaveAttribute('aria-selected', 'true');
    expect(jsonRow).toHaveAttribute('aria-selected', 'true');
    expect(tokensRow).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTestId('system-file-dialog-row-proj-refractor')
    ).toHaveAttribute('aria-selected', 'false');

    // Ctrl+Click after folder selected ignores folder and selects clicked file
    fireEvent.click(screen.getByTestId('system-file-dialog-row-proj-refractor'));
    fireEvent.click(jsonRow, { ctrlKey: true });
    expect(jsonRow).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByTestId('system-file-dialog-row-proj-refractor')
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('navigates across places sidebar, folders, breadcrumbs, Back, and Up buttons', () => {
    render(<SystemFileDialog />);

    const backBtn = screen.getByTestId('system-file-dialog-back');
    const upBtn = screen.getByTestId('system-file-dialog-up');
    expect(backBtn).toBeDisabled();
    expect(upBtn).toBeEnabled();

    // Clicking active place (/Projects) is a safe no-op
    fireEvent.click(screen.getByTestId('system-file-dialog-place-place-projects'));
    expect(backBtn).toBeDisabled();

    // Double-click folder enters /Projects/Refractor
    fireEvent.doubleClick(
      screen.getByTestId('system-file-dialog-row-proj-refractor')
    );
    expect(backBtn).toBeEnabled();
    expect(
      screen.getByTestId('system-file-dialog-row-ref-create-theme')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('system-file-dialog-crumb-/Projects/Refractor')
    ).toHaveAttribute('aria-current', 'location');

    // Back returns to /Projects
    fireEvent.click(backBtn);
    expect(backBtn).toBeDisabled();
    expect(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    ).toBeInTheDocument();

    // Places sidebar navigates to Documents, Downloads, Favorites, System Drive
    fireEvent.click(
      screen.getByTestId('system-file-dialog-place-place-documents')
    );
    expect(
      screen.getByTestId('system-file-dialog-row-doc-release-md')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId('system-file-dialog-place-place-downloads')
    );
    expect(
      screen.getByTestId('system-file-dialog-row-dl-palette-json')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId('system-file-dialog-place-place-favorites')
    );
    expect(
      screen.getByTestId('system-file-dialog-row-ref-prism-card')
    ).toBeInTheDocument();

    // Up climbs /Projects/Refractor -> /Projects -> /
    fireEvent.click(upBtn);
    expect(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    ).toBeInTheDocument();
    fireEvent.click(upBtn);
    expect(upBtn).toBeDisabled();
    expect(
      screen.getByTestId('system-file-dialog-row-root-manifest')
    ).toBeInTheDocument();

    // Clicking System Drive place when already at / stays at /
    fireEvent.click(
      screen.getByTestId('system-file-dialog-place-place-system-drive')
    );
    expect(upBtn).toBeDisabled();

    // Double-click Projects from root, then click System breadcrumb to return to /
    fireEvent.doubleClick(
      screen.getByTestId('system-file-dialog-row-root-projects')
    );
    expect(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('system-file-dialog-crumb-/'));
    expect(
      screen.getByTestId('system-file-dialog-row-root-manifest')
    ).toBeInTheDocument();
  });

  it('normalizes edge-case initialPath values and renders empty folder state', () => {
    const { rerender } = render(
      <SystemFileDialog
        initialPath="\Projects\..\EmptyFolder\./"
        defaultEntries={[]}
      />
    );
    expect(screen.getByTestId('system-file-dialog-empty')).toHaveTextContent(
      'This folder is empty.'
    );
    expect(
      screen.getByTestId('system-file-dialog-crumb-/EmptyFolder')
    ).toBeInTheDocument();

    rerender(<SystemFileDialog initialPath="  " defaultEntries={[]} />);
    expect(screen.getByTestId('system-file-dialog-empty')).toBeInTheDocument();
  });

  it('normalizes parent traversal initialPath to root', () => {
    render(<SystemFileDialog initialPath="/../.." defaultEntries={[]} />);
    expect(screen.getByTestId('system-file-dialog-up')).toBeDisabled();
  });

  it('filters files with linear-time search (safe against regex metacharacters) and format dropdown while keeping folders visible', () => {
    render(<SystemFileDialog />);

    const searchInput = screen.getByTestId('system-file-dialog-search');
    const formatSelect = screen.getByLabelText('File format filter');

    // Select a JSON file, then filter to Images — selection clears because JSON file is hidden
    fireEvent.click(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    );
    expect(screen.getByTestId('system-file-dialog-confirm')).toBeEnabled();

    fireEvent.change(formatSelect, { target: { value: 'images' } });
    expect(screen.getByTestId('system-file-dialog-confirm')).toBeDisabled();
    expect(
      screen.getByTestId('system-file-dialog-row-proj-refractor')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('system-file-dialog-row-proj-caustic-png')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('system-file-dialog-row-proj-mark-svg')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('system-file-dialog-row-proj-theme-json')
    ).not.toBeInTheDocument();

    // Filter to TypeScript
    fireEvent.change(formatSelect, { target: { value: 'typescript' } });
    expect(
      screen.getByTestId('system-file-dialog-row-proj-dialog-tsx')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('system-file-dialog-row-proj-tokens-ts')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('system-file-dialog-row-proj-caustic-png')
    ).not.toBeInTheDocument();

    // Search with regex metacharacters — must not throw and shows zero-match message
    fireEvent.change(searchInput, { target: { value: '(.*[invalid' } });
    expect(screen.getByTestId('system-file-dialog-empty')).toHaveTextContent(
      'No items match the current search or format filter.'
    );

    // Clear search restores visible entries
    fireEvent.click(screen.getByTestId('system-file-dialog-search-clear'));
    expect(
      screen.getByTestId('system-file-dialog-row-proj-tokens-ts')
    ).toBeInTheDocument();

    // Substring match narrows to matching file
    fireEvent.change(searchInput, { target: { value: 'tokens' } });
    expect(
      screen.getByTestId('system-file-dialog-row-proj-tokens-ts')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('system-file-dialog-row-proj-dialog-tsx')
    ).not.toBeInTheDocument();
  });

  it('supports custom format filters (empty extensions, wildcard .*, extensionless files, inferred extensions)', () => {
    const customEntries: ReadonlyArray<SystemFileNode> = [
      {
        id: 'f-makefile',
        name: 'Makefile',
        kind: 'file',
        parentPath: '/',
      },
      {
        id: 'f-readme',
        name: 'README.MD',
        kind: 'file',
        parentPath: '/',
      },
    ];
    const customFormats: ReadonlyArray<SystemFileFormatFilter> = [
      { id: 'md', label: 'Markdown', extensions: ['md'] },
      { id: 'empty-ext', label: 'Any', extensions: [] },
      { id: 'dot-star', label: 'All (.*)', extensions: ['.*'] },
    ];

    render(
      <SystemFileDialog
        initialPath="/"
        entries={customEntries}
        formats={customFormats}
      />
    );

    // First format ('md') matches README.MD via inferred extension, hides Makefile
    expect(
      screen.getByTestId('system-file-dialog-row-f-readme')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('system-file-dialog-row-f-makefile')
    ).not.toBeInTheDocument();

    // Empty extensions array shows all files
    const formatSelect = screen.getByLabelText('File format filter');
    fireEvent.change(formatSelect, { target: { value: 'empty-ext' } });
    expect(
      screen.getByTestId('system-file-dialog-row-f-makefile')
    ).toBeInTheDocument();

    // Wildcard '.*' shows all files
    fireEvent.change(formatSelect, { target: { value: 'dot-star' } });
    expect(
      screen.getByTestId('system-file-dialog-row-f-makefile')
    ).toBeInTheDocument();
  });

  it('switches between Open and Save As modes cleanly and populates filename on file click/double-click', () => {
    const onConfirm = vi.fn();
    render(<SystemFileDialog onConfirm={onConfirm} />);

    // Select a file in Open mode, then switch to Save mode
    fireEvent.click(
      screen.getByTestId('system-file-dialog-row-proj-tokens-ts')
    );
    fireEvent.click(screen.getByTestId('system-file-dialog-kind-save'));
    expect(
      screen.getByRole('heading', { name: 'Save As' })
    ).toBeInTheDocument();

    const fileInput = screen.getByTestId(
      'system-file-dialog-filename-input'
    ) as HTMLInputElement;
    expect(fileInput.value).toBe('prism-tokens.ts');

    // Clicking Save again when already in Save mode is a no-op
    fireEvent.click(screen.getByTestId('system-file-dialog-kind-save'));

    // Clicking or double-clicking another file updates filename without auto-confirming
    fireEvent.click(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    );
    expect(fileInput.value).toBe('optical-theme.json');
    fireEvent.doubleClick(
      screen.getByTestId('system-file-dialog-row-proj-mark-svg')
    );
    expect(fileInput.value).toBe('refractor-mark.svg');
    expect(onConfirm).not.toHaveBeenCalled();

    // Confirming an existing file includes its ID in selectedIds
    fireEvent.click(screen.getByTestId('system-file-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledWith({
      dialogKind: 'save',
      directoryPath: '/Projects',
      fileName: 'refractor-mark.svg',
      fullPath: '/Projects/refractor-mark.svg',
      formatId: 'all',
      selectedIds: ['proj-mark-svg'],
    });

    // Switch back to Open mode
    fireEvent.click(screen.getByTestId('system-file-dialog-kind-open'));
    expect(
      screen.getByRole('heading', { name: 'Open File' })
    ).toBeInTheDocument();
  });

  it('hides kind switcher when dialogKind is controlled or allowKindSwitch is false', () => {
    const { rerender } = render(<SystemFileDialog dialogKind="save" />);
    expect(
      screen.queryByTestId('system-file-dialog-kind-switcher')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Save As' })
    ).toBeInTheDocument();

    rerender(<SystemFileDialog allowKindSwitch={false} />);
    expect(
      screen.queryByTestId('system-file-dialog-kind-switcher')
    ).not.toBeInTheDocument();
  });

  it('auto-appends format extension in Save As mode when user omits extension and preserves explicit extensions', () => {
    const onConfirm = vi.fn();
    render(
      <SystemFileDialog
        dialogKind="save"
        defaultFileName="custom-export"
        onConfirm={onConfirm}
      />
    );

    const fileInput = screen.getByTestId(
      'system-file-dialog-filename-input'
    ) as HTMLInputElement;
    const formatSelect = screen.getByLabelText('File format filter');

    // Wildcard All Files (*) does not auto-append an extension
    expect(
      screen.queryByTestId('system-file-dialog-auto-ext')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('system-file-dialog-confirm'));
    expect(onConfirm).toHaveBeenLastCalledWith({
      dialogKind: 'save',
      directoryPath: '/Projects',
      fileName: 'custom-export',
      fullPath: '/Projects/custom-export',
      formatId: 'all',
      selectedIds: [],
    });

    // Switch format to JSON (.json) -> auto-appends .json
    fireEvent.change(formatSelect, { target: { value: 'json' } });
    expect(screen.getByTestId('system-file-dialog-auto-ext')).toHaveTextContent(
      'Auto .json'
    );

    // Confirm via Enter key inside filename input
    fireEvent.keyDown(fileInput, { key: 'Enter' });
    expect(onConfirm).toHaveBeenLastCalledWith({
      dialogKind: 'save',
      directoryPath: '/Projects',
      fileName: 'custom-export.json',
      fullPath: '/Projects/custom-export.json',
      formatId: 'json',
      selectedIds: [],
    });
    expect(fileInput.value).toBe('custom-export.json');

    // Confirming again does not double-append .json
    fireEvent.click(screen.getByTestId('system-file-dialog-confirm'));
    expect(onConfirm).toHaveBeenLastCalledWith({
      dialogKind: 'save',
      directoryPath: '/Projects',
      fileName: 'custom-export.json',
      fullPath: '/Projects/custom-export.json',
      formatId: 'json',
      selectedIds: [],
    });

    // Root directory save produces single-slash fullPath
    fireEvent.click(
      screen.getByTestId('system-file-dialog-place-place-system-drive')
    );
    fireEvent.change(fileInput, { target: { value: 'root-backup' } });
    fireEvent.click(screen.getByTestId('system-file-dialog-confirm'));
    expect(onConfirm).toHaveBeenLastCalledWith({
      dialogKind: 'save',
      directoryPath: '/',
      fileName: 'root-backup.json',
      fullPath: '/root-backup.json',
      formatId: 'json',
      selectedIds: [],
    });
  });

  it('strictly blocks path-traversal, separator, control-char, dots-only, trailing-dot, and empty filenames in Save As mode', () => {
    const onConfirm = vi.fn();
    render(
      <SystemFileDialog
        dialogKind="save"
        defaultFileName="valid.json"
        onConfirm={onConfirm}
      />
    );

    const fileInput = screen.getByTestId('system-file-dialog-filename-input');
    const confirmBtn = screen.getByTestId('system-file-dialog-confirm');

    const adversarialCases: ReadonlyArray<{
      value: string;
      expectedError: RegExp;
    }> = [
      { value: '../../etc/passwd', expectedError: /Path separators/i },
      { value: 'a/b', expectedError: /Path separators/i },
      { value: 'a\\b', expectedError: /Path separators/i },
      { value: '..', expectedError: /Path traversal/i },
      { value: 'foo..bar', expectedError: /Path traversal/i },
      { value: '.', expectedError: /Dots-only/i },
      { value: 'report.', expectedError: /trailing dot/i },
      { value: 'null\u0000byte.json', expectedError: /control or null/i },
      { value: 'del\u007fchar.json', expectedError: /control or null/i },
      { value: '', expectedError: /cannot be empty/i },
      { value: '   ', expectedError: /cannot be empty/i },
    ];

    for (const testCase of adversarialCases) {
      fireEvent.change(fileInput, { target: { value: testCase.value } });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(testCase.expectedError);
      expect(fileInput).toHaveAttribute('aria-invalid', 'true');
      expect(confirmBtn).toBeDisabled();

      // Pressing Enter while invalid must not confirm
      fireEvent.keyDown(fileInput, { key: 'Enter' });
      expect(onConfirm).not.toHaveBeenCalled();
    }

    // Restoring a valid name clears the alert and re-enables Save
    fireEvent.change(fileInput, { target: { value: 'clean-theme.json' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmBtn).toBeEnabled();
  });

  it('creates new folders with inline validation against empty, duplicate, and unsafe names (uncontrolled & controlled)', () => {
    const onCreateFolder = vi.fn();
    render(<SystemFileDialog onCreateFolder={onCreateFolder} />);

    // Open New Folder form
    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));
    const folderInput = screen.getByLabelText('New folder name');
    const createBtn = screen.getByTestId(
      'system-file-dialog-new-folder-create'
    );

    // Invalid names rejected with role="alert"
    fireEvent.click(createBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Folder name cannot be empty/i
    );

    fireEvent.change(folderInput, { target: { value: 'bad/folder' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(createBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/Path separators/i);

    fireEvent.change(folderInput, { target: { value: '..' } });
    fireEvent.click(createBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/Path traversal/i);

    // Duplicate existing folder name (case-insensitive) rejected
    fireEvent.change(folderInput, { target: { value: 'refractor' } });
    fireEvent.click(createBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
    expect(onCreateFolder).not.toHaveBeenCalled();

    // Valid name submitted via Enter creates folder in uncontrolled state
    fireEvent.change(folderInput, { target: { value: 'Exports' } });
    fireEvent.keyDown(folderInput, { key: 'Enter' });
    expect(onCreateFolder).toHaveBeenCalledTimes(1);
    expect(onCreateFolder).toHaveBeenCalledWith('/Projects/Exports');
    expect(
      screen.queryByTestId('system-file-dialog-new-folder-form')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('system-file-dialog-row-created-folder-1')
    ).toHaveTextContent('Exports');

    // Escape closes inline New Folder form cleanly
    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));
    const secondInput = screen.getByLabelText('New folder name');
    fireEvent.keyDown(secondInput, { key: 'Escape' });
    expect(
      screen.queryByTestId('system-file-dialog-new-folder-form')
    ).not.toBeInTheDocument();
  });

  it('invokes onCreateFolder without mutating controlled entries', () => {
    const onCreateFolder = vi.fn();
    const controlledEntries: ReadonlyArray<SystemFileNode> = [
      { id: 'c1', name: 'existing.json', kind: 'file', parentPath: '/' },
    ];
    render(
      <SystemFileDialog
        initialPath="/"
        entries={controlledEntries}
        onCreateFolder={onCreateFolder}
      />
    );

    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));
    fireEvent.change(screen.getByLabelText('New folder name'), {
      target: { value: 'ControlledDir' },
    });
    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-create'));

    expect(onCreateFolder).toHaveBeenCalledWith('/ControlledDir');
    expect(screen.queryByText('ControlledDir')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation (ArrowDown, ArrowUp, Home, End, Space, Enter) in open and save modes', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<SystemFileDialog onConfirm={onConfirm} />);

    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });

    // Enter/Space with no active item does nothing
    fireEvent.keyDown(listbox, { key: 'Enter' });
    fireEvent.keyDown(listbox, { key: ' ' });
    expect(onConfirm).not.toHaveBeenCalled();

    // ArrowUp from unset moves to last row (SystemFileDialog.tsx)
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(
      screen.getByTestId('system-file-dialog-row-proj-dialog-tsx')
    ).toHaveAttribute('data-active', 'true');

    // Home jumps to first row (Refractor folder)
    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(
      screen.getByTestId('system-file-dialog-row-proj-refractor')
    ).toHaveAttribute('data-active', 'true');

    // Space on folder is safe no-op; ArrowDown moves to first file (caustic-preview.png)
    fireEvent.keyDown(listbox, { key: ' ' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(
      screen.getByTestId('system-file-dialog-row-proj-caustic-png')
    ).toHaveAttribute('data-active', 'true');

    // Space selects active file in single-select
    fireEvent.keyDown(listbox, { key: ' ' });
    // End jumps to last row, ArrowUp moves up one (refractor-mark.svg), Enter confirms it
    fireEvent.keyDown(listbox, { key: 'End' });
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith({
      dialogKind: 'open',
      directoryPath: '/Projects',
      fileName: 'refractor-mark.svg',
      fullPath: '/Projects/refractor-mark.svg',
      formatId: 'all',
      selectedIds: ['proj-mark-svg'],
    });

    // Home -> Enter on folder navigates into /Projects/Refractor
    fireEvent.keyDown(listbox, { key: 'Home' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(
      screen.getByTestId('system-file-dialog-row-ref-create-theme')
    ).toBeInTheDocument();

    // ArrowDown from unset starts at index 0
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(
      screen.getByTestId('system-file-dialog-row-ref-create-theme')
    ).toHaveAttribute('data-active', 'true');

    // Switch to allowMultiple open mode and test Space toggle + Enter confirm on unselected active file
    rerender(<SystemFileDialog allowMultiple onConfirm={onConfirm} />);
    const multiListbox = screen.getByRole('listbox', {
      name: 'Directory contents',
    });
    fireEvent.keyDown(multiListbox, { key: 'ArrowDown' });
    fireEvent.keyDown(multiListbox, { key: ' ' });
    fireEvent.keyDown(multiListbox, { key: 'ArrowDown' });
    // Active item is unselected (index 2: PrismCard.tsx) -> Enter opens that active item
    fireEvent.keyDown(multiListbox, { key: 'Enter' });
    expect(onConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dialogKind: 'open',
        selectedIds: ['ref-prism-card'],
      })
    );

    // Switch to save mode -> ArrowDown/Space updates filename & Enter confirms save
    rerender(<SystemFileDialog dialogKind="save" onConfirm={onConfirm} />);
    const saveListbox = screen.getByRole('listbox', {
      name: 'Directory contents',
    });
    fireEvent.keyDown(saveListbox, { key: 'ArrowDown' });
    fireEvent.keyDown(saveListbox, { key: ' ' });
    fireEvent.keyDown(saveListbox, { key: 'Enter' });
    expect(onConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dialogKind: 'save',
        directoryPath: '/Projects/Refractor',
      })
    );
  });

  it('ignores keyboard navigation cleanly when directory is empty', () => {
    render(<SystemFileDialog defaultEntries={[]} />);
    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(screen.getByTestId('system-file-dialog-empty')).toBeInTheDocument();
  });

  it('guards all keyboard handlers against active IME composition', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onCreateFolder = vi.fn();

    render(
      <SystemFileDialog
        mode="modal"
        open={true}
        dialogKind="save"
        onConfirm={onConfirm}
        onCancel={onCancel}
        onCreateFolder={onCreateFolder}
      />
    );

    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });
    dispatchComposingKeyDown(listbox, 'ArrowDown');
    dispatchComposingKeyDown(listbox, 'Enter');

    const fileInput = screen.getByTestId('system-file-dialog-filename-input');
    dispatchComposingKeyDown(fileInput, 'Enter');

    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));
    const folderInput = screen.getByLabelText('New folder name');
    fireEvent.change(folderInput, { target: { value: 'ImeDir' } });
    dispatchComposingKeyDown(folderInput, 'Enter');
    dispatchComposingKeyDown(folderInput, 'Escape');
    expect(
      screen.getByTestId('system-file-dialog-new-folder-form')
    ).toBeInTheDocument();

    const backdrop = screen.getByTestId('system-file-dialog-backdrop');
    dispatchComposingKeyDown(backdrop, 'Escape');
    dispatchComposingKeyDown(window, 'Escape');

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onCreateFolder).not.toHaveBeenCalled();
  });

  it('renders modal backdrop when mode="modal", hides when open=false, and dismisses via backdrop, close, Cancel, or Escape', () => {
    const onCancel = vi.fn();
    const { rerender, unmount } = render(
      <SystemFileDialog mode="modal" open={false} onCancel={onCancel} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();

    rerender(
      <SystemFileDialog
        mode="modal"
        open={true}
        onCancel={onCancel}
        aria-label="Modal file picker"
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Modal file picker' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).not.toHaveAttribute('aria-labelledby');

    // Clicking inside the panel does NOT cancel
    fireEvent.click(dialog);
    expect(onCancel).not.toHaveBeenCalled();

    // Clicking backdrop cancels
    fireEvent.click(screen.getByTestId('system-file-dialog-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('system-file-dialog-status')).toHaveTextContent(
      'Canceled file dialog via backdrop.'
    );

    // Header close button cancels
    fireEvent.click(screen.getByTestId('system-file-dialog-close'));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('system-file-dialog-status')).toHaveTextContent(
      'Canceled file dialog.'
    );

    // Footer Cancel button cancels
    fireEvent.click(screen.getByTestId('system-file-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(3);

    // Pressing Escape on modal panel triggers onCancel once (not double-fired by window)
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId('system-file-dialog-status')).toHaveTextContent(
      'Canceled file dialog via Escape.'
    );

    // Pressing Escape on window triggers onCancel once
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(5);

    // Pressing Escape inside New Folder input only closes New Folder form, not modal
    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));
    fireEvent.keyDown(screen.getByLabelText('New folder name'), {
      key: 'Escape',
    });
    expect(onCancel).toHaveBeenCalledTimes(5);

    // Unmounting cleans up window Escape listener
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(5);
  });

  it('blocks all interactive actions, selection, navigation, and modal dismissal when disabled', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onCreateFolder = vi.fn();

    const { rerender } = render(
      <SystemFileDialog
        mode="modal"
        open={true}
        disabled={true}
        allowMultiple={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onCreateFolder={onCreateFolder}
        data-testid="disabled-modal"
      />
    );

    const root = screen.getByTestId('disabled-modal');
    expect(root).toHaveAttribute('data-disabled', 'true');
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveAttribute('aria-disabled', 'true');

    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });
    expect(listbox).toHaveAttribute('tabindex', '-1');
    expect(listbox).toHaveAttribute('aria-disabled', 'true');

    // Clicking/double-clicking rows, checkboxes, backdrop, and Escape do nothing
    fireEvent.click(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    );
    fireEvent.doubleClick(
      screen.getByTestId('system-file-dialog-row-proj-theme-json')
    );
    fireEvent.click(
      screen.getByTestId('system-file-dialog-check-proj-theme-json')
    );
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.click(root);
    fireEvent.keyDown(root, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('system-file-dialog-cancel'));
    fireEvent.click(screen.getByTestId('system-file-dialog-confirm'));
    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onCreateFolder).not.toHaveBeenCalled();

    // Also verify inline disabled state renders aria-disabled="true"
    rerender(
      <SystemFileDialog
        mode="inline"
        disabled={true}
        data-testid="disabled-inline"
      />
    );
    expect(screen.getByTestId('disabled-inline')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('handles non-action keys, dynamic format list fallback, empty-selection kind switch, and New Folder dismiss button', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <SystemFileDialog
        mode="modal"
        open={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Switch Open -> Save with no selected file preserves defaultFileName
    fireEvent.click(screen.getByTestId('system-file-dialog-kind-save'));
    const fileInput = screen.getByTestId(
      'system-file-dialog-filename-input'
    ) as HTMLInputElement;
    expect(fileInput.value).toBe('optical-theme.json');

    // Non-action keys on filename input, listbox, new folder input, modal panel, and window are no-ops
    fireEvent.keyDown(fileInput, { key: 'a' });
    const listbox = screen.getByRole('listbox', { name: 'Directory contents' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Tab' });

    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-btn'));
    fireEvent.keyDown(screen.getByLabelText('New folder name'), { key: 'a' });
    fireEvent.click(screen.getByTestId('system-file-dialog-new-folder-cancel'));
    expect(
      screen.queryByTestId('system-file-dialog-new-folder-form')
    ).not.toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'a' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    // Dynamic formats prop replacement falls back safely to the first format in the new list
    const replacementFormats: ReadonlyArray<SystemFileFormatFilter> = [
      { id: 'svg-only', label: 'SVG (.svg)', extensions: ['.svg'] },
    ];
    rerender(
      <SystemFileDialog
        mode="inline"
        formats={replacementFormats}
        onConfirm={onConfirm}
      />
    );
    expect(
      screen.getByTestId('system-file-dialog-row-proj-mark-svg')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('system-file-dialog-row-proj-theme-json')
    ).not.toBeInTheDocument();

    // Change select to unknown value does not throw
    fireEvent.change(screen.getByLabelText('File format filter'), {
      target: { value: 'nonexistent-format' },
    });
  });
});
