import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from 'lucide-react';
import {
  ActiveSessionsList,
  AlertBanner,
  Avatar,
  BadgeStatus,
  Checkbox,
  DropdownSelect,
  FacetedFilterBar,
  InternationalPhoneInput,
  OtpCodeInput,
  PasswordStrengthMeter,
  PrimaryButton,
  PrismCard,
  RolePermissionsMatrix,
  SecondaryButton,
  SecretKeyField,
  StatefulAsyncButton,
  Stepper,
  StickyActionBar,
  TextInput,
  ToggleSwitch,
  type ActiveSessionItem,
  type FacetedFilterState,
  type PermissionRow,
  type PhoneInputValue,
  type RoleColumn,
  type RoleGrantsRecord,
} from '@refractor-ui/core';
import type { ExampleScreenSpec } from './types';

/* ==========================================================================
   1. Sign In / Authentication Portal (`login-screen`)
   ========================================================================== */

type LoginViewMode = 'signin' | 'reset';

interface AuthenticatedSession {
  email: string;
  method: 'Email & Password' | 'WebAuthn Passkey' | 'GitHub SSO';
  persistent: boolean;
  sessionCode: string;
}

function LoginPortalScreen() {
  const [viewMode, setViewMode] = useState<LoginViewMode>('signin');
  const [email, setEmail] = useState('clara.vance@refractor.io');
  const [password, setPassword] = useState('Prism!Optical2026');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [session, setSession] = useState<AuthenticatedSession | null>(null);

  const emailInvalid = email.trim().length > 0 && !email.includes('@');
  const passwordTooShort = password.length > 0 && password.length < 8;

  const handlePasswordSignIn = async () => {
    setFormError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Enter a valid work email address before signing in.');
      throw new Error('Invalid email');
    }
    if (password.length < 8) {
      setFormError('Password must contain at least 8 characters.');
      throw new Error('Invalid password');
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 550);
    });

    setSession({
      email: trimmedEmail,
      method: 'Email & Password',
      persistent: keepSignedIn,
      sessionCode: 'RF-SESS-94C2',
    });
  };

  const handleSsoSignIn = (method: 'WebAuthn Passkey' | 'GitHub SSO') => {
    setFormError(null);
    setSession({
      email: email.trim().includes('@') ? email.trim() : 'clara.vance@refractor.io',
      method,
      persistent: keepSignedIn,
      sessionCode: method === 'WebAuthn Passkey' ? 'RF-FIDO-7A1E' : 'RF-OAUTH-3B8D',
    });
  };

  const handleResetDemo = () => {
    setSession(null);
    setViewMode('signin');
    setResetSent(false);
    setFormError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto min-w-0">
      <div className="prism-slab p-5 sm:p-7 space-y-5">
        {/* Optical Brand Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="prism-crystal w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                Refractor Cloud
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Zero-trust workspace portal
              </p>
            </div>
          </div>
          <BadgeStatus
            tone={session ? 'online' : viewMode === 'reset' ? 'warning' : 'online'}
            label={session ? 'Session Active' : viewMode === 'reset' ? 'Recovery' : 'Passkey Ready'}
          />
        </div>

        {/* Authenticated Banner */}
        {session ? (
          <div className="space-y-4">
            <AlertBanner
              severity="success"
              title={`Signed in via ${session.method}`}
              message={`Authenticated ${session.email} (${
                session.persistent ? '30-day persistent session' : 'browser-session token'
              }).`}
            />

            <div className="prism-well rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Session ID</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {session.sessionCode}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Identity</span>
                <span className="font-medium text-slate-900 dark:text-white truncate">
                  {session.email}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Persistence</span>
                <span className="prism-emerald px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  {session.persistent ? '30-day token' : 'Ephemeral'}
                </span>
              </div>
            </div>

            <SecondaryButton
              tone="crystal"
              size="sm"
              className="w-full"
              leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={handleResetDemo}
            >
              Sign Out &amp; Reset Portal
            </SecondaryButton>
          </div>
        ) : viewMode === 'reset' ? (
          /* Password Reset Flow */
          <div className="space-y-4">
            {resetSent ? (
              <AlertBanner
                severity="success"
                title="Recovery link dispatched"
                message={`A single-use reset token was sent to ${email.trim() || 'your inbox'}. Expires in 15 minutes.`}
              />
            ) : (
              <AlertBanner
                severity="info"
                title="Reset your workspace password"
                message="Enter your verified email to receive a hardware-signed recovery link."
              />
            )}

            <TextInput
              label="Account Email"
              type="email"
              leadingIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errorText={emailInvalid ? 'Enter a valid email address' : undefined}
              placeholder="name@company.com"
            />

            <div className="flex flex-col gap-2.5">
              <PrimaryButton
                size="md"
                className="w-full"
                disabled={!email.trim().includes('@')}
                onClick={() => setResetSent(true)}
              >
                {resetSent ? 'Resend Recovery Link' : 'Send Recovery Link'}
              </PrimaryButton>
              <SecondaryButton
                tone="crystal"
                size="sm"
                className="w-full"
                leadingIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={() => {
                  setViewMode('signin');
                  setResetSent(false);
                }}
              >
                Back to Sign In
              </SecondaryButton>
            </div>
          </div>
        ) : (
          /* Primary Sign-In View */
          <div className="space-y-4">
            {formError ? (
              <AlertBanner
                severity="error"
                title="Sign in failed"
                message={formError}
                onDismiss={() => setFormError(null)}
              />
            ) : null}

            <div className="space-y-3.5">
              <TextInput
                label="Work Email"
                type="email"
                autoComplete="email"
                leadingIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                errorText={emailInvalid ? 'Include an @ symbol in your email' : undefined}
                placeholder="clara.vance@refractor.io"
              />

              <TextInput
                label="Password"
                type="password"
                autoComplete="current-password"
                leadingIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError(null);
                }}
                errorText={passwordTooShort ? 'Minimum 8 characters required' : undefined}
                placeholder="Enter your password"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <Checkbox
                checked={keepSignedIn}
                onChange={setKeepSignedIn}
                label="Keep me signed in"
              />
              <button
                type="button"
                onClick={() => {
                  setViewMode('reset');
                  setFormError(null);
                }}
                className="prism-focus-ring rounded-lg px-1.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
              >
                Reset password?
              </button>
            </div>

            <StatefulAsyncButton
              idleLabel="Sign In"
              idleIcon={<Shield className="w-4 h-4" aria-hidden="true" />}
              loadingLabel="Authenticating..."
              successLabel="Signed In"
              errorLabel="Check Credentials"
              className="w-full"
              onAction={handlePasswordSignIn}
            />

            <div className="flex items-center gap-3 py-0.5">
              <div className="h-px flex-1 bg-slate-300/60 dark:bg-slate-700/60" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-slate-300/60 dark:bg-slate-700/60" />
            </div>

            <div className="flex flex-col gap-2.5">
              <SecondaryButton
                tone="cobalt"
                size="sm"
                className="w-full"
                leadingIcon={<Fingerprint className="w-4 h-4" aria-hidden="true" />}
                onClick={() => handleSsoSignIn('WebAuthn Passkey')}
              >
                Continue with Passkey
              </SecondaryButton>
              <SecondaryButton
                tone="crystal"
                size="sm"
                className="w-full"
                leadingIcon={<KeyRound className="w-4 h-4" aria-hidden="true" />}
                onClick={() => handleSsoSignIn('GitHub SSO')}
              >
                Continue with GitHub
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const LOGIN_SCREEN_CODE = `import { useState } from 'react';
import { Fingerprint, KeyRound, Lock, Mail, RotateCcw, Shield, Sparkles } from 'lucide-react';
import {
  AlertBanner,
  BadgeStatus,
  Checkbox,
  PrimaryButton,
  SecondaryButton,
  StatefulAsyncButton,
  TextInput,
} from '@refractor-ui/core';

type ViewMode = 'signin' | 'reset';

interface AuthSession {
  email: string;
  method: 'Email & Password' | 'WebAuthn Passkey' | 'GitHub SSO';
  persistent: boolean;
}

export function LoginPortal() {
  const [viewMode, setViewMode] = useState<ViewMode>('signin');
  const [email, setEmail] = useState('clara.vance@refractor.io');
  const [password, setPassword] = useState('Prism!Optical2026');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  const handleSignIn = async () => {
    if (!email.includes('@') || password.length < 8) {
      throw new Error('Invalid credentials');
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 550));
    setSession({ email: email.trim(), method: 'Email & Password', persistent: keepSignedIn });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="prism-slab p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="prism-crystal w-11 h-11 rounded-2xl inline-flex items-center justify-center">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Refractor Cloud</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">Zero-trust workspace portal</p>
            </div>
          </div>
          <BadgeStatus tone="online" label={session ? 'Session Active' : 'Passkey Ready'} />
        </div>

        {session ? (
          <div className="space-y-4">
            <AlertBanner
              severity="success"
              title={\`Signed in via \${session.method}\`}
              message={\`Authenticated \${session.email} (\${session.persistent ? '30-day session' : 'ephemeral'}).\`}
            />
            <SecondaryButton
              tone="crystal"
              size="sm"
              className="w-full"
              leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => setSession(null)}
            >
              Sign Out & Reset
            </SecondaryButton>
          </div>
        ) : viewMode === 'reset' ? (
          <div className="space-y-4">
            <AlertBanner
              severity={resetSent ? 'success' : 'info'}
              title={resetSent ? 'Recovery link dispatched' : 'Reset your password'}
              message="We will send a single-use hardware-signed recovery link to your work inbox."
            />
            <TextInput label="Work Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PrimaryButton className="w-full" onClick={() => setResetSent(true)}>
              Send Recovery Link
            </PrimaryButton>
            <SecondaryButton tone="crystal" size="sm" className="w-full" onClick={() => setViewMode('signin')}>
              Back to Sign In
            </SecondaryButton>
          </div>
        ) : (
          <div className="space-y-4">
            <TextInput
              label="Work Email"
              type="email"
              leadingIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextInput
              label="Password"
              type="password"
              leadingIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Checkbox checked={keepSignedIn} onChange={setKeepSignedIn} label="Keep me signed in" />
              <button type="button" onClick={() => setViewMode('reset')} className="text-xs font-semibold underline cursor-pointer">
                Reset password?
              </button>
            </div>
            <StatefulAsyncButton
              idleLabel="Sign In"
              idleIcon={<Shield className="w-4 h-4" aria-hidden="true" />}
              loadingLabel="Authenticating..."
              successLabel="Signed In"
              className="w-full"
              onAction={handleSignIn}
            />
            <div className="flex flex-col gap-2.5">
              <SecondaryButton
                tone="cobalt"
                size="sm"
                className="w-full"
                leadingIcon={<Fingerprint className="w-4 h-4" aria-hidden="true" />}
                onClick={() => setSession({ email, method: 'WebAuthn Passkey', persistent: keepSignedIn })}
              >
                Continue with Passkey
              </SecondaryButton>
              <SecondaryButton
                tone="crystal"
                size="sm"
                className="w-full"
                leadingIcon={<KeyRound className="w-4 h-4" aria-hidden="true" />}
                onClick={() => setSession({ email, method: 'GitHub SSO', persistent: keepSignedIn })}
              >
                Continue with GitHub
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;

/* ==========================================================================
   2. Sign Up & Account Onboarding Flow (`signup-onboarding`)
   ========================================================================== */

const ONBOARDING_STEPS = [
  { id: 'account', title: 'Account', subtitle: 'Identity & role' },
  { id: 'security', title: 'Security', subtitle: 'Password & phone' },
  { id: 'workspace', title: 'Workspace', subtitle: 'Region & terms' },
];

const INITIAL_PHONE_VALUE: PhoneInputValue = {
  countryIso: 'US',
  dialCode: '+1',
  nationalDigits: '4155550199',
  formatted: '(415) 555-0199',
  e164: '+14155550199',
};

function SignupOnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [fullName, setFullName] = useState('Elena Rostova');
  const [email, setEmail] = useState('elena.rostova@acme.dev');
  const [role, setRole] = useState('security');
  const [password, setPassword] = useState('R3fractor!Glass26');
  const [phone, setPhone] = useState<PhoneInputValue>(INITIAL_PHONE_VALUE);
  const [workspaceName, setWorkspaceName] = useState('Acme Optical Systems');
  const [region, setRegion] = useState('us-west');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    setStepError(null);
    if (stepIndex === 0) {
      if (fullName.trim().length < 2) {
        setStepError('Enter your full name to continue.');
        return;
      }
      if (!email.trim().includes('@')) {
        setStepError('Provide a valid work email address.');
        return;
      }
      setStepIndex(1);
      return;
    }

    if (stepIndex === 1) {
      if (password.length < 12) {
        setStepError('Your password must be at least 12 characters to satisfy enterprise policy.');
        return;
      }
      if (phone.nationalDigits.length < 7) {
        setStepError('Add a valid recovery phone number for MFA fallback.');
        return;
      }
      setStepIndex(2);
      return;
    }

    if (workspaceName.trim().length < 2) {
      setStepError('Give your workspace a name before provisioning.');
      return;
    }
    if (!acceptedTerms) {
      setStepError('Accept the Enterprise Security Addendum and Terms of Service to finish.');
      return;
    }
    setCompleted(true);
  };

  const handleRestart = () => {
    setCompleted(false);
    setStepIndex(0);
    setAcceptedTerms(false);
    setStepError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto min-w-0">
      <div className="prism-slab p-5 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Create your Refractor account
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Provision a SOC 2-ready workspace with phishing-resistant recovery in three quick steps.
            </p>
          </div>
          <BadgeStatus
            tone={completed ? 'online' : 'counter'}
            count={completed ? undefined : stepIndex + 1}
            label={completed ? 'Workspace Provisioned' : `Step ${stepIndex + 1} of 3`}
          />
        </div>

        {/* Multi-Step Stepper */}
        <div className="prism-well rounded-2xl p-3.5 sm:p-4">
          <Stepper
            steps={ONBOARDING_STEPS}
            activeStepIndex={completed ? 3 : stepIndex}
            onStepClick={(idx) => {
              setCompleted(false);
              setStepError(null);
              setStepIndex(idx);
            }}
          />
        </div>

        {stepError ? (
          <AlertBanner
            severity="warning"
            title="Action required before continuing"
            message={stepError}
            onDismiss={() => setStepError(null)}
          />
        ) : null}

        {completed ? (
          <div className="space-y-4">
            <AlertBanner
              severity="success"
              title={`Welcome aboard, ${fullName.trim()}`}
              message={`Workspace "${workspaceName.trim()}" is live in ${region.toUpperCase()} with recovery SMS bound to ${phone.e164}.`}
            />

            <div className="prism-well rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Account Owner</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{fullName}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Work Email</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">{email}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Recovery E.164</div>
                <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                  {phone.e164}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Data Residency</div>
                <div className="font-semibold uppercase text-slate-900 dark:text-white mt-0.5">
                  {region}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <SecondaryButton
                tone="crystal"
                size="sm"
                leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={handleRestart}
              >
                Start Another Onboarding
              </SecondaryButton>
            </div>
          </div>
        ) : (
          <>
            {/* Step 0: Account */}
            {stepIndex === 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextInput
                    label="Full Name"
                    leadingIcon={<User className="w-4 h-4" aria-hidden="true" />}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Elena Rostova"
                  />
                  <TextInput
                    label="Work Email"
                    type="email"
                    leadingIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    errorText={email && !email.includes('@') ? 'Enter a valid email' : undefined}
                    placeholder="name@company.dev"
                  />
                </div>

                <DropdownSelect
                  label="Primary Role"
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: 'security', label: 'Security & IAM Architect' },
                    { value: 'engineering', label: 'Staff Frontend Engineer' },
                    { value: 'design', label: 'Design Systems Lead' },
                    { value: 'platform', label: 'Platform Operations' },
                  ]}
                />

                <div className="prism-well rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Derived audit identity</span>
                  <code className="font-mono font-semibold text-slate-900 dark:text-white">
                    {email.trim() || 'pending@workspace.dev'}
                  </code>
                </div>
              </div>
            ) : null}

            {/* Step 1: Security */}
            {stepIndex === 1 ? (
              <div className="space-y-4">
                <TextInput
                  label="Master Account Password"
                  type="password"
                  leadingIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Use 12+ characters with mixed case, numbers, and symbols."
                />

                <PasswordStrengthMeter
                  password={password}
                  minLength={12}
                  label="Enterprise Password Policy"
                />

                <InternationalPhoneInput
                  label="Recovery Phone Number"
                  value={phone}
                  onChange={setPhone}
                />
              </div>
            ) : null}

            {/* Step 2: Workspace */}
            {stepIndex === 2 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextInput
                    label="Workspace Name"
                    leadingIcon={<Building2 className="w-4 h-4" aria-hidden="true" />}
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Acme Optical Systems"
                  />
                  <DropdownSelect
                    label="Data Residency Region"
                    value={region}
                    onChange={setRegion}
                    options={[
                      { value: 'us-west', label: 'US West (Oregon · SOC 2)' },
                      { value: 'eu-central', label: 'EU Central (Frankfurt · GDPR)' },
                      { value: 'ap-northeast', label: 'Asia Pacific (Tokyo · ISO 27001)' },
                    ]}
                  />
                </div>

                <div className="prism-well rounded-2xl p-4 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Onboarding Summary
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div>
                      Member: <strong className="text-slate-900 dark:text-white">{fullName}</strong>
                    </div>
                    <div className="truncate">
                      Email: <strong className="text-slate-900 dark:text-white">{email}</strong>
                    </div>
                    <div>
                      Recovery:{' '}
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {phone.e164 || 'Not set'}
                      </strong>
                    </div>
                    <div>
                      Password:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {password.length} chars verified
                      </strong>
                    </div>
                  </div>
                </div>

                <Checkbox
                  checked={acceptedTerms}
                  onChange={(checked) => {
                    setAcceptedTerms(checked);
                    if (checked && stepError) setStepError(null);
                  }}
                  label="I accept the Terms of Service & Security Processing Addendum"
                  description="Enables audit log retention, zero-trust session telemetry, and encrypted key storage."
                />
              </div>
            ) : null}

            {/* Step Footer Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-300/40 dark:border-slate-700/50">
              <SecondaryButton
                tone="crystal"
                size="sm"
                disabled={stepIndex === 0}
                leadingIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={() => {
                  setStepError(null);
                  setStepIndex((prev) => Math.max(0, prev - 1));
                }}
              >
                Back
              </SecondaryButton>

              <PrimaryButton
                size="sm"
                trailingIcon={
                  stepIndex < 2 ? (
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  )
                }
                onClick={handleNext}
              >
                {stepIndex === 0
                  ? 'Continue to Security'
                  : stepIndex === 1
                    ? 'Continue to Workspace'
                    : 'Create Account'}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SIGNUP_ONBOARDING_CODE = `import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Lock, Mail, User } from 'lucide-react';
