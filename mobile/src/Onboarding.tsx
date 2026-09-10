import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { localeForLanguage, type Language } from './i18n';
import { departureInstant, formatBahrainTime, formatNumber } from './routeTime';
import { NBH_PREVIEW_DISTANCE_KM } from './domain';
import { NBH_CUSTOMER_NAMES } from './seed';
import { DARK, type Palette } from './designTokens';
import {
  FONT_ARABIC_BOLD,
  FONT_ARABIC_MEDIUM,
  FONT_ARABIC_REGULAR,
  FONT_BOLD,
  FONT_EXTRABOLD,
  FONT_MEDIUM,
  FONT_REGULAR,
  FONT_SEMIBOLD,
} from './fonts';

export type ExperienceLevel = 'new' | 'regular' | 'endurance';
export type RidingGoal = 'plan' | 'train' | 'discover' | 'commute';
export type RideWindow = 'morning' | 'afternoon' | 'flexible';
export type WindPreference = 'balanced' | 'sheltered' | 'tailwind';
export type DistanceUnit = 'km' | 'mi';

export type OnboardingData = {
  displayName: string;
  experience: ExperienceLevel | null;
  goals: RidingGoal[];
  preferredWindow: RideWindow | null;
  windPreference: WindPreference;
  distanceUnit: DistanceUnit;
  askLocationWhenStarting: boolean;
  privacyAcknowledged: boolean;
};

export type OnboardingStepKey = 'welcome' | 'profile' | 'goals' | 'permissions';

export type OnboardingCopy = {
  brandName: string;
  privatePilot: string;
  stepOf: string;
  skip: string;
  back: string;
  next: string;
  begin: string;
  finish: string;
  welcomeTitle: string;
  welcomeBody: string;
  welcomeNote: string;
  signalLabel: string;
  signalTitle: string;
  signalTime: string;
  signalDistance: string;
  distanceLabel: string;
  signalEvidence: string;
  profileTitle: string;
  profileBody: string;
  nameLabel: string;
  namePlaceholder: string;
  nameHelp: string;
  nameRequired: string;
  nameTooLong: string;
  experienceLabel: string;
  experienceRequired: string;
  experience: Record<ExperienceLevel, string>;
  experienceDescription: Record<ExperienceLevel, string>;
  locationLabel: string;
  locationDescription: string;
  goalsTitle: string;
  goalsBody: string;
  goalsLabel: string;
  goalRequired: string;
  goals: Record<RidingGoal, string>;
  goalDescription: Record<RidingGoal, string>;
  windowLabel: string;
  windowRequired: string;
  windows: Record<RideWindow, string>;
  windLabel: string;
  windPreferences: Record<WindPreference, string>;
  unitsLabel: string;
  km: string;
  mi: string;
  permissionsTitle: string;
  permissionsBody: string;
  locationPermissionTitle: string;
  locationPermissionBody: string;
  askLocationLabel: string;
  askLocationDescription: string;
  privacyTitle: string;
  privacyBody: string;
  privacySource: string;
  privacySourceDescription: string;
  privacyRoute: string;
  privacyRouteDescription: string;
  privacyAcknowledgement: string;
  privacyRequired: string;
  openPrivacy: string;
  submitError: string;
  readyTitle: string;
  readyBody: string;
  skippedTitle: string;
  skippedBody: string;
  exploreApp: string;
  required: string;
};

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  displayName: '',
  experience: null,
  goals: [],
  preferredWindow: null,
  windPreference: 'balanced',
  distanceUnit: 'km',
  askLocationWhenStarting: true,
  privacyAcknowledged: false,
};

