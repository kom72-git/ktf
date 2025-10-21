#!/usr/bin/env python3

import re

# Seznam technických polí k úpravě
fields = [
    ('rytec', 'Rytec'),
    ('druhTisku', 'Druh tisku'),
    ('tiskovaForma', 'Tisková forma'),
    ('zoubkovani', 'Zoubkování'),
    ('papir', 'Papír'),
    ('rozmer', 'Rozměr'),
    ('naklad', 'Náklad')
]

# Čteme soubor
with open('/workspaces/ktf/src/StampCatalog.jsx', 'r') as f:
    content = f.read()

for field_name, field_label in fields:
    # Najdeme vzor pro dané pole
    pattern = rf'(<div className="stamp-spec-row">\s*<span className="stamp-spec-label">{re.escape(field_label)}</span>\s*<span className="stamp-spec-value">\s*{{isEditingAll \? \(\s*)<input\s*type="text"\s*value={{editStampData\.{field_name}}}\s*onChange=\{{.*?\}}\s*(?:onKeyDown=\{{.*?\}}\s*)?style=\{{.*?\}}\s*/>\s*\) : \(\s*(?:isEditingAll \? editStampData\.{field_name} : )?item\.{field_name}\s*\)}}\s*</span>\s*</div>)'
    
    replacement = f'''<div className="stamp-spec-row">
            <span className="stamp-spec-label">{field_label}</span>
            <span className="stamp-spec-value">
              {{isEditingAll ? (
                <div style={{{{display: 'flex', alignItems: 'center', gap: '5px'}}}}>
                  <input
                    type="text"
                    value={{editStampData.{field_name}}}
                    onChange={{(e) => setEditStampData({{...editStampData, {field_name}: e.target.value}})}}
                    style={{{{
                      flex: 1,
                      padding: '2px 4px',
                      border: '1px solid #d1d5db',
                      borderRadius: '3px',
                      fontSize: 'inherit',
                      background: '#fff'
                    }}}}
                  />
                  <button
                    onClick={{() => saveTechnicalField('{field_name}', editStampData.{field_name})}}
                    style={{{{
                      padding: '2px 6px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}}}
                  >
                    ✓
                  </button>
                </div>
              ) : (
                item.{field_name}
              )}}
            </span>
          </div>'''
    
    # Flexibilní vzor, který zachytí různé varianty
    pattern = rf'<div className="stamp-spec-row">\s*<span className="stamp-spec-label">{re.escape(field_label)}</span>\s*<span className="stamp-spec-value">\s*{{isEditingAll \? \([^}}]+editStampData\.{field_name}[^}}]+\) : \([^}}]*item\.{field_name}[^}}]*\)}}\s*</span>\s*</div>'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Zapíšeme soubor
with open('/workspaces/ktf/src/StampCatalog.jsx', 'w') as f:
    f.write(content)

print("Technická pole byla upravena!")