import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  it('renders optical glass shell, label, telemetry, ref passthrough, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RichTextEditor: {
              className: 'theme-rte',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <RichTextEditor
          ref={ref}
          label="Release Notes"
          defaultValue="Hello **Refractor**"
          className="local-rte"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="rte-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('rte-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-rich-text-editor', 'prism-slab', 'theme-rte', 'local-rte');
    expect(root).toHaveAttribute('data-view-mode', 'split');
    expect(root).toHaveAttribute('data-preview', 'true');
    expect(root).toHaveStyle({ letterSpacing: '0.2px' });

    const textarea = screen.getByLabelText('Release Notes');
    expect(textarea).toHaveValue('Hello **Refractor**');

    const preview = screen.getByRole('region', { name: 'Rich text preview' });
    expect(preview.querySelector('strong')).toHaveTextContent('Refractor');

    const stats = screen.getByLabelText('Document statistics');
    expect(stats).toHaveTextContent('2 words');
    expect(stats).toHaveTextContent('19 chars');
  });

  it('switches Write | Split | Preview modes via clicks and keyboard arrows, and respects showPreview=false', () => {
    const { rerender } = render(
      <RichTextEditor defaultValue="One" />
    );

    expect(screen.getByText('Rich Text Editor')).toBeInTheDocument();
    expect(screen.getByLabelText('Document statistics')).toHaveTextContent('1 word');

    const writeTab = screen.getByRole('tab', { name: 'Write' });
    const splitTab = screen.getByRole('tab', { name: 'Split' });
    const previewTab = screen.getByRole('tab', { name: 'Preview' });

    expect(splitTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Rich text editor')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rich text preview' })).toBeInTheDocument();

    fireEvent.click(writeTab);
    expect(writeTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Rich text editor')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Rich text preview' })).not.toBeInTheDocument();

    fireEvent.click(previewTab);
    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Rich text editor')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rich text preview' })).toHaveTextContent('One');

    // Keyboard arrow cycling on tabs (ArrowRight wraps Preview -> Write, ArrowLeft -> Preview, non-arrow ignored)
    fireEvent.keyDown(previewTab, { key: 'Enter' });
    expect(previewTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(previewTab, { key: 'ArrowRight' });
    expect(writeTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(writeTab, { key: 'ArrowLeft' });
    expect(previewTab).toHaveAttribute('aria-selected', 'true');

    // showPreview=false with label hides tabs and preview region while keeping label
    rerender(<RichTextEditor label="Compact" value="a" showPreview={false} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Rich text preview' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Compact')).toBeInTheDocument();
    expect(screen.getByLabelText('Document statistics')).toHaveTextContent('1 char');

    // showPreview=false without label hides header row completely
    rerender(<RichTextEditor value="ab" showPreview={false} />);
    expect(screen.queryByText('Rich Text Editor')).not.toBeInTheDocument();
  });

  it('applies all toolbar formatting actions, selection toggles, multi-line lists, keyboard shortcuts, and clear formatting', () => {
    const onChange = vi.fn();
    render(<RichTextEditor label="Body" defaultValue="hello world" onChange={onChange} />);

    const textarea = screen.getByLabelText('Body') as HTMLTextAreaElement;
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting toolbar' });

    // Select "hello" and apply Bold, then toggle Bold off
    textarea.setSelectionRange(0, 5);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Bold' }));
    expect(textarea.value).toBe('**hello** world');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('strong')).toHaveTextContent('hello');

    textarea.setSelectionRange(0, 9);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Bold' }));
    expect(textarea.value).toBe('hello world');

    // Italic and Underline with selection
    textarea.setSelectionRange(6, 11);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Italic' }));
    expect(textarea.value).toBe('hello *world*');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('em')).toHaveTextContent('world');

    textarea.setSelectionRange(0, 5);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Underline' }));
    expect(textarea.value).toBe('<u>hello</u> *world*');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('u')).toHaveTextContent('hello');

    // Collapsed cursor inserts fallback placeholder text
    fireEvent.change(textarea, { target: { value: '' } });
    textarea.setSelectionRange(0, 0);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Bold' }));
    expect(textarea.value).toBe('**bold text**');

    // Heading 1 -> switches to Heading 2 -> toggles off
    fireEvent.change(textarea, { target: { value: 'Title line' } });
    textarea.setSelectionRange(0, 0);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Heading 1' }));
    expect(textarea.value).toBe('# Title line');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('h1')).toHaveTextContent('Title line');

    fireEvent.click(within(toolbar).getByRole('button', { name: 'Heading 2' }));
    expect(textarea.value).toBe('## Title line');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('h2')).toHaveTextContent('Title line');

    fireEvent.click(within(toolbar).getByRole('button', { name: 'Heading 2' }));
    expect(textarea.value).toBe('Title line');

    // Bullet list, Numbered list (multi-line & toggle off), Blockquote, and line-2 cursor prefix
    fireEvent.change(textarea, { target: { value: 'Alpha\nBeta' } });
    textarea.setSelectionRange(6, 10);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Heading 2' }));
    expect(textarea.value).toBe('Alpha\n## Beta');

    fireEvent.change(textarea, { target: { value: 'Alpha\nBeta' } });
    textarea.setSelectionRange(0, 10);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Bullet list' }));
    expect(textarea.value).toBe('- Alpha\n- Beta');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelectorAll('ul li')).toHaveLength(2);

    textarea.setSelectionRange(0, textarea.value.length);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Numbered list' }));
    expect(textarea.value).toBe('1. Alpha\n2. Beta');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelectorAll('ol li')).toHaveLength(2);

    textarea.setSelectionRange(0, textarea.value.length);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Numbered list' }));
    expect(textarea.value).toBe('Alpha\nBeta');

    textarea.setSelectionRange(0, 5);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Blockquote' }));
    expect(textarea.value).toBe('> Alpha\nBeta');
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('blockquote')).toHaveTextContent('Alpha');

    // Keyboard shortcuts Ctrl+B, Ctrl+I, Ctrl+U (and non-shortcut keys + IME guard)
    fireEvent.change(textarea, { target: { value: 'word' } });
    textarea.setSelectionRange(0, 4);
    const composingKey = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(composingKey, 'isComposing', { value: true });
    fireEvent(textarea, composingKey);
    expect(textarea.value).toBe('word');

    fireEvent.keyDown(textarea, { key: 'a' });
    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
    expect(textarea.value).toBe('word');

    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    expect(textarea.value).toBe('**word**');

    fireEvent.change(textarea, { target: { value: 'word' } });
    textarea.setSelectionRange(0, 4);
    fireEvent.keyDown(textarea, { key: 'i', metaKey: true });
    expect(textarea.value).toBe('*word*');

    fireEvent.change(textarea, { target: { value: 'word' } });
    textarea.setSelectionRange(0, 4);
    fireEvent.keyDown(textarea, { key: 'u', ctrlKey: true });
    expect(textarea.value).toBe('<u>word</u>');

    // Clear formatting on selection and on entire document (including ##, 1., unclosed brackets)
    fireEvent.change(textarea, {
      target: {
        value:
          '# **Heading** with `code` and [Site](https://example.com) and ![Pic](https://example.com/a.png) and <u>under</u>\n## Sub\n1. Item [unclosed ![img](no-close',
      },
    });
    textarea.setSelectionRange(0, 13);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Clear formatting' }));
    expect(textarea.value.startsWith('Heading')).toBe(true);

    textarea.setSelectionRange(0, 0);
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Clear formatting' }));
    expect(textarea.value).toBe('Heading with code and Site and Pic and under\nSub\nItem [unclosed ![img](no-close');
  });

  it('validates link and image insertions via sanitizeUrl(), rejects javascript: URIs, and handles Escape/Enter/IME', () => {
    const onChange = vi.fn();
    render(<RichTextEditor label="Composer" defaultValue="Click here" onChange={onChange} />);

    const textarea = screen.getByLabelText('Composer') as HTMLTextAreaElement;
    textarea.setSelectionRange(6, 10);

    // Open and toggle link popover
    const linkBtn = screen.getByRole('button', { name: 'Insert link' });
    fireEvent.click(linkBtn);
    expect(screen.getByRole('dialog', { name: 'Insert link' })).toBeInTheDocument();
    expect(screen.getByLabelText('Link text')).toHaveValue('here');

    // Reject javascript: URI with visible role="alert" error
    const urlInput = screen.getByLabelText('Link URL');
    fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Unsafe or invalid URL rejected');
    expect(onChange).not.toHaveBeenCalled();

    // IME composing Enter inside link URL input does not submit
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(urlInput, composingEnter);
    expect(onChange).not.toHaveBeenCalled();

    // Editing clears error; valid HTTPS URL submits via Enter
    fireEvent.change(urlInput, { target: { value: 'https://refractor.dev/docs' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.keyDown(urlInput, { key: 'Enter' });

    expect(textarea.value).toBe('Click [here](https://refractor.dev/docs)');
    const previewLink = screen.getByRole('link', { name: 'here' });
    expect(previewLink).toHaveAttribute('href', 'https://refractor.dev/docs');
    expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Open link popover again with blank label -> defaults to URL; submit from Link text input Enter
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    fireEvent.click(linkBtn);
    fireEvent.change(screen.getByLabelText('Link URL'), { target: { value: 'mailto:team@refractor.dev' } });
    fireEvent.keyDown(screen.getByLabelText('Link text'), { key: 'Enter' });
    expect(textarea.value).toContain('[mailto:team@refractor.dev](mailto:team@refractor.dev)');

    // Toggle link popover closed by Escape and Cancel and button click (ignore unrelated keys)
    fireEvent.click(linkBtn);
    fireEvent.keyDown(screen.getByLabelText('Link URL'), { key: 'a' });
    fireEvent.keyDown(screen.getByLabelText('Link text'), { key: 'a' });
    fireEvent.keyDown(screen.getByLabelText('Link URL'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Insert link' })).not.toBeInTheDocument();

    fireEvent.click(linkBtn);
    fireEvent.keyDown(screen.getByLabelText('Link text'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Insert link' })).not.toBeInTheDocument();

    fireEvent.click(linkBtn);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Insert link' })).not.toBeInTheDocument();

    fireEvent.click(linkBtn);
    fireEvent.click(linkBtn);
    expect(screen.queryByRole('dialog', { name: 'Insert link' })).not.toBeInTheDocument();

    // Insert Image popover: reject javascript: and SVG data URI, accept safe PNG data URI & HTTPS
    const imageBtn = screen.getByRole('button', { name: 'Insert image' });
    fireEvent.click(imageBtn);
    expect(screen.getByRole('dialog', { name: 'Insert image' })).toBeInTheDocument();

    const imgUrlInput = screen.getByLabelText('Image URL');
    const imgAltInput = screen.getByLabelText('Image alt text');

    fireEvent.change(imgUrlInput, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply image' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Unsafe or invalid image URL rejected');

    fireEvent.change(imgUrlInput, { target: { value: 'data:image/svg+xml;base64,PHN2Zz4=' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply image' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Unsafe or invalid image URL rejected');

    const imgComposingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imgComposingEnter, 'isComposing', { value: true });
    fireEvent(imgUrlInput, imgComposingEnter);

    fireEvent.change(imgUrlInput, { target: { value: 'data:image/png;base64,iVBORw0KGgo=' } });
    fireEvent.change(imgAltInput, { target: { value: 'Optical prism' } });
    fireEvent.keyDown(imgAltInput, { key: 'Enter' });

    const renderedImg = screen.getByRole('img', { name: 'Optical prism' });
    expect(renderedImg).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');

    // Image popover Escape / Cancel / Toggle / URL Enter paths
    fireEvent.click(imageBtn);
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/glass.webp' } });
    fireEvent.keyDown(screen.getByLabelText('Image URL'), { key: 'Enter' });
    expect(screen.getByRole('region', { name: 'Rich text preview' }).querySelector('img[src="https://example.com/glass.webp"]')).not.toBeNull();

    fireEvent.click(imageBtn);
    fireEvent.keyDown(screen.getByLabelText('Image URL'), { key: 'a' });
    fireEvent.keyDown(screen.getByLabelText('Image alt text'), { key: 'a' });
    fireEvent.keyDown(screen.getByLabelText('Image URL'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Insert image' })).not.toBeInTheDocument();

    fireEvent.click(imageBtn);
    fireEvent.keyDown(screen.getByLabelText('Image alt text'), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Insert image' })).not.toBeInTheDocument();

    fireEvent.click(imageBtn);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Insert image' })).not.toBeInTheDocument();

    fireEvent.click(imageBtn);
    fireEvent.click(imageBtn);
    expect(screen.queryByRole('dialog', { name: 'Insert image' })).not.toBeInTheDocument();
  });

  it('renders rich HTML & markdown structures safely without dangerouslySetInnerHTML and neutralizes XSS attacks', () => {
    const htmlAndMarkdown = [
      '<h1>Main Title</h1>',
      '<h2>Section Two</h2>',
      '<h3>Sub Section</h3>',
      '<p>Hello <b>bold</b>, <i>italic</i>, <u>under</u>, <code>inline</code>, <a href="https://example.com">SafeLink</a>, <a href="javascript:alert(1)">BadLink</a>, <img src="https://example.com/pic.png" alt="Sample" />, <img src="javascript:alert(1)" alt="BadImg" /></p>',
      '<ul><li>Bullet One</li><li>Bullet Two</li></ul>',
      '<ol><li>Step One</li><li>Step Two</li></ol>',
      '<blockquote>Quoted glass<br />line</blockquote>',
      '* Star bullet',
      'Mixed `code` and [EmptyUrl](not-a-valid-scheme) and ![Invalid](not-valid-url)',
      '<script>window.__rteXss=1</script><iframe src="https://evil.test"></iframe>',
    ].join('\r\n');

    render(<RichTextEditor defaultValue={htmlAndMarkdown} />);

    const preview = screen.getByRole('region', { name: 'Rich text preview' });
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expect(preview.querySelector('h1')).toHaveTextContent('Main Title');
    expect(preview.querySelectorAll('h2').length).toBeGreaterThanOrEqual(2);
    expect(preview.querySelector('strong')).toHaveTextContent('bold');
    expect(preview.querySelector('em')).toHaveTextContent('italic');
    expect(preview.querySelector('u')).toHaveTextContent('under');
    expect(preview.querySelector('code')).toHaveTextContent('inline');
    expect(preview.querySelector('blockquote')).toHaveTextContent('Quoted glass');
    expect(preview.querySelectorAll('ul li').length).toBeGreaterThanOrEqual(3);
    expect(preview.querySelectorAll('ol li')).toHaveLength(2);

    const links = preview.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.com');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    expect(preview).toHaveTextContent('BadLink');

    const imgs = preview.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute('src', 'https://example.com/pic.png');
    expect(imgs[0]).toHaveAttribute('alt', 'Sample');
  });

  it('sanitizes XSS and unsafe markdown URLs on live input, handles deep nesting, controlled mode, and readOnly mode', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RichTextEditor label="Live" defaultValue="" onChange={onChange} />
    );

    expect(screen.getByText('Nothing to preview yet.')).toBeInTheDocument();

    const textarea = screen.getByLabelText('Live');
    fireEvent.change(textarea, {
      target: {
        value:
          '<script>alert(1)</script><img src=x onerror=alert(1)>Safe [Bad](javascript:alert(1)) ![BadImg](javascript:alert(1)) [Good](https://example.com) ![GoodImg](https://example.com/p.png)',
      },
    });

    const emitted = onChange.mock.calls[0]?.[0] as string;
    expect(emitted).not.toContain('<script>');
    expect(emitted).not.toContain('javascript:');
    expect(emitted).not.toContain('onerror');
    expect(emitted).toContain('Safe Bad  [Good](https://example.com) ![GoodImg](https://example.com/p.png)');

    // Deeply nested inline formatting terminates gracefully at MAX_INLINE_DEPTH,
    // and unclosed markdown/HTML tokens + empty link labels render safely without throwing
    fireEvent.change(textarea, {
      target: {
        value:
          '<b><i><u>**a *b <u>c **d *e <u>Deep</u>*</u>*</u></i></b>\n[unclosed ![img](https://example.com\n[](https://example.com) <a href="https://example.org"></a>\n[nolink](unclosed **bold *italic `code <open',
      },
    });
    const previewRegion = screen.getByRole('region', { name: 'Rich text preview' });
    expect(previewRegion).toHaveTextContent('Deep');
    expect(previewRegion.querySelector('a[href="https://example.com"]')).toHaveTextContent(
      'https://example.com'
    );
    expect(previewRegion.querySelector('a[href="https://example.org"]')).toHaveTextContent(
      'https://example.org'
    );

    // Read-only disables toolbar buttons, renders Read-only pill, and blocks edits
    onChange.mockClear();
    rerender(<RichTextEditor label="Live" value="Locked text" readOnly onChange={onChange} />);
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    const lockedArea = screen.getByLabelText('Live');
    expect(lockedArea).toHaveAttribute('readonly');
    expect(lockedArea).toHaveClass('disabled:cursor-not-allowed');

    const boldBtn = screen.getByRole('button', { name: 'Bold' });
    expect(boldBtn).toBeDisabled();
    expect(boldBtn).toHaveClass('disabled:cursor-not-allowed');

    fireEvent.change(lockedArea, { target: { value: 'Attempted edit' } });
    fireEvent.keyDown(lockedArea, { key: 'b', ctrlKey: true });
    expect(onChange).not.toHaveBeenCalled();

    // Controlled harness
    function ControlledHarness() {
      const [doc, setDoc] = useState('Initial');
      return <RichTextEditor label="Controlled" value={doc} onChange={setDoc} />;
    }
    render(<ControlledHarness />);
    const controlledArea = screen.getByLabelText('Controlled');
    fireEvent.change(controlledArea, { target: { value: 'Updated **text**' } });
    expect(controlledArea).toHaveValue('Updated **text**');
  });

  it('handles formatting when textarea is unmounted in preview-only mode', () => {
    const onChange = vi.fn();
    render(<RichTextEditor defaultValue="Hello" onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
    expect(screen.queryByLabelText('Rich text editor')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onChange).toHaveBeenCalledWith('Hello**bold text**');
  });
});