export const ONBOARDING_COPY: Record<Language, OnboardingCopy> = {
  en: {
    brandName: 'NASEEM',
    privatePilot: 'YOUR FIRST ROUTE PLAN',
    stepOf: 'Step {step} of {total}',
    skip: 'Skip for now',
    back: 'Back',
    next: 'Continue',
    begin: 'Build my riding plan',
    finish: 'Open my riding plan',
    welcomeTitle: 'Know the ride before you roll.',
    welcomeBody: 'Naseem brings route shape, wind, and what we know about the road into one clear plan for your next ride.',
    welcomeNote: 'A few quick choices are enough. You can change them later in Settings.',
    signalLabel: 'NEXT RIDE SNAPSHOT',
    signalTitle: 'A calmer way to choose your window.',
    signalTime: '',
    signalDistance: '',
    distanceLabel: 'distance',
    signalEvidence: 'route and wind context',
    profileTitle: 'Make the plan yours.',
    profileBody: 'A few details help us shape the first recommendation without making you create an account.',
    nameLabel: 'Rider name',
    namePlaceholder: 'e.g. Dana',
    nameHelp: 'Use a name or nickname. You can edit it later.',
    nameRequired: 'Add a rider name so we know what to call you.',
    nameTooLong: 'Keep the rider name under {max} characters.',
    experienceLabel: 'How do you ride?',
    experienceRequired: 'Choose the closest match for your current riding.',
    experience: { new: 'Finding my rhythm', regular: 'Regular rider', endurance: 'Endurance focused' },
    experienceDescription: { new: 'Short, comfortable rides first.', regular: 'I ride most weeks.', endurance: 'Distance and pacing matter.' },
    locationLabel: 'Starting area',
    locationDescription: 'Bahrain route coverage · location stays off until you start a live ride.',
    goalsTitle: 'What should the first plan help with?',
    goalsBody: 'Choose one or more. This tunes the way routes and timing are presented—not a fitness score.',
    goalsLabel: 'Your riding goals',
    goalRequired: 'Choose at least one riding goal.',
    goals: { plan: 'Plan a ride', train: 'Build endurance', discover: 'Find new roads', commute: 'Ride to get there' },
    goalDescription: { plan: 'Make a better departure decision.', train: 'Keep distance and time visible.', discover: 'Compare route evidence.', commute: 'Make the everyday route clearer.' },
    windowLabel: 'When do you usually ride?',
    windowRequired: 'Choose a preferred riding window.',
    windows: { morning: 'Early morning', afternoon: 'Late afternoon', flexible: 'It depends' },
    windLabel: 'Wind preference',
    windPreferences: { balanced: 'Show the full picture', sheltered: 'Prioritise calmer sections', tailwind: 'Look for helpful wind' },
    unitsLabel: 'Distance units',
    km: 'Kilometres',
    mi: 'Miles',
    permissionsTitle: 'Keep control of your location.',
    permissionsBody: 'Naseem does not need your location to plan a route. It asks only when you explicitly start a live ride.',
    locationPermissionTitle: 'Location is a live-ride tool',
    locationPermissionBody: 'When you tap Start live ride, the app can request foreground location to show progress and the next segment. End the ride and tracking stops.',
    askLocationLabel: 'Ask when I start a live ride',
    askLocationDescription: 'Recommended. No permission prompt appears during onboarding.',
    privacyTitle: 'What stays yours',
    privacyBody: 'Your choices are saved on this device first. Source connections are read-only and can be disconnected or deleted.',
    privacySource: 'Route and weather evidence',
    privacySourceDescription: 'Shown with its source and confidence.',
    privacyRoute: 'Live tracking boundary',
    privacyRouteDescription: 'Only active while a live ride is running.',
    privacyAcknowledgement: 'I understand when location can be used.',
    privacyRequired: 'Confirm the location boundary before finishing.',
    openPrivacy: 'Review privacy details',
    submitError: 'We could not save this plan. Check your connection and try again.',
    readyTitle: 'Your first plan is ready.',
    readyBody: 'You can change these choices any time. Start with Today to see the next useful riding window.',
    skippedTitle: 'You can explore without setup.',
    skippedBody: 'Set up your riding plan later in Settings whenever you are ready.',
    exploreApp: 'Enter Naseem',
    required: 'Required',
  },
  ar: {
    brandName: 'نسيم',
    privatePilot: 'خطة مسارك الأولى',
    stepOf: 'الخطوة {step} من {total}',
    skip: 'تخطي الآن',
    back: 'رجوع',
    next: 'متابعة',
    begin: 'أنشئ خطة ركوبك',
    finish: 'افتح خطة ركوبك',
    welcomeTitle: 'اعرف الرحلة قبل أن تنطلق.',
    welcomeBody: 'يجمع نسيم شكل المسار والرياح وما نعرفه عن الطريق في خطة واضحة لرحلتك التالية.',
    welcomeNote: 'تكفي بضع اختيارات سريعة. يمكنك تغييرها لاحقاً من الإعدادات.',
    signalLabel: 'لمحة عن الرحلة القادمة',
    signalTitle: 'طريقة أهدأ لاختيار وقت الرحلة.',
    signalTime: '',
    signalDistance: '',
    distanceLabel: 'المسافة',
    signalEvidence: 'سياق المسار والرياح',
    profileTitle: 'اجعل الخطة لك.',
    profileBody: 'تساعدنا بعض التفاصيل على تشكيل التوصية الأولى دون الحاجة إلى إنشاء حساب.',
    nameLabel: 'اسم الراكب',
    namePlaceholder: 'مثال: دانا',
    nameHelp: 'استخدم اسماً أو لقباً. يمكنك تعديله لاحقاً.',
    nameRequired: 'أضف اسم الراكب لنعرف كيف نخاطبك.',
    nameTooLong: 'اجعل الاسم أقل من {max} حرفاً.',
    experienceLabel: 'كيف تركب؟',
    experienceRequired: 'اختر الوصف الأقرب لركوبك الحالي.',
    experience: { new: 'أبحث عن إيقاعي', regular: 'أركب بانتظام', endurance: 'أركز على التحمل' },
    experienceDescription: { new: 'رحلات قصيرة ومريحة أولاً.', regular: 'أركب معظم الأسابيع.', endurance: 'المسافة والإيقاع مهمان.' },
    locationLabel: 'منطقة البداية',
    locationDescription: 'نطاق مسارات البحرين · يبقى الموقع متوقفاً حتى تبدأ رحلة مباشرة.',
    goalsTitle: 'بماذا تساعدك الخطة الأولى؟',
    goalsBody: 'اختر واحداً أو أكثر. يضبط ذلك طريقة عرض المسارات والتوقيت، وليس درجة لياقتك.',
    goalsLabel: 'أهداف ركوبك',
    goalRequired: 'اختر هدفاً واحداً على الأقل.',
    goals: { plan: 'تخطيط رحلة', train: 'بناء التحمل', discover: 'اكتشاف طرق جديدة', commute: 'الركوب للوصول' },
    goalDescription: { plan: 'اتخذ قرار مغادرة أفضل.', train: 'أبقِ المسافة والوقت واضحين.', discover: 'قارن أدلة المسارات.', commute: 'اجعل مسار اليوم أوضح.' },
    windowLabel: 'متى تركب عادة؟',
    windowRequired: 'اختر وقت الركوب المفضل.',
    windows: { morning: 'الصباح الباكر', afternoon: 'آخر النهار', flexible: 'حسب الظروف' },
    windLabel: 'تفضيل الرياح',
    windPreferences: { balanced: 'أظهر الصورة كاملة', sheltered: 'قدّم المقاطع الأهدأ', tailwind: 'ابحث عن رياح مساعدة' },
    unitsLabel: 'وحدات المسافة',
    km: 'كيلومترات',
    mi: 'أميال',
    permissionsTitle: 'تحكم في موقعك.',
    permissionsBody: 'لا يحتاج نسيم إلى موقعك لتخطيط المسار. سيطلبه فقط عندما تبدأ رحلة مباشرة بوضوح.',
    locationPermissionTitle: 'الموقع أداة للرحلة المباشرة',
    locationPermissionBody: 'عند الضغط على بدء رحلة مباشرة، يمكن للتطبيق طلب موقعك أثناء الاستخدام لعرض التقدم والمقطع التالي. عند إنهاء الرحلة يتوقف التتبع.',
    askLocationLabel: 'اسألني عند بدء رحلة مباشرة',
    askLocationDescription: 'موصى به. لن يظهر طلب الإذن أثناء الإعداد.',
    privacyTitle: 'ما يبقى لك',
    privacyBody: 'تُحفظ اختياراتك على هذا الجهاز أولاً. الاتصالات الخارجية للقراءة فقط ويمكن فصلها أو حذفها.',
    privacySource: 'أدلة المسار والطقس',
    privacySourceDescription: 'تظهر مع المصدر ودرجة الثقة.',
    privacyRoute: 'حدود التتبع المباشر',
    privacyRouteDescription: 'يعمل فقط أثناء الرحلة المباشرة.',
    privacyAcknowledgement: 'أفهم متى يمكن استخدام الموقع.',
    privacyRequired: 'أكد حدود الموقع قبل الإنهاء.',
    openPrivacy: 'راجع تفاصيل الخصوصية',
    submitError: 'تعذر حفظ الخطة. تحقق من الاتصال وحاول مرة أخرى.',
    readyTitle: 'خطتك الأولى جاهزة.',
    readyBody: 'يمكنك تغيير هذه الاختيارات في أي وقت. ابدأ من اليوم لرؤية أقرب فترة ركوب مفيدة.',
    skippedTitle: 'يمكنك الاستكشاف دون إعداد.',
    skippedBody: 'أنشئ خطة ركوبك لاحقاً من الإعدادات عندما تكون مستعداً.',
    exploreApp: 'ادخل إلى نسيم',
    required: 'مطلوب',
  },
};

