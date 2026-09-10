export type ReferenceLink = {
  label: string;
  url: string;
};

export type ComponentVocabulary = {
  patternName: string;
  libraryNames: string[];
  references: ReferenceLink[];
};

const sites = {
  twentyFirst: { label: '21st.dev', url: 'https://21st.dev/' },
  material: { label: 'Material 3', url: 'https://m3.material.io/components' },
  apple: { label: 'Apple HIG', url: 'https://developer.apple.com/design/human-interface-guidelines' },
  shadcn: { label: 'shadcn/ui', url: 'https://ui.shadcn.com/docs/components' },
  mui: { label: 'MUI', url: 'https://mui.com/material-ui/getting-started/overview/' },
  chakra: { label: 'Chakra UI', url: 'https://chakra-ui.com/docs/components/concepts/overview' },
  ant: { label: 'Ant Design', url: 'https://ant.design/components/overview' },
  bootstrap: { label: 'Bootstrap', url: 'https://getbootstrap.com/docs/5.3/components/' },
  radix: { label: 'Radix Primitives', url: 'https://www.radix-ui.com/primitives' },
  headless: { label: 'Headless UI', url: 'https://headlessui.com/react' },
  expo: { label: 'Expo MapView', url: 'https://docs.expo.dev/versions/v57.0.0/sdk/map-view/' },
  mapbox: { label: 'Mapbox GL JS', url: 'https://docs.mapbox.com/mapbox-gl-js/guides/' },
} satisfies Record<string, ReferenceLink>;

export const referenceSites = Object.values(sites);

const refs = (...keys: Array<keyof typeof sites>) => keys.map((key) => sites[key]);

