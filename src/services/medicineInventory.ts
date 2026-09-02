import { Medicine, MedicinePurchase } from '../types';

export interface MedicineDeductionItem {
  medicineName: string;
  deductedAmount: number;
  unit: string;
  remainingPacks: number;
  remainingLoose: number;
  remainingTotal: number;
  wasExhausted: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface MedicineDeductionResult {
  updatedMedicines: Medicine[];
  deductions: MedicineDeductionItem[];
  alerts: string[];
  summaryMessage: string;
}

/**
 * Robust Dosage Parser:
 * Extracts numeric doses safely from strings like "10 ml", "2.5 cc", "5 pills", "1 bottle", or number values.
 */
export function parseDosageNumber(doseStr?: string | number): number {
  if (typeof doseStr === 'number') {
    return isNaN(doseStr) ? 0 : Math.max(0, doseStr);
  }
  if (!doseStr) return 0;
  const match = doseStr.toString().match(/([\d.]+)/);
  if (!match) return 0;
  const parsed = parseFloat(match[1]);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Intelligent Medicine Stock Deduction Engine:
 * - Accurately deducts from open/loose quantity first.
 * - Automatically unpacks unopened full packs if loose is insufficient.
 * - Prevents negative packs, handles complete stock exhaustion gracefully.
 * - Rounds floating decimals to 2 decimal places.
 * - Flags low stock and out of stock warnings.
 */
export function deductMedicineStock(
  medicines: Medicine[],
  treatments: Array<{ name: string; dose?: string | number }>,
  patientCount: number = 1
): MedicineDeductionResult {
  const updatedMedicines = medicines.map(m => ({ ...m }));
  const deductions: MedicineDeductionItem[] = [];
  const alerts: string[] = [];
  const validPatientCount = Math.max(1, patientCount);

  treatments.forEach(treatment => {
    if (!treatment.name || !treatment.name.trim()) return;
    const cleanName = treatment.name.trim();
    const singleDose = parseDosageNumber(treatment.dose);
    if (singleDose <= 0) return;

    const totalDoseNeeded = Math.round(singleDose * validPatientCount * 100) / 100;

    const medIndex = updatedMedicines.findIndex(
      m => m.name.toLowerCase() === cleanName.toLowerCase() || m.id === cleanName
    );

    if (medIndex !== -1) {
      const med = updatedMedicines[medIndex];
      const loosePerPack = Math.max(1, med.loosePerPack || 100);
      let currentPacks = Math.max(0, med.packs || 0);
      let currentLoose = Math.max(0, med.loose || 0);
      const initialTotalUnits = (currentPacks * loosePerPack) + currentLoose;

      let wasExhausted = false;
      let actualDeducted = 0;

      if (currentLoose >= totalDoseNeeded) {
        // Simple case: satisfied by loose open units
        currentLoose = Math.round((currentLoose - totalDoseNeeded) * 100) / 100;
        actualDeducted = totalDoseNeeded;
      } else {
        // Need to unpack unopened boxes
        const deficit = totalDoseNeeded - currentLoose;
        const packsToOpen = Math.ceil(deficit / loosePerPack);

        if (currentPacks >= packsToOpen) {
          currentPacks -= packsToOpen;
          currentLoose = Math.round(((currentLoose + (packsToOpen * loosePerPack)) - totalDoseNeeded) * 100) / 100;
          actualDeducted = totalDoseNeeded;
        } else {
          // Insufficient stock: consume all remaining packs and loose
          wasExhausted = true;
          actualDeducted = initialTotalUnits;
          currentPacks = 0;
          currentLoose = 0;
          alerts.push(
            `🚨 Out of Stock: Stock exhausted for "${med.name}". Dispensed ${initialTotalUnits} ${med.unit} (requested ${totalDoseNeeded} ${med.unit} for ${validPatientCount} animal(s)).`
          );
        }
      }

      const newTotalUnits = Math.round(((currentPacks * loosePerPack) + currentLoose) * 100) / 100;
      const isOutOfStock = newTotalUnits === 0;
      const isLowStock = newTotalUnits > 0 && newTotalUnits < (med.minStockLevel || 0);

      if (isLowStock && !wasExhausted) {
        alerts.push(
          `⚠️ Low Stock Alert: "${med.name}" is down to ${currentPacks} packs + ${currentLoose} ${med.unit} (${newTotalUnits} ${med.unit} total, below min threshold ${med.minStockLevel} ${med.unit}).`
        );
      }

      updatedMedicines[medIndex] = {
        ...med,
        packs: currentPacks,
        loose: currentLoose
      };

      deductions.push({
        medicineName: med.name,
        deductedAmount: actualDeducted,
        unit: med.unit,
        remainingPacks: currentPacks,
        remainingLoose: currentLoose,
        remainingTotal: newTotalUnits,
        wasExhausted,
        isLowStock,
        isOutOfStock
      });
    }
  });

  const summary = deductions.length > 0
    ? `Deducted: ${deductions.map(d => `${d.deductedAmount} ${d.unit} of ${d.medicineName}`).join(', ')}`
    : 'No stock deductions processed.';

  return {
    updatedMedicines,
    deductions,
    alerts,
    summaryMessage: summary
  };
}

/**
 * Refund medicine stock back to inventory (e.g. when an administration is edited or deleted):
 */
export function refundMedicineStock(
  medicines: Medicine[],
  treatments: Array<{ name: string; dose?: string | number }>,
  patientCount: number = 1
): { updatedMedicines: Medicine[]; refundedSummary: string } {
  const updatedMedicines = medicines.map(m => ({ ...m }));
  const validPatientCount = Math.max(1, patientCount);
  const refundedItems: string[] = [];

  treatments.forEach(treatment => {
    if (!treatment.name || !treatment.name.trim()) return;
    const cleanName = treatment.name.trim();
    const singleDose = parseDosageNumber(treatment.dose);
    if (singleDose <= 0) return;

    const totalToRefund = Math.round(singleDose * validPatientCount * 100) / 100;

    const medIndex = updatedMedicines.findIndex(
      m => m.name.toLowerCase() === cleanName.toLowerCase() || m.id === cleanName
    );

    if (medIndex !== -1) {
      const med = updatedMedicines[medIndex];
      const loosePerPack = Math.max(1, med.loosePerPack || 100);
      let currentPacks = Math.max(0, med.packs || 0);
      let currentLoose = Math.max(0, med.loose || 0);

      currentLoose = Math.round((currentLoose + totalToRefund) * 100) / 100;

      // Automatically repack into full packs if loose exceeds pack capacity
      if (currentLoose >= loosePerPack) {
        const fullPacks = Math.floor(currentLoose / loosePerPack);
        currentPacks += fullPacks;
        currentLoose = Math.round((currentLoose - (fullPacks * loosePerPack)) * 100) / 100;
      }

      updatedMedicines[medIndex] = {
        ...med,
        packs: currentPacks,
        loose: currentLoose
      };

      refundedItems.push(`${totalToRefund} ${med.unit} of ${med.name}`);
    }
  });

  return {
    updatedMedicines,
    refundedSummary: refundedItems.length > 0 ? `Restored: ${refundedItems.join(', ')}` : 'No medicine refunded.'
  };
}

export interface MedicineDeltaItem {
  medicineName: string;
  previousDose: number;
  newDose: number;
  delta: number; // positive = deducted more, negative = refunded
  action: 'deducted' | 'refunded' | 'unchanged';
  unit: string;
  patientCount: number;
  totalDelta: number;
}

export interface MedicineEditAdjustmentResult extends MedicineDeductionResult {
  deltaReport: MedicineDeltaItem[];
  deltaSummary: string;
}

/**
 * Get Medicine Pack Capacity and Inventory Stock Details
 */
export function getMedicinePackInfo(
  medicines: Medicine[],
  medNameOrId?: string
): {
  matchedMedicine: Medicine | null;
  loosePerPack: number;
  unit: string;
  packs: number;
  loose: number;
  totalUnits: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
} {
  if (!medNameOrId || !medNameOrId.trim()) {
    return {
      matchedMedicine: null,
      loosePerPack: 100,
      unit: 'ml',
      packs: 0,
      loose: 0,
      totalUnits: 0,
      isLowStock: false,
      isOutOfStock: true
    };
  }

  const clean = medNameOrId.trim().toLowerCase();
  const matched = medicines.find(
    m => m.name.toLowerCase() === clean || m.id === medNameOrId
  ) || medicines.find(
    m => m.name.toLowerCase().includes(clean) || clean.includes(m.name.toLowerCase())
  ) || null;

  if (!matched) {
    return {
      matchedMedicine: null,
      loosePerPack: 100,
      unit: 'ml',
      packs: 0,
      loose: 0,
      totalUnits: 0,
      isLowStock: false,
      isOutOfStock: true
    };
  }

  const loosePerPack = Math.max(1, matched.loosePerPack || 100);
  const packs = Math.max(0, matched.packs || 0);
  const loose = Math.max(0, matched.loose || 0);
  const totalUnits = Math.round(((packs * loosePerPack) + loose) * 100) / 100;
  const isOutOfStock = totalUnits <= 0;
  const isLowStock = totalUnits > 0 && totalUnits < (matched.minStockLevel || 0);

  return {
    matchedMedicine: matched,
    loosePerPack,
    unit: matched.unit || 'ml',
    packs,
    loose,
    totalUnits,
    isLowStock,
    isOutOfStock
  };
}

/**
 * Handle medicine stock adjustment when editing a health event:
 * - First refunds the previous treatments recorded on the event.
 * - Then deducts the new treatments from the restored stock baseline.
 * - Accurately computes the delta per medicine for full transparency.
 * - Returns the final updated medicines list, delta deductions, detailed delta report, and alerts.
 */
export function adjustMedicineStockForEdit(
  medicines: Medicine[],
  previousTreatments: Array<{ name: string; dose?: string | number }>,
  newTreatments: Array<{ name: string; dose?: string | number }>,
  patientCount: number = 1
): MedicineEditAdjustmentResult {
  const validPatientCount = Math.max(1, patientCount);

  // Collect all unique medicine names across previous and new treatments
  const medicineNamesMap = new Map<string, { prevDose: number; newDose: number }>();

  previousTreatments.forEach(t => {
    if (!t.name || !t.name.trim()) return;
    const nameKey = t.name.trim().toLowerCase();
    const dose = parseDosageNumber(t.dose);
    const existing = medicineNamesMap.get(nameKey) || { prevDose: 0, newDose: 0 };
    medicineNamesMap.set(nameKey, { ...existing, prevDose: existing.prevDose + dose });
  });

  newTreatments.forEach(t => {
    if (!t.name || !t.name.trim()) return;
    const nameKey = t.name.trim().toLowerCase();
    const dose = parseDosageNumber(t.dose);
    const existing = medicineNamesMap.get(nameKey) || { prevDose: 0, newDose: 0 };
    medicineNamesMap.set(nameKey, { ...existing, newDose: existing.newDose + dose });
  });

  // Step 1: Refund previously deducted stock
  const { updatedMedicines: refundedMedicines } = refundMedicineStock(
    medicines,
    previousTreatments,
    validPatientCount
  );

  // Step 2: Deduct new treatments from the restored baseline
  const deductionResult = deductMedicineStock(refundedMedicines, newTreatments, validPatientCount);

  // Step 3: Compute delta report per medicine
  const deltaReport: MedicineDeltaItem[] = [];
  const deltaSummaries: string[] = [];

  medicineNamesMap.forEach(({ prevDose, newDose }, nameKey) => {
    const med = deductionResult.updatedMedicines.find(m => m.name.toLowerCase() === nameKey)
      || medicines.find(m => m.name.toLowerCase() === nameKey);
    const medDisplayName = med?.name || nameKey;
    const unit = med?.unit || 'ml';

    const deltaSingle = Math.round((newDose - prevDose) * 100) / 100;
    const totalDelta = Math.round(deltaSingle * validPatientCount * 100) / 100;

    let action: 'deducted' | 'refunded' | 'unchanged' = 'unchanged';
    if (totalDelta > 0) {
      action = 'deducted';
      deltaSummaries.push(
        `Deducted additional ${totalDelta} ${unit} of ${medDisplayName} (Changed from ${prevDose} ${unit} to ${newDose} ${unit}${validPatientCount > 1 ? ` for ${validPatientCount} animals` : ''})`
      );
    } else if (totalDelta < 0) {
      action = 'refunded';
      deltaSummaries.push(
        `Restored ${Math.abs(totalDelta)} ${unit} of ${medDisplayName} back to stock (Changed from ${prevDose} ${unit} to ${newDose} ${unit}${validPatientCount > 1 ? ` for ${validPatientCount} animals` : ''})`
      );
    } else {
      action = 'unchanged';
    }

    deltaReport.push({
      medicineName: medDisplayName,
      previousDose: prevDose,
      newDose,
      delta: deltaSingle,
      totalDelta,
      action,
      unit,
      patientCount: validPatientCount
    });
  });

  const deltaSummary = deltaSummaries.length > 0
    ? deltaSummaries.join('. ')
    : 'No net change in medicine dosage.';

  return {
    ...deductionResult,
    deltaReport,
    deltaSummary
  };
}

/**
 * Restock a medicine with new packs and/or loose units:
 */
export function restockMedicineStock(
  medicines: Medicine[],
  medicineId: string,
  packsToAdd: number = 0,
  looseToAdd: number = 0
): { updatedMedicines: Medicine[]; updatedMed: Medicine | null } {
  const index = medicines.findIndex(m => m.id === medicineId);
  if (index === -1) return { updatedMedicines: medicines, updatedMed: null };

  const med = medicines[index];
  const updatedMed: Medicine = {
    ...med,
    packs: Math.max(0, (med.packs || 0) + Math.max(0, packsToAdd)),
    loose: Math.round(((med.loose || 0) + Math.max(0, looseToAdd)) * 100) / 100
  };

  const updatedMedicines = [...medicines];
  updatedMedicines[index] = updatedMed;

  return { updatedMedicines, updatedMed };
}

/**
 * Direct single-item dispensation / deduction:
 */
export function dispenseMedicineStock(
  medicines: Medicine[],
  medicineId: string,
  amountToDeduct: number
): MedicineDeductionResult {
  const med = medicines.find(m => m.id === medicineId);
  if (!med) {
    return {
      updatedMedicines: medicines,
      deductions: [],
      alerts: [`Medicine not found`],
      summaryMessage: `Medicine not found`
    };
  }

  return deductMedicineStock(medicines, [{ name: med.name, dose: amountToDeduct }], 1);
}

/**
 * Calculate Stock Status
 */
export function getMedicineStockStatus(med: Medicine): {
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  isOutOfStock: boolean;
  isLowStock: boolean;
  isInStock: boolean;
} {
  const total = ((med.packs || 0) * (med.loosePerPack || 100)) + (med.loose || 0);
  if (total <= 0) {
    return { status: 'out-of-stock', isOutOfStock: true, isLowStock: false, isInStock: false };
  }
  if (total < (med.minStockLevel || 0)) {
    return { status: 'low-stock', isOutOfStock: false, isLowStock: true, isInStock: false };
  }
  return { status: 'in-stock', isOutOfStock: false, isLowStock: false, isInStock: true };
}

/**
 * Calculate Summary Metrics
 */
export function calculateMedicineTotals(medicines: Medicine[]) {
  let totalUnits = 0;
  let totalPacks = 0;
  let totalLooseUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inStockCount = 0;

  medicines.forEach(m => {
    const packs = m.packs || 0;
    const loose = m.loose || 0;
    const total = (packs * (m.loosePerPack || 100)) + loose;
    totalUnits += total;
    totalPacks += packs;
    totalLooseUnits += loose;
    if (total <= 0) {
      outOfStockCount++;
    } else if (total < (m.minStockLevel || 0)) {
      lowStockCount++;
    } else {
      inStockCount++;
    }
  });

  return {
    totalItems: medicines.length,
    totalMedicines: medicines.length,
    totalPacks,
    totalLooseUnits: Math.round(totalLooseUnits * 100) / 100,
    totalUnits: Math.round(totalUnits * 100) / 100,
    lowStockCount,
    outOfStockCount,
    inStockCount
  };
}
