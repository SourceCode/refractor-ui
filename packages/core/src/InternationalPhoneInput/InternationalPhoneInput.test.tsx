import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_PHONE_COUNTRIES,
  InternationalPhoneInput,
  formatNationalPhone,
  type PhoneCountrySpec,
  type PhoneInputValue,
} from './index';

describe('DEFAULT_PHONE_COUNTRIES & formatNationalPhone', () => {
  it('includes at least 8 regional dialing specifications with canonical masks', () => {
    expect(DEFAULT_PHONE_COUNTRIES.length).toBeGreaterThanOrEqual(8);
    const byIso = new Map(DEFAULT_PHONE_COUNTRIES.map((c) => [c.iso, c]));

    expect(byIso.get('US')).toEqual({
      iso: 'US',
      name: 'United States',
      dialCode: '+1',
      mask: '(###) ###-####',
      maxDigits: 10,
    });
    expect(byIso.get('CA')?.dialCode).toBe('+1');
    expect(byIso.get('GB')).toMatchObject({ dialCode: '+44', mask: '#### ######', maxDigits: 10 });
    expect(byIso.get('DE')).toMatchObject({ dialCode: '+49', mask: '### ########', maxDigits: 11 });
    expect(byIso.get('FR')).toMatchObject({ dialCode: '+33', mask: '# ## ## ## ##', maxDigits: 9 });
    expect(byIso.get('JP')).toMatchObject({ dialCode: '+81', mask: '##-####-####', maxDigits: 10 });
    expect(byIso.get('AU')).toMatchObject({ dialCode: '+61', mask: '### ### ###', maxDigits: 9 });
    expect(byIso.get('IN')).toMatchObject({ dialCode: '+91', mask: '##### #####', maxDigits: 10 });
    expect(byIso.get('BR')).toMatchObject({
      dialCode: '+55',
      mask: '(##) #####-####',
      maxDigits: 11,
    });
  });

  it('formats digits cleanly without trailing dangling delimiters and handles edge cases', () => {
    const usMask = '(###) ###-####';
    expect(formatNationalPhone('', usMask, 10)).toBe('');
    expect(formatNationalPhone('abc-() ', usMask, 10)).toBe('');
    expect(formatNationalPhone('4', usMask, 10)).toBe('(4');
    expect(formatNationalPhone('415', usMask, 10)).toBe('(415');
    expect(formatNationalPhone('(415) ', usMask, 10)).toBe('(415');
    expect(formatNationalPhone('4155', usMask, 10)).toBe('(415) 5');
    expect(formatNationalPhone('415555', usMask, 10)).toBe('(415) 555');
    expect(formatNationalPhone('4155550', usMask, 10)).toBe('(415) 555-0');
    expect(formatNationalPhone('4155550199', usMask, 10)).toBe('(415) 555-0199');
    expect(formatNationalPhone('415-555-01999999', usMask, 10)).toBe('(415) 555-0199');

    // Regional masks
    expect(formatNationalPhone('7911123456', '#### ######', 10)).toBe('7911 123456');
    expect(formatNationalPhone('612345678', '# ## ## ## ##', 9)).toBe('6 12 34 56 78');
    expect(formatNationalPhone('9012345678', '##-####-####', 10)).toBe('90-1234-5678');
    expect(formatNationalPhone('11987654321', '(##) #####-####', 11)).toBe('(11) 98765-4321');

    // Extra digits past mask slots & invalid maxDigits
    expect(formatNationalPhone('12345678', '###-###', 8)).toBe('123-45678');
    expect(formatNationalPhone('12345', '', 5)).toBe('12345');
    expect(formatNationalPhone('4155550199', usMask, 0)).toBe('');
    expect(formatNationalPhone('4155550199', usMask, -4)).toBe('');
    expect(formatNationalPhone('4155550199', usMask, Number.NaN)).toBe('');
  });
});