export const componentVocabulary: Record<string, ComponentVocabulary> = {
  'today-screen': {
    patternName: 'Dashboard / forecast overview screen',
    libraryNames: ['21st: dashboard', 'Material: Scaffold + cards', 'Apple: overview view', 'MUI: page layout + Card'],
    references: refs('twentyFirst', 'material', 'apple', 'mui'),
  },
  'explore-screen': {
    patternName: 'Map-based route planner / discovery screen',
    libraryNames: ['21st: map dashboard', 'Material: map screen', 'Apple: map view', 'MUI: page layout'],
    references: refs('twentyFirst', 'material', 'apple', 'mui', 'expo', 'mapbox'),
  },
  'route-screen': {
    patternName: 'Detail / analysis screen',
    libraryNames: ['21st: detail page', 'Material: top app bar + cards', 'Apple: detail view', 'MUI: detail layout'],
    references: refs('twentyFirst', 'material', 'apple', 'mui'),
  },
  'live-screen': {
    patternName: 'Live tracking / active status screen',
    libraryNames: ['21st: live dashboard', 'Material: map + status card', 'Apple: live activity view', 'MUI: Card + LinearProgress'],
    references: refs('twentyFirst', 'material', 'apple', 'mui', 'expo', 'mapbox'),
  },
  'riding-screen': {
    patternName: 'Profile / integrations / settings screen',
    libraryNames: ['21st: settings dashboard', 'Material: settings screen', 'Apple: settings view', 'MUI: List + Card'],
    references: refs('twentyFirst', 'material', 'apple', 'mui'),
  },
  'app-shell': {
    patternName: 'Application shell / app frame',
    libraryNames: ['21st: app shell', 'Material: Scaffold', 'MUI: App layout', 'Chakra: layout primitives', 'Ant: Layout'],
    references: refs('twentyFirst', 'material', 'mui', 'chakra', 'ant'),
  },
  'top-bar': {
    patternName: 'Top app bar / navigation header',
    libraryNames: ['21st: navbar / navigation menu', 'Material: Top app bar', 'Apple: Navigation bar / Toolbar', 'MUI: AppBar + Toolbar', 'Bootstrap: Navbar'],
    references: refs('twentyFirst', 'material', 'apple', 'mui', 'bootstrap'),
  },
  'theme-toggle': {
    patternName: 'Appearance toggle / toolbar action',
    libraryNames: ['21st: toggle / switch', 'Material: Switch', 'Apple: Toggle', 'shadcn: Switch or Toggle', 'MUI: Switch / ToggleButton', 'Chakra: Switch'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui', 'chakra'),
  },
  'language-toggle': {
    patternName: 'Locale switcher / segmented choice',
    libraryNames: ['21st: toggle group', 'Material: Segmented button', 'Apple: Segmented control', 'shadcn: ToggleGroup', 'MUI: ToggleButtonGroup', 'Ant: Segmented'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui', 'ant'),
  },
  'page-intro': {
    patternName: 'Page header / title block',
    libraryNames: ['21st: page header / hero', 'Material: title + top app bar', 'Apple: Large title', 'MUI: Typography + Stack', 'Bootstrap: heading'],
    references: refs('twentyFirst', 'material', 'apple', 'mui', 'bootstrap'),
  },
  icon: {
    patternName: 'Icon / symbol / glyph primitive',
    libraryNames: ['21st: icon', 'Material: Icon', 'Apple: SF Symbol', 'shadcn: icon + Lucide', 'MUI: Icon / IconButton'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui'),
  },
  metric: {
    patternName: 'Statistic / data point / KPI',
    libraryNames: ['21st: stat card', 'Material: supporting text in Card', 'Chakra: Stat', 'Ant: Statistic', 'MUI: Card + Typography'],
    references: refs('twentyFirst', 'material', 'chakra', 'ant', 'mui'),
  },
  'conditions-band': {
    patternName: 'Weather summary card / status panel',
    libraryNames: ['21st: Card', 'Material: Card', 'shadcn: Card', 'MUI: Card', 'Chakra: Card', 'Ant: Card', 'Bootstrap: Card'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'ant', 'bootstrap'),
  },
  'weather-metric': {
    patternName: 'Key-value row / description list item',
    libraryNames: ['21st: data row', 'Material: List item', 'shadcn: Item', 'MUI: ListItem', 'Ant: Descriptions.Item'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'ant'),
  },
  'refresh-weather': {
    patternName: 'Inline text action / link button',
    libraryNames: ['21st: text button', 'Material: Text button', 'shadcn: Button variant=link', 'MUI: Button variant=text', 'Bootstrap: link button'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'bootstrap'),
  },
  'riding-window': {
    patternName: 'Recommendation banner / informational callout',
    libraryNames: ['21st: callout / alert', 'Material: Banner', 'shadcn: Alert', 'MUI: Alert', 'Chakra: Alert', 'Ant: Alert', 'Bootstrap: Alert'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'ant', 'bootstrap'),
  },
  'route-map': {
    patternName: 'Interactive map view / map canvas',
    libraryNames: ['21st: map component', 'Expo: MapView', 'Mapbox: map', 'Apple MapKit: Map', 'Google Maps: Map'],
    references: refs('twentyFirst', 'expo', 'mapbox', 'apple'),
  },
  'map-header': {
    patternName: 'Map overlay / floating route label',
    libraryNames: ['21st: overlay card', 'Mapbox: map overlay / popup', 'Google Maps: info window', 'Apple MapKit: annotation callout'],
    references: refs('twentyFirst', 'mapbox', 'apple'),
  },
  'map-zoom': {
    patternName: 'Map control cluster / zoom control',
    libraryNames: ['21st: control group', 'Mapbox: NavigationControl', 'Google Maps: zoom control', 'Apple MapKit: map controls'],
    references: refs('twentyFirst', 'mapbox', 'apple'),
  },
  'map-legend': {
    patternName: 'Map legend / visual key',
    libraryNames: ['21st: legend', 'Material: legend / supporting text', 'Mapbox: map legend', 'Apple: map annotation key'],
    references: refs('twentyFirst', 'material', 'mapbox', 'apple'),
  },
  'map-fit': {
    patternName: 'Map action / recenter control',
    libraryNames: ['21st: icon button', 'Material: Icon button', 'Apple: toolbar button', 'MUI: IconButton', 'Mapbox: control button'],
    references: refs('twentyFirst', 'material', 'apple', 'mui', 'mapbox'),
  },
  'primary-action': {
    patternName: 'Primary action button / CTA',
    libraryNames: ['21st: Button', 'Material: Filled button', 'shadcn: Button', 'MUI: Button contained', 'Chakra: Button solid', 'Ant: Button primary', 'Bootstrap: primary Button'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'ant', 'bootstrap'),
  },
  'metrics-rail': {
    patternName: 'Statistics strip / KPI row',
    libraryNames: ['21st: stats row', 'Material: Card + supporting text', 'Chakra: StatGroup', 'Ant: Statistic', 'MUI: Stack + Card', 'Bootstrap: utility row'],
    references: refs('twentyFirst', 'material', 'chakra', 'ant', 'mui', 'bootstrap'),
  },
  recommendation: {
    patternName: 'Insight card / recommendation callout',
    libraryNames: ['21st: callout card', 'Material: Card / Banner', 'shadcn: Alert', 'MUI: Alert / Card', 'Chakra: Alert', 'Ant: Alert'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'ant'),
  },
  'route-actions': {
    patternName: 'Action group / button group',
    libraryNames: ['21st: action bar', 'Material: Button group', 'shadcn: ButtonGroup', 'MUI: ButtonGroup', 'Chakra: ButtonGroup', 'Radix: Toolbar'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'radix'),
  },
  'route-option': {
    patternName: 'Selectable card / radio card / list option',
    libraryNames: ['21st: selectable card', 'Material: Card + Radio button', 'shadcn: Card + RadioGroup', 'MUI: CardActionArea + Radio', 'Ant: Radio', 'Bootstrap: List group'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'ant', 'bootstrap'),
  },
  'route-top': {
    patternName: 'Detail header / contextual navigation bar',
    libraryNames: ['21st: detail header', 'Material: Top app bar', 'Apple: Navigation bar', 'MUI: AppBar + Toolbar', 'Bootstrap: Navbar'],
    references: refs('twentyFirst', 'material', 'apple', 'mui', 'bootstrap'),
  },
  'departure-selector': {
    patternName: 'Segmented control / mutually exclusive choice group',
    libraryNames: ['21st: segmented control', 'Material: Segmented button', 'Apple: Segmented control', 'shadcn: ToggleGroup / RadioGroup', 'MUI: ToggleButtonGroup', 'Ant: Segmented'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui', 'ant'),
  },
  'timing-result': {
    patternName: 'Result summary card / forecast result',
    libraryNames: ['21st: result card', 'Material: Card', 'shadcn: Card', 'MUI: Card + Typography', 'Ant: Result / Statistic', 'Bootstrap: Card'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'ant', 'bootstrap'),
  },
  'segment-row': {
    patternName: 'Route segment list item / timeline row',
    libraryNames: ['21st: list item', 'Material: List item', 'shadcn: Item', 'MUI: ListItem', 'Ant: List item', 'Bootstrap: List group item'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'ant', 'bootstrap'),
  },
  'wind-badge': {
    patternName: 'Status badge / condition chip',
    libraryNames: ['21st: Badge / Chip', 'Material: Chip', 'shadcn: Badge', 'MUI: Chip / Badge', 'Chakra: Badge', 'Ant: Tag / Badge', 'Bootstrap: Badge'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'ant', 'bootstrap'),
  },
  'evidence-panel': {
    patternName: 'Evidence disclosure / expandable provenance panel',
    libraryNames: ['21st: accordion / disclosure', 'Material: Expansion panel', 'shadcn: Accordion', 'MUI: Accordion', 'Radix: Collapsible', 'Headless UI: Disclosure'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'radix', 'headless'),
  },
  'live-state': {
    patternName: 'Live status card / tracking state panel',
    libraryNames: ['21st: status card', 'Material: Card + status indicator', 'shadcn: Card / Alert', 'MUI: Card / Alert', 'Chakra: Card / Badge'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra'),
  },
  'live-readout': {
    patternName: 'Live metric card / progress readout',
    libraryNames: ['21st: metric card', 'Material: Card + progress indicator', 'MUI: Card + LinearProgress', 'Chakra: Stat + Progress', 'Ant: Statistic + Progress'],
    references: refs('twentyFirst', 'material', 'mui', 'chakra', 'ant'),
  },
  'connection-panel': {
    patternName: 'Integration card / connection prompt',
    libraryNames: ['21st: integration card', 'Material: Card', 'shadcn: Card + Button', 'MUI: Card + Button', 'Chakra: Card + Button', 'Ant: Card'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'chakra', 'ant'),
  },
  'privacy-panel': {
    patternName: 'Settings section / privacy controls panel',
    libraryNames: ['21st: settings panel', 'Material: settings list', 'Apple: settings view', 'shadcn: Card / Field', 'MUI: List / Card', 'Ant: Descriptions / List'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui', 'ant'),
  },
  'delete-confirmation': {
    patternName: 'Destructive confirmation / alert dialog',
    libraryNames: ['21st: dialog / alert dialog', 'Material: Alert dialog', 'Apple: Alert', 'shadcn: AlertDialog', 'MUI: Dialog', 'Chakra: Dialog role=alertdialog', 'Ant: Modal'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui', 'chakra', 'ant'),
  },
  'bottom-navigation': {
    patternName: 'Primary mobile navigation / tab bar',
    libraryNames: ['21st: navbar / tabs', 'Material: Navigation bar', 'Apple: Tab bar', 'shadcn: Navigation menu / Tabs', 'MUI: BottomNavigation', 'Bootstrap: Nav tabs'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui', 'bootstrap'),
  },
  '21st-dashboard-activities': {
    patternName: 'Activity feed / dashboard activity list',
    libraryNames: ['21st: dashboard activities', 'Material: list + cards', 'MUI: List + Card', 'Ant: List'],
    references: refs('twentyFirst', 'material', 'mui', 'ant'),
  },
  '21st-interactive-map': {
    patternName: 'Web map with search, layers, markers, and overlays',
    libraryNames: ['21st: interactive map', 'React Leaflet: MapContainer + controls', 'Mapbox: map controls', 'Google Maps: map + markers'],
    references: refs('twentyFirst', 'mapbox', 'apple'),
  },
  '21st-button-with-icon': {
    patternName: 'Icon button / action button with leading icon',
    libraryNames: ['21st: button with icon', 'Material: filled button + icon', 'shadcn: Button', 'MUI: Button startIcon'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui'),
  },
  '21st-freelancer-stats': {
    patternName: 'Stats card / ranked performance summary',
    libraryNames: ['21st: freelancer stats card', 'Material: Card + supporting text', 'Chakra: Stat', 'Ant: Statistic'],
    references: refs('twentyFirst', 'material', 'chakra', 'ant'),
  },
  '21st-workout-summary': {
    patternName: 'Workout summary card / activity detail card',
    libraryNames: ['21st: workout summary card', 'Material: Card', 'Apple: activity summary', 'MUI: Card + Statistic'],
    references: refs('twentyFirst', 'material', 'apple', 'mui'),
  },
  '21st-colorful-button': {
    patternName: 'Decorative colorful CTA button',
    libraryNames: ['21st: colorful button', 'Material: filled button', 'shadcn: Button variant', 'MUI: Button contained'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui'),
  },
  '21st-admonition': {
    patternName: 'Admonition / semantic callout with icon',
    libraryNames: ['21st: admonition', 'Material: Banner', 'shadcn: Alert', 'MUI: Alert', 'Docusaurus: Admonition'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui'),
  },
  '21st-notice-alert': {
    patternName: 'Notice alert / status message',
    libraryNames: ['21st: notice alert', 'Material: Snackbar / Banner', 'shadcn: Alert', 'MUI: Alert', 'Ant: Alert'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'ant'),
  },
  '21st-marketing-dashboard': {
    patternName: 'Team activity dashboard / KPI overview',
    libraryNames: ['21st: marketing dashboard', 'Material: dashboard layout', 'MUI: Grid + Card', 'Ant: Dashboard'],
    references: refs('twentyFirst', 'material', 'mui', 'ant'),
  },
  '21st-theme-switch': {
    patternName: 'Theme switch / light-dark appearance control',
    libraryNames: ['21st: theme switch', 'Material: Switch', 'Apple: Toggle', 'shadcn: Switch', 'MUI: Switch'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui'),
  },
  '21st-futuristic-nav': {
    patternName: 'Decorative futuristic navigation bar',
    libraryNames: ['21st: futuristic nav / LumaBar', 'Material: Navigation bar', 'Apple: Tab bar', 'MUI: BottomNavigation'],
    references: refs('twentyFirst', 'material', 'apple', 'mui'),
  },
  '21st-limelight-nav': {
    patternName: 'Animated icon navigation / active tab bar',
    libraryNames: ['21st: LimelightNav', 'Material: Navigation bar', 'Apple: Tab bar', 'shadcn: Tabs', 'MUI: BottomNavigation'],
    references: refs('twentyFirst', 'material', 'apple', 'shadcn', 'mui'),
  },
  '21st-health-stat-card': {
    patternName: 'Health stat card / goal progress overview',
    libraryNames: ['21st: health stat card', 'Material: Card + ProgressIndicator', 'Chakra: Stat + Progress', 'Ant: Statistic + Progress'],
    references: refs('twentyFirst', 'material', 'chakra', 'ant'),
  },
  '21st-activity-stats-card': {
    patternName: 'Activity statistics card / comparison bar chart',
    libraryNames: ['21st: activity stats card', 'Material: chart card', 'MUI: Card + chart', 'Ant: Statistic + chart'],
    references: refs('twentyFirst', 'material', 'mui', 'ant'),
  },
  '21st-status-demo': {
    patternName: 'Status badge set / lifecycle status chips',
    libraryNames: ['21st: status badges', 'Material: Chip', 'shadcn: Badge', 'MUI: Chip', 'Ant: Tag'],
    references: refs('twentyFirst', 'material', 'shadcn', 'mui', 'ant'),
  },
  '21st-heatmap': {
    patternName: 'Calendar heatmap / activity intensity visualization',
    libraryNames: ['21st: heatmap chart', 'GitHub: contribution heatmap', 'Material: data visualization', 'MUI: chart'],
    references: refs('twentyFirst', 'material', 'mui'),
  },
  '21st-category-bar-chart': {
    patternName: 'Categorical bar chart / distribution chart',
    libraryNames: ['21st: category bar chart', 'Material: bar chart', 'MUI: bar chart', 'Ant: bar chart'],
    references: refs('twentyFirst', 'material', 'mui', 'ant'),
  },
};
