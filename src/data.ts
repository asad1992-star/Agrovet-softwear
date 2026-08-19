
import { AnimalStatus, Animal, ReproductionEvent, HealthEvent, Alert, ReproEventType, HealthEventType, ProtocolTemplate, Medicine, MedicinePurchase } from './types';

export const PREDEFINED_PROTOCOLS: ProtocolTemplate[] = [
  {
    id: 'ovsynch',
    name: 'Ovsynch',
    description: 'Standard GnRH-PGF-GnRH protocol',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'GnRH Injection', isAI: false },
      { dayOffset: 7, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 9, action: 'GnRH Injection', isAI: false },
      { dayOffset: 10, action: 'Timed AI', isAI: true }
    ]
  },
  {
    id: 'cosynch',
    name: 'Co-Synch',
    description: 'GnRH-PGF-GnRH with AI at second GnRH',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'GnRH Injection', isAI: false },
      { dayOffset: 7, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 9, action: 'GnRH + Timed AI', isAI: true }
    ]
  },
  {
    id: 'cidr',
    name: 'CIDR-Based',
    description: 'Progesterone insert protocol',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'GnRH + CIDR Insert', isAI: false },
      { dayOffset: 7, action: 'CIDR Removal + PGF2α', isAI: false },
      { dayOffset: 9, action: 'GnRH Injection', isAI: false },
      { dayOffset: 10, action: 'Timed AI', isAI: true }
    ]
  },
  {
    id: 'presynch',
    name: 'Presynch-Ovsynch',
    description: 'Two PGF injections before Ovsynch',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 14, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 26, action: 'GnRH Injection (Ovsynch Start)', isAI: false },
      { dayOffset: 33, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 35, action: 'GnRH Injection', isAI: false },
      { dayOffset: 36, action: 'Timed AI', isAI: true }
    ]
  },
  {
    id: 'doublepg',
    name: 'Double PG',
    description: 'Sequential Prostaglandin protocol',
    isPredefined: true,
    steps: [
      { dayOffset: 0, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 14, action: 'PGF2α Injection', isAI: false },
      { dayOffset: 16, action: 'Timed AI', isAI: true }
    ]
  }
];

export const MOCK_ANIMALS: Animal[] = [
  { id: '1', tag: 'TAG-001', name: 'Bessie', breed: 'Holstein', sex: 'Female', dob: '2020-05-15', status: AnimalStatus.PREGNANT, herd: 'Herd A' },
  { id: '2', tag: 'TAG-002', name: 'Daisy', breed: 'Jersey', sex: 'Female', dob: '2021-02-10', status: AnimalStatus.ACTIVE, herd: 'Herd A' },
  { id: '3', tag: 'TAG-003', name: 'Molly', breed: 'Holstein', sex: 'Female', dob: '2019-11-20', status: AnimalStatus.SICK, herd: 'Herd B' },
  { id: '4', tag: 'TAG-004', name: 'Bella', breed: 'Angus', sex: 'Female', dob: '2022-01-05', status: AnimalStatus.DRY, herd: 'Herd B' },
  { id: '5', tag: 'TAG-005', name: 'Lucy', breed: 'Holstein', sex: 'Female', dob: '2021-08-12', status: AnimalStatus.ACTIVE, herd: 'Herd A' },
];

export const MOCK_REPRO_EVENTS: ReproductionEvent[] = [
  { id: 'r1', animalId: '1', type: ReproEventType.INSEMINATION, date: '2023-10-01', details: 'Artificial Insemination', bullId: 'BULL-42', success: true },
  { id: 'r2', animalId: '1', type: ReproEventType.PREGNANCY_CHECK, date: '2023-11-15', details: 'Positive - Ultrasound', success: true },
  { id: 'r3', animalId: '2', type: ReproEventType.ESTRUS, date: '2023-12-10', details: 'Strong heat detected' },
];

export const MOCK_HEALTH_EVENTS: HealthEvent[] = [
  { 
    id: 'h1', 
    animalId: '3', 
    type: HealthEventType.ILLNESS, 
    date: '2024-01-10', 
    details: 'Mastitis detected in rear quarter, initiated anti-inflammatory and intramammary therapy', 
    medication: 'Masti-Clear Syringe', 
    dosage: '2 dose', 
    treatments: [{ name: 'Masti-Clear Syringe', dose: '2 dose' }], 
    technician: 'Dr. Tariq' 
  },
  { 
    id: 'h2', 
    animalId: '1', 
    type: HealthEventType.TREATMENT, 
    date: '2024-01-18', 
    details: 'Foot rot treatment with long-acting antibiotic', 
    medication: 'Oxytetracycline LA', 
    dosage: '20 ml', 
    treatments: [{ name: 'Oxytetracycline LA', dose: '20 ml' }], 
    technician: 'Dr. Tariq' 
  },
  { 
    id: 'h3', 
    animalId: '5', 
    type: HealthEventType.TREATMENT, 
    date: '2024-02-02', 
    details: 'Respiratory infection therapy administered', 
    medication: 'Penicillin G', 
    dosage: '15 ml', 
    treatments: [{ name: 'Penicillin G', dose: '15 ml' }], 
    technician: 'Asad Ali' 
  },
  { 
    id: 'h4', 
    animalId: '2', 
    type: HealthEventType.CHECKUP, 
    date: '2024-02-14', 
    details: 'Routine herd deworming drench before breeding cycle', 
    medication: 'Dewormer Oral drench', 
    dosage: '50 ml', 
    treatments: [{ name: 'Dewormer Oral drench', dose: '50 ml' }], 
    technician: 'Asad Ali' 
  },
  { 
    id: 'h5', 
    animalId: '4', 
    type: HealthEventType.TREATMENT, 
    date: '2024-02-25', 
    details: 'Acute systemic infection treated with Borgal 24%', 
    medication: 'Borgal 24%', 
    dosage: '20 ml', 
    treatments: [{ name: 'Borgal 24%', dose: '20 ml' }], 
    technician: 'Dr. Tariq' 
  }
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'a1', type: 'Repro', title: 'Pregnancy Check Due', description: 'Daisy (TAG-002) is due for 30-day ultrasound.', dueDate: '2024-01-20', animalId: '2', isRead: false, priority: 'High' },
];

