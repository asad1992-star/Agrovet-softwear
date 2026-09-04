export interface UpdateItem {
  type: 'new' | 'improved' | 'fixed';
  title: string;
  description?: string;
}

export interface AppRelease {
  version: string;
  releaseDate: string;
  tagline: string;
  notes: UpdateItem[];
}

export const APP_RELEASES: AppRelease[] = [
  {
    version: '2.3',
    releaseDate: '2026-09-04',
    tagline: 'Interactive Type-Ahead Pharmacy, Scannable List Layouts, and Verified Security & Authentication.',
    notes: [
      {
        type: 'new',
        title: 'Interactive Type-Ahead Medicine Search in Treatment Forms',
        description: 'Instant incremental search as you type (e.g. "k" -> "ke" -> "keto") with high-contrast prefix highlights, full medicine titles with no abbreviation or truncation, and auto-suggested standard dosages.'
      },
      {
        type: 'new',
        title: 'Rich Medicine Packing & Real-Time Stock Status',
        description: 'Treatment dropdown now shows complete packaging specifications (e.g. 100 ml/pack), total in-stock units (packs + loose ml), and color-coded stock badges (In Stock, Low Stock, or Out of Stock).'
      },
      {
        type: 'improved',
        title: 'Standardized Executive List Views Across All Sections',
        description: 'Herd Hub (adults and calves), Pregnancy Diagnosis (PD), Active Synchronization Batches, Protocol Templates, and Pharmacy Inventory are all defaulted to high-efficiency, scannable list rows.'
      },
      {
        type: 'improved',
        title: 'Complete Secure Sign Out & Authentication Flow',
        description: 'Fully wired 1-click Secure Sign Out from the sidebar and account settings, returning immediately to the secure Auth Screen with session reset.'
      },
      {
        type: 'fixed',
        title: 'Release Notes & "What\'s New" Hub Popups',
        description: 'Activated the What\'s New changelog modal and release tracker, providing instant on-click access to all system version histories and updates.'
      }
    ]
  },
  {
    version: '2.2',
    releaseDate: '2026-09-03',
    tagline: 'Mass Herd Synchronization Protocols & Multi-Animal Treatments.',
    notes: [
      {
        type: 'new',
        title: 'Multi-Animal / Flock Treatment Logging',
        description: 'Log clinical treatments across multiple cows or whole pens simultaneously with synchronized dosage deductions from medicine stock.'
      },
      {
        type: 'improved',
        title: 'Reproduction Protocol Timeline Visualizer',
        description: 'Interactive step-by-step hormone injection timeline (GnRH, PGF2α, CIDR) with direct AI timing alerts and automatic calendar scheduling.'
      },
      {
        type: 'fixed',
        title: 'Loose Unit Inventory Stock Math',
        description: 'Ensured accurate fractional dispensing where administered doses automatically deduct from loose units before breaking open a new pack.'
      }
    ]
  },
  {
    version: '2.1',
    releaseDate: '2026-09-01',
    tagline: 'Veterinary Pregnancy Diagnosis Hub & Pen Auto-Movements.',
    notes: [
      {
        type: 'new',
        title: 'Pregnancy Diagnosis Hub & Past-Date PD Registry',
        description: 'Instant 1-click today diagnosis check, historical PD registry, and bulk list paste parser with automatic pregnant cow/heifer pen movements.'
      },
      {
        type: 'improved',
        title: 'WhatsApp & PDF Dossier Export Formatting',
        description: 'Chronological newest-first ordering for farm logs, morning action sheets, and veterinary dossiers with date filters.'
      }
    ]
  },
  {
    version: '1.0',
    releaseDate: '2026-08-25',
    tagline: 'Comprehensive Cattle Reproduction, Health, & Farm Operations Management Platform.',
    notes: [
      {
        type: 'new',
        title: 'Core Reproduction & Health Engine',
        description: 'Complete tracking of heats, inseminations, pregnancy checks, dry-offs, calvings, illnesses, and withdrawal periods.'
      }
    ]
  }
];

export const CURRENT_APP_VERSION = APP_RELEASES[0].version;
export const LAST_SEEN_VERSION_KEY = 'agrovet_last_seen_app_version';

export function hasUnseenAppUpdate(): boolean {
  if (typeof window === 'undefined') return false;
  const seenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
  return seenVersion !== CURRENT_APP_VERSION;
}

export function markAppUpdateAsSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_APP_VERSION);
}