import {
  AlertBanner,
  Checkbox,
  InternationalPhoneInput,
  PasswordStrengthMeter,
  PrimaryButton,
  SecondaryButton,
  Stepper,
  TextInput,
  type PhoneInputValue,
} from '@refractor-ui/core';

const STEPS = [
  { id: 'account', title: 'Account', subtitle: 'Identity & email' },
  { id: 'security', title: 'Security', subtitle: 'Password & phone' },
  { id: 'workspace', title: 'Workspace', subtitle: 'Team & terms' },
];

const DEFAULT_PHONE: PhoneInputValue = {
  countryIso: 'US',
  dialCode: '+1',
  nationalDigits: '4155550199',
  formatted: '(415) 555-0199',
  e164: '+14155550199',
};

export function SignupOnboardingFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const [fullName, setFullName] = useState('Elena Rostova');
  const [email, setEmail] = useState('elena.rostova@acme.dev');
  const [password, setPassword] = useState('R3fractor!Glass26');
  const [phone, setPhone] = useState<PhoneInputValue>(DEFAULT_PHONE);
  const [workspaceName, setWorkspaceName] = useState('Acme Optical Systems');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const advance = () => {
    setError(null);
    if (stepIndex === 0 && (!fullName.trim() || !email.includes('@'))) {
      setError('Enter your name and a valid work email.');
      return;
    }
    if (stepIndex === 1 && password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (stepIndex < 2) {
      setStepIndex((idx) => idx + 1);
      return;
    }
    if (!acceptedTerms) {
      setError('Accept the Terms of Service to complete onboarding.');
      return;
    }
    setDone(true);
  };

  return (
    <div className="prism-slab p-5 sm:p-7 w-full max-w-2xl mx-auto space-y-6">
      <Stepper steps={STEPS} activeStepIndex={done ? 3 : stepIndex} onStepClick={setStepIndex} />
      {error ? <AlertBanner severity="warning" title="Check required fields" message={error} /> : null}
      {done ? (
        <AlertBanner
          severity="success"
          title={\`Workspace "\${workspaceName}" ready\`}
          message={\`Provisioned \${email} with recovery phone \${phone.e164}.\`}
        />
      ) : (
        <>
          {stepIndex === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Full Name" leadingIcon={<User className="w-4 h-4" />} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <TextInput label="Work Email" type="email" leadingIcon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          ) : null}
          {stepIndex === 1 ? (
            <div className="space-y-4">
              <TextInput label="Password" type="password" leadingIcon={<Lock className="w-4 h-4" />} value={password} onChange={(e) => setPassword(e.target.value)} />
              <PasswordStrengthMeter password={password} minLength={12} />
              <InternationalPhoneInput label="Recovery Phone" value={phone} onChange={setPhone} />
            </div>
          ) : null}
          {stepIndex === 2 ? (
            <div className="space-y-4">
              <TextInput label="Workspace Name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
              <Checkbox checked={acceptedTerms} onChange={setAcceptedTerms} label="Accept Terms of Service & Security Addendum" />
            </div>
          ) : null}
          <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-slate-300/40 dark:border-slate-700/50">
            <SecondaryButton size="sm" disabled={stepIndex === 0} leadingIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
              Back
            </SecondaryButton>
            <PrimaryButton size="sm" trailingIcon={stepIndex < 2 ? <ArrowRight className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />} onClick={advance}>
              {stepIndex < 2 ? 'Continue' : 'Create Account'}
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}`;

/* ==========================================================================
   3. Mobile Two-Factor (OTP) Verification (`mfa-otp-verification`)
   ========================================================================== */

type OtpVerificationState = 'idle' | 'verified' | 'error';

function MfaOtpVerificationScreen() {
  const [code, setCode] = useState('482');
  const [status, setStatus] = useState<OtpVerificationState>('idle');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendCount, setResendCount] = useState(0);

  const validateCode = (candidate: string) => {
    if (candidate.length < 6) {
      setStatus('error');
      return;
    }
    if (candidate === '000000') {
      setStatus('error');
      return;
    }
    setStatus('verified');
  };

  const handleCodeChange = (next: string) => {
    setCode(next);
    if (next.length < 6 && status !== 'idle') {
      setStatus('idle');
    }
  };

  const handleResend = () => {
    setResendCount((count) => count + 1);
    setCode('');
    setStatus('idle');
  };

  const handleAutoFillDemo = () => {
    const demoCode = '482910';
    setCode(demoCode);
    validateCode(demoCode);
  };

  return (
    <div className="w-full max-w-sm mx-auto min-w-0">
      <div className="prism-slab p-4 sm:p-6 space-y-5">
        {/* Trust Device Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BadgeStatus
            tone={status === 'verified' ? 'online' : status === 'error' ? 'warning' : 'counter'}
            label={
              status === 'verified'
                ? 'Device Verified'
                : status === 'error'
                  ? 'Invalid Code'
                  : '2FA Gate Active'
            }
          />
          <span className="prism-crystal px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200">
            <Smartphone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>TOTP · SHA-256</span>
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            Two-factor verification
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Enter the 6-digit code from your authenticator app. Type 6 digits for instant
            auto-validation (use <code className="font-mono font-semibold">000000</code> to test
            rejection).
          </p>
        </div>

        {/* 6-Digit Optical OTP Input */}
        <OtpCodeInput
          length={6}
          label="Authenticator Code"
          value={code}
          onChange={handleCodeChange}
          onComplete={validateCode}
          error={
            status === 'error'
              ? code === '000000'
                ? 'Code 000000 was rejected. Request a fresh code.'
                : 'Enter all 6 digits to verify your identity.'
              : undefined
          }
        />

        {/* Live Auto-Validation Status Banner */}
        {status === 'verified' ? (
          <AlertBanner
            severity="success"
            title="Verification approved"
            message={
              trustDevice
                ? `Code ${code} verified. This Pixel / iPhone is trusted for 30 days.`
                : `Code ${code} verified for this single sign-in session.`
            }
          />
        ) : status === 'error' ? (
          <AlertBanner
            severity="error"
            title="Verification failed"
            message="Confirm your device clock is synced and try another 6-digit code."
          />
        ) : (
          <AlertBanner
            severity="info"
            title="Awaiting 6-digit code"
            message={
              resendCount > 0
                ? `Fresh push #${resendCount} dispatched · ${6 - code.length} digits remaining.`
                : `${6 - code.length} digits remaining · Auto-validates on the 6th digit.`
            }
          />
        )}

        {/* Trusted Device Toggle */}
        <div className="prism-well rounded-2xl p-3.5">
          <ToggleSwitch
            checked={trustDevice}
            onChange={setTrustDevice}
            label="Trust this Pixel / iPhone for 30 days"
          />
        </div>

        {/* Primary & Secondary Actions */}
        <div className="space-y-2.5">
          <PrimaryButton
            size="md"
            className="w-full"
            leadingIcon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
            onClick={() => {
              if (status === 'verified') {
                setCode('482');
                setStatus('idle');
              } else {
                validateCode(code);
              }
            }}
          >
            {status === 'verified' ? 'Reset Challenge' : 'Verify Code'}
          </PrimaryButton>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SecondaryButton tone="crystal" size="sm" onClick={handleResend}>
              {resendCount > 0 ? `Resend (${resendCount})` : 'Resend Code'}
            </SecondaryButton>
            <SecondaryButton tone="cobalt" size="sm" onClick={handleAutoFillDemo}>
              Fill 482910
            </SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

const MFA_OTP_CODE = `import { useState } from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import {
  AlertBanner,
  BadgeStatus,
  OtpCodeInput,
  PrimaryButton,
  SecondaryButton,
  ToggleSwitch,
} from '@refractor-ui/core';

type VerifyState = 'idle' | 'verified' | 'error';

export function MfaOtpVerification() {
  const [code, setCode] = useState('482');
  const [status, setStatus] = useState<VerifyState>('idle');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendCount, setResendCount] = useState(0);

  const validateCode = (candidate: string) => {
    if (candidate.length < 6 || candidate === '000000') {
      setStatus('error');
      return;
    }
    setStatus('verified');
  };

  return (
    <div className="prism-slab p-4 sm:p-6 w-full max-w-sm mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BadgeStatus
          tone={status === 'verified' ? 'online' : status === 'error' ? 'warning' : 'counter'}
          label={status === 'verified' ? 'Device Verified' : '2FA Gate Active'}
        />
        <span className="prism-crystal px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium">
          <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
          <span>TOTP · SHA-256</span>
        </span>
      </div>

      <OtpCodeInput
        length={6}
        label="Authenticator Code"
        value={code}
        onChange={(next) => {
          setCode(next);
          if (next.length < 6) setStatus('idle');
        }}
        onComplete={validateCode}
        error={status === 'error' ? 'Enter a valid 6-digit authenticator code.' : undefined}
      />

      <AlertBanner
        severity={status === 'verified' ? 'success' : status === 'error' ? 'error' : 'info'}
        title={status === 'verified' ? 'Verification approved' : status === 'error' ? 'Code rejected' : 'Awaiting 6-digit code'}
        message={
          status === 'verified'
            ? trustDevice
              ? 'Pixel / iPhone trusted for 30 days.'
              : 'Verified for this single session.'
            : \`\${6 - code.length} digits remaining · Auto-validates on entry.\`
        }
      />

      <div className="prism-well rounded-2xl p-3.5">
        <ToggleSwitch checked={trustDevice} onChange={setTrustDevice} label="Trust this Pixel / iPhone for 30 days" />
      </div>

      <PrimaryButton className="w-full" leadingIcon={<ShieldCheck className="w-4 h-4" />} onClick={() => validateCode(code)}>
        Verify Code
      </PrimaryButton>
      <div className="flex flex-wrap justify-between gap-2">
        <SecondaryButton tone="crystal" size="sm" onClick={() => { setResendCount((n) => n + 1); setCode(''); setStatus('idle'); }}>
          {resendCount > 0 ? \`Resend (\${resendCount})\` : 'Resend Code'}
        </SecondaryButton>
        <SecondaryButton tone="cobalt" size="sm" onClick={() => { setCode('482910'); validateCode('482910'); }}>
          Fill 482910
        </SecondaryButton>
      </div>
    </div>
  );
}`;

/* ==========================================================================
   4. API Keys, Secrets & Active Sessions Hub (`security-account-settings`)
   ========================================================================== */

const INITIAL_SECURITY_SESSIONS: ReadonlyArray<ActiveSessionItem> = [
  {
    id: 'sess-macbook',
    deviceName: 'MacBook Pro 16" (M4 Max)',
    deviceType: 'desktop',
    browserOrClient: 'Chrome 134 · macOS 15',
    location: 'San Francisco, US',
    ipAddress: '198.51.100.14',
    lastActive: 'Active now',
    current: true,
  },
  {
    id: 'sess-iphone',
    deviceName: 'iPhone 16 Pro',
    deviceType: 'mobile',
    browserOrClient: 'Refractor iOS · Face ID',
    location: 'San Francisco, US',
    ipAddress: '198.51.100.42',
    lastActive: '11m ago',
  },
  {
    id: 'sess-ipad',
    deviceName: 'iPad Pro 13"',
    deviceType: 'tablet',
    browserOrClient: 'Safari · iPadOS 19',
    location: 'Seattle, US',
    ipAddress: '198.51.100.78',
    lastActive: '1h ago',
  },
  {
    id: 'sess-cli',
    deviceName: 'Release Automation CLI',
    deviceType: 'cli',
    browserOrClient: '@refractor-ui/cli v2.1.0',
    location: 'Frankfurt, DE',
    ipAddress: '203.0.113.91',
    lastActive: '3h ago',
  },
];

const PROD_ROTATION_SUFFIXES: ReadonlyArray<string> = [
  '9x8k2m4p7q1v5w3z',
  '3f7d9a2c8e4b6h1k',
  '6m2p9t5w1x8z4r7n',
  '8v4y2b7j5n9c3q6d',
];

const STG_ROTATION_SUFFIXES: ReadonlyArray<string> = [
  '4c7n1b8r2t6y9h5j',
  '7p3q9w5e2r8t4u1m',
  '2k6m8n4p9v3x7z5c',
  '5d9f3g7h1j6k2l8w',
];

interface SecurityAuditNotice {
  severity: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

function SecurityAccountSettingsScreen() {
  const [prodRotationIndex, setProdRotationIndex] = useState(0);
  const [stgRotationIndex, setStgRotationIndex] = useState(0);
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([...INITIAL_SECURITY_SESSIONS]);
  const [hardwarePasskeys, setHardwarePasskeys] = useState(true);
  const [ipAllowlist, setIpAllowlist] = useState(true);
  const [auditNotice, setAuditNotice] = useState<SecurityAuditNotice | null>(null);

  const prodKey = `rf_demo_prod_${PROD_ROTATION_SUFFIXES[prodRotationIndex % PROD_ROTATION_SUFFIXES.length]}`;
  const stgKey = `rf_demo_stg_${STG_ROTATION_SUFFIXES[stgRotationIndex % STG_ROTATION_SUFFIXES.length]}`;
  const enforcedPolicyCount = (hardwarePasskeys ? 1 : 0) + (ipAllowlist ? 1 : 0);

  return (
    <div className="w-full max-w-4xl mx-auto min-w-0 space-y-5">
      {/* Posture Header */}
      <div className="prism-slab p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            API Keys, Secrets &amp; Active Sessions
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Rotate scoped credentials, enforce zero-trust authentication guardrails, and revoke remote sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BadgeStatus
            tone={enforcedPolicyCount === 2 ? 'online' : 'warning'}
            label={`Hardened · ${enforcedPolicyCount}/2 Policies`}
          />
          <BadgeStatus count={sessions.length} tone="counter" label="Active Sessions" />
        </div>
      </div>

      {/* Live Audit Feedback Banner */}
      {auditNotice ? (
        <AlertBanner
          severity={auditNotice.severity}
          title={auditNotice.title}
          message={auditNotice.message}
          onDismiss={() => setAuditNotice(null)}
        />
      ) : null}

      {/* Scoped API Secrets */}
      <div className="space-y-4">
        <SecretKeyField
          label="Production Telemetry API Key"
          value={prodKey}
          visiblePrefixChars={13}
          visibleSuffixChars={4}
          helperText={`Read/write runtime telemetry scope · Rotated ${prodRotationIndex} time(s) this session.`}
          onCopy={() =>
            setAuditNotice({
              severity: 'success',
              title: 'Production key copied',
              message: 'Copied rf_demo_prod_ token to clipboard. Never commit tokens to client bundles.',
            })
          }
          onRotate={() => {
            const nextCount = prodRotationIndex + 1;
            setProdRotationIndex(nextCount);
            setAuditNotice({
              severity: 'warning',
              title: 'Production API key rotated',
              message: `Issued rotation #${nextCount}. Previous credentials enter a 15-minute grace window.`,
            });
          }}
        />

        <SecretKeyField
          label="Staging Webhook Signing Secret"
          value={stgKey}
          visiblePrefixChars={12}
          visibleSuffixChars={4}
          helperText={`HMAC-SHA256 webhook verification · Rotated ${stgRotationIndex} time(s) this session.`}
          onCopy={() =>
            setAuditNotice({
              severity: 'info',
              title: 'Staging signing secret copied',
              message: 'Copied rf_demo_stg_ HMAC secret for staging webhook verification.',
            })
          }
          onRotate={() => {
            const nextCount = stgRotationIndex + 1;
            setStgRotationIndex(nextCount);
            setAuditNotice({
              severity: 'warning',
              title: 'Staging webhook secret rotated',
              message: `Issued staging rotation #${nextCount}. Update your staging verifier endpoint.`,
            });
          }}
        />
      </div>

      {/* Security Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PrismCard
          kicker="Authentication Policy"
          title="Hardware Passkeys (FIDO2)"
          footer={
            <ToggleSwitch
              checked={hardwarePasskeys}
              onChange={(next) => {
                setHardwarePasskeys(next);
                setAuditNotice({
                  severity: next ? 'success' : 'warning',
                  title: next ? 'Hardware passkeys enforced' : 'Hardware passkeys set to optional',
                  message: next
                    ? 'All workspace operators must authenticate with FIDO2 / WebAuthn keys.'
                    : 'Password + TOTP fallback is now permitted for non-owner accounts.',
                });
              }}
              label={hardwarePasskeys ? 'Enforced' : 'Optional'}
            />
          }
        >
          Require biometric Touch ID, Face ID, or YubiKey attestation before revealing secrets or modifying production releases.
        </PrismCard>

        <PrismCard
          kicker="Network Perimeter"
          title="Corporate IP Allowlist"
          footer={
            <ToggleSwitch
              checked={ipAllowlist}
              onChange={(next) => {
                setIpAllowlist(next);
                setAuditNotice({
                  severity: next ? 'success' : 'warning',
                  title: next ? 'IP Allowlist enabled' : 'IP Allowlist paused',
                  message: next
                    ? 'API tokens restricted to verified CIDR block 203.0.113.0/24.'
                    : 'Requests are temporarily accepted from any TLS-authenticated origin.',
                });
              }}
              label={ipAllowlist ? 'Restricted' : 'Open'}
            />
          }
        >
          Restrict programmatic API key traffic and CLI sessions to approved corporate VPN egress ranges (<code className="font-mono text-xs">203.0.113.0/24</code>).
        </PrismCard>
      </div>

      {/* Active Sessions List with Live Revoke */}
      <div className="space-y-3">
        <ActiveSessionsList
          title="Active Signed-In Devices"
          sessions={sessions}
          onSessionsChange={setSessions}
          onSignOutSession={(sessionId) =>
            setAuditNotice({
              severity: 'warning',
              title: 'Remote session revoked',
              message: `Invalidated refresh tokens for session "${sessionId}".`,
            })
          }
          onSignOutAllOthers={() =>
            setAuditNotice({
              severity: 'success',
              title: 'All remote sessions terminated',
              message: 'Only your current MacBook Pro session remains authenticated.',
            })
          }
        />

        {sessions.length < INITIAL_SECURITY_SESSIONS.length ? (
          <div className="flex justify-end">
            <SecondaryButton
              tone="crystal"
              size="sm"
              leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => {
                setSessions([...INITIAL_SECURITY_SESSIONS]);
                setAuditNotice({
                  severity: 'info',
                  title: 'Demo sessions restored',
                  message: 'Repopulated all 4 active workspace device sessions.',
                });
              }}
            >
              Restore Demo Sessions
            </SecondaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const SECURITY_SETTINGS_CODE = `import { useState } from 'react';
import {
  ActiveSessionsList,
  AlertBanner,
  BadgeStatus,
  PrismCard,
  SecretKeyField,
  ToggleSwitch,
  type ActiveSessionItem,
} from '@refractor-ui/core';

const INITIAL_SESSIONS: ReadonlyArray<ActiveSessionItem> = [
  {
    id: 'sess-macbook',
    deviceName: 'MacBook Pro 16"',
    deviceType: 'desktop',
    browserOrClient: 'Chrome 134 · macOS 15',
    location: 'San Francisco, US',
    ipAddress: '198.51.100.14',
    lastActive: 'Active now',
    current: true,
  },
  {
    id: 'sess-iphone',
    deviceName: 'iPhone 16 Pro',
    deviceType: 'mobile',
    browserOrClient: 'Refractor iOS · Face ID',
    location: 'San Francisco, US',
    ipAddress: '198.51.100.42',
    lastActive: '11m ago',
  },
  {
    id: 'sess-cli',
    deviceName: 'Release Automation CLI',
    deviceType: 'cli',
    browserOrClient: '@refractor-ui/cli v2.1.0',
    location: 'Frankfurt, DE',
    ipAddress: '203.0.113.91',
    lastActive: '3h ago',
  },
];

export function SecurityAccountSettings() {
  const [prodKey, setProdKey] = useState('rf_demo_prod_9x8k2m4p7q1v5w3z');
  const [stgKey, setStgKey] = useState('rf_demo_stg_4c7n1b8r2t6y9h5j');
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([...INITIAL_SESSIONS]);
  const [passkeysOnly, setPasskeysOnly] = useState(true);
  const [ipAllowlist, setIpAllowlist] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      <div className="prism-slab p-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">API Keys & Active Sessions</h2>
        <BadgeStatus tone={passkeysOnly && ipAllowlist ? 'online' : 'warning'} label={\`\${sessions.length} Active Sessions\`} />
      </div>

      {notice ? <AlertBanner severity="info" title="Security Audit" message={notice} onDismiss={() => setNotice(null)} /> : null}

      <SecretKeyField
        label="Production Telemetry API Key"
        value={prodKey}
        visiblePrefixChars={13}
        visibleSuffixChars={4}
        onCopy={() => setNotice('Copied production API key.')}
        onRotate={() => {
          setProdKey(\`rf_demo_prod_\${Date.now().toString(36)}9x8k\`);
          setNotice('Rotated production API key.');
        }}
      />

      <SecretKeyField
        label="Staging Webhook Signing Secret"
        value={stgKey}
        visiblePrefixChars={12}
        visibleSuffixChars={4}
        onCopy={() => setNotice('Copied staging webhook secret.')}
        onRotate={() => {
          setStgKey(\`rf_demo_stg_\${Date.now().toString(36)}4c7n\`);
          setNotice('Rotated staging webhook secret.');
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PrismCard kicker="Authentication" title="Hardware Passkeys (FIDO2)" footer={<ToggleSwitch checked={passkeysOnly} onChange={setPasskeysOnly} label={passkeysOnly ? 'Enforced' : 'Optional'} />}>
          Require WebAuthn hardware attestation before rotating keys.
        </PrismCard>
        <PrismCard kicker="Network Perimeter" title="Corporate IP Allowlist" footer={<ToggleSwitch checked={ipAllowlist} onChange={setIpAllowlist} label={ipAllowlist ? 'Restricted' : 'Open'} />}>
          Restrict CLI & API access to approved egress CIDR blocks.
        </PrismCard>
      </div>

      <ActiveSessionsList
        sessions={sessions}
        onSessionsChange={setSessions}
        onSignOutSession={(id) => setNotice(\`Revoked remote session \${id}.\`) }
        onSignOutAllOthers={() => setNotice('Signed out all remote devices.')}
      />
    </div>
  );
}`;

/* ==========================================================================
   5. Workspace Access & RBAC Admin Console (`team-rbac-permissions`)
   ========================================================================== */

interface TeamMemberSpec {
  id: string;
  name: string;
  initials: string;
  shape: 'circle' | 'squircle';
  roleId: string;
  roleLabel: string;
  email: string;
}

interface ScopedPermissionRow extends PermissionRow {
  riskLevel: number;
}

const TEAM_ROSTER: ReadonlyArray<TeamMemberSpec> = [
  {
    id: 'm-clara',
    name: 'Clara Vance',
    initials: 'CV',
    shape: 'squircle',
    roleId: 'admin',
    roleLabel: 'Owner',
    email: 'clara@refractor.io',
  },
  {
    id: 'm-marcus',
    name: 'Marcus Chen',
    initials: 'MC',
    shape: 'circle',
    roleId: 'security',
    roleLabel: 'Security Ops',
    email: 'marcus@refractor.io',
  },
  {
    id: 'm-elena',
    name: 'Elena Rostova',
    initials: 'ER',
    shape: 'circle',
    roleId: 'editor',
    roleLabel: 'Engineer',
    email: 'elena@refractor.io',
  },
  {
    id: 'm-devon',
    name: 'Devon Kim',
    initials: 'DK',
    shape: 'squircle',
    roleId: 'viewer',
    roleLabel: 'Auditor',
    email: 'devon@refractor.io',
  },
];

const RBAC_ROLES: ReadonlyArray<RoleColumn> = [
  { id: 'admin', name: 'Owner', description: 'Immutable org root', locked: true },
  { id: 'security', name: 'Security Ops', description: 'Secrets & sessions' },
  { id: 'editor', name: 'Engineer', description: 'Author & ship' },
  { id: 'viewer', name: 'Auditor', description: 'Read-only review' },
];

const RBAC_PERMISSIONS: ReadonlyArray<ScopedPermissionRow> = [
  {
    id: 'read_tokens',
    label: 'Read Design Tokens',
    category: 'Core',
    description: 'Inspect theme palettes, typography, and optical physics configs.',
    riskLevel: 1,
  },
  {
    id: 'edit_themes',
    label: 'Edit Optical Themes',
    category: 'Core',
    description: 'Modify theme presets and push design system tokens.',
    riskLevel: 2,
  },
  {
    id: 'view_audit_logs',
    label: 'Inspect Audit Trails',
    category: 'Security',
    description: 'Read immutable authentication and key rotation audit logs.',
    riskLevel: 2,
  },
  {
    id: 'rotate_api_keys',
    label: 'Rotate API Secrets',
    category: 'Security',
    description: 'Generate, reveal, and revoke production telemetry keys.',
    riskLevel: 5,
  },
  {
    id: 'deploy_staging',
    label: 'Deploy Staging Builds',
    category: 'Release',
    description: 'Promote verified preview packages to staging environments.',
    riskLevel: 3,
  },
  {
    id: 'publish_prod',
    label: 'Publish Production Releases',
    category: 'Release',
    description: 'Sign and publish SemVer packages to production registries.',
    riskLevel: 5,
  },
  {
    id: 'manage_billing',
    label: 'Manage Billing & Seats',
    category: 'Billing',
    description: 'Update enterprise contracts, invoices, and seat quotas.',
    riskLevel: 4,
  },
];

const BASELINE_GRANTS: RoleGrantsRecord = {
  admin: [
    'read_tokens',
    'edit_themes',
    'view_audit_logs',
    'rotate_api_keys',
    'deploy_staging',
    'publish_prod',
    'manage_billing',
  ],
  security: ['read_tokens', 'view_audit_logs', 'rotate_api_keys'],
  editor: ['read_tokens', 'edit_themes', 'deploy_staging'],
  viewer: ['read_tokens', 'view_audit_logs'],
};

const INITIAL_DRAFT_GRANTS: RoleGrantsRecord = {
  ...BASELINE_GRANTS,
  editor: ['read_tokens', 'edit_themes', 'deploy_staging', 'publish_prod'],
};

function cloneGrantsRecord(record: RoleGrantsRecord): Record<string, string[]> {
  const entries = Object.entries(record).map(([roleId, permIds]) => [roleId, [...permIds]]);
  return Object.fromEntries(entries);
}

function countPendingGrantDeltas(
  baseline: RoleGrantsRecord,
  draft: RoleGrantsRecord,
  roles: ReadonlyArray<RoleColumn>,
  permissions: ReadonlyArray<PermissionRow>
): number {
  const baseMap = new Map<string, Set<string>>();
  for (const [roleId, list] of Object.entries(baseline)) {
    baseMap.set(roleId, new Set<string>(list));
  }
  const draftMap = new Map<string, Set<string>>();
  for (const [roleId, list] of Object.entries(draft)) {
    draftMap.set(roleId, new Set<string>(list));
  }

  let deltas = 0;
  for (const role of roles) {
    if (role.locked) continue;
    const baseSet = baseMap.get(role.id);
    const nextSet = draftMap.get(role.id);
    for (const perm of permissions) {
      const had = baseSet?.has(perm.id) ?? false;
      const has = nextSet?.has(perm.id) ?? false;
      if (had !== has) {
        deltas += 1;
      }
    }
  }
  return deltas;
}

function TeamRbacConsoleScreen() {
  const [committedGrants, setCommittedGrants] = useState<RoleGrantsRecord>(() =>
    cloneGrantsRecord(BASELINE_GRANTS)
  );
  const [draftGrants, setDraftGrants] = useState<RoleGrantsRecord>(() =>
    cloneGrantsRecord(INITIAL_DRAFT_GRANTS)
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FacetedFilterState>({
    query: '',
    categories: [],
  });
  const [revision, setRevision] = useState(14);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => TEAM_ROSTER.find((member) => member.id === selectedMemberId) ?? null,
    [selectedMemberId]
  );

  const filteredPermissions = useMemo(() => {
    const queryLower = filterState.query.trim().toLowerCase();
    const categorySet = new Set(filterState.categories);

    return RBAC_PERMISSIONS.filter((perm) => {
      if (categorySet.size > 0 && (!perm.category || !categorySet.has(perm.category))) {
        return false;
      }
      if (filterState.minPrice !== undefined && perm.riskLevel < filterState.minPrice) {
        return false;
      }
      if (filterState.maxPrice !== undefined && perm.riskLevel > filterState.maxPrice) {
        return false;
      }
      if (queryLower.length > 0) {
        const matchesLabel = perm.label.toLowerCase().includes(queryLower);
        const matchesDesc = (perm.description ?? '').toLowerCase().includes(queryLower);
        const matchesCategory = (perm.category ?? '').toLowerCase().includes(queryLower);
        if (!matchesLabel && !matchesDesc && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [filterState]);

  const visibleRoles = useMemo(() => {
    if (!selectedMember) return RBAC_ROLES;
    return RBAC_ROLES.filter((role) => role.id === selectedMember.roleId);
  }, [selectedMember]);

  const pendingChanges = useMemo(
    () => countPendingGrantDeltas(committedGrants, draftGrants, RBAC_ROLES, RBAC_PERMISSIONS),
    [committedGrants, draftGrants]
  );

  const handleSavePolicy = () => {
    const deltaCount = pendingChanges;
    setCommittedGrants(cloneGrantsRecord(draftGrants));
    const nextRev = revision + 1;
    setRevision(nextRev);
    setSavedMessage(
      `Committed ${deltaCount} permission ${deltaCount === 1 ? 'change' : 'changes'} to Audit Policy Rev ${nextRev}.`
    );
  };

  const handleDiscardChanges = () => {
    setDraftGrants(cloneGrantsRecord(committedGrants));
    setSavedMessage(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto min-w-0 space-y-5">
      {/* Header & Team Roster Strip */}
      <div className="prism-slab p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Workspace Access &amp; RBAC Console
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Click a teammate to spotlight their role column, filter by permission scope or risk tier, and commit audited changes.
            </p>
          </div>
          <BadgeStatus
            tone={pendingChanges > 0 ? 'warning' : 'online'}
            label={
              pendingChanges > 0
                ? `${pendingChanges} Unsaved Policy ${pendingChanges === 1 ? 'Change' : 'Changes'}`
                : `SOC 2 Audit Synced · Rev ${revision}`
            }
          />
        </div>

        {/* Team Roster Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TEAM_ROSTER.map((member) => {
            const isSelected = selectedMemberId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  setSelectedMemberId((prev) => (prev === member.id ? null : member.id))
                }
                className={`prism-focus-ring rounded-2xl p-3 flex items-center gap-3 text-left transition-all cursor-pointer min-w-0 ${
                  isSelected ? 'prism-emerald' : 'prism-crystal hover:brightness-105'
                }`}
              >
                <Avatar
                  size="sm"
                  shape={member.shape}
                  initials={member.initials}
                  alt={member.name}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{member.name}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isSelected ? 'opacity-90' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {member.roleLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Faceted Search & Scope Filter */}
      <FacetedFilterBar
        value={filterState}
        onChange={setFilterState}
        searchPlaceholder="Search permissions (e.g. rotate, tokens, deploy)..."
        priceLabel="Risk Tier"
        priceBounds={{ min: 1, max: 5 }}
        showDateRange={false}
        resultCount={filteredPermissions.length}
        categories={[
          { value: 'Core', label: 'Core', count: 2 },
          { value: 'Security', label: 'Security', count: 2 },
          { value: 'Release', label: 'Release', count: 2 },
          { value: 'Billing', label: 'Billing', count: 1 },
        ]}
      />

      {savedMessage ? (
        <AlertBanner
          severity="success"
          title="RBAC policy updated"
          message={savedMessage}
          onDismiss={() => setSavedMessage(null)}
        />
      ) : null}

      {/* Interactive Role Permissions Matrix */}
      <RolePermissionsMatrix
        title={
          selectedMember
            ? `Permissions for ${selectedMember.name} (${selectedMember.roleLabel})`
            : 'Workspace Role & Permissions Matrix'
        }
        roles={visibleRoles}
        permissions={filteredPermissions}
        grants={draftGrants}
        onChange={(next) => {
          setDraftGrants(next);
          if (savedMessage) setSavedMessage(null);
        }}
      />

      {/* Sticky Save / Discard Action Bar when permissions differ from committed baseline */}
      <StickyActionBar
        position="inline"
        selectedCount={pendingChanges}
        selectionLabel={(count) =>
          `${count} policy ${count === 1 ? 'change' : 'changes'} pending`
        }
        onClearSelection={handleDiscardChanges}
        actions={[
          {
            id: 'discard',
            label: 'Discard',
            tone: 'secondary',
            icon: <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />,
            onClick: handleDiscardChanges,
          },
          {
            id: 'save',
            label: 'Save Policy',
            tone: 'primary',
            icon: <Save className="w-3.5 h-3.5" aria-hidden="true" />,
            onClick: handleSavePolicy,
          },
        ]}
      />
    </div>
  );
}

const TEAM_RBAC_CODE = `import { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import {
  AlertBanner,
  Avatar,
  BadgeStatus,
  FacetedFilterBar,
  RolePermissionsMatrix,
  StickyActionBar,
  type FacetedFilterState,
  type PermissionRow,
  type RoleColumn,
  type RoleGrantsRecord,
} from '@refractor-ui/core';

const ROLES: ReadonlyArray<RoleColumn> = [
  { id: 'admin', name: 'Owner', description: 'Immutable org root', locked: true },
  { id: 'security', name: 'Security Ops', description: 'Secrets & sessions' },
  { id: 'editor', name: 'Engineer', description: 'Author & ship' },
  { id: 'viewer', name: 'Auditor', description: 'Read-only review' },
];

const PERMISSIONS: ReadonlyArray<PermissionRow> = [
  { id: 'read_tokens', label: 'Read Design Tokens', category: 'Core' },
  { id: 'edit_themes', label: 'Edit Optical Themes', category: 'Core' },
  { id: 'rotate_api_keys', label: 'Rotate API Secrets', category: 'Security' },
  { id: 'publish_prod', label: 'Publish Production Releases', category: 'Release' },
];

const BASELINE: RoleGrantsRecord = {
  admin: ['read_tokens', 'edit_themes', 'rotate_api_keys', 'publish_prod'],
  security: ['read_tokens', 'rotate_api_keys'],
  editor: ['read_tokens', 'edit_themes'],
  viewer: ['read_tokens'],
};

export function TeamRbacConsole() {
  const [committed, setCommitted] = useState<RoleGrantsRecord>(BASELINE);
  const [draft, setDraft] = useState<RoleGrantsRecord>({ ...BASELINE, editor: ['read_tokens', 'edit_themes', 'publish_prod'] });
  const [filters, setFilters] = useState<FacetedFilterState>({ query: '', categories: [] });
  const [revision, setRevision] = useState(14);
  const [banner, setBanner] = useState<string | null>(null);

  const visiblePermissions = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const cats = new Set(filters.categories);
    return PERMISSIONS.filter((p) => (cats.size === 0 || (p.category && cats.has(p.category))) && (!q || p.label.toLowerCase().includes(q)));
  }, [filters]);

  const pendingCount = useMemo(() => {
    let count = 0;
    const baseEntries = new Map(Object.entries(committed).map(([k, v]) => [k, new Set(v)]));
    const draftEntries = new Map(Object.entries(draft).map(([k, v]) => [k, new Set(v)]));
    for (const role of ROLES) {
      if (role.locked) continue;
      for (const perm of PERMISSIONS) {
        if ((baseEntries.get(role.id)?.has(perm.id) ?? false) !== (draftEntries.get(role.id)?.has(perm.id) ?? false)) {
          count += 1;
        }
      }
    }
    return count;
  }, [committed, draft]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="prism-slab p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm" shape="squircle" initials="CV" alt="Clara Vance" />
          <Avatar size="sm" initials="MC" alt="Marcus Chen" />
          <Avatar size="sm" initials="ER" alt="Elena Rostova" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white ml-1">Workspace RBAC Console</h2>
        </div>
        <BadgeStatus tone={pendingCount > 0 ? 'warning' : 'online'} label={pendingCount > 0 ? \`\${pendingCount} Pending Changes\` : \`Audit Synced · Rev \${revision}\`} />
      </div>

      <FacetedFilterBar
        value={filters}
        onChange={setFilters}
        priceLabel="Risk Tier"
        priceBounds={{ min: 1, max: 5 }}
        showDateRange={false}
        resultCount={visiblePermissions.length}
        categories={[
          { value: 'Core', label: 'Core', count: 2 },
          { value: 'Security', label: 'Security', count: 1 },
          { value: 'Release', label: 'Release', count: 1 },
        ]}
      />

      {banner ? <AlertBanner severity="success" title="Policy Saved" message={banner} onDismiss={() => setBanner(null)} /> : null}

      <RolePermissionsMatrix roles={ROLES} permissions={visiblePermissions} grants={draft} onChange={setDraft} />

      <StickyActionBar
        position="inline"
        selectedCount={pendingCount}
        selectionLabel={(n) => \`\${n} policy \${n === 1 ? 'change' : 'changes'} pending\`}
        onClearSelection={() => setDraft(committed)}
        actions={[
          { id: 'discard', label: 'Discard', tone: 'secondary', icon: <RotateCcw className="w-3.5 h-3.5" />, onClick: () => setDraft(committed) },
          {
            id: 'save',
            label: 'Save Policy',
            tone: 'primary',
            icon: <Save className="w-3.5 h-3.5" />,
            onClick: () => {
              setCommitted(draft);
              setRevision((r) => r + 1);
              setBanner(\`Committed \${pendingCount} RBAC changes.\`);
            },
          },
        ]}
      />
    </div>
  );
}`;

/* ==========================================================================
   Exported Auth, Onboarding & Security Example Catalog
   ========================================================================== */

export const AUTH_SECURITY_EXAMPLES: ReadonlyArray<ExampleScreenSpec> = [
  {
    id: 'login-screen',
    title: 'Sign In / Authentication Portal',
    domain: 'auth-security',
    domainTitle: 'Auth, Onboarding & Security',
    summary:
      'Optical glass authentication portal with email/password validation, async sign-in feedback, WebAuthn Passkey & GitHub SSO shortcuts, and inline password recovery.',
    devices: ['web', 'mobile'],
    defaultPreviewFrame: 'mobile',
    componentsUsed: [
      'TextInput',
      'Checkbox',
      'StatefulAsyncButton',
      'SecondaryButton',
      'PrimaryButton',
      'AlertBanner',
      'BadgeStatus',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Single-column stacked SSO capsules prevent text truncation across 390px mobile and desktop frames.',
      'StatefulAsyncButton provides inline loading, success, and credential-error feedback without jarring layout shifts.',
      'Inline password reset flow and signed-in session receipt keep the entire auth lifecycle inside one cohesive optical slab.',
    ],
    fullCode: LOGIN_SCREEN_CODE,
    render: () => <LoginPortalScreen />,
  },
  {
    id: 'signup-onboarding',
    title: 'Sign Up & Account Onboarding Flow',
    domain: 'auth-security',
    domainTitle: 'Auth, Onboarding & Security',
    summary:
      'Three-stage guided registration pairing a clickable Stepper with live PasswordStrengthMeter telemetry, E.164 InternationalPhoneInput recovery, and terms confirmation.',
    devices: ['web', 'tablet', 'mobile'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'Stepper',
      'TextInput',
      'PasswordStrengthMeter',
      'InternationalPhoneInput',
      'DropdownSelect',
      'Checkbox',
      'PrimaryButton',
      'SecondaryButton',
      'AlertBanner',
      'BadgeStatus',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Progressive 3-step disclosure keeps cognitive load low while enforcing 12-character enterprise password entropy live.',
      'Structured InternationalPhoneInput persists formatted and canonical E.164 state across step navigation.',
      'Final review summary distills owner identity, recovery number, and data residency region before terms sign-off.',
    ],
    fullCode: SIGNUP_ONBOARDING_CODE,
    render: () => <SignupOnboardingScreen />,
  },
  {
    id: 'mfa-otp-verification',
    title: 'Mobile Two-Factor (OTP) Verification',
    domain: 'auth-security',
    domainTitle: 'Auth, Onboarding & Security',
    summary:
      'Mobile-first 6-digit TOTP security gate with live auto-validation, 30-day trusted-device ToggleSwitch, instant rejection testing, and one-tap code resend.',
    devices: ['mobile', 'web'],
    defaultPreviewFrame: 'mobile',
    componentsUsed: [
      'BadgeStatus',
      'OtpCodeInput',
      'AlertBanner',
      'ToggleSwitch',
      'PrimaryButton',
      'SecondaryButton',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Calibrated optical padding keeps all 6 OTP cells crisp and thumb-reachable inside 390px mobile viewports.',
      'Auto-validates immediately on the 6th digit via onComplete and surfaces live semantic status in AlertBanner.',
      'Dedicated resend counter and trusted-device toggle eliminate unnecessary modal round-trips.',
    ],
    fullCode: MFA_OTP_CODE,
    render: () => <MfaOtpVerificationScreen />,
  },
  {
    id: 'security-account-settings',
    title: 'API Keys, Secrets & Active Sessions Hub',
    domain: 'auth-security',
    domainTitle: 'Auth, Onboarding & Security',
    summary:
      'Enterprise security dashboard uniting masked SecretKeyField vaults with live rotation, FIDO2/IP Allowlist ToggleSwitch policies, and interactive ActiveSessionsList revocation.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'SecretKeyField',
      'ActiveSessionsList',
      'ToggleSwitch',
      'PrismCard',
      'BadgeStatus',
      'AlertBanner',
      'SecondaryButton',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Prefix/suffix credential masking lets operators verify key namespaces (rf_demo_prod_ vs rf_demo_stg_) without exposing secrets.',
      'Live posture header badge dynamically recalculates hardened policy compliance and active device counts.',
      'Individual and bulk remote session revocation preserves the current workstation session with one-click demo restore.',
    ],
    fullCode: SECURITY_SETTINGS_CODE,
    render: () => <SecurityAccountSettingsScreen />,
  },
  {
    id: 'team-rbac-permissions',
    title: 'Workspace Access & RBAC Admin Console',
    domain: 'auth-security',
    domainTitle: 'Auth, Onboarding & Security',
    summary:
      'Least-privilege RBAC console combining an interactive Avatar team spotlight strip, FacetedFilterBar scope/risk search, RolePermissionsMatrix, and StickyActionBar diff commit bar.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'Avatar',
      'FacetedFilterBar',
      'RolePermissionsMatrix',
      'StickyActionBar',
      'BadgeStatus',
      'AlertBanner',
    ],
    uxScore: 9.7,
    uxHighlights: [
      'Clicking any teammate card isolates their role column in the matrix without losing edits across other roles.',
      'FacetedFilterBar filters permissions by text query, domain category, and numeric Risk Tier (1–5) simultaneously.',
      'StickyActionBar automatically surfaces exact pending policy deltas with one-click Discard or audited Save Policy.',
    ],
    fullCode: TEAM_RBAC_CODE,
    render: () => <TeamRbacConsoleScreen />,
  },
];
