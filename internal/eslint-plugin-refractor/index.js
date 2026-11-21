/**
 * @refractor-ui/eslint-plugin-refractor
 *
 * Two-tier Astryx-aligned ESLint plugin enforcing Refractor Optical Glass UI Kit
 * architecture invariants, accessibility rules, security boundaries, and zero any/unknown types.
 *
 * Tiers:
 * - recommended: Warnings for local human iteration; soundness/security rules remain errors.
 * - strict: Errors across all 17 rules (activated by CI=true or REFRACTOR_STRICT_LINT=1).
 */

const RAW_COLOR_REGEX = /(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\()/;
const REACT_HOOKS = new Set([
  'useState',
  'useEffect',
  'useLayoutEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'useId',
  'useReducer',
  'useTransition',
  'useDeferredValue',
  'useImperativeHandle',
  'useSyncExternalStore',
]);

function isComponentSourceFile(filename) {
  const normalized = filename.replace(/\\/g, '/');
  if (!normalized.includes('packages/core/src/')) return false;
  if (normalized.endsWith('.test.tsx') || normalized.endsWith('.test.ts')) return false;
  if (normalized.includes('/theme/') || normalized.includes('/utils/') || normalized.includes('/hooks/')) {
    return false;
  }
  const match = normalized.match(/packages\/core\/src\/([A-Z][A-Za-z0-9]+)\/\1\.tsx$/);
  return Boolean(match);
}

function getStringValue(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'JSXExpressionContainer') {
    return getStringValue(node.expression);
  }
  if (node.type === 'TemplateLiteral') {
    return node.quasis.map((q) => q.value.raw).join(' ');
  }
  return null;
}

