import { stableClassName } from '../naming';

export type ThemeAttrValue = string | number | boolean | undefined | null;
export type ThemeAttrMap = Record<string, ThemeAttrValue>;
export type ThemeDataAttributes = Record<`data-${string}`, string | undefined>;
export type ThemeTargetProps = { className: string } & ThemeDataAttributes;

export function themeDataAttributeName(prop: string): `data-${string}` {
  const kebab = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `data-${kebab}`;
}

export function themeDataAttributes(props?: ThemeAttrMap): ThemeDataAttributes {
  const attrs: ThemeDataAttributes = {};
  if (!props) return attrs;

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    attrs[themeDataAttributeName(key)] = value === true ? 'true' : String(value);
  }
  return attrs;
}

/**
 * Emits one stable `refractor-<component>` class name plus canonical `data-*`
 * attribute reflection for visual props and runtime states (Astryx pattern).
 */
export function themeProps(component: string, state?: ThemeAttrMap, part?: string): ThemeTargetProps {
  return {
    className: stableClassName(component, part),
    ...themeDataAttributes(state),
  };
}
