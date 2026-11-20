import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import refractorPlugin from '../index.js';

const tsParser = tseslint.parser;

function lintCode(code, ruleName, filename = 'packages/core/src/Sample/Sample.tsx') {
  const linter = new Linter({ configType: 'flat' });
  const result = linter.verify(
    code,
    [
      {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
        },
        plugins: { '@refractor': refractorPlugin },
        rules: { [`@refractor/${ruleName}`]: 'error' },
      },
    ],
    filename
  );
  return result;
}

test('no-unknown-type rejects unknown and accepts concrete unions', () => {
  assert.equal(lintCode('export type Value = unknown;', 'no-unknown-type').length, 1);
  assert.equal(lintCode('export type Value = string | number | boolean;', 'no-unknown-type').length, 0);
});

test('require-base-props enforces BaseProps extension on component Props', () => {
  assert.equal(
    lintCode('export interface SampleProps { label: string; }', 'require-base-props').length,
    1
  );
  assert.equal(
    lintCode('export interface SampleProps extends BaseProps<HTMLDivElement> { label: string; }', 'require-base-props').length,
    0
  );
});

test('require-ref-prop forbids forwardRef', () => {
  assert.equal(
    lintCode('const X = React.forwardRef(() => null);', 'require-ref-prop').length,
    1
  );
  assert.equal(
    lintCode('export function Sample({ ref }: { ref?: React.Ref<HTMLDivElement> }) { return <div ref={ref} />; }', 'require-ref-prop').length,
    0
  );
});

test('require-baseprops-passthrough verifies JSX spread passthrough', () => {
  assert.equal(
    lintCode('export function Sample() { return <div />; }', 'require-baseprops-passthrough').length,
    1
  );
  assert.equal(
    lintCode('export function Sample({ ...rest }) { return <div {...rest} />; }', 'require-baseprops-passthrough').length,
    0
  );
});

test('no-classname-clobber catches static className after spread', () => {
  assert.equal(
    lintCode('const el = <div {...props} className="foo" />;', 'no-classname-clobber').length,
    1
  );
  assert.equal(
    lintCode('const el = <div {...mergeProps(props, "foo")} />;', 'no-classname-clobber').length,
    0
  );
});

test('no-raw-color catches hex and rgba literals in component JSX', () => {
  assert.equal(
    lintCode('const el = <svg><rect fill="#ff0000" /></svg>;', 'no-raw-color').length,
    1
  );
  assert.equal(
    lintCode('const el = <svg><rect fill="var(--prism-primary-main)" /></svg>;', 'no-raw-color').length,
    0
  );
});

test('disabled-cursor and no-hover-on-disabled catch misleading disabled affordances', () => {
  assert.equal(
    lintCode('const el = <button disabled={d} className="cursor-pointer" />;', 'disabled-cursor').length,
    1
  );
  assert.equal(
    lintCode('const el = <button disabled={d} className="cursor-pointer disabled:cursor-not-allowed" />;', 'disabled-cursor').length,
    0
  );
  assert.equal(
    lintCode('const el = <button disabled={d} className="hover:-translate-y-0.5" />;', 'no-hover-on-disabled').length,
    1
  );
  assert.equal(
    lintCode('const el = <button disabled={d} className="enabled:hover:-translate-y-0.5" />;', 'no-hover-on-disabled').length,
    0
  );
});

test('focus-outline-keyboard-only forbids bare focus:ring and allows focus-visible:ring', () => {
  assert.equal(
    lintCode('const el = <button className="focus:ring-2" />;', 'focus-outline-keyboard-only').length,
    1
  );
  assert.equal(
    lintCode('const el = <button className="focus-visible:outline-2" />;', 'focus-outline-keyboard-only').length,
    0
  );
});

test('no-unguarded-ime-keydown requires isComposing check on Enter', () => {
  assert.equal(
    lintCode('const el = <input onKeyDown={(e) => { if (e.key === "Enter") save(); }} />;', 'no-unguarded-ime-keydown').length,
    1
  );
  assert.equal(
    lintCode('const el = <input onKeyDown={(e) => { if (!e.nativeEvent.isComposing && e.key === "Enter") save(); }} />;', 'no-unguarded-ime-keydown').length,
    0
  );
});

test('no-prevent-default-in-passive-react-handler forbids preventDefault in onWheel/onTouchStart', () => {
  assert.equal(
    lintCode('const el = <div onWheel={(e) => e.preventDefault()} />;', 'no-prevent-default-in-passive-react-handler').length,
    1
  );
  assert.equal(
    lintCode('const el = <div onClick={(e) => e.preventDefault()} />;', 'no-prevent-default-in-passive-react-handler').length,
    0
  );
});

test('no-react-namespace-hooks forbids React.useState', () => {
  assert.equal(
    lintCode('const [x] = React.useState(0);', 'no-react-namespace-hooks').length,
    1
  );
  assert.equal(
    lintCode('const [x] = useState(0);', 'no-react-namespace-hooks').length,
    0
  );
});

test('no-unstable-merged-refs forbids inline multi-ref assignments', () => {
  assert.equal(
    lintCode('const el = <div ref={(n) => { a.current = n; b.current = n; }} />;', 'no-unstable-merged-refs').length,
    1
  );
  assert.equal(
    lintCode('const el = <div ref={mergedRef} />;', 'no-unstable-merged-refs').length,
    0
  );
});

test('no-internal-barrel-import blocks parent index imports inside core', () => {
  assert.equal(
    lintCode('import { PrimaryButton } from "..";', 'no-internal-barrel-import').length,
    1
  );
  assert.equal(
    lintCode('import { PrimaryButton } from "../PrimaryButton/PrimaryButton";', 'no-internal-barrel-import').length,
    0
  );
});

test('require-table-section requires thead/tbody around tr', () => {
  assert.equal(
    lintCode('const el = <table><tr><td /></tr></table>;', 'require-table-section').length,
    1
  );
  assert.equal(
    lintCode('const el = <table><tbody><tr><td /></tr></tbody></table>;', 'require-table-section').length,
    0
  );
});

test('boolean-prop-naming rejects negative boolean prop names', () => {
  assert.equal(
    lintCode('interface Foo { notDisabled?: boolean; }', 'boolean-prop-naming').length,
    1
  );
  assert.equal(
    lintCode('interface Foo { disabled?: boolean; }', 'boolean-prop-naming').length,
    0
  );
});

test('no-dangerous-html forbids dangerouslySetInnerHTML', () => {
  assert.equal(
    lintCode('const el = <div dangerouslySetInnerHTML={{ __html: x }} />;', 'no-dangerous-html').length,
    1
  );
  assert.equal(
    lintCode('const el = <div>{safeText}</div>;', 'no-dangerous-html').length,
    0
  );
});