describe('InternationalPhoneInput', () => {
  it('renders prism-slab split control with ref, displayName, theme overrides, formatting, and E.164 pill', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(next: PhoneInputValue) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            InternationalPhoneInput: {
              className: 'theme-phone-input',
              style: { maxWidth: '460px' },
            },
          },
        }}
      >
        <InternationalPhoneInput
          ref={ref}
          onChange={onChange}
          className="local-phone-input"
          style={{ marginTop: '6px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="phone-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('phone-root');
    expect(InternationalPhoneInput.displayName).toBe('InternationalPhoneInput');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-international-phone-input',
      'prism-slab',
      'theme-phone-input',
      'local-phone-input'
    );
    expect(root).toHaveStyle({ maxWidth: '460px', marginTop: '6px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-country', 'US');
    expect(root).not.toHaveAttribute('data-filled');
    expect(root).not.toHaveAttribute('data-open');

    const trigger = screen.getByTestId('phone-country-trigger');
    expect(trigger).toHaveClass('prism-crystal');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(screen.getByTestId('phone-country-iso')).toHaveTextContent('US');
    expect(screen.getByTestId('phone-country-dial')).toHaveTextContent('+1');
    expect(screen.queryByTestId('phone-e164-pill')).not.toBeInTheDocument();
    expect(screen.queryByTestId('phone-clear-button')).not.toBeInTheDocument();

    const telInput = screen.getByLabelText('Phone Number');
    expect(telInput).toHaveAttribute('type', 'tel');

    // Partial digits -> crystal E.164 pill
    fireEvent.change(telInput, { target: { value: '41555' } });
    expect(telInput).toHaveValue('(415) 55');
    expect(screen.getByTestId('phone-e164-pill')).toHaveTextContent('+141555');
    expect(screen.getByTestId('phone-e164-pill')).toHaveClass('prism-crystal');
    expect(root).toHaveAttribute('data-filled', 'true');
    expect(root).not.toHaveAttribute('data-complete');

    // Complete 10 US digits (with extra junk stripped and capped) -> emerald E.164 pill
    fireEvent.change(telInput, { target: { value: '415-abc-555-0199-888' } });
    expect(telInput).toHaveValue('(415) 555-0199');
    expect(screen.getByTestId('phone-e164-pill')).toHaveTextContent('+14155550199');
    expect(screen.getByTestId('phone-e164-pill')).toHaveClass('prism-emerald');
    expect(root).toHaveAttribute('data-complete', 'true');
    expect(onChange).toHaveBeenLastCalledWith({
      countryIso: 'US',
      dialCode: '+1',
      nationalDigits: '4155550199',
      formatted: '(415) 555-0199',
      e164: '+14155550199',
    });

    // Clear button resets digits
    fireEvent.click(screen.getByTestId('phone-clear-button'));
    expect(telInput).toHaveValue('');
    expect(screen.queryByTestId('phone-e164-pill')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      countryIso: 'US',
      dialCode: '+1',
      nationalDigits: '',
      formatted: '',
      e164: '',
    });
  });

  it('searches countries by name, ISO, and dial code, switches countries, and re-formats entered digits cleanly', () => {
    const onChange = vi.fn<(next: PhoneInputValue) => void>();

    render(
      <InternationalPhoneInput
        defaultCountryIso="US"
        defaultNationalDigits="4155550199"
        onChange={onChange}
      />
    );

    const telInput = screen.getByTestId('phone-national-input');
    expect(telInput).toHaveValue('(415) 555-0199');
    expect(screen.getByTestId('phone-e164-pill')).toHaveTextContent('+14155550199');

    // Open searchable dropdown
    const trigger = screen.getByTestId('phone-country-trigger');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const popover = screen.getByTestId('phone-country-popover');
    expect(popover).toHaveClass('prism-slab');

    const searchInput = screen.getByTestId('phone-country-search');

    // Search by country name
    fireEvent.change(searchInput, { target: { value: 'france' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('phone-country-option-FR')).toBeInTheDocument();

    // Search by ISO code
    fireEvent.change(searchInput, { target: { value: 'jp' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('phone-country-option-JP')).toBeInTheDocument();

    // Search by dial code
    fireEvent.change(searchInput, { target: { value: '+44' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('phone-country-option-GB')).toBeInTheDocument();

    // Unmatched query renders empty state
    fireEvent.change(searchInput, { target: { value: 'wakanda' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByTestId('phone-country-empty')).toHaveTextContent('No matching countries');
    expect(screen.getByTestId('phone-country-empty')).toHaveTextContent('wakanda');

    // Clear search button restores all countries
    fireEvent.click(screen.getByTestId('phone-country-search-clear'));
    expect(screen.getAllByRole('option')).toHaveLength(DEFAULT_PHONE_COUNTRIES.length);

    // Select France (maxDigits: 9) -> trims 10 digits to 9 and re-formats to '# ## ## ## ##'
    fireEvent.click(screen.getByTestId('phone-country-option-FR'));
    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();
    expect(screen.getByTestId('phone-country-iso')).toHaveTextContent('FR');
    expect(screen.getByTestId('phone-country-dial')).toHaveTextContent('+33');
    expect(telInput).toHaveValue('4 15 55 50 19');
    expect(screen.getByTestId('phone-e164-pill')).toHaveTextContent('+33415555019');
    expect(onChange).toHaveBeenLastCalledWith({
      countryIso: 'FR',
      dialCode: '+33',
      nationalDigits: '415555019',
      formatted: '4 15 55 50 19',
      e164: '+33415555019',
    });
  });

  it('supports ArrowDown, ArrowUp, mouse hover, IME-safe Enter, and Escape keyboard navigation', () => {
    const onChange = vi.fn<(next: PhoneInputValue) => void>();

    render(<InternationalPhoneInput defaultNationalDigits="9012345678" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('phone-country-trigger'));
    const searchInput = screen.getByTestId('phone-country-search');

    // Filter to countries matching '+1' -> US and CA (2 options)
    fireEvent.change(searchInput, { target: { value: '+1' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByTestId('phone-country-option-US')).toHaveAttribute('data-active', 'true');

    // ArrowDown -> CA
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(screen.getByTestId('phone-country-option-CA')).toHaveAttribute('data-active', 'true');

    // ArrowUp -> US, ArrowUp -> wraps to CA
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    expect(screen.getByTestId('phone-country-option-US')).toHaveAttribute('data-active', 'true');
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    expect(screen.getByTestId('phone-country-option-CA')).toHaveAttribute('data-active', 'true');

    // Clear search, hover Japan, verify IME composing Enter is ignored
    fireEvent.click(screen.getByTestId('phone-country-search-clear'));
    fireEvent.mouseEnter(screen.getByTestId('phone-country-option-JP'));
    expect(screen.getByTestId('phone-country-option-JP')).toHaveAttribute('data-active', 'true');

    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(searchInput, composingEnter);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('phone-country-popover')).toBeInTheDocument();

    // Non-composing Enter selects JP and reformats 9012345678 -> 90-1234-5678
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith({
      countryIso: 'JP',
      dialCode: '+81',
      nationalDigits: '9012345678',
      formatted: '90-1234-5678',
      e164: '+819012345678',
    });

    // Reopen, test ArrowDown/ArrowUp/Enter on empty results and Escape on search input
    fireEvent.click(screen.getByTestId('phone-country-trigger'));
    const reopenedSearch = screen.getByTestId('phone-country-search');
    fireEvent.change(reopenedSearch, { target: { value: 'zzzz-unmatched' } });
    fireEvent.keyDown(reopenedSearch, { key: 'ArrowDown' });
    fireEvent.keyDown(reopenedSearch, { key: 'ArrowUp' });
    fireEvent.keyDown(reopenedSearch, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(reopenedSearch, { key: 'Escape' });
    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click and non-composing window Escape while staying open on inside click or composing Escape', () => {
    render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <InternationalPhoneInput />
      </div>
    );

    const trigger = screen.getByTestId('phone-country-trigger');
    fireEvent.click(trigger);
    expect(screen.getByTestId('phone-country-popover')).toBeInTheDocument();

    // Non-Escape key keeps open
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByTestId('phone-country-popover')).toBeInTheDocument();

    // Composing Escape keeps open
    const composingEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(window, composingEsc);
    expect(screen.getByTestId('phone-country-popover')).toBeInTheDocument();

    // Inside mousedown keeps open
    fireEvent.mouseDown(screen.getByTestId('phone-country-popover'));
    expect(screen.getByTestId('phone-country-popover')).toBeInTheDocument();

    // Outside mousedown closes
    fireEvent.mouseDown(screen.getByTestId('outside-btn'));
    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();

    // Reopen and close via window Escape
    fireEvent.click(trigger);
    expect(screen.getByTestId('phone-country-popover')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();
  });

  it('supports controlled value updates across typing, country switching, and clearing', () => {
    function ControlledPhoneHarness() {
      const [phone, setPhone] = useState<PhoneInputValue>({
        countryIso: 'GB',
        dialCode: '+44',
        nationalDigits: '7911123456',
        formatted: '7911 123456',
        e164: '+447911123456',
      });

      return (
        <div>
          <span data-testid="controlled-e164">{phone.e164}</span>
          <InternationalPhoneInput value={phone} onChange={setPhone} />
        </div>
      );
    }

    render(<ControlledPhoneHarness />);

    expect(screen.getByTestId('controlled-e164')).toHaveTextContent('+447911123456');
    expect(screen.getByTestId('phone-country-iso')).toHaveTextContent('GB');
    expect(screen.getByTestId('phone-national-input')).toHaveValue('7911 123456');

    // Switch controlled country to DE
    fireEvent.click(screen.getByTestId('phone-country-trigger'));
    fireEvent.click(screen.getByTestId('phone-country-option-DE'));
    expect(screen.getByTestId('controlled-e164')).toHaveTextContent('+497911123456');
    expect(screen.getByTestId('phone-national-input')).toHaveValue('791 1123456');

    // Edit digits in controlled mode
    fireEvent.change(screen.getByTestId('phone-national-input'), { target: { value: '15112345678' } });
    expect(screen.getByTestId('controlled-e164')).toHaveTextContent('+4915112345678');
    expect(screen.getByTestId('phone-national-input')).toHaveValue('151 12345678');

    // Clear in controlled mode
    fireEvent.click(screen.getByTestId('phone-clear-button'));
    expect(screen.getByTestId('controlled-e164')).toHaveTextContent('');
    expect(screen.getByTestId('phone-national-input')).toHaveValue('');
  });

  it('handles empty countries list, unmatched ISO, empty label, zero maxDigits, and disabled state gracefully (negative test)', () => {
    const onChange = vi.fn<(next: PhoneInputValue) => void>();

    const { rerender, unmount } = render(
      <InternationalPhoneInput
        countries={[]}
        defaultCountryIso=""
        label=""
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('phone-country-iso')).toHaveTextContent('US');
    expect(screen.getByTestId('phone-country-dial')).toHaveTextContent('+1');
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();

    // Open dropdown with empty countries -> shows empty configured state, toggle closes
    fireEvent.click(screen.getByTestId('phone-country-trigger'));
    expect(screen.getByTestId('phone-country-empty')).toHaveTextContent('No countries configured.');
    fireEvent.click(screen.getByTestId('phone-country-trigger'));
    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();

    // Unmatched countryIso falls back to first custom country, and zero maxDigits/empty dialCode produce empty e164
    const edgeCountries: PhoneCountrySpec[] = [
      { iso: 'ZZ', name: 'Zero Max', dialCode: '', mask: '###', maxDigits: 0 },
    ];
    rerender(
      <InternationalPhoneInput
        countries={edgeCountries}
        value={{
          countryIso: 'MISSING',
          dialCode: '+99',
          nationalDigits: '123',
          formatted: '',
          e164: '',
        }}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('phone-country-iso')).toHaveTextContent('ZZ');
    expect(screen.getByTestId('phone-national-input')).toHaveValue('');
    expect(screen.queryByTestId('phone-e164-pill')).not.toBeInTheDocument();

    unmount();

    // Disabled state blocks dropdown, edits, and clear button
    render(
      <InternationalPhoneInput
        disabled
        defaultCountryIso="US"
        defaultNationalDigits="4155550199"
        onChange={onChange}
        data-testid="disabled-phone"
      />
    );

    expect(screen.getByTestId('disabled-phone')).toHaveAttribute('data-disabled', 'true');
    const trigger = screen.getByTestId('phone-country-trigger');
    const telInput = screen.getByTestId('phone-national-input');
    const clearBtn = screen.getByTestId('phone-clear-button');

    expect(trigger).toBeDisabled();
    expect(telInput).toBeDisabled();
    expect(clearBtn).toBeDisabled();

    fireEvent.click(trigger);
    fireEvent.change(telInput, { target: { value: '9999999999' } });
    fireEvent.click(clearBtn);

    expect(screen.queryByTestId('phone-country-popover')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders XSS payloads in label, custom countries, search query, and phone input as literal text (adversarial test)', () => {
    const payload = '<script>window.__phoneXss=1</script><img src=x onerror=alert(1)>';
    const hostileCountries: PhoneCountrySpec[] = [
      {
        iso: 'US',
        name: payload,
        dialCode: '+1',
        mask: '(###) ###-####',
        maxDigits: 10,
      },
    ];

    render(
      <InternationalPhoneInput
        label={payload}
        countries={hostileCountries}
        defaultCountryIso="US"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Hostile input stripped to numeric digits only ("1" and "1")
    const telInput = screen.getByTestId('phone-national-input');
    fireEvent.change(telInput, { target: { value: payload } });
    expect(telInput).toHaveValue('(11');
    expect(screen.getByTestId('phone-e164-pill')).toHaveTextContent('+111');

    // Hostile search query rendered literally in empty state
    fireEvent.click(screen.getByTestId('phone-country-trigger'));
    expect(screen.getByTestId('phone-country-option-US')).toHaveTextContent(payload);
    fireEvent.change(screen.getByTestId('phone-country-search'), {
      target: { value: `${payload}-unmatched` },
    });
    expect(screen.getByTestId('phone-country-empty')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
