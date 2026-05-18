import { Animal, ReproductionEvent, HealthEvent, ReproEventType, HealthEventType } from '../types';

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