const MAX_RIDER_NAME_LENGTH = 40;
const MILES_PER_KILOMETRE = 0.621371192237334;

export function formatOnboardingDistance(
  distanceKm: number,
  distanceUnit: DistanceUnit,
  locale: string,
  labels: Pick<OnboardingCopy, 'km' | 'mi'>,
): string {
  const value = distanceUnit === 'mi' ? distanceKm * MILES_PER_KILOMETRE : distanceKm;
  const unitLabel = distanceUnit === 'mi' ? labels.mi : labels.km;
  return `${formatNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unitLabel}`;
}

export function formatOnboardingProgress(template: string, step: number, total: number, locale: string): string {
  return template
    .replace('{step}', formatNumber(step, locale))
    .replace('{total}', formatNumber(total, locale));
}

export type OnboardingChevronDirection = 'back' | 'forward';

export function onboardingChevronRotation(rtl: boolean, direction: OnboardingChevronDirection): '0deg' | '180deg' {
  const pointsRight = direction === 'back' ? rtl : !rtl;
  return pointsRight ? '0deg' : '180deg';
}

export type OnboardingProps = {
  palette?: Palette;
  language?: Language;
  rtl?: boolean;
  copy?: Partial<OnboardingCopy>;
  initialData?: Partial<OnboardingData>;
  initialStep?: number;
  onComplete?: (data: OnboardingData) => void | Promise<void>;
  onSkip?: (data: OnboardingData) => void | Promise<void>;
  onOpenPrivacy?: () => void;
  testID?: string;
};

export function createOnboardingData(initialData?: Partial<OnboardingData>): OnboardingData {
  return {
    ...DEFAULT_ONBOARDING_DATA,
    ...initialData,
    displayName: initialData?.displayName ?? DEFAULT_ONBOARDING_DATA.displayName,
    experience: initialData?.experience ?? DEFAULT_ONBOARDING_DATA.experience,
    goals: initialData?.goals ? [...initialData.goals] : [...DEFAULT_ONBOARDING_DATA.goals],
    preferredWindow: initialData?.preferredWindow ?? DEFAULT_ONBOARDING_DATA.preferredWindow,
    windPreference: initialData?.windPreference ?? DEFAULT_ONBOARDING_DATA.windPreference,
    distanceUnit: initialData?.distanceUnit ?? DEFAULT_ONBOARDING_DATA.distanceUnit,
    askLocationWhenStarting: initialData?.askLocationWhenStarting ?? DEFAULT_ONBOARDING_DATA.askLocationWhenStarting,
    privacyAcknowledged: initialData?.privacyAcknowledged ?? DEFAULT_ONBOARDING_DATA.privacyAcknowledged,
  };
}

export function validateOnboardingStep(
  step: number,
  data: OnboardingData,
  text: OnboardingCopy = ONBOARDING_COPY.en,
  locale: string = localeForLanguage('en'),
): string | null {
  if (step === 1) {
    const name = data.displayName.trim();
    if (!name) return text.nameRequired;
    if (name.length > MAX_RIDER_NAME_LENGTH) return text.nameTooLong.replace('{max}', formatNumber(MAX_RIDER_NAME_LENGTH, locale));
    if (!data.experience) return text.experienceRequired;
  }
  if (step === 2) {
    if (!data.goals.length) return text.goalRequired;
    if (!data.preferredWindow) return text.windowRequired;
  }
  if (step === 3 && !data.privacyAcknowledged) return text.privacyRequired;
  return null;
}

const STEP_KEYS: OnboardingStepKey[] = ['welcome', 'profile', 'goals', 'permissions'];
const TOTAL_STEPS = STEP_KEYS.length;

