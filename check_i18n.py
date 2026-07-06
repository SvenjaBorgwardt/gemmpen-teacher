#!/usr/bin/env python3
import json
import re
import os
from pathlib import Path
from collections import defaultdict

# Load locales
de_path = "locales/de.json"
en_path = "locales/en.json"

with open(de_path) as f:
    de_locale = json.load(f)
with open(en_path) as f:
    en_locale = json.load(f)

de_keys = set(de_locale.keys())
en_keys = set(en_locale.keys())

print("=== LOCALE KEYS COMPARISON ===")
print(f"German keys: {len(de_keys)}")
print(f"English keys: {len(en_keys)}")

missing_in_de = en_keys - de_keys
missing_in_en = de_keys - en_keys

if missing_in_de:
    print(f"\nMissing in de.json ({len(missing_in_de)}):")
    for key in sorted(missing_in_de):
        print(f"  - {key}")

if missing_in_en:
    print(f"\nMissing in en.json ({len(missing_in_en)}):")
    for key in sorted(missing_in_en):
        print(f"  - {key}")

if not missing_in_de and not missing_in_en:
    print("\n✓ All keys match between de.json and en.json")

# Now search for hardcoded strings in JSX/TS files
print("\n=== HARDCODED STRING SEARCH ===")

# Patterns to look for hardcoded strings (not in t() calls)
# We'll look for common UI strings
hardcoded_patterns = [
    (r'>\s*["\']([^"\']{3,})["\']', 'text content'),
    (r'placeholder=\s*["\']([^"\']{3,})["\']', 'placeholder'),
    (r'title=\s*["\']([^"\']{3,})["\']', 'title'),
    (r'aria-label=\s*["\']([^"\']{3,})["\']', 'aria-label'),
    (r'alt=\s*["\']([^"\']{3,})["\']', 'alt text'),
]

hardcoded_found = defaultdict(list)
exclude_words = {'page', 'div', 'span', 'button', 'input', 'form', 'component'}

for root, dirs, files in os.walk('app'):
    # Skip .next and node_modules
    dirs[:] = [d for d in dirs if d not in ['.next', 'node_modules', '__pycache__']]
    
    for file in files:
        if not file.endswith(('.tsx', '.ts')):
            continue
        
        filepath = os.path.join(root, file)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
            # Skip if file imports useI18n or has proper i18n setup
            if 'useI18n' in content or "from '@/lib/i18n'" in content or 'const { t }' in content:
                continue
            
            # Look for suspicious strings
            for pattern, desc in hardcoded_patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    text = match.group(1)
                    # Filter out obvious non-content
                    if len(text) > 2 and not any(w in text.lower() for w in exclude_words):
                        hardcoded_found[filepath].append((desc, text))

if hardcoded_found:
    print(f"\nFound {len(hardcoded_found)} files with potential hardcoded strings:")
    for filepath in sorted(hardcoded_found.keys()):
        print(f"\n{filepath}:")
        for desc, text in hardcoded_found[filepath][:5]:  # Limit to first 5
            print(f"  [{desc}] {text[:60]}")
else:
    print("✓ No obvious hardcoded strings found in app/ (components use useI18n)")

# Check for missing useI18n in components that should use it
print("\n=== COMPONENT i18n USAGE ===")
tsx_files = []
for root, dirs, files in os.walk('app'):
    dirs[:] = [d for d in dirs if d not in ['.next', 'node_modules']]
    for file in files:
        if file.endswith('.tsx'):
            tsx_files.append(os.path.join(root, file))

no_i18n = []
for filepath in tsx_files:
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        if 'useI18n' not in content and 'i18n' not in content and len(content) > 200:
            # Likely a page/component that should have i18n
            if 'layout' not in filepath.lower() and 'api' not in filepath:
                no_i18n.append(filepath)

if no_i18n:
    print(f"\n⚠ {len(no_i18n)} components may need i18n review:")
    for f in no_i18n[:10]:
        print(f"  - {f}")
else:
    print("✓ All components appear to have i18n imports")

print("\n=== SUMMARY ===")
status_ok = not missing_in_de and not missing_in_en and not hardcoded_found
if status_ok:
    print("✓ i18n setup looks complete")
else:
    print("✗ Issues found - see above")