export const MOCK_MEDICINES: Medicine[] = [
  { id: 'm1', name: 'Oxytetracycline LA', category: 'Injection', unit: 'ml', packs: 3, loose: 40, loosePerPack: 100, minStockLevel: 100 },
  { id: 'm2', name: 'Penicillin G', category: 'Injection', unit: 'ml', packs: 5, loose: 15, loosePerPack: 100, minStockLevel: 120 },
  { id: 'm3', name: 'Masti-Clear Syringe', category: 'Liquid', unit: 'dose', packs: 10, loose: 4, loosePerPack: 12, minStockLevel: 24 },
  { id: 'm4', name: 'Borgal 24%', category: 'Injection', unit: 'ml', packs: 2, loose: 80, loosePerPack: 100, minStockLevel: 100 },
  { id: 'm5', name: 'Dewormer Oral drench', category: 'Liquid', unit: 'ml', packs: 1, loose: 500, loosePerPack: 1000, minStockLevel: 500 },
  { id: 'm6', name: 'Sulfa-Trim Powder', category: 'Powder', unit: 'dose', packs: 4, loose: 10, loosePerPack: 50, minStockLevel: 50 }
];

export const MOCK_MEDICINE_PURCHASES: MedicinePurchase[] = [
  {
    id: 'p1',
    medicineId: 'm1',
    medicineName: 'Oxytetracycline LA',
    date: '2024-01-05',
    packs: 3,
    loose: 0,
    totalUnits: 300,
    supplier: 'VetPharm National Supplies',
    batchNumber: 'OXY-9942',
    expiryDate: '2026-06-30',
    recordedBy: 'Asad Ali',
    notes: 'Seasonal bulk supply order'
  },
  {
    id: 'p2',
    medicineId: 'm1',
    medicineName: 'Oxytetracycline LA',
    date: '2024-02-10',
    packs: 1,
    loose: 0,
    totalUnits: 100,
    supplier: 'AgroCare Veterinary Co.',
    batchNumber: 'OXY-1021',
    expiryDate: '2026-09-15',
    recordedBy: 'Dr. Tariq',
    notes: 'Emergency replenishment'
  },
  {
    id: 'p3',
    medicineId: 'm2',
    medicineName: 'Penicillin G',
    date: '2023-12-20',
    packs: 6,
    loose: 0,
    totalUnits: 600,
    supplier: 'VetPharm National Supplies',
    batchNumber: 'PEN-5501',
    expiryDate: '2025-12-31',
    recordedBy: 'Asad Ali',
    notes: 'Standard quarterly replenishment'
  },
  {
    id: 'p4',
    medicineId: 'm3',
    medicineName: 'Masti-Clear Syringe',
    date: '2024-01-12',
    packs: 12,
    loose: 0,
    totalUnits: 144,
    supplier: 'DairyHealth Solutions',
    batchNumber: 'MST-881',
    expiryDate: '2025-11-20',
    recordedBy: 'Dr. Tariq',
    notes: 'Mastitis management stock'
  },
  {
    id: 'p5',
    medicineId: 'm4',
    medicineName: 'Borgal 24%',
    date: '2024-01-25',
    packs: 3,
    loose: 0,
    totalUnits: 300,
    supplier: 'AgroCare Veterinary Co.',
    batchNumber: 'BOR-7740',
    expiryDate: '2026-03-31',
    recordedBy: 'Asad Ali',
    notes: 'Antimicrobial restock'
  },
  {
    id: 'p6',
    medicineId: 'm5',
    medicineName: 'Dewormer Oral drench',
    date: '2023-11-15',
    packs: 2,
    loose: 0,
    totalUnits: 2000,
    supplier: 'AgriSupply Hub',
    batchNumber: 'DWM-2009',
    expiryDate: '2026-01-10',
    recordedBy: 'Asad Ali',
    notes: 'Herd deworming schedule pack'
  },
  {
    id: 'p7',
    medicineId: 'm6',
    medicineName: 'Sulfa-Trim Powder',
    date: '2024-01-18',
    packs: 5,
    loose: 0,
    totalUnits: 250,
    supplier: 'VetPharm National Supplies',
    batchNumber: 'SLF-4412',
    expiryDate: '2025-10-30',
    recordedBy: 'Asad Ali',
    notes: 'Soluble powder restock'
  }
];
