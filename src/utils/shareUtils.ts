import { Animal, ReproductionEvent, HealthEvent, ReproEventType, Medicine } from '../types';

export const formatWhatsAppMessage = (text: string) => {
  return encodeURIComponent(text);
};

export const shareToWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${formatWhatsAppMessage(text)}`;
  window.open(url, '_blank');
};

export const generateAnimalShareText = (animal: Animal, reproEvents: ReproductionEvent[], healthEvents: HealthEvent[]) => {
  const animalRepros = reproEvents.filter(e => e.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date));
  const animalHealth = healthEvents.filter(e => e.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date));

  const lastHeat = animalRepros.find(e => e.type === ReproEventType.ESTRUS);
  const lastInsem = animalRepros.find(e => e.type === ReproEventType.INSEMINATION);
  const lastCalving = animalRepros.find(e => e.type === ReproEventType.CALVING);
  const lastTreatment = animalHealth[0];
  const pregStatus = animal.status === 'Pregnant' || animal.status === 'Closeup' ? 'Pregnant' : 'Not Confirmed';

  let text = `*Animal Profile: ${animal.tag}*\n`;
  if (animal.name) text += `Name: ${animal.name}\n`;
  text += `Status: ${animal.status}\n`;
  text += `Breed: ${animal.breed}\n`;
  text += `Pregnancy: ${pregStatus}\n`;
  if (lastHeat) text += `Last Heat: ${lastHeat.date}\n`;
  if (lastInsem) text += `Last Service: ${lastInsem.date} (${lastInsem.semenName || 'N/A'})\n`;
  if (lastCalving) text += `Last Calving: ${lastCalving.date}\n`;
  if (lastTreatment) text += `Last Treatment: ${lastTreatment.date} - ${lastTreatment.details || lastTreatment.type}\n`;
  if (animal.notes) text += `Notes: ${animal.notes}\n`;

  return text;
};

export const generateReproEventShareText = (event: ReproductionEvent, animalTag: string) => {
  let text = `*Reproduction Record: ${animalTag}*\n`;
  text += `Type: ${event.type}\n`;
  text += `Date: ${event.date}\n`;
  if (event.technician) text += `Technician: ${event.technician}\n`;
  if (event.semenName) text += `Semen: ${event.semenName}\n`;
  if (event.bullId) text += `Bull: ${event.bullId}\n`;
  if (event.details) text += `Details: ${event.details}\n`;
  if (event.type === ReproEventType.PREGNANCY_CHECK) {
    text += `Result: ${event.success ? 'PREGNANT' : 'NON-PREGNANT'}\n`;
  }
  return text;
};

export const generateHealthEventShareText = (event: HealthEvent, animalTag: string) => {
  let text = `*Health Record: ${animalTag}*\n`;
  text += `Type: ${event.type}\n`;
  text += `Date: ${event.date}\n`;
  if (event.technician) text += `Technician: ${event.technician}\n`;
  if (event.medication) text += `Medication: ${event.medication}\n`;
  if (event.dosage) text += `Dosage: ${event.dosage}\n`;
  if (event.treatments && event.treatments.length > 0) {
    const rx = event.treatments.map(t => `${t.name} (${t.dose})`).join(', ');
    text += `Treatments: ${rx}\n`;
  }
  if (event.details) text += `Details: ${event.details}\n`;
  return text;
};

export const generateListShareText = (title: string, items: { tag: string; value: string }[]) => {
  let text = `*${title}*\n`;
  text += `Total: ${items.length}\n\n`;
  items.slice(0, 50).forEach((item, i) => {
    text += `${i + 1}. ${item.tag}: ${item.value}\n`;
  });
  if (items.length > 50) text += `\n...and ${items.length - 50} more.`;
  return text;
};

export const generateMedicineInventoryShareText = (
  medicines: Medicine[],
  filterLabel: string = 'All Items',
  farmName?: string
) => {
  const lowCount = medicines.filter(m => {
    const total = (m.packs * m.loosePerPack) + m.loose;
    return total < m.minStockLevel && total > 0;
  }).length;
  const outCount = medicines.filter(m => ((m.packs * m.loosePerPack) + m.loose) === 0).length;

  let text = `*💊 Medicine Inventory Report*\n`;
  if (farmName) text += `🏢 *${farmName}*\n`;
  text += `📋 Filter: *${filterLabel}*\n`;
  text += `📊 Total Listed: ${medicines.length} | ⚠️ Low: ${lowCount} | ❌ Out: ${outCount}\n\n`;

  medicines.slice(0, 40).forEach((m, idx) => {
    const totalUnits = (m.packs * m.loosePerPack) + m.loose;
    const isOut = totalUnits === 0;
    const isLow = totalUnits < m.minStockLevel && !isOut;
    const statusIcon = isOut ? '❌ OUT OF STOCK' : isLow ? '⚠️ LOW STOCK' : '🟢 OK';

    text += `${idx + 1}. *${m.name}* [${m.category}]\n`;
    text += `   • Stock: ${m.packs} packs + ${m.loose} ${m.unit} (${totalUnits} ${m.unit} total)\n`;
    text += `   • Min Level: ${m.minStockLevel} ${m.unit} | ${statusIcon}\n`;
    if (isLow || isOut) {
      const shortfall = m.minStockLevel - totalUnits;
      const recPacks = m.loosePerPack > 0 ? Math.ceil(shortfall / m.loosePerPack) : 0;
      text += `   • Shortfall: ${shortfall} ${m.unit} (Order ~${recPacks} pk)\n`;
    }
  });

  if (medicines.length > 40) {
    text += `\n...and ${medicines.length - 40} additional medicines in inventory.`;
  }

  text += `\n_Generated via AgroVet Pro Management_`;
  return text;
};

export const generateLowStockAlertShareText = (
  medicines: Medicine[],
  farmName?: string
) => {
  const lowStock = medicines.filter(m => {
    const total = (m.packs * m.loosePerPack) + m.loose;
    return total < m.minStockLevel;
  });

  let text = `*🚨 URGENT: Medicine Low Stock / Reorder Alert*\n`;
  if (farmName) text += `🏢 *${farmName}*\n`;
  text += `⚠️ Items requiring replenishment: *${lowStock.length}*\n\n`;

  if (lowStock.length === 0) {
    text += `✅ All medicines are currently well-stocked above minimum thresholds!`;
    return text;
  }

  lowStock.forEach((m, idx) => {
    const totalUnits = (m.packs * m.loosePerPack) + m.loose;
    const isOut = totalUnits === 0;
    const shortfall = m.minStockLevel - totalUnits;
    const recPacks = m.loosePerPack > 0 ? Math.ceil(shortfall / m.loosePerPack) : 1;

    text += `${idx + 1}. *${m.name}* [${m.category}]\n`;
    text += `   • Status: ${isOut ? '❌ DEPLETED (0 stock)' : `⚠️ Low (${totalUnits} ${m.unit} left)`}\n`;
    text += `   • Threshold: ${m.minStockLevel} ${m.unit} | Shortfall: ${shortfall} ${m.unit}\n`;
    text += `   • 📦 *Suggested Order: ${recPacks} pack(s)* (${m.loosePerPack} ${m.unit}/pack)\n\n`;
  });

  text += `_Please confirm orders with veterinary pharmacy supplier._`;
  return text;
};

export const generateHealthReportShareText = (
  events: HealthEvent[],
  animals: Animal[],
  filterLabel: string = 'Clinical History',
  farmName?: string
) => {
  let text = `*🏥 Clinical & Health Activity Report*\n`;
  if (farmName) text += `🏢 *${farmName}*\n`;
  text += `📅 Scope: *${filterLabel}*\n`;
  text += `📋 Total Treatments Logged: *${events.length}*\n\n`;

  events.slice(0, 35).forEach((e, idx) => {
    const animal = animals.find(a => a.id === e.animalId);
    const medDetails = [
      e.medication,
      ...(e.treatments?.map(t => `${t.name} (${t.dose})`) || [])
    ].filter(Boolean).join(', ') || 'No medication';

    text += `${idx + 1}. *[${e.date}] Cow ${animal?.tag || 'Unk'}* ${animal?.breed ? `(${animal.breed})` : ''}\n`;
    text += `   • Case: ${e.type}${e.details ? ` - ${e.details}` : ''}\n`;
    text += `   • Rx: ${medDetails}\n`;
    if (e.technician) text += `   • Vet/Tech: ${e.technician}\n`;
  });

  if (events.length > 35) {
    text += `\n...and ${events.length - 35} more clinical cases.`;
  }

  text += `\n_Generated via AgroVet Pro Management_`;
  return text;
};

export const generateDemandForecastShareText = (
  predictions: {
    medicine: Medicine;
    pastUsage: number;
    projected: number;
    currentStock: number;
    shortfall: number;
    recommendedPacks: number;
  }[],
  farmName?: string
) => {
  const atRisk = predictions.filter(p => p.shortfall > 0);

  let text = `*📈 30-Day Medicine Demand & Stock Forecast*\n`;
  if (farmName) text += `🏢 *${farmName}*\n`;
  text += `📊 Analyzed Items: ${predictions.length} | ⚠️ Projected Shortages: ${atRisk.length}\n\n`;

  predictions.forEach((p, idx) => {
    const isShort = p.shortfall > 0;
    text += `${idx + 1}. *${p.medicine.name}* (${p.medicine.category})\n`;
    text += `   • Current Stock: ${p.currentStock} ${p.medicine.unit}\n`;
    text += `   • Past 30D Use: ${p.pastUsage} ${p.medicine.unit} → Forecast: ${p.projected} ${p.medicine.unit}\n`;
    if (isShort) {
      text += `   • ⚠️ *Shortfall Risk: ${p.shortfall} ${p.medicine.unit}* (Order ~${p.recommendedPacks} packs)\n`;
    } else {
      text += `   • 🟢 Stock Sufficient for next 30 days\n`;
    }
  });

  text += `\n_Generated via AgroVet Pro Management_`;
  return text;
};

export const generatePdCheckShareText = (
  events: ReproductionEvent[],
  animals: Animal[],
  filterLabel: string = 'PD Checks',
  farmName?: string
) => {
  const pdEvents = events.filter(e => e.type === ReproEventType.PREGNANCY_CHECK);
  const pregCount = pdEvents.filter(e => e.pregnancyResult === 'Pregnant' || e.success === true).length;
  const openCount = pdEvents.filter(e => e.pregnancyResult === 'Non-Pregnant' || (e.success === false && e.pregnancyResult !== 'Pregnant')).length;

  let text = `*🤰 Pregnancy Diagnosis (PD) Report*\n`;
  if (farmName) text += `🏢 *${farmName}*\n`;
  text += `📅 Scope: *${filterLabel}*\n`;
  text += `📋 Total Exams: ${pdEvents.length} | 🤰 Pregnant: ${pregCount} | ❌ Open/Non-Pregnant: ${openCount}\n\n`;

  pdEvents.slice(0, 40).forEach((e, idx) => {
    const animal = animals.find(a => a.id === e.animalId);
    const isPreg = e.pregnancyResult === 'Pregnant' || e.success === true;
    text += `${idx + 1}. *${e.date}* - Cow *${animal?.tag || 'Unk'}*: ${isPreg ? '🤰 PREGNANT' : '❌ NON-PREGNANT'}${e.details ? ` (${e.details})` : ''}\n`;
  });

  if (pdEvents.length > 40) {
    text += `\n...and ${pdEvents.length - 40} more PD examinations.`;
  }

  text += `\n_Generated via AgroVet Pro Management_`;
  return text;
};

