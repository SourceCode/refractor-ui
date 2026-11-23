'use client';

import { memo, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { sanitizeUrl } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarShape = 'circle' | 'squircle';

export interface AvatarProps extends BaseProps<HTMLDivElement> {
  /** Optional portrait image URL. Automatically falls back to cobalt initials on error or unsafe protocol. */
  src?: string;
  /** Accessible alternative text for the portrait or initials badge. */
  alt: string;
  /** Resilient fallback initials displayed when no valid image loads. */
  initials: string;
  /** Dimensions scale ('sm' | 'md' | 'lg'). */
  size?: AvatarSize;
  /** Outer crystal frame geometry ('circle' | 'squircle'). */
  shape?: AvatarShape;
}

function AvatarInner({
  src,
  alt,
  initials,
  size = 'md',
  shape = 'circle',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AvatarProps) {
  const override = useComponentOverride('Avatar');
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const safeSrc = src ? sanitizeUrl(src, true) : '';
  const showImage = Boolean(safeSrc) && failedSrc !== safeSrc;

  const dims =
    size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-11 h-11 text-sm';
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  const merged = mergeProps({
    themeTarget: themeProps('avatar', { size, shape, fallback: !showImage }),
    baseClassName: `prism-crystal ${dims} ${radius} p-0.5 inline-flex items-center justify-center overflow-hidden shrink-0`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {showImage ? (
        <img
          src={safeSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(safeSrc)}
          className={`w-full h-full object-cover ${radius}`}
        />
      ) : (
        <span
          role="img"
          aria-label={alt}
          className={`prism-btn-cobalt w-full h-full ${radius} flex items-center justify-center font-semibold tracking-tight`}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

export const Avatar = memo(AvatarInner);
Avatar.displayName = 'Avatar';
