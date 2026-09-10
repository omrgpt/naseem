import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nodeModule = require('node:module') as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = nodeModule._load;
const noopComponent = () => null;
nodeModule._load = (request, parent, isMain) => {
  if (request === 'expo-status-bar') return { StatusBar: noopComponent };
  if (request === 'react-native') {
    return {
      Animated: {},
      KeyboardAvoidingView: noopComponent,
      Platform: { OS: 'web' },
      Pressable: noopComponent,
      SafeAreaView: noopComponent,
      ScrollView: noopComponent,
      StyleSheet: { create: <T,>(styles: T) => styles },
      Switch: noopComponent,
      Text: noopComponent,
      TextInput: noopComponent,
      View: noopComponent,
    };
  }
  return originalLoad(request, parent, isMain);
};

const onboardingModule = import('./Onboarding');

test('onboarding distance follows the selected unit and presentation locale', async () => {
  const { formatOnboardingDistance, ONBOARDING_COPY } = await onboardingModule;
  assert.equal(
    formatOnboardingDistance(21.8, 'km', 'en-BH', ONBOARDING_COPY.en),
    '21.8 Kilometres',
  );
  assert.equal(
    formatOnboardingDistance(21.8, 'mi', 'ar-BH', ONBOARDING_COPY.ar),
    '١٣٫٥ أميال',
  );
});

test('onboarding progress localizes both visible step numbers in Arabic', async () => {
  const { formatOnboardingProgress, ONBOARDING_COPY } = await onboardingModule;
  assert.equal(
    formatOnboardingProgress(ONBOARDING_COPY.ar.stepOf, 2, 4, 'ar-BH'),
    'الخطوة ٢ من ٤',
  );
});

test('overlong-name validation uses customer-facing Arabic numerals', async () => {
  const { createOnboardingData, ONBOARDING_COPY, validateOnboardingStep } = await onboardingModule;
  const data = createOnboardingData({ displayName: 'أ'.repeat(41), experience: 'regular' });
  assert.equal(
    validateOnboardingStep(1, data, ONBOARDING_COPY.ar, 'ar-BH'),
    'اجعل الاسم أقل من ٤٠ حرفاً.',
  );
});

test('onboarding chevrons point in the logical direction for each locale', async () => {
  const { onboardingChevronRotation } = await onboardingModule;
  assert.equal(onboardingChevronRotation(false, 'back'), '180deg');
  assert.equal(onboardingChevronRotation(true, 'back'), '0deg');
  assert.equal(onboardingChevronRotation(false, 'forward'), '0deg');
  assert.equal(onboardingChevronRotation(true, 'forward'), '180deg');
});
