import re
from pathlib import Path
root = Path('backend/src')
for path in root.rglob('*.js'):
    text = path.read_text(encoding='utf-8')
    for pat in [r"query\\s*\\(\\s*`([^`]+)`\\s*,\\s*\\[([^\\]]*)\\]", r"query\\s*\\(\\s*'([^']+)'\\s*,\\s*\\[([^\\]]*)\\]"]:
        for m in re.finditer(pat, text, re.S):
            sql = m.group(1)
            params = m.group(2)
            placeholder_count = len(re.findall(r"\\$\\d+", sql))
            param_count = len([p for p in re.split(r",\\s*", params.strip()) if p])
            if placeholder_count != param_count:
                print(path, 'placeholder_count', placeholder_count, 'param_count', param_count)
                print(sql)
                print('---')
