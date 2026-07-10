import os
import re

dir_path = '/Users/macbook/.gemini/antigravity/scratch/mac-cleanse-local/src/modules'

replacements = {
    r'bg-\[\#080808\]': 'bg-bg-main',
    r'bg-\[\#0C0C0C\]': 'bg-bg-panel',
    r'bg-\[\#0A0A0A\]': 'bg-bg-drawer',
    r'text-\[\#F5F5F0\]': 'text-text-main',
    r'text-white/95': 'text-text-main',
    r'text-white/90': 'text-text-main',
    r'text-white/70': 'text-text-sub',
    r'text-white/50': 'text-text-sub',
    r'text-white/40': 'text-text-muted',
    r'text-white/30': 'text-text-muted',
    r'text-white/20': 'text-text-muted',
    r'border-white/10': 'border-border-main',
    r'border-white/5': 'border-border-main',
    r'border-white/20': 'border-border-main',
    r'text-\[\#A1FF00\]': 'text-accent',
    r'bg-\[\#A1FF00\]': 'bg-accent',
    r'border-\[\#A1FF00\]': 'border-accent',
    r'text-white': 'text-text-main',
    r'bg-white/5': 'bg-text-main/5',
    r'bg-white/10': 'bg-text-main/10',
    r'bg-white/20': 'bg-text-main/20',
}

for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add lang, theme props to the component signature if missing
            if 'export default function' in content and '{ lang, theme }' not in content:
                content = re.sub(r'export default function (\w+)\(\) \{', r'export default function \1({ lang = "vi", theme = "dark" }) {', content)
            
            for pattern, repl in replacements.items():
                content = re.sub(pattern, repl, content)
                
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

print("Colors and props updated in all modules.")
