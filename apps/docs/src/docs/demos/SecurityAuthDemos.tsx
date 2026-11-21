import { useState } from 'react';
import {
  ActiveSessionsList,
  OtpCodeInput,
  PasswordStrengthMeter,
  RolePermissionsMatrix,
  SecretKeyField,
  TextInput,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface SecurityAuthDemosProps {
  componentId: string;
}

export function SecurityAuthDemos({ componentId }: SecurityAuthDemosProps) {
  const dispatch = useAppDispatch();
  const [otp, setOtp] = useState('482');
  const [password, setPassword] = useState('Pr1sm@Optical2026!');
  const [apiKey, setApiKey] = useState('rf_live_9f4b2e8c7d1a6e3f5b0c8a9f2');

  switch (componentId) {
    case 'otp-code-input':
      return (
        <div className="w-full max-w-md">
          <OtpCodeInput
            length={6}
            value={otp}
            onChange={setOtp}
            onComplete={(code) =>
              dispatch(pushToast({ title: `Verified 6-digit code ${code}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'password-strength-meter':
      return (
        <div className="w-full max-w-md space-y-3">
          <TextInput
            label="New Account Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a strong password..."
          />
          <PasswordStrengthMeter password={password} minLength={12} />
        </div>
      );

    case 'secret-key-field':
      return (
        <div className="w-full max-w-xl">
          <SecretKeyField
            label="Production API Secret"
            value={apiKey}
            helperText="Keep secret tokens out of client bundles. Rotate immediately if exposed."
            onCopy={() =>
              dispatch(pushToast({ title: 'API key copied to clipboard', tone: 'emerald' }))
            }
            onRotate={() => {
              const next = `rf_live_${Math.random().toString(16).slice(2, 14)}a9f2`;
              setApiKey(next);
              dispatch(pushToast({ title: 'Rotated API secret key', tone: 'amber' }));
            }}
          />
        </div>
      );

    case 'role-permissions-matrix':
      return (
        <div className="w-full">
          <RolePermissionsMatrix
            roles={[
              { id: 'admin', name: 'Admin', description: 'Full org control', locked: true },
              { id: 'editor', name: 'Editor', description: 'Author & publish' },
              { id: 'viewer', name: 'Viewer', description: 'Read-only audit' },
            ]}
            permissions={[
              { id: 'read_tokens', label: 'Read Design Tokens', category: 'Core' },
              { id: 'edit_themes', label: 'Edit Optical Themes', category: 'Theming' },
              { id: 'publish_pkg', label: 'Publish Releases', category: 'Release' },
              { id: 'manage_keys', label: 'Rotate API Secrets', category: 'Security' },
            ]}
            defaultGrants={{
              admin: ['read_tokens', 'edit_themes', 'publish_pkg', 'manage_keys'],
              editor: ['read_tokens', 'edit_themes'],
              viewer: ['read_tokens'],
            }}
          />
        </div>
      );

    case 'active-sessions-list':
      return (
        <div className="w-full max-w-2xl">
          <ActiveSessionsList
            defaultSessions={[
              {
                id: 's1',
                deviceName: 'MacBook Pro 16"',
                deviceType: 'desktop',
                browserOrClient: 'Chrome 131 · macOS',
                location: 'San Francisco, US',
                ipAddress: '198.51.100.14',
                lastActive: 'Active now',
                current: true,
              },
              {
                id: 's2',
                deviceName: 'iPhone 16 Pro',
                deviceType: 'mobile',
                browserOrClient: 'Safari · iOS 19',
                location: 'Seattle, US',
                ipAddress: '198.51.100.42',
                lastActive: '14m ago',
              },
              {
                id: 's3',
                deviceName: 'Refractor CLI Token',
                deviceType: 'cli',
                browserOrClient: '@refractor-ui/cli v1.3.0',
                location: 'London, UK',
                ipAddress: '203.0.113.88',
                lastActive: '2h ago',
              },
            ]}
            onSignOutSession={(id) =>
              dispatch(pushToast({ title: `Revoked session ${id}`, tone: 'amber' }))
            }
            onSignOutAllOthers={() =>
              dispatch(pushToast({ title: 'Signed out all remote sessions', tone: 'emerald' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