const rules = {
  /** 1. Forbid TypeScript `unknown` keyword globally (ADR-0002) */
  'no-unknown-type': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow the TypeScript `unknown` type; define concrete types or unions.' },
      schema: [],
      messages: {
        noUnknown:
          'Avoid using `unknown` (ADR-0002). Define a concrete interface, discriminated union, or bounded generic type instead.',
      },
    },
    create(context) {
      return {
        TSUnknownKeyword(node) {
          context.report({ node, messageId: 'noUnknown' });
        },
      };
    },
  },

  /** 2. Public component Props interfaces must extend BaseProps (ADR-0001) */
  'require-base-props': {
    meta: {
      type: 'problem',
      docs: { description: 'Require public component Props interfaces to extend BaseProps.' },
      schema: [],
      messages: {
        missingBaseProps:
          'Component props interface "{{name}}" must extend BaseProps (or an interface extending it) for Astryx parity.',
      },
    },
    create(context) {
      const filename = context.filename || context.getFilename();
      if (!isComponentSourceFile(filename)) return {};
      const match = filename.replace(/\\/g, '/').match(/\/([A-Z][A-Za-z0-9]+)\.tsx$/);
      const expectedPropsName = match ? `${match[1]}Props` : null;

      return {
        ExportNamedDeclaration(node) {
          if (
            node.declaration &&
            node.declaration.type === 'TSInterfaceDeclaration' &&
            node.declaration.id.name === expectedPropsName
          ) {
            const heritage = node.declaration.extends || [];
            const extendsBase = heritage.some(
              (h) =>
                (h.expression && h.expression.name === 'BaseProps') ||
                (h.expression &&
                  typeof h.expression.name === 'string' &&
                  h.expression.name.endsWith('Props'))
            );
            if (!extendsBase) {
              context.report({
                node: node.declaration.id,
                messageId: 'missingBaseProps',
                data: { name: node.declaration.id.name },
              });
            }
          }
        },
      };
    },
  },

  /** 3. React 19 ref-as-prop; forbid legacy forwardRef (ADR-0001) */
  'require-ref-prop': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow legacy React.forwardRef; accept ref as a standard React 19 prop.' },
      schema: [],
      messages: {
        noForwardRef: 'Do not use `forwardRef` in React 19. Accept `ref` directly via BaseProps.',
      },
    },
    create(context) {
      return {
        CallExpression(node) {
          if (
            (node.callee.type === 'Identifier' && node.callee.name === 'forwardRef') ||
            (node.callee.type === 'MemberExpression' &&
              node.callee.property.type === 'Identifier' &&
              node.callee.property.name === 'forwardRef')
          ) {
            context.report({ node, messageId: 'noForwardRef' });
          }
        },
      };
    },
  },

  /** 4. Component root must pass through base props via spread (ADR-0001) */
  'require-baseprops-passthrough': {
    meta: {
      type: 'problem',
      docs: { description: 'Ensure component source passes through BaseProps via JSX spread.' },
      schema: [],
      messages: {
        missingPassthrough:
          'Component "{{name}}" must pass through BaseProps (e.g. via mergeProps/rest JSX spread) onto its root element.',
      },
    },
    create(context) {
      const filename = context.filename || context.getFilename();
      if (!isComponentSourceFile(filename)) return {};
      const match = filename.replace(/\\/g, '/').match(/\/([A-Z][A-Za-z0-9]+)\.tsx$/);
      const compName = match ? match[1] : null;
      let hasSpread = false;
      let compNode = null;

      return {
        JSXSpreadAttribute() {
          hasSpread = true;
        },
        ExportNamedDeclaration(node) {
          if (
            node.declaration &&
            node.declaration.type === 'FunctionDeclaration' &&
            node.declaration.id &&
            node.declaration.id.name === compName
          ) {
            compNode = node.declaration.id;
          }
          if (node.declaration && node.declaration.type === 'VariableDeclaration') {
            for (const d of node.declaration.declarations) {
              if (d.id && d.id.type === 'Identifier' && d.id.name === compName) {
                compNode = d.id;
              }
            }
          }
        },
        'Program:exit'() {
          if (compNode && !hasSpread) {
            context.report({
              node: compNode,
              messageId: 'missingPassthrough',
              data: { name: compName || 'Component' },
            });
          }
        },
      };
    },
  },

  /** 5. Prevent className clobber when spreading rest/merged props */
  'no-classname-clobber': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow placing className after a JSX spread that could clobber caller classes.' },
      schema: [],
      messages: {
        clobber:
          'Do not place `className` after a props spread that may carry `className`; compose via `mergeProps()`.',
      },
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          let seenSpread = false;
          for (const attr of node.attributes) {
            if (attr.type === 'JSXSpreadAttribute') {
              seenSpread = true;
            } else if (
              seenSpread &&
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'className'
            ) {
              const str = getStringValue(attr.value);
              if (str !== null && !str.includes('${')) {
                context.report({ node: attr, messageId: 'clobber' });
              }
            }
          }
        },
      };
    },
  },

  /** 6. Disallow raw color literals in component JSX (use CSS custom properties) */
  'no-raw-color': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow hardcoded hex/rgb/hsl colors in component TSX; use --prism-* tokens.' },
      schema: [],
      messages: {
        rawColor:
          'Avoid raw color literal "{{value}}" in component code (ADR-0003). Use semantic `--prism-*` CSS tokens.',
      },
    },
    create(context) {
      const filename = context.filename || context.getFilename();
      const normalized = filename.replace(/\\/g, '/');
      if (
        !isComponentSourceFile(filename) ||
        normalized.includes('/ColorPicker/') ||
        normalized.includes('/SignaturePad/') ||
        normalized.includes('/LivePresenceIndicator/')
      ) {
        return {};
      }
      const COLOR_ATTRS = new Set(['fill', 'stroke', 'stopColor', 'color', 'backgroundColor', 'borderColor']);

      return {
        JSXAttribute(node) {
          if (node.name.type === 'JSXIdentifier' && COLOR_ATTRS.has(node.name.name)) {
            const val = getStringValue(node.value);
            if (val && RAW_COLOR_REGEX.test(val)) {
              context.report({ node, messageId: 'rawColor', data: { value: val } });
            }
          }
        },
        Property(node) {
          const keyName =
            node.key.type === 'Identifier'
              ? node.key.name
              : node.key.type === 'Literal'
                ? String(node.key.value)
                : null;
          if (keyName && COLOR_ATTRS.has(keyName) && node.value.type === 'Literal' && typeof node.value.value === 'string') {
            if (RAW_COLOR_REGEX.test(node.value.value)) {
              context.report({ node: node.value, messageId: 'rawColor', data: { value: node.value.value } });
            }
          }
        },
      };
    },
  },

  /** 7. Prevent hover highlight promises on disabled interactive elements */
  'no-hover-on-disabled': {
    meta: {
      type: 'problem',
      docs: { description: 'Require disabled-guarded hover styles when a disabled prop is present.' },
      schema: [],
      messages: {
        hoverOnDisabled:
          'Interactive element with `disabled` prop uses unguarded hover transform/bg; prefix with `enabled:hover:` or guard disabled state.',
      },
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          const hasDisabled = node.attributes.some(
            (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'disabled'
          );
          if (!hasDisabled) return;
          const classAttr = node.attributes.find(
            (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'className'
          );
          const raw = classAttr ? getStringValue(classAttr.value) : null;
          if (!raw) return;
          const tokens = raw.split(/\s+/);
          const hasUnguardedHover = tokens.some(
            (t) =>
              t.startsWith('hover:-translate') ||
              t.startsWith('hover:scale')
          );
          if (hasUnguardedHover) {
            context.report({ node: classAttr, messageId: 'hoverOnDisabled' });
          }
        },
      };
    },
  },

  /** 8. Disabled interactive controls must pair cursor-pointer with disabled:cursor-not-allowed */
  'disabled-cursor': {
    meta: {
      type: 'problem',
      docs: { description: 'Require disabled:cursor-not-allowed when cursor-pointer is used with disabled.' },
      schema: [],
      messages: {
        missingDisabledCursor:
          'Element accepts `disabled` and sets `cursor-pointer` without `disabled:cursor-not-allowed`.',
      },
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          const hasDisabled = node.attributes.some(
            (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'disabled'
          );
          if (!hasDisabled) return;
          const classAttr = node.attributes.find(
            (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'className'
          );
          const raw = classAttr ? getStringValue(classAttr.value) : null;
          if (!raw) return;
          const tokens = raw.split(/\s+/);
          if (tokens.includes('cursor-pointer') && !tokens.includes('disabled:cursor-not-allowed')) {
            context.report({ node: classAttr, messageId: 'missingDisabledCursor' });
          }
        },
      };
    },
  },

  /** 9. Keyboard-only focus outline (forbid bare focus:ring- / focus:outline-2) */
  'focus-outline-keyboard-only': {
    meta: {
      type: 'problem',
      docs: { description: 'Use focus-visible: instead of bare focus: for visible focus rings.' },
      schema: [],
      messages: {
        keyboardOnly:
          'Use `focus-visible:` rather than bare `focus:` for focus outlines/rings so pointer clicks do not display keyboard focus rings.',
      },
    },
    create(context) {
      return {
        JSXAttribute(node) {
          if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'className') return;
          const raw = getStringValue(node.value);
          if (!raw) return;
          const tokens = raw.split(/\s+/);
          const bad = tokens.some(
            (t) =>
              (t.startsWith('focus:ring') && !t.startsWith('focus:ring-0')) ||
              (t.startsWith('focus:outline-') && t !== 'focus:outline-none')
          );
          if (bad) {
            context.report({ node, messageId: 'keyboardOnly' });
          }
        },
      };
    },
  },

  /** 10. Guard IME composition inside text input onKeyDown handlers */
  'no-unguarded-ime-keydown': {
    meta: {
      type: 'problem',
      docs: { description: 'Require checking isComposing before handling Enter inside input/textarea onKeyDown.' },
      schema: [],
      messages: {
        unguardedIme:
          'Guard `Enter` handling in text input `onKeyDown` with `e.nativeEvent.isComposing` (or `isComposing`) so IME composition commits are not hijacked.',
      },
    },
    create(context) {
      const sourceCode = context.sourceCode || context.getSourceCode();
      return {
        JSXOpeningElement(node) {
          if (
            node.name.type !== 'JSXIdentifier' ||
            (node.name.name !== 'input' && node.name.name !== 'textarea')
          ) {
            return;
          }
          const keyDownAttr = node.attributes.find(
            (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'onKeyDown'
          );
          if (!keyDownAttr || !keyDownAttr.value) return;
          const text = sourceCode.getText(keyDownAttr.value);
          if (
            (text.includes("'Enter'") || text.includes('"Enter"')) &&
            !text.includes('isComposing')
          ) {
            context.report({ node: keyDownAttr, messageId: 'unguardedIme' });
          }
        },
      };
    },
  },

  /** 11. Disallow preventDefault() inside passive React event handlers */
  'no-prevent-default-in-passive-react-handler': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow preventDefault() in passive React wheel/touch handlers.' },
      schema: [],
      messages: {
        passivePreventDefault:
          'React attaches `{{handler}}` as passive; calling `preventDefault()` inside it is a no-op and logs console warnings.',
      },
    },
    create(context) {
      const PASSIVE_HANDLERS = new Set(['onWheel', 'onTouchStart', 'onTouchMove']);
      const sourceCode = context.sourceCode || context.getSourceCode();
      return {
        JSXAttribute(node) {
          if (node.name.type !== 'JSXIdentifier' || !PASSIVE_HANDLERS.has(node.name.name)) return;
          const text = node.value ? sourceCode.getText(node.value) : '';
          if (text.includes('preventDefault(')) {
            context.report({
              node,
              messageId: 'passivePreventDefault',
              data: { handler: node.name.name },
            });
          }
        },
      };
    },
  },

  /** 12. Disallow React.use* namespace hooks (prefer named imports) */
  'no-react-namespace-hooks': {
    meta: {
      type: 'problem',
      docs: { description: 'Import React hooks directly rather than calling React.use*.' },
      schema: [],
      messages: {
        namespaceHook: 'Import `{{hook}}` directly from "react" instead of `React.{{hook}}`.',
      },
    },
    create(context) {
      return {
        MemberExpression(node) {
          if (
            node.object.type === 'Identifier' &&
            node.object.name === 'React' &&
            node.property.type === 'Identifier' &&
            REACT_HOOKS.has(node.property.name)
          ) {
            context.report({
              node,
              messageId: 'namespaceHook',
              data: { hook: node.property.name },
            });
          }
        },
      };
    },
  },

  /** 13. Disallow inline multi-ref callback mergers; use useMergedRefs */
  'no-unstable-merged-refs': {
    meta: {
      type: 'problem',
      docs: { description: 'Use useMergedRefs() instead of unstable inline ref-merging callbacks.' },
      schema: [],
      messages: {
        unstableRef: 'Use `useMergedRefs(...)` instead of an inline callback ref that assigns multiple refs.',
      },
    },
    create(context) {
      const sourceCode = context.sourceCode || context.getSourceCode();
      return {
        JSXAttribute(node) {
          if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'ref') return;
          if (
            node.value &&
            node.value.type === 'JSXExpressionContainer' &&
            (node.value.expression.type === 'ArrowFunctionExpression' ||
              node.value.expression.type === 'FunctionExpression')
          ) {
            const text = sourceCode.getText(node.value.expression);
            const currentAssignments = (text.match(/\.current\s*=/g) || []).length;
            if (currentAssignments >= 2) {
              context.report({ node, messageId: 'unstableRef' });
            }
          }
        },
      };
    },
  },

  /** 14. Prevent internal barrel imports inside packages/core/src */
  'no-internal-barrel-import': {
    meta: {
      type: 'problem',
      docs: { description: 'Prevent intra-package imports from the root barrel to avoid circular deps.' },
      schema: [],
      messages: {
        barrelImport: 'Do not import from the package root barrel ("{{source}}") inside core source files; import the sibling module directly.',
      },
    },
    create(context) {
      const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
      if (!filename.includes('packages/core/src/') || filename.endsWith('.test.tsx') || filename.endsWith('.test.ts')) {
        return {};
      }
      return {
        ImportDeclaration(node) {
          const src = node.source.value;
          if (src === '..' || src === '../index' || src === '../index.ts' || src === '@refractor-ui/core') {
            context.report({ node: node.source, messageId: 'barrelImport', data: { source: src } });
          }
        },
      };
    },
  },

  /** 15. Require <thead>/<tbody>/<tfoot> inside <table> (hydration-safe DOM) */
  'require-table-section': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow direct <tr> children inside <table>; wrap in <thead>, <tbody>, or <tfoot>.' },
      schema: [],
      messages: {
        missingSection: 'Direct `<tr>` inside `<table>` is invalid HTML and hydration-unsafe; wrap in `<thead>`, `<tbody>`, or `<tfoot>`.',
      },
    },
    create(context) {
      return {
        JSXElement(node) {
          if (
            node.openingElement.name.type !== 'JSXIdentifier' ||
            node.openingElement.name.name !== 'table'
          ) {
            return;
          }
          for (const child of node.children) {
            if (
              child.type === 'JSXElement' &&
              child.openingElement.name.type === 'JSXIdentifier' &&
              child.openingElement.name.name === 'tr'
            ) {
              context.report({ node: child, messageId: 'missingSection' });
            }
          }
        },
      };
    },
  },

  /** 16. Avoid double-negative boolean prop names in public Props interfaces */
  'boolean-prop-naming': {
    meta: {
      type: 'suggestion',
      docs: { description: 'Avoid negated boolean prop names like noBorder or notDisabled.' },
      schema: [],
      messages: {
        negatedBoolean:
          'Avoid negated boolean prop "{{name}}"; prefer an affirmative boolean name with an explicit default.',
      },
    },
    create(context) {
      return {
        TSPropertySignature(node) {
          if (
            node.key.type === 'Identifier' &&
            node.typeAnnotation &&
            node.typeAnnotation.typeAnnotation.type === 'TSBooleanKeyword' &&
            /^(?:not|no)[A-Z]/.test(node.key.name)
          ) {
            context.report({ node: node.key, messageId: 'negatedBoolean', data: { name: node.key.name } });
          }
        },
      };
    },
  },

  /** 17. Forbid raw dangerouslySetInnerHTML (ADR-0005 security invariant) */
  'no-dangerous-html': {
    meta: {
      type: 'problem',
      docs: { description: 'Disallow dangerouslySetInnerHTML in JSX to prevent XSS vulnerabilities.' },
      schema: [],
      messages: {
        noDangerousHtml:
          'Do not use `dangerouslySetInnerHTML` (ADR-0005). Render structured React elements or use the audited sanitizer.',
      },
    },
    create(context) {
      return {
        JSXAttribute(node) {
          if (node.name.type === 'JSXIdentifier' && node.name.name === 'dangerouslySetInnerHTML') {
            context.report({ node, messageId: 'noDangerousHtml' });
          }
        },
      };
    },
  },
};

