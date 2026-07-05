import re

with open('client/src/engine/registries/SkillDescriptions.js', 'r') as f:
    desc_code = f.read()

# Parse SkillDescriptions
desc_dict = {}
for match in re.finditer(r'"([a-zA-Z0-9-]+)":\s*"([^"]+)"', desc_code):
    desc_dict[match.group(1)] = match.group(2)

with open('client/src/engine/registries/SkillRegistry.js', 'r') as f:
    skill_code = f.read()

# Parse SkillRegistry
reg_dict = {}
for match in re.finditer(r"'([a-zA-Z0-9-]+)':\s*{.*?name:\s*'([^']+)'", skill_code, re.DOTALL):
    # This regex is a bit fragile due to DOTALL and lazy match, let's use a safer one
    pass
    
# Safer way for SkillRegistry
reg_dict = {}
for match in re.finditer(r"'([a-zA-Z0-9-]+)':\s*{", skill_code):
    skill_id = match.group(1)
    
    start = match.end() - 1
    brace_count = 1
    i = start + 1
    while i < len(skill_code) and brace_count > 0:
        if skill_code[i] == '{': brace_count += 1
        elif skill_code[i] == '}': brace_count -= 1
        i += 1
        
    block = skill_code[start:i]
    name_match = re.search(r"name:\s*'([^']+)'", block)
    if name_match:
        reg_dict[skill_id] = name_match.group(1)

print("=== SO SÁNH TÊN KỸ NĂNG ===")
for skill_id, desc_name in desc_dict.items():
    if skill_id in reg_dict:
        reg_name = reg_dict[skill_id]
        if desc_name != reg_name and not reg_name.startswith(desc_name):
            print(f"LỆCH TÊN: {skill_id} -> SkillDescriptions='{desc_name}' vs SkillRegistry='{reg_name}'")
    else:
        print(f"THIẾU TRONG REGISTRY: {skill_id} ('{desc_name}') có trong Descriptions nhưng không có trong Registry!")

print("---")
for skill_id, reg_name in reg_dict.items():
    if skill_id not in desc_dict:
        print(f"THIẾU TRONG DESCRIPTIONS: {skill_id} ('{reg_name}') có trong Registry nhưng không có trong Descriptions!")

