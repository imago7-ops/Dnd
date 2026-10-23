"""Builds template.yaml from index.js, so the Lambda code is embedded in the template.
Run: python server/aws/build-template.py"""
from pathlib import Path
here = Path(__file__).parent
code = (here / 'index.js').read_text()
indented = ''.join('          ' + line if line.strip() else '\n' for line in code.splitlines(keepends=True))
template = (here / 'template.head.yaml').read_text().replace('__CODE__\n', indented)
(here / 'template.yaml').write_text(template)
print('wrote', here / 'template.yaml', len(template), 'bytes')
