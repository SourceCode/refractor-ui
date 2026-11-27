import type { MotionTokenName } from '../motion/motion.theme';
import type { ThemeDensityMode } from '../theme/types';
import type { OpticalMaterialTier } from './opticalMaterial';

/**
 * Strict TypeScript Contracts & Token Autocomplete (`strictContracts.ts`)
 *
 * Enforces discriminated unions for mutually exclusive accessibility props
 * and exports typed literal token unions for full IDE autocomplete with zero `any`/`unknown`.
 */

export type SemanticColorToken =
  | '--prism-primary'
  | '--prism-secondary'
  | '--prism-info'
  | '--prism-success'
  | '--prism-warning'
  | '--prism-error'
  | '--prism-text-primary'
  | '--prism-text-secondary'
  | '--prism-border-divider';

/**
 * Discriminated union enforcing that icon-only actions ALWAYS supply either
 * `aria-label` or `aria-labelledby`, while labeled buttons carry visible `label`.
 */
export type AccessibleIconActionProps =
  | {
      iconOnly: true;
      'aria-label': string;
      'aria-labelledby'?: string;
      label?: never;
    }
  | {
      iconOnly: true;
      'aria-label'?: string;
      'aria-labelledby': string;
      label?: never;
    }
  | {
      iconOnly?: false;
      label: string;
      'aria-label'?: string;
      'aria-labelledby'?: string;
    };

export interface DesignSystemTokenBundle {
  readonly material: OpticalMaterialTier;
  readonly motion: MotionTokenName;
  readonly density: ThemeDensityMode;
  readonly accentToken: SemanticColorToken;
}

/** Identity helper preserving strict literal inference for token bundles. */
export function defineTokenBundle(bundle: DesignSystemTokenBundle): Readonly<DesignSystemTokenBundle> {
  return Object.freeze({ ...bundle });
}

/** Validates at runtime that an accessible action contract carries an explicit label. */
export function hasAccessibleActionLabel(props: AccessibleIconActionProps): boolean {
  if (props.iconOnly) {
    return Boolean(
      (props['aria-label'] && props['aria-label'].trim().length > 0) ||
        (props['aria-labelledby'] && props['aria-labelledby'].trim().length > 0)
    );
  }
  return Boolean(props.label && props.label.trim().length > 0);
}
