with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "Cow {doseModalData.animalTag} • {doseModalData.dayNumber ?  : 'Scheduled Dose'}",
    "Cow {doseModalData.animalTag} • {doseModalData.dayNumber ? `Day ${doseModalData.dayNumber} of ${doseModalData.totalDays}` : 'Scheduled Dose'}"
)

content = content.replace(
    "{t.name} {t.dose ?  : ''}",
    "{t.name} {t.dose ? `(${t.dose})` : ''}"
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('fix_script completed!')
