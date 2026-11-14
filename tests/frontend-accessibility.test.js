const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const frontend = path.join(__dirname, '..', 'frontend');
const css = fs.readFileSync(path.join(frontend, 'src/index.css'), 'utf8');
const html = fs.readFileSync(path.join(frontend, 'dist/index.html'), 'utf8');

function variables(selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^@import.*$/gm, '');
  const block = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((match) => match[1].trim() === selector);
  assert.ok(block, selector);
  return Object.fromEntries([...block[2].matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

for (const dark of [false, true]) for (const high of [false, true]) {
  test(`paleta definida em CSS: contraste de pares principais, escuro=${dark}, alto=${high}`, () => {
    const colors = { ...variables(':root'), ...(dark ? variables('[data-theme="dark"]') : {}),
      ...(high ? variables('[data-contrast="high"]') : {}),
      ...(high && dark ? variables('[data-theme="dark"][data-contrast="high"]') : {}),
      ...(high ? variables(dark ? ':root[data-theme="dark"][data-contrast="high"]' : ':root[data-contrast="high"]') : {}),
    };
    for (const text of ['ink', 'muted', 'subtle']) for (const background of ['paper', 'surface']) {
      assert.ok(contrast(colors[text], colors[background]) >= 4.5, `${text}/${background}`);
    }
    for (const [text, background] of [['forest-deep', 'forest-pale'], ['red', 'red-pale'], ['purple', 'purple-pale'], ['white', 'forest']]) {
      assert.ok(contrast(colors[text], colors[background]) >= 4.5, `${text}/${background}`);
    }
    assert.ok(contrast('#ffffff', '#b22222') >= 4.5);
    assert.ok(contrast('#ffffff', '#696969') >= 3); // posição do switch desligado
  });
}

test('documento gerado usa pt-BR, Alexandr.IA e descrição coerente', () => {
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<title>Alexandr\.IA<\/title>/);
  assert.match(html, /name="description" content="Alexandr\.IA:/);
  assert.doesNotMatch(html, /Figma Make App|Bibliotech/);
});

test('CSS fornece foco, ocultação móvel e texto relativo com movimento reduzido', () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline: 3px/);
  assert.match(css, /\.skip-link:focus\s*\{\s*transform: none/);
  assert.match(css, /\.sidebar:not\(\.sidebar-open\)\s*\{\s*visibility: hidden/);
  assert.doesNotMatch(css, /font-size:\s*\d+(?:\.\d+)?px/);
  assert.match(css, /\[data-font-size="large"\]\s*\{\s*font-size: 112\.5%/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\[data-motion="reduced"\]/);
});