export function Onboarding({
  palette = DARK,
  language = 'en',
  rtl,
  copy,
  initialData,
  initialStep = 0,
  onComplete,
  onSkip,
  onOpenPrivacy,
  testID = 'onboarding',
}: OnboardingProps) {
  const text = useMemo(() => {
    const base = ONBOARDING_COPY[language];
    return {
      ...base,
      ...copy,
      experience: { ...base.experience, ...copy?.experience },
      experienceDescription: { ...base.experienceDescription, ...copy?.experienceDescription },
      goals: { ...base.goals, ...copy?.goals },
      goalDescription: { ...base.goalDescription, ...copy?.goalDescription },
      windows: { ...base.windows, ...copy?.windows },
      windPreferences: { ...base.windPreferences, ...copy?.windPreferences },
    };
  }, [copy, language]);
  const isRtl = rtl ?? language === 'ar';
  const [step, setStep] = useState(() => Math.max(0, Math.min(TOTAL_STEPS - 1, Math.floor(initialStep))));
  const [data, setData] = useState<OnboardingData>(() => createOnboardingData(initialData));
  const [errors, setErrors] = useState<Partial<Record<OnboardingStepKey, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completion, setCompletion] = useState<'complete' | 'skipped' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const styles = useMemo(() => createStyles(palette, isRtl), [isRtl, palette]);
  const isDark = palette.bg.toLowerCase() === DARK.bg.toLowerCase();
  const stepKey = STEP_KEYS[step];
  const locale = localeForLanguage(language);
  const hour12 = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ?? language === 'en';
  const signalTime = copy?.signalTime || formatBahrainTime(departureInstant('tomorrow'), locale, { hour12 });
  const signalDistance = copy?.signalDistance || `${language === 'ar' ? NBH_CUSTOMER_NAMES.arabic : NBH_CUSTOMER_NAMES.short} · ${formatOnboardingDistance(NBH_PREVIEW_DISTANCE_KM, data.distanceUnit, locale, text)}`;

  useEffect(() => {
    setErrors((current) => ({ ...current, [stepKey]: undefined }));
    setSubmitError('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, stepKey]);

  const updateData = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [stepKey]: undefined }));
  };

  const complete = async (skipped = false) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (skipped) await onSkip?.(data);
      else await onComplete?.(data);
      setCompletion(skipped ? 'skipped' : 'complete');
    } catch {
      setSubmitError(text.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => { void complete(true); };

  const handleNext = () => {
    const error = validateOnboardingStep(step, data, text, locale);
    if (error) {
      setErrors((current) => ({ ...current, [stepKey]: error }));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (step === TOTAL_STEPS - 1) {
      void complete();
      return;
    }
    setStep((current) => Math.min(TOTAL_STEPS - 1, current + 1));
  };

  const handleBack = () => {
    if (submitting) return;
    setStep((current) => Math.max(0, current - 1));
  };

  if (completion) {
    const completionTitle = completion === 'skipped' ? text.skippedTitle : text.readyTitle;
    const completionBody = completion === 'skipped' ? text.skippedBody : text.readyBody;
    return (
      <SafeAreaView testID={`${testID}-complete`} style={styles.root}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.completeScreen}>
          <View style={[styles.completeMark, { backgroundColor: palette.accentSoft, borderColor: palette.accent }]}>
            <Icon name="route" color={palette.accent} size={34} />
          </View>
          <Text style={[styles.completeTitle, isRtl && styles.textRight]}>{completionTitle}</Text>
          <Text style={[styles.completeBody, { color: palette.muted }, isRtl && styles.textRight]}>{completionBody}</Text>
          <OnboardingButton label={text.exploreApp} icon="home" onPress={() => setCompletion(null)} palette={palette} rtl={isRtl} testID={`${testID}-enter`} />
        </View>
      </SafeAreaView>
    );
  }

  const error = errors[stepKey];
  const actionLabel = step === 0 ? text.begin : step === TOTAL_STEPS - 1 ? text.finish : text.next;
  const actionIcon: IconName = step === TOTAL_STEPS - 1 ? 'route' : step === 0 ? 'play' : 'chevron';

  return (
    <SafeAreaView testID={testID} style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <View style={[styles.topBarSide, isRtl && styles.rowReverse]}>
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.back}
                accessibilityHint={isRtl ? 'العودة إلى الخطوة السابقة' : 'Return to the previous step'}
                disabled={submitting}
                onPress={handleBack}
                style={({ pressed }) => [styles.backButton, { opacity: submitting ? 0.45 : pressed ? 0.68 : 1 }, isRtl && styles.rowReverse]}
                testID={`${testID}-back`}
              >
                <View style={styles.backIcon}><Icon name="chevron" color={palette.ink} size={15} /></View>
                <Text style={styles.backText}>{text.back}</Text>
              </Pressable>
            ) : <View style={styles.topBarSpacer} />}
          </View>
          <View style={styles.brandLockup}>
            <View style={[styles.brandDot, { backgroundColor: palette.accent }]} />
            <Text style={styles.brandText}>{text.brandName}</Text>
          </View>
          <View style={[styles.topBarSide, styles.topBarSideRight, isRtl && styles.rowReverse]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.skip}
              accessibilityHint={isRtl ? 'تخطي الإعداد والانتقال إلى التطبيق' : 'Skip setup and enter the app'}
              disabled={submitting}
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipButton, { opacity: submitting ? 0.45 : pressed ? 0.68 : 1 }]}
              testID={`${testID}-skip`}
            >
              <Text style={styles.skipText}>{text.skip}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.progressWrap} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step + 1 }}>
          <View style={[styles.progressHeader, isRtl && styles.rowReverse]}>
            <Text style={styles.progressText}>{formatOnboardingProgress(text.stepOf, step + 1, TOTAL_STEPS, locale)}</Text>
            <Text style={styles.progressText}>{text.privatePilot}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: palette.line }, isRtl && styles.rowReverse]}>
            <View style={[styles.progressFill, { backgroundColor: palette.accent, width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentFrame}>
            {step === 0 && <WelcomeStep text={text} palette={palette} rtl={isRtl} signalTime={signalTime} signalDistance={signalDistance} />}
            {step === 1 && <ProfileStep text={text} palette={palette} rtl={isRtl} data={data} updateData={updateData} error={error} />}
            {step === 2 && <GoalsStep text={text} palette={palette} rtl={isRtl} data={data} updateData={updateData} error={error} />}
            {step === 3 && <PermissionsStep text={text} palette={palette} rtl={isRtl} data={data} updateData={updateData} onOpenPrivacy={onOpenPrivacy} error={error} />}
            {submitError ? <InlineError message={submitError} palette={palette} rtl={isRtl} /> : null}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <OnboardingButton
            label={submitting ? text.next : actionLabel}
            icon={actionIcon}
            onPress={handleNext}
            palette={palette}
            rtl={isRtl}
            disabled={submitting}
            loading={submitting}
            testID={`${testID}-next`}
          />
          {step === 0 ? <Text style={[styles.bottomHint, { color: palette.muted }, isRtl && styles.textRight, isRtl && styles.arabicRegular]}>{text.welcomeNote}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomeStep({ text, palette, rtl, signalTime, signalDistance }: { text: OnboardingCopy; palette: Palette; rtl: boolean; signalTime: string; signalDistance: string }) {
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.heroTitle, { color: palette.ink }, rtl && styles.textRight]}>{text.welcomeTitle}</Text>
      <Text style={[styles.heroBody, { color: palette.muted }, rtl && styles.textRight]}>{text.welcomeBody}</Text>
      <WelcomeSignal text={text} palette={palette} rtl={rtl} signalTime={signalTime} signalDistance={signalDistance} />
      <View style={[styles.trustRow, { borderColor: palette.line }, rtl && styles.rowReverse]}>
        <Icon name="wind" color={palette.accent} size={18} />
        <Text style={[styles.trustText, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.signalEvidence}</Text>
      </View>
    </View>
  );
}

function WelcomeSignal({ text, palette, rtl, signalTime, signalDistance }: { text: OnboardingCopy; palette: Palette; rtl: boolean; signalTime: string; signalDistance: string }) {
  return (
    <View style={[styles.signalPanel, { backgroundColor: palette.ink, borderColor: palette.line }]}>
      <View style={[styles.signalTop, rtl && styles.rowReverse]}>
        <View style={[styles.signalStatus, rtl && styles.rowReverse]}>
          <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.signalLabel, { color: palette.accent }, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{text.signalLabel}</Text>
        </View>
        <Icon name="route" color={palette.accent} size={22} />
      </View>
      <Text style={[styles.signalTitle, { color: palette.bg }, rtl && { fontFamily: FONT_ARABIC_BOLD }, rtl && styles.textRight]}>{text.signalTitle}</Text>
      <View style={styles.signalLine}>
        <View style={[styles.signalSegment, { backgroundColor: palette.accent, flex: 1.2 }]} />
        <View style={[styles.signalSegment, { backgroundColor: palette.caution, flex: 0.6 }]} />
        <View style={[styles.signalSegment, { backgroundColor: palette.accent, flex: 1.5 }]} />
        <View style={[styles.signalSegment, { backgroundColor: palette.panelAlt, flex: 0.7 }]} />
      </View>
      <View style={[styles.signalMetrics, rtl && styles.rowReverse]}>
        <View style={styles.signalMetric}>
          <Text style={[styles.signalMetricValue, { color: palette.bg }]}>{signalTime}</Text>
          <Text style={[styles.signalMetricLabel, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.windows.afternoon}</Text>
        </View>
        <View style={[styles.signalDivider, { backgroundColor: palette.line }]} />
        <View style={styles.signalMetric}>
          <Text style={[styles.signalMetricValue, { color: palette.bg }]}>{signalDistance}</Text>
          <Text style={[styles.signalMetricLabel, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.distanceLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function ProfileStep({
  text,
  palette,
  rtl,
  data,
  updateData,
  error,
}: {
  text: OnboardingCopy;
  palette: Palette;
  rtl: boolean;
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  error?: string;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.screenTitle, { color: palette.ink }, rtl && styles.textRight]}>{text.profileTitle}</Text>
      <Text style={[styles.screenBody, { color: palette.muted }, rtl && styles.textRight]}>{text.profileBody}</Text>
      <FloatingLabelInput
        label={text.nameLabel}
        placeholder={text.namePlaceholder}
        value={data.displayName}
        onChangeText={(value) => updateData('displayName', value)}
        helperText={text.nameHelp}
        error={error && (!data.displayName.trim() || data.displayName.length > MAX_RIDER_NAME_LENGTH) ? error : undefined}
        palette={palette}
        rtl={rtl}
        autoCapitalize="words"
        textContentType="name"
        testID="onboarding-name"
      />
      <SectionLabel label={text.experienceLabel} required={text.required} palette={palette} rtl={rtl} />
      <View style={styles.choiceStack}>
        {(['new', 'regular', 'endurance'] as ExperienceLevel[]).map((level) => (
          <ChoiceTile
            key={level}
            icon={level === 'new' ? 'person' : level === 'regular' ? 'route' : 'pulse'}
            label={text.experience[level]}
            description={text.experienceDescription[level]}
            selected={data.experience === level}
            onPress={() => updateData('experience', level)}
            palette={palette}
            rtl={rtl}
            role="radio"
            testID={`onboarding-experience-${level}`}
          />
        ))}
      </View>
      {error && !data.experience ? <FieldError message={error} palette={palette} rtl={rtl} /> : null}
      <View style={[styles.locationReadout, { backgroundColor: palette.panelAlt, borderColor: palette.line }, rtl && styles.rowReverse]}>
        <View style={[styles.locationIcon, { backgroundColor: palette.accentSoft }]}><Icon name="map" color={palette.accent} size={19} /></View>
        <View style={styles.flex}>
          <Text style={[styles.locationTitle, { color: palette.ink }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{text.locationLabel} · {rtl ? 'البحرين' : 'Bahrain'}</Text>
          <Text style={[styles.locationDescription, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.locationDescription}</Text>
        </View>
      </View>
    </View>
  );
}

function GoalsStep({
  text,
  palette,
  rtl,
  data,
  updateData,
  error,
}: {
  text: OnboardingCopy;
  palette: Palette;
  rtl: boolean;
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  error?: string;
}) {
  const toggleGoal = (goal: RidingGoal) => {
    const goals = data.goals.includes(goal) ? data.goals.filter((current) => current !== goal) : [...data.goals, goal];
    updateData('goals', goals);
  };
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.screenTitle, { color: palette.ink }, rtl && styles.textRight]}>{text.goalsTitle}</Text>
      <Text style={[styles.screenBody, { color: palette.muted }, rtl && styles.textRight]}>{text.goalsBody}</Text>
      <SectionLabel label={text.goalsLabel} required={text.required} palette={palette} rtl={rtl} />
      <View style={styles.goalGrid}>
        {(['plan', 'train', 'discover', 'commute'] as RidingGoal[]).map((goal) => (
          <ChoiceTile
            key={goal}
            icon={goal === 'plan' ? 'route' : goal === 'train' ? 'pulse' : goal === 'discover' ? 'map' : 'play'}
            label={text.goals[goal]}
            description={text.goalDescription[goal]}
            selected={data.goals.includes(goal)}
            onPress={() => toggleGoal(goal)}
            palette={palette}
            rtl={rtl}
            role="checkbox"
            testID={`onboarding-goal-${goal}`}
          />
        ))}
      </View>
      {error && !data.goals.length ? <FieldError message={error} palette={palette} rtl={rtl} /> : null}
      <SectionLabel label={text.windowLabel} required={text.required} palette={palette} rtl={rtl} />
      <View style={[styles.segmented, { backgroundColor: palette.panelAlt, borderColor: palette.line }, rtl && styles.rowReverse]}>
        {(['morning', 'afternoon', 'flexible'] as RideWindow[]).map((window) => {
          const selected = data.preferredWindow === window;
          return (
            <Pressable
              key={window}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={text.windows[window]}
              onPress={() => updateData('preferredWindow', window)}
              style={({ pressed }) => [styles.segment, { backgroundColor: selected ? palette.ink : 'transparent', opacity: pressed ? 0.76 : 1 }]}
              testID={`onboarding-window-${window}`}
            >
              <Text style={[styles.segmentText, { color: selected ? palette.bg : palette.muted }, rtl && styles.arabicMedium]}>{text.windows[window]}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && !data.preferredWindow ? <FieldError message={error} palette={palette} rtl={rtl} /> : null}
      <SectionLabel label={text.windLabel} palette={palette} rtl={rtl} />
      <View style={styles.preferenceList}>
        {(['balanced', 'sheltered', 'tailwind'] as WindPreference[]).map((preference) => (
          <Pressable
            key={preference}
            accessibilityRole="radio"
            accessibilityState={{ checked: data.windPreference === preference }}
            accessibilityLabel={text.windPreferences[preference]}
            onPress={() => updateData('windPreference', preference)}
            style={({ pressed }) => [styles.preferenceRow, { borderColor: data.windPreference === preference ? palette.accent : palette.line, backgroundColor: data.windPreference === preference ? palette.accentSoft : palette.panel, opacity: pressed ? 0.8 : 1 }, rtl && styles.rowReverse]}
            testID={`onboarding-wind-${preference}`}
          >
            <View style={[styles.radioOuter, { borderColor: data.windPreference === preference ? palette.accent : palette.muted }]}>
              {data.windPreference === preference ? <View style={[styles.radioInner, { backgroundColor: palette.accent }]} /> : null}
            </View>
            <Text style={[styles.preferenceText, { color: palette.ink }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{text.windPreferences[preference]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.unitsRow, rtl && styles.rowReverse]}>
        <Text style={[styles.unitsLabel, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.unitsLabel}</Text>
        <View style={[styles.unitsOptions, rtl && styles.rowReverse]}>
          {(['km', 'mi'] as DistanceUnit[]).map((unit) => (
            <Pressable
              key={unit}
              accessibilityRole="radio"
              accessibilityState={{ checked: data.distanceUnit === unit }}
              accessibilityLabel={unit === 'km' ? text.km : text.mi}
              onPress={() => updateData('distanceUnit', unit)}
              style={({ pressed }) => [styles.unitButton, { borderColor: data.distanceUnit === unit ? palette.accent : palette.line, backgroundColor: data.distanceUnit === unit ? palette.accentSoft : palette.panel, opacity: pressed ? 0.78 : 1 }]}
            >
              <Text style={[styles.unitText, { color: data.distanceUnit === unit ? palette.accent : palette.muted }, rtl && styles.arabicMedium]}>{unit === 'km' ? text.km : text.mi}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function PermissionsStep({
  text,
  palette,
  rtl,
  data,
  updateData,
  onOpenPrivacy,
  error,
}: {
  text: OnboardingCopy;
  palette: Palette;
  rtl: boolean;
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onOpenPrivacy?: () => void;
  error?: string;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.screenTitle, { color: palette.ink }, rtl && styles.textRight]}>{text.permissionsTitle}</Text>
      <Text style={[styles.screenBody, { color: palette.muted }, rtl && styles.textRight]}>{text.permissionsBody}</Text>
      <View style={[styles.permissionPanel, { backgroundColor: palette.ink, borderColor: palette.line }]}>
        <View style={[styles.permissionPanelTop, rtl && styles.rowReverse]}>
          <View style={[styles.permissionIcon, { backgroundColor: palette.accentSoft }]}><Icon name="person" color={palette.accent} size={22} /></View>
          <View style={styles.flex}>
            <Text style={[styles.permissionTitle, { color: palette.bg }, rtl && { fontFamily: FONT_ARABIC_BOLD }, rtl && styles.textRight]}>{text.locationPermissionTitle}</Text>
            <Text style={[styles.permissionBody, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.locationPermissionBody}</Text>
          </View>
        </View>
        <View style={[styles.permissionDivider, { backgroundColor: palette.line }]} />
        <View style={[styles.toggleRow, rtl && styles.rowReverse]}>
          <View style={styles.flex}>
            <Text style={[styles.toggleTitle, { color: palette.bg }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{text.askLocationLabel}</Text>
            <Text style={[styles.toggleDescription, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.askLocationDescription}</Text>
          </View>
          <Switch
            accessibilityLabel={text.askLocationLabel}
            accessibilityRole="switch"
            value={data.askLocationWhenStarting}
            onValueChange={(value) => updateData('askLocationWhenStarting', value)}
            trackColor={{ false: palette.line, true: palette.accentSoft }}
            thumbColor={data.askLocationWhenStarting ? palette.accent : palette.muted}
            ios_backgroundColor={palette.line}
          />
        </View>
      </View>
      <Text style={[styles.privacyHeading, { color: palette.ink }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{text.privacyTitle}</Text>
      <Text style={[styles.screenBody, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{text.privacyBody}</Text>
      <PrivacyLine icon="route" title={text.privacySource} description={text.privacySourceDescription} palette={palette} rtl={rtl} />
      <PrivacyLine icon="person" title={text.privacyRoute} description={text.privacyRouteDescription} palette={palette} rtl={rtl} />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={text.openPrivacy}
        onPress={onOpenPrivacy}
        disabled={!onOpenPrivacy}
        style={({ pressed }) => [styles.privacyLink, { opacity: !onOpenPrivacy ? 0.55 : pressed ? 0.68 : 1 }, rtl && styles.rowReverse]}
      >
        <Text style={[styles.privacyLinkText, { color: palette.accent }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{text.openPrivacy}</Text>
        <View style={{ transform: [{ rotate: onboardingChevronRotation(rtl, 'forward') }] }}><Icon name="chevron" color={palette.accent} size={14} /></View>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: data.privacyAcknowledged }}
        accessibilityLabel={text.privacyAcknowledgement}
        onPress={() => updateData('privacyAcknowledged', !data.privacyAcknowledged)}
        style={({ pressed }) => [styles.acknowledgement, { borderColor: data.privacyAcknowledged ? palette.accent : palette.line, backgroundColor: data.privacyAcknowledged ? palette.accentSoft : palette.panel, opacity: pressed ? 0.78 : 1 }, rtl && styles.rowReverse]}
        testID="onboarding-privacy-acknowledgement"
      >
        <View style={[styles.checkbox, { borderColor: data.privacyAcknowledged ? palette.accent : palette.muted, backgroundColor: data.privacyAcknowledged ? palette.accent : 'transparent' }]}>
          {data.privacyAcknowledged ? <Icon name="chevron" color={palette.bg} size={12} /> : null}
        </View>
        <Text style={[styles.acknowledgementText, { color: palette.ink }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{text.privacyAcknowledgement}</Text>
      </Pressable>
      {error ? <FieldError message={error} palette={palette} rtl={rtl} /> : null}
    </View>
  );
}

function FloatingLabelInput({
  label,
  placeholder,
  value,
  onChangeText,
  helperText,
  error,
  palette,
  rtl,
  autoCapitalize = 'sentences',
  textContentType,
  testID,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  helperText?: string;
  error?: string;
  palette: Palette;
  rtl: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: 'name' | 'nickname';
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const floating = focused || hasValue;
  const progress = useRef(new Animated.Value(floating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: floating ? 1 : 0, duration: 170, useNativeDriver: true }).start();
  }, [floating, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -13] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] });
  return (
    <View style={styles.inputGroup}>
      <View style={[styles.inputFrame, { borderColor: error ? palette.caution : focused ? palette.accent : palette.line, backgroundColor: palette.panel }, rtl && styles.rowReverse]}>
        <Animated.Text style={[styles.floatingLabel, { color: error ? palette.caution : focused ? palette.accent : palette.muted, backgroundColor: palette.panel, transform: [{ translateY }, { scale }] }, rtl ? styles.floatingLabelRtl : styles.floatingLabelLtr, rtl && styles.arabicRegular]}>{label}</Animated.Text>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ? error : helperText}
          autoCapitalize={autoCapitalize}
          autoCorrect
          blurOnSubmit
          maxLength={MAX_RIDER_NAME_LENGTH}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={focused ? placeholder : undefined}
          placeholderTextColor={palette.muted}
          returnKeyType="done"
          selectionColor={palette.accent}
          style={[styles.input, { color: palette.ink }, rtl && styles.textRight, rtl && styles.arabicRegular]}
          textContentType={textContentType}
          testID={testID}
          value={value}
        />
      </View>
      {error ? <Text style={[styles.fieldError, { color: palette.caution }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{error}</Text> : helperText ? <Text style={[styles.fieldHelp, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{helperText}</Text> : null}
    </View>
  );
}

function ChoiceTile({
  icon,
  label,
  description,
  selected,
  onPress,
  palette,
  rtl,
  role,
  testID,
}: {
  icon: IconName;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  palette: Palette;
  rtl: boolean;
  role: 'radio' | 'checkbox';
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.choiceTile, { borderColor: selected ? palette.accent : palette.line, backgroundColor: selected ? palette.accentSoft : palette.panel, opacity: pressed ? 0.8 : 1 }, rtl && styles.rowReverse]}
      testID={testID}
    >
      <View style={[styles.choiceIcon, { backgroundColor: selected ? palette.accent : palette.panelAlt }]}><Icon name={icon} color={selected ? palette.bg : palette.accent} size={18} /></View>
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceTitle, { color: palette.ink }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{label}</Text>
        <Text style={[styles.choiceDescription, { color: palette.muted }, rtl && styles.textRight, rtl && styles.arabicRegular]}>{description}</Text>
      </View>
      <View style={[styles.radioOuter, { borderColor: selected ? palette.accent : palette.muted }]}>{selected ? <View style={[styles.radioInner, { backgroundColor: palette.accent }]} /> : null}</View>
    </Pressable>
  );
}

function SectionLabel({ label, required, palette, rtl }: { label: string; required?: string; palette: Palette; rtl: boolean }) {
  return (
    <View style={[styles.sectionLabelRow, rtl && styles.rowReverse]}>
      <Text style={[styles.sectionLabel, { color: palette.ink }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{label}</Text>
      {required ? <Text style={[styles.requiredText, { color: palette.muted }, rtl && styles.arabicRegular]}>{required}</Text> : null}
    </View>
  );
}

function PrivacyLine({ icon, title, description, palette, rtl }: { icon: IconName; title: string; description: string; palette: Palette; rtl: boolean }) {
  return (
    <View style={[styles.privacyLine, rtl && styles.rowReverse]}>
      <View style={[styles.privacyIcon, { backgroundColor: palette.panelAlt }]}><Icon name={icon} color={palette.accent} size={17} /></View>
      <View style={styles.flex}>
        <Text style={[styles.privacyLineTitle, { color: palette.ink }, rtl && styles.textRight]}>{title}</Text>
        <Text style={[styles.privacyLineDescription, { color: palette.muted }, rtl && styles.textRight]}>{description}</Text>
      </View>
    </View>
  );
}

function FieldError({ message, palette, rtl }: { message: string; palette: Palette; rtl: boolean }) {
  return <Text accessibilityRole="alert" style={[styles.fieldError, { color: palette.caution }, rtl && styles.textRight]}>{message}</Text>;
}

function InlineError({ message, palette, rtl }: { message: string; palette: Palette; rtl: boolean }) {
  return (
    <View accessibilityRole="alert" style={[styles.inlineError, { backgroundColor: palette.cautionSoft, borderColor: palette.caution }, rtl && styles.rowReverse]}>
      <View style={[styles.inlineErrorDot, { backgroundColor: palette.caution }]} />
      <Text style={[styles.inlineErrorText, { color: palette.caution }, rtl && styles.textRight]}>{message}</Text>
    </View>
  );
}

function OnboardingButton({ label, icon, onPress, palette, rtl, disabled = false, loading = false, testID }: { label: string; icon: IconName; onPress: () => void; palette: Palette; rtl: boolean; disabled?: boolean; loading?: boolean; testID?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { backgroundColor: palette.ink, opacity: disabled ? 0.56 : pressed ? 0.82 : 1 }, rtl && styles.rowReverse]}
      testID={testID}
    >
      <View style={[styles.actionIcon, { backgroundColor: palette.accentSoft }]}>{loading ? <View style={[styles.loadingDot, { borderColor: palette.accent, borderTopColor: 'transparent' }]} /> : <Icon name={icon} color={palette.ink} size={17} />}</View>
      <Text style={[styles.actionText, { color: palette.bg }, rtl && styles.textRight, rtl && styles.arabicMedium]}>{label}</Text>
      <View style={[styles.actionArrow, { backgroundColor: palette.bg, transform: [{ rotate: onboardingChevronRotation(rtl, 'forward') }] }]}><Icon name="chevron" color={palette.ink} size={14} /></View>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: DARK.bg },
  topBar: { minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarSide: { width: 110, minHeight: 44, justifyContent: 'center' },
  topBarSideRight: { alignItems: 'flex-end' },
  topBarSpacer: { width: 44, height: 44 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 9, height: 9, borderRadius: 5 },
  brandText: { color: DARK.ink, fontFamily: FONT_EXTRABOLD, fontSize: 13, letterSpacing: 2.2 },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: DARK.panelAlt },
  backText: { color: DARK.ink, fontFamily: FONT_SEMIBOLD, fontSize: 12 },
  skipButton: { minHeight: 44, justifyContent: 'center' },
  skipText: { color: DARK.muted, fontFamily: FONT_MEDIUM, fontSize: 12, textDecorationLine: 'underline', textDecorationColor: DARK.muted },
  progressWrap: { paddingHorizontal: 20, gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  progressText: { color: DARK.muted, fontFamily: FONT_BOLD, fontSize: 9, letterSpacing: 0.55, textTransform: 'uppercase' },
  progressTrack: { height: 4, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 22 },
  contentFrame: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  stepBody: { gap: 16 },
  heroTitle: { fontFamily: FONT_EXTRABOLD, fontSize: 38, lineHeight: 44, letterSpacing: -1.1 },
  heroBody: { fontFamily: FONT_REGULAR, fontSize: 15, lineHeight: 23, maxWidth: 540 },
  screenTitle: { fontFamily: FONT_EXTRABOLD, fontSize: 30, lineHeight: 37, letterSpacing: -0.6 },
  screenBody: { fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 21 },
  signalPanel: { marginTop: 10, padding: 20, borderWidth: 1, borderRadius: 24, gap: 20 },
  signalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signalStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  signalLabel: { fontFamily: FONT_BOLD, fontSize: 10, letterSpacing: 1.1 },
  signalTitle: { fontFamily: FONT_BOLD, fontSize: 21, lineHeight: 28 },
  signalLine: { flexDirection: 'row', gap: 4, height: 9 },
  signalSegment: { borderRadius: 4 },
  signalMetrics: { flexDirection: 'row', alignItems: 'stretch', gap: 16 },
  signalMetric: { flex: 1, gap: 4 },
  signalMetricValue: { fontFamily: FONT_EXTRABOLD, fontSize: 26 },
  signalMetricLabel: { fontFamily: FONT_MEDIUM, fontSize: 11 },
  signalDivider: { width: 1 },
  trustRow: { minHeight: 48, borderTopWidth: 1, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustText: { flex: 1, fontFamily: FONT_MEDIUM, fontSize: 12 },
  sectionLabelRow: { marginTop: 6, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  sectionLabel: { fontFamily: FONT_BOLD, fontSize: 13 },
  requiredText: { fontFamily: FONT_MEDIUM, fontSize: 10 },
  choiceStack: { gap: 10 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceTile: { flexGrow: 1, flexBasis: '46%', minWidth: 230, minHeight: 82, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1, gap: 3 },
  choiceTitle: { fontFamily: FONT_BOLD, fontSize: 12 },
  choiceDescription: { fontFamily: FONT_REGULAR, fontSize: 10, lineHeight: 15 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  segmented: { minHeight: 52, padding: 4, borderWidth: 1, borderRadius: 16, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 12 },
  segmentText: { fontFamily: FONT_SEMIBOLD, fontSize: 11, textAlign: 'center' },
  preferenceList: { gap: 8 },
  preferenceRow: { minHeight: 49, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  preferenceText: { flex: 1, fontFamily: FONT_MEDIUM, fontSize: 12 },
  unitsRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  unitsLabel: { flex: 1, fontFamily: FONT_MEDIUM, fontSize: 12 },
  unitsOptions: { flexDirection: 'row', gap: 8 },
  unitButton: { minWidth: 50, minHeight: 42, paddingHorizontal: 13, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  unitText: { fontFamily: FONT_BOLD, fontSize: 11 },
  locationReadout: { minHeight: 70, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  locationIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontFamily: FONT_BOLD, fontSize: 12 },
  locationDescription: { fontFamily: FONT_REGULAR, fontSize: 10, lineHeight: 15, marginTop: 3 },
  inputGroup: { gap: 7 },
  inputFrame: { minHeight: 64, borderWidth: 1, borderRadius: 17, paddingHorizontal: 16, justifyContent: 'center' },
  floatingLabel: { position: 'absolute', top: 21, paddingHorizontal: 4, fontFamily: FONT_MEDIUM, fontSize: 15, lineHeight: 20 },
  floatingLabelLtr: { left: 12 },
  floatingLabelRtl: { right: 12 },
  input: { minHeight: 58, paddingTop: 15, paddingBottom: 4, paddingHorizontal: 0, fontFamily: FONT_REGULAR, fontSize: 16 },
  fieldHelp: { fontFamily: FONT_REGULAR, fontSize: 11, lineHeight: 17 },
  fieldError: { fontFamily: FONT_MEDIUM, fontSize: 11, lineHeight: 17 },
  permissionPanel: { borderWidth: 1, borderRadius: 21, padding: 17, gap: 16 },
  permissionPanelTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  permissionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  permissionTitle: { fontFamily: FONT_BOLD, fontSize: 14, lineHeight: 20 },
  permissionBody: { fontFamily: FONT_REGULAR, fontSize: 12, lineHeight: 18, marginTop: 5 },
  permissionDivider: { height: 1 },
  toggleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontFamily: FONT_SEMIBOLD, fontSize: 12 },
  toggleDescription: { fontFamily: FONT_REGULAR, fontSize: 10, lineHeight: 15, marginTop: 3 },
  privacyHeading: { fontFamily: FONT_BOLD, fontSize: 15, marginTop: 8 },
  privacyLine: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11 },
  privacyIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  privacyLineTitle: { fontFamily: FONT_SEMIBOLD, fontSize: 12 },
  privacyLineDescription: { fontFamily: FONT_REGULAR, fontSize: 10, lineHeight: 15, marginTop: 2 },
  privacyLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  privacyLinkText: { fontFamily: FONT_BOLD, fontSize: 12, textDecorationLine: 'underline' },
  acknowledgement: { minHeight: 56, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  acknowledgementText: { flex: 1, fontFamily: FONT_MEDIUM, fontSize: 12, lineHeight: 18 },
  inlineError: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  inlineErrorDot: { width: 7, height: 7, borderRadius: 4 },
  inlineErrorText: { flex: 1, fontFamily: FONT_MEDIUM, fontSize: 11, lineHeight: 17 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 9 },
  actionButton: { minHeight: 58, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 9, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, fontFamily: FONT_BOLD, fontSize: 13 },
  actionArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loadingDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  bottomHint: { fontFamily: FONT_REGULAR, fontSize: 10, lineHeight: 15, textAlign: 'center', maxWidth: 560, alignSelf: 'center' },
  completeScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 18 },
  completeMark: { width: 82, height: 82, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  completeTitle: { color: DARK.ink, fontFamily: FONT_EXTRABOLD, fontSize: 29, lineHeight: 36, textAlign: 'center' },
  completeBody: { fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 430 },
  rowReverse: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  arabicRegular: { fontFamily: FONT_ARABIC_REGULAR },
  arabicMedium: { fontFamily: FONT_ARABIC_MEDIUM },
});

// Helper components use the stable, token-neutral layout styles. The screen
// itself overlays palette and locale-specific values through createStyles().
const styles = baseStyles;

function createStyles(palette: Palette, rtl: boolean) {
  return {
    ...baseStyles,
    root: [baseStyles.root, { backgroundColor: palette.bg }],
    brandText: [baseStyles.brandText, { color: palette.ink }],
    backIcon: [baseStyles.backIcon, { backgroundColor: palette.panelAlt, transform: [{ rotate: onboardingChevronRotation(rtl, 'back') }] }],
    backText: [baseStyles.backText, { color: palette.ink, fontFamily: rtl ? FONT_ARABIC_MEDIUM : FONT_MEDIUM }],
    skipText: [baseStyles.skipText, { color: palette.muted, textDecorationColor: palette.muted, fontFamily: rtl ? FONT_ARABIC_MEDIUM : FONT_MEDIUM }],
    progressText: [baseStyles.progressText, { color: palette.muted, fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_BOLD }],
    progressTrack: [baseStyles.progressTrack, { backgroundColor: palette.line }],
    progressFill: [baseStyles.progressFill, { backgroundColor: palette.accent }],
    heroTitle: [baseStyles.heroTitle, { color: palette.ink, fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_EXTRABOLD }],
    heroBody: [baseStyles.heroBody, { color: palette.muted, fontFamily: rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR }],
    screenTitle: [baseStyles.screenTitle, { color: palette.ink, fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_EXTRABOLD }],
    screenBody: [baseStyles.screenBody, { color: palette.muted, fontFamily: rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR }],
    completeTitle: [baseStyles.completeTitle, { color: palette.ink, fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_EXTRABOLD }],
    completeBody: [baseStyles.completeBody, { fontFamily: rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR }],
  };
}
