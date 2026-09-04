
export enum AnimalStatus {
  ACTIVE = 'Active',
  YOUNG_STOCK = 'Young Stock',
  IN_PROTOCOL = 'In Protocol',
  INSEMINATED = 'Inseminated',
  PREGNANT = 'Pregnant',
  CLOSEUP = 'Closeup',
  DRY = 'Dry',
  SICK = 'Sick',
  OBSERVATION = 'Observation'
}

export enum ReproEventType {
  ESTRUS = 'Estrus',
  INSEMINATION = 'Insemination',
  PREGNANCY_CHECK = 'Pregnancy Check',
  CALVING = 'Calving',
  DRY_OFF = 'Dry Off',
  PROTOCOL_STEP = 'Protocol Step',
  ABORTION = 'Abortion'
}

export enum HealthEventType {
  ILLNESS = 'Illness',
  VACCINATION = 'Vaccination',
  TREATMENT = 'Treatment',
  RECOVERY = 'Recovery',
  CHECKUP = 'Checkup',
  OBSERVATION = 'Observation'
}

export interface ProtocolStep {
  dayOffset: number;
  action: string;
  isAI: boolean;
  time?: string; // e.g., "16:00"
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  description?: string;
  steps: ProtocolStep[];
  isPredefined: boolean;
}

export interface ProtocolEnrollment {
  id: string;
  animalIds: string[];
  templateId: string;
  startDate: string;
  status: 'Active' | 'Completed' | 'Failed' | 'Archived';
  completedStepIndices: number[];
  result?: 'Pregnant' | 'Not Pregnant';
  archivedDate?: string;
}

export interface StatusColors {
  active: string;
  youngStock?: string;
  pregnant: string;
  sick: string;
  dry: string;
  closeup: string;
  inProtocol: string;
  inseminated: string;
  observation: string;
}

export type PenCategory = 
  | 'fresh'
  | 'highLactating'
  | 'mediumLactating'
  | 'lowLactating'
  | 'dryLactating'
  | 'pregnantHeifers'
  | 'breedableHeifers'
  | 'growingHeifers'
  | 'postWeanedHeifers'
  | 'sucklingCalves';

export interface PenMapping {
  fresh?: string;
  highLactating?: string;
  mediumLactating?: string;
  lowLactating?: string;
  dryLactating?: string;
  pregnantHeifers?: string;
  breedableHeifers?: string;
  growingHeifers?: string;
  postWeanedHeifers?: string;
  sucklingCalves?: string;
}

export interface NavigationTabsConfig {
  dashboard: boolean;
  animals: boolean;      // Herd Hub
  repro: boolean;        // Reproduction
  'pd-check': boolean;   // PD Check
  health: boolean;       // Health Bay
  protocols: boolean;    // Protocol Lab
  reports: boolean;      // Report Center
  settings: boolean;     // Configurations
}

export interface FarmSettings {
  gestationDays: number;
  closeupDays: number;
  dryPeriodDays: number;
  pregnancyCheckDays: number;
  estrusCycleDays: number;
  pdfTemplate: 'Professional' | 'Minimalist' | 'Modern';
  farmName: string;
  statusColors: StatusColors;
  customGroups?: string[];
  technicians?: string[];
  semenCatalog?: string[];
  autoBackupEnabled?: boolean;
  lastBackupDate?: string;
  penMapping?: PenMapping;
  autoMoveHeiferOnPD?: boolean;
  navigationTabs?: NavigationTabsConfig;
}

export interface Animal {
  id: string;
  tag: string;
  name: string;
  breed: string;
  sex: 'Male' | 'Female';
  dob: string;
  herd: string;
  photoUrl?: string;
  status?: AnimalStatus;
  expectedCalving?: string;
  pregnancyDays?: number;
  serviceDate?: string;
  motherId?: string;
  fatherId?: string;
  isCalf?: boolean;
  notes?: string;
}

export interface ReproductionEvent {
  id: string;
  animalId: string;
  type: ReproEventType;
  date: string;
  details: string;
  bullId?: string;
  success?: boolean;
  offspringGender?: 'Male' | 'Female';
  offspringTag?: string;
  calfTag?: string;
  calfStatus?: 'Alive' | 'Expired';
  protocolId?: string; // Link to enrollment if step
  technician?: string;
  semenName?: string;
  pregnancyResult?: 'Pregnant' | 'Non-Pregnant';
}

export interface HealthEvent {
  id: string;
  animalId: string;
  type: HealthEventType;
  date: string;
  details: string;
  medication?: string;
  dosage?: string;
  treatments?: { name: string; dose: string }[];
  nextDue?: string;
  treatmentDays?: number; // How many days to treat
  numberOfDoses?: number; // Multi-dose: total number of injections
  daysGap?: number; // Days between each dose
  completedDoses?: number; // How many doses have been marked done
  dosesAdministered?: string[]; // Array of ISO date strings (e.g. ['2026-08-28', '2026-08-29']) when daily doses were administered
  isCured?: boolean; // true = cured, false = not cured / still sick
  cureStatus?: 'Cured' | 'Not Cured' | 'Pending'; // Cure evaluation outcome
  cureDate?: string; // Date cure status was evaluated
  attachments?: string[];
  technician?: string;
  isBatch?: boolean; // True if logged for whole herd or group of animals (e.g. batch vaccination)
  batchAnimalCount?: number; // Total number of animals treated in this batch
  batchHerdName?: string; // Name of the herd or group (e.g. "All Herd" or "Main Herd")
  batchAnimalIds?: string[]; // IDs of the animals in the batch
}

export interface Alert {
  id: string;
  type: 'Repro' | 'Health' | 'System' | 'Protocol';
  title: string;
  description: string;
  dueDate: string;
  animalId?: string;
  priority: 'Low' | 'Medium' | 'High';
  isRead?: boolean;
  dismissed?: boolean;
  metadata?: Record<string, any>;
}

export interface PenMovement {
  id: string;
  animalId: string;
  animalTag: string;
  fromPen: string;
  toPen: string;
  date: string;
  reason: string;
  isAutomatic: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  farmId: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: 'Injection' | 'Liquid' | 'Powder';
  unit: 'ml' | 'bottle' | 'dose';
  packs: number; // e.g., 5 bottles
  loose: number; // e.g., 20 ml
  loosePerPack: number; // size of a full pack (e.g. 100ml per bottle)
  minStockLevel: number; // e.g. 50 (in total equivalent units, or packs, or loose)
}

export interface MedicinePurchase {
  id: string;
  medicineId: string;
  medicineName: string;
  date: string;
  packs: number;
  loose: number;
  totalUnits: number;
  supplier?: string;
  invoiceNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
  recordedBy?: string;
}

export type ViewState = 'dashboard' | 'animals' | 'repro' | 'health' | 'protocols' | 'settings' | 'pd-check' | 'reports';