const strictRules = {
  '@refractor/no-unknown-type': 'error',
  '@refractor/require-base-props': 'error',
  '@refractor/require-ref-prop': 'error',
  '@refractor/require-baseprops-passthrough': 'error',
  '@refractor/no-classname-clobber': 'error',
  '@refractor/no-raw-color': 'error',
  '@refractor/no-hover-on-disabled': 'error',
  '@refractor/disabled-cursor': 'error',
  '@refractor/focus-outline-keyboard-only': 'error',
  '@refractor/no-unguarded-ime-keydown': 'error',
  '@refractor/no-prevent-default-in-passive-react-handler': 'error',
  '@refractor/no-react-namespace-hooks': 'error',
  '@refractor/no-unstable-merged-refs': 'error',
  '@refractor/no-internal-barrel-import': 'error',
  '@refractor/require-table-section': 'error',
  '@refractor/boolean-prop-naming': 'error',
  '@refractor/no-dangerous-html': 'error',
};

const recommendedRules = {
  '@refractor/no-unknown-type': 'error',
  '@refractor/require-base-props': 'warn',
  '@refractor/require-ref-prop': 'error',
  '@refractor/require-baseprops-passthrough': 'warn',
  '@refractor/no-classname-clobber': 'error',
  '@refractor/no-raw-color': 'warn',
  '@refractor/no-hover-on-disabled': 'error',
  '@refractor/disabled-cursor': 'error',
  '@refractor/focus-outline-keyboard-only': 'error',
  '@refractor/no-unguarded-ime-keydown': 'error',
  '@refractor/no-prevent-default-in-passive-react-handler': 'error',
  '@refractor/no-react-namespace-hooks': 'error',
  '@refractor/no-unstable-merged-refs': 'error',
  '@refractor/no-internal-barrel-import': 'error',
  '@refractor/require-table-section': 'error',
  '@refractor/boolean-prop-naming': 'warn',
  '@refractor/no-dangerous-html': 'error',
};

const plugin = {
  meta: {
    name: '@refractor-ui/eslint-plugin-refractor',
    version: '1.0.0',
  },
  rules,
  configs: {},
};

plugin.configs.strict = {
  plugins: { '@refractor': plugin },
  rules: strictRules,
};

plugin.configs.recommended = {
  plugins: { '@refractor': plugin },
  rules: recommendedRules,
};

export default plugin;
