import pandas as pd
import json
import re

def process_excel(file_path):
    xls = pd.ExcelFile(file_path)
    
    heroes_js = "export const HEROES = [\n"
    
    faction_map = {
        'Lạc (Thục)': 'Lạc',
        'Việt (Nguỵ)': 'Việt',
        'Hà (Ngô)': 'Hà',
        'Sơn (Quần Hùng)': 'Sơn'
    }
    
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if df.empty: continue
        
        faction = faction_map.get(sheet_name)
        if not faction: continue
        
        heroes_js += f"  // {faction.upper()}\n"
        
        active_df = df[df['Trạng thái'] == 'active'] if 'Trạng thái' in df.columns else df
        
        for idx, row in active_df.iterrows():
            name = str(row['Tướng'])
            hp = str(row.get('HP', '3')).replace('.0', '')
            gender = str(row.get('Giới tính', 'Nam'))
            image = str(row.get('Ảnh', ''))
            
            # Simple id logic
            import unicodedata
            slug = name.lower().replace('đ', 'd').replace(' ', '-')
            slug = unicodedata.normalize('NFD', slug).encode('ascii', 'ignore').decode('utf-8')
            slug = ''.join(c for c in slug if c.isalnum() or c == '-')
            
            desc_full = str(row.get('Mô Tả Tướng (Wiki)', ''))
            lines = [l.strip() for l in desc_full.split('\n') if l.strip()]
            
            skills = []
            bio = ""
            
            # Parse skills and bio
            # Typically bio is the last line wrapped in quotes
            if lines and lines[-1].startswith('"') and lines[-1].endswith('"'):
                bio = lines[-1].replace('"', '')
                lines = lines[:-1]
                
            # Now parse skills (Name followed by Description)
            # Some lines are like: "Thủy Tổ" \n "Trong giai đoạn..."
            # Some lines might have (Chủ Công Kỹ)
            current_skill = None
            for line in lines:
                if line.startswith('"') and line.endswith('"') and not current_skill:
                    # Maybe another bio quote inside?
                    bio = line.replace('"', '')
                    continue
                    
                # Heuristic: if it's short and doesn't end with a period, it might be a skill name
                if (not current_skill and len(line) < 40 and not line.endswith('.')) or ('(Chủ Công' in line) or ('(Tỏa Định' in line) or ('(Hạn Định' in line):
                    # It's a skill name
                    current_skill = {"name": line, "desc": ""}
                    skills.append(current_skill)
                else:
                    if current_skill:
                        if current_skill["desc"]:
                            current_skill["desc"] += " " + line
                        else:
                            current_skill["desc"] = line
                    else:
                        # No skill name yet, just put it in a default skill
                        current_skill = {"name": "Kỹ Năng", "desc": line}
                        skills.append(current_skill)
            
            # Format JS object
            skills_js = "[\n"
            for s in skills:
                # Escape single quotes
                desc_escaped = s['desc'].replace("'", "\\'")
                name_escaped = s['name'].replace("'", "\\'")
                skills_js += f"      {{ name: '{name_escaped}', desc: '{desc_escaped}' }},\n"
            skills_js += "    ]"
            
            bio_escaped = bio.replace("'", "\\'")
            
            heroes_js += f"  {{\n"
            heroes_js += f"    id: '{slug}', name: '{name}', maxHp: {hp}, faction: '{faction}', gender: '{gender}', image: '{image}',\n"
            heroes_js += f"    skills: {skills_js}, bio: '{bio_escaped}',\n"
            heroes_js += f"  }},\n"
            
    heroes_js += "];\n"
    
    # Write to gameData.js
    with open('client/src/data/gameData.js', 'r') as f:
        content = f.read()
        
    start_idx = content.find('export const HEROES = [')
    end_idx = content.find('export const CARD_TYPES = {')
    
    if start_idx != -1 and end_idx != -1:
        new_content = content[:start_idx] + heroes_js + '\n' + content[end_idx:]
        with open('client/src/data/gameData.js', 'w') as f:
            f.write(new_content)
        print("Updated gameData.js successfully!")
    else:
        print("Markers not found in gameData.js")
        with open('docs/heroes_debug.js', 'w') as f:
            f.write(heroes_js)

if __name__ == '__main__':
    process_excel('docs/hero.xlsx')
