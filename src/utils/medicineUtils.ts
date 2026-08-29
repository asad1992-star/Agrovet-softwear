import { HealthEvent, Medicine } from '../types';

/**
 * Computes suggested dosages for a given medicine name based on:
 * 1. Historical health events where this medicine was prescribed
 * 2. Medicine category / standard veterinary defaults
 */
export const getMedicineDoseSuggestions = (
  medicineName: string,
  healthEvents: HealthEvent[] = [],
  medicines: Medicine[] = []
): { primaryDose?: string; suggestions: string[] } => {
  if (!medicineName || !medicineName.trim()) {
    return { suggestions: [] };
  }

  const query = medicineName.trim().toLowerCase();
  const matchedMed = medicines.find(m => m.name.toLowerCase() === query || m.name.toLowerCase().includes(query));
  const unit = matchedMed?.unit || 'ml';

  // Count dose occurrences in past health logs
  const doseCounts: Record<string, number> = {};

  healthEvents.forEach(event => {
    // Check treatments array
    if (event.treatments && event.treatments.length > 0) {
      event.treatments.forEach(t => {
        if (t.name && t.name.toLowerCase().includes(query) && t.dose && t.dose.trim()) {
          const formatted = t.dose.trim();
          doseCounts[formatted] = (doseCounts[formatted] || 0) + 1;
        }
      });
    }

    // Check legacy medication / dosage fields
    if (event.medication && event.medication.toLowerCase().includes(query) && event.dosage && event.dosage.trim()) {
      const formatted = event.dosage.trim();
      doseCounts[formatted] = (doseCounts[formatted] || 0) + 1;
    }
  });

  // Sort historical doses by frequency
  const sortedHistorical = Object.entries(doseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([dose]) => dose);

  // Common veterinary fallbacks if no history or to complement history
  const commonFallbacks = [
    `20${unit}`,
    `15${unit}`,
    `10${unit}`,
    `25${unit}`,
    `5${unit}`
  ];

  // Specific high-frequency common injection heuristics
  if (query.includes('ketoject') || query.includes('ketoprofen') || query.includes('ketovet')) {
    if (!sortedHistorical.includes(`20${unit}`)) {
      sortedHistorical.unshift(`20${unit}`);
    }
  } else if (query.includes('oxytet') || query.includes('terramycin') || query.includes('la-200')) {
    if (!sortedHistorical.includes(`20${unit}`)) {
      sortedHistorical.unshift(`20${unit}`);
    }
  } else if (query.includes('penicillin') || query.includes('pen')) {
    if (!sortedHistorical.includes(`15${unit}`)) {
      sortedHistorical.unshift(`15${unit}`);
    }
  }

  const combinedSuggestions: string[] = [];
  const addIfUnique = (d: string) => {
    const clean = d.trim();
    if (clean && !combinedSuggestions.some(s => s.toLowerCase() === clean.toLowerCase())) {
      combinedSuggestions.push(clean);
    }
  };

  // 1. Add historical top suggestions first
  sortedHistorical.forEach(addIfUnique);

  // 2. Add fallbacks
  commonFallbacks.forEach(addIfUnique);

  const finalSuggestions = combinedSuggestions.slice(0, 4);
  const primaryDose = finalSuggestions[0];

  return {
    primaryDose,
    suggestions: finalSuggestions
  };
};
