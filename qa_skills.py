import re
import json

with open('client/src/engine/registries/HeroRegistry.js', 'r') as f:
    hero_code = f.read()
    
# Extract the HeroRegistry object
hero_code = hero_code[hero_code.find('export const HeroRegistry = ')+28:]
# Find the ending };
hero_code = hero_code[:hero_code.rfind('};')+1]

# Parsing Javascript object into JSON can be tricky due to trailing commas, but we can use ast or just regex
hero_dict = {}
for match in re.finditer(r'"([a-zA-Z0-9-]+)":\s*{([^}]+)}', hero_code):
    hero_id = match.group(1)
    content = match.group(2)
    name_match = re.search(r'"name":\s*"([^"]+)"', content)
    skills_match = re.search(r'"skillIds":\s*\[(.*?)\]', content, re.DOTALL)
    
    if name_match and skills_match:
        name = name_match.group(1)
        skills = [s.strip().strip('"') for s in skills_match.group(1).split(',') if s.strip()]
        hero_dict[hero_id] = {'name': name, 'skills': skills}

with open('client/src/engine/registries/SkillRegistry.js', 'r') as f:
    skill_code = f.read()

# Extract skill configurations
# Format: 'skill-id': { ... }
skill_dict = {}
for match in re.finditer(r"'([a-zA-Z0-9-]+)':\s*{", skill_code):
    skill_id = match.group(1)
    
    # Try to extract the block
    start = match.end() - 1
    brace_count = 1
    i = start + 1
    while i < len(skill_code) and brace_count > 0:
        if skill_code[i] == '{': brace_count += 1
        elif skill_code[i] == '}': brace_count -= 1
        i += 1
        
    block = skill_code[start:i]
    
    # Check if the block has hooks, onUse, onReact
    has_logic = 'hooks:' in block or 'onUse:' in block or 'onReact:' in block or 'canUse:' in block or 'canPlay:' in block
    
    # Check if it has name
    name_match = re.search(r"name:\s*'([^']+)'", block)
    name = name_match.group(1) if name_match else skill_id
    
    skill_dict[skill_id] = {'name': name, 'has_logic': has_logic, 'block_length': len(block)}

# QA Check
print("=== THỐNG KÊ LỖI ===")
for hero_id, hero in hero_dict.items():
    for skill_id in hero['skills']:
        if skill_id not in skill_dict:
            print(f"- Tướng {hero['name']} ({hero_id}): Thiếu kỹ năng '{skill_id}' trong SkillRegistry!")
        else:
            if not skill_dict[skill_id]['has_logic']:
                print(f"- Tướng {hero['name']} ({hero_id}): Kỹ năng '{skill_id}' chỉ là vỏ rỗng (chưa có logic code)!")

