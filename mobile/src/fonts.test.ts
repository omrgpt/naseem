import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nodeModule = require('node:module') as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = nodeModule._load;
nodeModule._load = (request, parent, isMain) => {
  if (request === 'react-native') return { Platform: { OS: 'web' } };
  return originalLoad(request, parent, isMain);
};

const fontsModule = import('./fonts');

test('font family stacks keep native registration names and web fallbacks', async () => {
  const {
    FONT_ARABIC_REGULAR,
    FONT_REGULAR,
    fontFamilyForPlatform,
  } = await fontsModule;

  assert.equal(typeof fontFamilyForPlatform, 'function');
  assert.equal(
    fontFamilyForPlatform('Manrope_400Regular', 'system-ui, sans-serif', 'native'),
    'Manrope_400Regular',
  );
  assert.equal(
    fontFamilyForPlatform('Manrope_400Regular', 'system-ui, sans-serif', 'web'),
    '"Manrope_400Regular", system-ui, sans-serif',
  );
  assert.match(FONT_REGULAR, /system-ui/u);
  assert.match(FONT_REGULAR, /sans-serif$/u);
  assert.match(FONT_ARABIC_REGULAR, /Noto Sans Arabic/u);
  assert.match(FONT_ARABIC_REGULAR, /sans-serif$/u);
});
