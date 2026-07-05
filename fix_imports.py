import re

with open('client/src/engine/registries/SkillRegistry.js', 'r') as f:
    content = f.read()

# Add imports at the top
if 'import * as Effects' not in content:
    content = re.sub(r"import \{ getAttackRange", "import * as Effects from '../core/Effects';\nimport * as Actions from '../core/Actions';\nimport { getAttackRange", content)

def replace_async_imports(text):
    # Find all import().then(...)
    pattern = r"import\('\.\./core/(?:Effects|Actions)'\)\.then\((?:[a-zA-Z_]+|\{.*?\}|\(\))\s*=>\s*\{"
    
    while True:
        match = re.search(pattern, text)
        if not match:
            break
            
        start_idx = match.start()
        block_start = match.end() - 1 # The opening '{'
        
        # Find the matching closing brace
        brace_count = 1
        i = block_start + 1
        while i < len(text):
            if text[i] == '{':
                brace_count += 1
            elif text[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    break
            i += 1
            
        block_end = i
        
        # Check if it's followed by `);` or `)`
        end_idx = block_end + 1
        if text[block_end+1:block_end+3] == ');':
            end_idx += 2
        elif text[block_end+1] == ')':
            end_idx += 1
            
        # Replace the start with `{` and the end with `}`
        # Wait, if we just replace the start with `{`, we can just keep the `}` as is, and remove the `);`
        new_text = text[:start_idx] + "{" + text[block_start+1:block_end] + "}" + text[end_idx:]
        text = new_text
        
    return text

new_content = replace_async_imports(content)

with open('client/src/engine/registries/SkillRegistry.js', 'w') as f:
    f.write(new_content)

