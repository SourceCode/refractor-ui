import { stableClassName } from '../naming';

export type ThemeAttrValue = string | number | boolean | undefined | null;
export type ThemeAttrMap = Record<string, ThemeAttrValue>;
export type ThemeDataAttributes = Record<`data-${string}`, string | undefined>;
export type ThemeTargetProps = { className: string } & ThemeDataAttributes;

const MAX_ATTR_NAME_CACHE_SIZE = 1024;
const attrNameCache = new Map<string, `data-${string}`>();
const statelessTargetCache = new Map<string, ThemeTargetProps>();

export function themeDataAttributeName(prop: string): `data-${string}` {
  const cached = attrNameCache.get(prop);
  if (cached !== undefined) {
    return cached;
  }
  const kebab = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const resolved: `data-${string}` = `data-${kebab}`;
  if (attrNameCache.size >= MAX_ATTR_NAME_CACHE_SIZE) {
    attrNameCache.clear();
  }
  attrNameCache.set(prop, resolved);
  return resolved;
}

export function themeDataAttributes(props?: ThemeAttrMap): ThemeDataAttributes {
  const attrs: ThemeDataAttributes = {};
  if (!props) return attrs;

  for (const key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
    const value = props[key];
    if (value === undefined || value === null || value === false) {
      continue;
    }
    attrs[themeDataAttributeName(key)] = value === true ? 'true' : String(value);
  }
  return attrs;
}

/**
 * Emits one stable `refractor-<component>` class name plus canonical `data-*`
 * attribute reflection for visual props and runtime states.
 * Single-pass allocation-minimized hot path with cached stateless targets.
 */
export function themeProps(component: string, state?: ThemeAttrMap, part?: string): ThemeTargetProps {
  const className = stableClassName(component, part);

  if (!state) {
    const cached = statelessTargetCache.get(className);
    if (cached !== undefined) {
      return cached;
    }
    const target: ThemeTargetProps = Object.freeze({ className });
    if (statelessTargetCache.size >= MAX_ATTR_NAME_CACHE_SIZE) {
      statelessTargetCache.clear();
    }
    statelessTargetCache.set(className, target);
    return target;
  }

  const target: ThemeTargetProps = { className };
  for (const key in state) {
    if (!Object.prototype.hasOwnProperty.call(state, key)) continue;
    const value = state[key];
    if (value === undefined || value === null || value === false) {
      continue;
    }
    target[themeDataAttributeName(key)] = value === true ? 'true' : String(value);
  }
  return target;
}
