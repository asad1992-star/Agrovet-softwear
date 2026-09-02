with open('src/App.tsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix the two syntax lines
# Line 8928 fix
content = content.replace('dose: updated[idx].dose ||  };', 'dose: updated[idx].dose || `1 ${unit}` };')

# Line 9343 fix
bad_placeholder = '''              placeholder={"101 Pregnant
102 Open
103 Preg
104 P
105 O"}'''

good_placeholder = '''              placeholder="101 Pregnant\\n102 Open\\n103 Preg\\n104 P\\n105 O"'''

content = content.replace(bad_placeholder, good_placeholder)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
