import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { FileDropzone, type UploadedFileSummary } from './FileDropzone';

const SAMPLE_FILES: UploadedFileSummary[] = [
  { name: 'tokens.json', sizeBytes: 512, mimeType: 'application/json' },
  { name: 'prism.svg', sizeBytes: 4096, mimeType: 'image/svg+xml' },
];

describe('FileDropzone', () => {
  it('renders uploaded files, handles browse/input uploads, removal, stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onUploadFiles = vi.fn();
    const onRemoveFile = vi.fn();

    render(
      <FileDropzone
        ref={ref}
        files={SAMPLE_FILES}
        onUploadFiles={onUploadFiles}
        onRemoveFile={onRemoveFile}
        accept=".svg,.json"
        className="custom-dz"
        data-testid="dz-root"
      />
    );

    const root = screen.getByTestId('dz-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-file-dropzone', 'space-y-3', 'custom-dz');
    expect(screen.getByText('tokens.json')).toBeInTheDocument();
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('4.0 KB')).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Upload files') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.svg,.json');

    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'browse device' }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const f1 = new File(['hello'], 'spec.ts', { type: '' });
    fireEvent.change(fileInput, { target: { files: [f1] } });
    expect(onUploadFiles).toHaveBeenCalledWith([
      { name: 'spec.ts', sizeBytes: 5, mimeType: 'application/octet-stream' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove tokens.json' }));
    expect(onRemoveFile).toHaveBeenCalledWith('tokens.json');
  });

  it('handles dragOver, dragLeave, and valid file drop with dragging data attribute', () => {
    const onUploadFiles = vi.fn();
    render(
      <FileDropzone files={[]} onUploadFiles={onUploadFiles} data-testid="dz-drag" />
    );

    const root = screen.getByTestId('dz-drag');
    const dropSurface = root.querySelector('.prism-slab') as HTMLElement;

    fireEvent.dragOver(dropSurface);
    expect(root).toHaveAttribute('data-dragging', 'true');

    fireEvent.dragLeave(dropSurface);
    expect(root).not.toHaveAttribute('data-dragging');

    const droppedFile = new File(['svg'], 'icon.svg', { type: 'image/svg+xml' });
    fireEvent.dragOver(dropSurface);
    fireEvent.drop(dropSurface, { dataTransfer: { files: [droppedFile] } });

    expect(root).not.toHaveAttribute('data-dragging');
    expect(onUploadFiles).toHaveBeenCalledWith([
      { name: 'icon.svg', sizeBytes: 3, mimeType: 'image/svg+xml' },
    ]);
  });

  it('ignores empty file drops and missing dataTransfer safely (adversarial)', () => {
    const onUploadFiles = vi.fn();
    render(<FileDropzone files={[]} onUploadFiles={onUploadFiles} data-testid="dz-empty" />);

    const dropSurface = screen.getByTestId('dz-empty').querySelector('.prism-slab') as HTMLElement;
    fireEvent.drop(dropSurface, { dataTransfer: { files: [] } });
    fireEvent.drop(dropSurface, {});

    const fileInput = screen.getByLabelText('Upload files');
    fireEvent.change(fileInput, { target: { files: null } });

    expect(onUploadFiles).not.toHaveBeenCalled();
  });

  it('supports theme overrides, omits remove buttons when onRemoveFile absent, and blocks actions when disabled', () => {
    const onUploadFiles = vi.fn();
    render(
      <PrismThemeProvider
        theme={{
          components: { FileDropzone: { className: 'theme-dz', style: { maxWidth: '420px' } } },
        }}
      >
        <FileDropzone
          files={SAMPLE_FILES}
          onUploadFiles={onUploadFiles}
          disabled
          className="local-dz"
          data-testid="dz-disabled"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('dz-disabled');
    expect(root).toHaveClass('refractor-file-dropzone', 'theme-dz', 'local-dz');
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();

    const dropSurface = root.querySelector('.prism-slab') as HTMLElement;
    fireEvent.dragOver(dropSurface);
    expect(root).not.toHaveAttribute('data-dragging');

    const droppedFile = new File(['data'], 'blocked.png', { type: 'image/png' });
    fireEvent.drop(dropSurface, { dataTransfer: { files: [droppedFile] } });
    expect(onUploadFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'browse device' })).toBeDisabled();
  });

  it('safely renders adversarial XSS file names as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>.svg';
    render(
      <FileDropzone
        files={[{ name: payload, sizeBytes: -10, mimeType: 'image/svg+xml' }]}
        onUploadFiles={vi.fn()}
        onRemoveFile={vi.fn()}
      />
    );

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByText('0 B')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
