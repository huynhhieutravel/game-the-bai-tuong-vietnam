import subprocess

empty_skills = [
    'thiet-ma', 'doi-nui', 'tien-duyen-active', 'duyen-tien', 'tien-duyen-passive', 
    'dam-bac', 'khai-thien', 'than-giap', 'than-hoa', 'linh-giam', 'ky-tap', 
    'binh-ngo', 'nghe-an-ke', 'nhiep-chinh', 'thinh-chinh', 'ung-bien', 
    'quoc-sac', 'nam-duoc', 'khai-quoc', 'phat-toi', 'quan-co', 'pha-quan', 'ho-gia'
]

print("=== CHECK USAGE IN CODEBASE ===")
for skill in empty_skills:
    # Use ripgrep or grep to find the skill id outside of HeroRegistry, SkillRegistry, and SkillDescriptions
    cmd = f"rg -l '{skill}' client/src/engine/ client/src/App.jsx | grep -v 'HeroRegistry.js' | grep -v 'SkillRegistry.js' | grep -v 'SkillDescriptions.js' | grep -v 'SkillRules.js' | grep -v 'data/heroes.js' | grep -v 'phase4_backup'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    files = result.stdout.strip().split('\n')
    files = [f for f in files if f]
    if files:
        print(f"- {skill}: implemented/used in {', '.join(files)}")
    else:
        print(f"- {skill}: NOT IMPLEMENTED ANYWHERE (True Empty)")

