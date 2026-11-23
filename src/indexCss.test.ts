import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

describe('index.css', () => {
  it('has no comment that swallows rules', () => {
    // A comment holding a brace means rules were folded into it (an unclosed or mangled
    // comment), and every style up to the next "*/" silently stops applying.
    const swallowing = (css.match(/\/\*[\s\S]*?\*\//g) ?? []).filter((c) => /[{}]/.test(c));
    expect(swallowing).toEqual([]);
  });
});
