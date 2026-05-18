
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Animal, 
  ReproductionEvent, 
  HealthEvent, 
  FarmSettings, 
  ProtocolEnrollment, 
  ProtocolTemplate, 
  ReproEventType, 
  AnimalStatus
} from '../types';
import { dateUtils } from '../services/businessLogic';

const getThemeColors = (template: string): { 
  header: [number, number, number], 
  primary: [number, number, number], 
  accent: [number, number, number] 
} => {
  switch (template) {
    case 'Modern':
      return { header: [16, 185, 129], primary: [16, 185, 129], accent: [245, 158, 11] };
    case 'Minimalist':
      return { header: [30, 41, 59], primary: [71, 85, 105], accent: [148, 163, 184] };
    case 'Professional':
    default:
      return { header: [15, 23, 42], primary: [15, 23, 42], accent: [2, 132, 199] };
  }
};

const addHeader = (doc: jsPDF, title: string, settings?: FarmSettings) => {
  const colors = getThemeColors(settings?.pdfTemplate || 'Professional');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(22);
  doc.setTextColor(colors.header[0], colors.header[1], colors.header[2]);
  doc.text('Asad’s Management System', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(51, 65, 85);
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 32, { align: 'center' });
  
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 35, pageWidth - 14, 35);
};

export const generateIndividualAnimalReport = (
  animal: Animal,
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  rangeLabel: string,
  settings?: FarmSettings
) => {
  const doc = new jsPDF();
  const colors = getThemeColors(settings?.pdfTemplate || 'Professional');
  
  let reportType = "Animal Dossier";

  addHeader(doc, `${reportType}: ${animal.tag} | ${rangeLabel}`, settings);

  autoTable(doc, {
    startY: 45,
    head: [['Profile Attribute', 'Details']],
    body: [
      ['Tag ID', animal.tag],
      ['Serial Number', animal.id.slice(-6).toUpperCase()],
      ['Breed', animal.breed],
      ['Status', animal.status || 'Active'],
      ['Sex', animal.sex],
      ['DOB', animal.dob],
    ],
    theme: 'striped',
    headStyles: { fillColor: colors.primary }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  if (reproEvents.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(2, 132, 199);
    doc.text('Reproduction Log (Filtered)', 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Date', 'Type', 'Tech', 'Semen/Bull', 'Result']],
      body: reproEvents.map(e => {
        let result = '-';
        if (e.type === ReproEventType.PREGNANCY_CHECK) {
          result = e.success ? '+ve' : '-ve';
        } else if (e.type === ReproEventType.INSEMINATION) {
          // Check for subsequent PG check in the passed events
          const subsequentCheck = reproEvents.find(ev => ev.animalId === e.animalId && ev.type === ReproEventType.PREGNANCY_CHECK && ev.date >= e.date);
          result = subsequentCheck ? (subsequentCheck.success ? '+ve' : '-ve') : 'Pending';
        } else {
          result = e.success !== undefined ? (e.success ? 'Success' : 'Fail') : '-';
        }
        return [e.date, e.type, e.technician || '-', e.semenName || e.bullId || '-', result];
      }),
      theme: 'grid'
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  if (healthEvents.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(225, 29, 72);
    doc.text('Health Log (Filtered)', 14, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Date', 'Finding', 'Medication', 'Vet/Tech']],
    body: healthEvents.map(e => {
      const medicationDisplay = [
        e.medication,
        ...(e.treatments?.map(t => `${t.name} (${t.dose})`) || [])
      ].filter(Boolean).join(', ') || '-';
      
      return [e.date, e.details, medicationDisplay, e.technician || '-'];
    }),
    theme: 'grid'
  });
}

doc.save(`${animal.tag}_Report.pdf`);
};

export const generateProtocolReport = (
enrollment: ProtocolEnrollment,
template: ProtocolTemplate,
animal: Animal,
settings?: FarmSettings
) => {
const doc = new jsPDF();
addHeader(doc, `Protocol: ${template.name}`, settings);

autoTable(doc, {
  startY: 45,
  head: [['Attribute', 'Value']],
  body: [
    ['Animal Tag', animal.tag],
    ['Start Date', enrollment.startDate],
    ['Status', enrollment.status],
    ['Result', enrollment.result || 'Pending']
  ],
  theme: 'striped'
});

const stepsY = (doc as any).lastAutoTable.finalY + 15;
doc.setFontSize(14);
doc.text('Timeline', 14, stepsY);

autoTable(doc, {
  startY: stepsY + 5,
  head: [['Day', 'Date', 'Action', 'Status']],
  body: template.steps.map((step, idx) => [
    `Day ${step.dayOffset}`,
    dateUtils.addDays(enrollment.startDate, step.dayOffset),
    step.action,
    enrollment.completedStepIndices.includes(idx) ? 'Completed' : 'Pending'
  ]),
  headStyles: { fillColor: [59, 130, 246] }
});

doc.save(`Protocol_${animal.tag}.pdf`);
};

export const generateDashboardPDF = (stats: any, animals: Animal[], settings?: FarmSettings) => {
  const doc = new jsPDF();
  addHeader(doc, 'Livestock Analytics Summary', settings);

  autoTable(doc, {
    startY: 45,
    head: [['Key Performance Indicator', 'Current Value']],
    body: [
      ['Total Herd Count (Excl. Calves)', stats.total.toString()],
      ['Pregnant Animals', stats.pregnant.toString()],
      ['Open Animals', stats.open.toString()],
      ['Animals in Heat', stats.inHeat.toString()],
      ['Repeat Breeders (>3 Insems)', stats.repeatBreeders.toString()],
      ['Conception Rate (%)', `${stats.conceptionRate}%`],
      ['Sick Animals (Active Cases)', stats.sick.toString()],
      ['Recently Treated (7 Days)', stats.recentlyTreated.toString()],
      ['Dry Period Animals', stats.dry.toString()],
      ['Calving Due (Upcoming)', stats.calvingDue.toString()],
      ['Calving Overdue', stats.overdueCalving.toString()],
      ['Total Calf Population', stats.calves.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('Confidential Livestock Report - Automated Insight', 14, nextY);

  doc.save('Farm_Analytics_Dashboard.pdf');
};

export const generateReproSectionReport = (
  events: ReproductionEvent[], 
  animals: Animal[], 
  settings?: FarmSettings, 
  allEvents?: ReproductionEvent[],
  rangeLabel: string = 'Full Record'
) => {
  const doc = new jsPDF();
  addHeader(doc, `Reproduction Activity Log | ${rangeLabel}`, settings);
  
  const reproData = allEvents || events;
  // Filter out pregnancy checks from the rows as requested, focusing on primary events
  // Sort events newest first for the report
  const sortedEvents = [...events]
    .filter(e => e.type !== ReproEventType.PREGNANCY_CHECK)
    .sort((a, b) => b.date.localeCompare(a.date));

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Tag', 'Type', 'Tech', 'Semen', 'Result', 'Last PD Date']],
    body: sortedEvents.map(e => {
      const animal = animals.find(a => a.id === e.animalId);
      
      // Calculate Result based on subsequent checks for inseminations
      let result = '-';
      if (e.type === ReproEventType.INSEMINATION) {
        const checks = reproData
          .filter(ev => ev.animalId === e.animalId && ev.type === ReproEventType.PREGNANCY_CHECK && ev.date >= e.date)
          .sort((a, b) => a.date.localeCompare(b.date));
        const subsequentCheck = checks[0];
        result = subsequentCheck ? (subsequentCheck.success ? '+ve' : '-ve') : 'Pending';
      } else {
        result = e.success !== undefined ? (e.success ? 'Success' : 'Fail') : 'Done';
      }

      // Calculate Last PD Date
      const lastPdDate = reproData
        .filter(ev => ev.animalId === e.animalId && ev.type === ReproEventType.PREGNANCY_CHECK)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || 'Not Done';
      
      return [
        e.date, 
        animal?.tag || 'Unk', 
        e.type, 
        e.technician || '-', 
        e.semenName || e.bullId || '-', 
        result,
        lastPdDate
      ];
    }),
    headStyles: { fillColor: [2, 132, 199] },
    columnStyles: {
      6: { cellWidth: 30 }
    }
  });

  doc.save('Reproduction_Report.pdf');
};

export const generateHealthSectionReport = (events: HealthEvent[], animals: Animal[], settings?: FarmSettings, rangeLabel: string = 'Full Record') => {
const doc = new jsPDF();
addHeader(doc, `Health Activity Log | ${rangeLabel}`, settings);
autoTable(doc, {
  startY: 45,
  head: [['Date', 'Tag', 'Type', 'Medication', 'Vet/Tech', 'Details']],
  body: events.map(e => {
    const animal = animals.find(a => a.id === e.animalId);
    const medicationDisplay = [
      e.medication,
      ...(e.treatments?.map(t => `${t.name} (${t.dose})`) || [])
    ].filter(Boolean).join(', ') || '-';
    
    return [e.date, animal?.tag || 'Unk', e.type, medicationDisplay, e.technician || '-', e.details];
  }),
  headStyles: { fillColor: [225, 29, 72] }
});
doc.save('Health_Report.pdf');
};

export const generateAnimalListReport = (animals: Animal[], settings?: FarmSettings, filterLabel: string = 'All Animals') => {
const doc = new jsPDF();
addHeader(doc, `Herd List | ${filterLabel}`, settings);
autoTable(doc, {
  startY: 45,
  head: [['S.No', 'Tag', 'Breed', 'Status', 'Herd', 'DOB']],
  body: animals.map((a, index) => [index + 1, a.tag, a.breed, a.status || 'Active', a.herd, a.dob]),
  headStyles: { fillColor: [59, 130, 246] }
});
doc.save('Herd_List_Report.pdf');
};

export const generateProtocolListReport = (
  enrollments: ProtocolEnrollment[], 
  protocols: ProtocolTemplate[], 
  animals: Animal[], 
  settings?: FarmSettings,
  filterLabel: string = 'Active Protocols'
) => {
  const doc = new jsPDF();
  
  enrollments.forEach((enrollment, index) => {
    if (index > 0) doc.addPage();
    addHeader(doc, `Protocol Batch Report | ${filterLabel}`, settings);
    
    const template = protocols.find(p => p.id === enrollment.templateId);
    const batchAnimals = enrollment.animalIds.map(id => animals.find(a => a.id === id)).filter(Boolean) as Animal[];
    const animalTags = batchAnimals.map(a => a.tag).join(', ');

    autoTable(doc, {
      startY: 45,
      head: [['Batch Attribute', 'Details']],
      body: [
        ['Protocol Name', template?.name || 'Unknown'],
        ['Enrolled Cows', animalTags || 'None'],
        ['Start Date', enrollment.startDate],
        ['Status', enrollment.status],
        ['Progress', template ? `${enrollment.completedStepIndices.length}/${template.steps.length}` : '-']
      ],
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] }
    });

    const stepsY = (doc as any).lastAutoTable.finalY + 15;
    
    if (template) {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Protocol Timeline', 14, stepsY);

      autoTable(doc, {
        startY: stepsY + 5,
        head: [['Day', 'Planned Date', 'Action Step', 'Status']],
        body: template.steps.map((step, idx) => [
          `Day ${step.dayOffset}`,
          dateUtils.addDays(enrollment.startDate, step.dayOffset),
          step.action,
          enrollment.completedStepIndices.includes(idx) ? 'Completed' : 'Pending'
        ]),
        headStyles: { fillColor: [59, 130, 246] }
      });
    }
  });

  doc.save(`Protocol_Batch_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
