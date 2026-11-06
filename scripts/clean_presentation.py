import re

with open(r'd:\alphatable testing\src\pages\PresentationPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize CRLF
content = content.replace('\r\n', '\n')

# Remove isPreview
content = re.sub(r'  const isPreview = searchParams\.get\(\'preview\'\) === \'true\';[^\n]*\n', '', content)

# Remove viewportSize state & useEffect
content = re.sub(
    r'  const \[viewportSize, setViewportSize\] = useState\(\{[\s\S]*?return \(\) => window\.removeEventListener\(\'resize\', updateViewportSize\);\s*\}, \[\]\);\n',
    '',
    content
)

# Remove size indicator and background image from JSX
content = re.sub(
    r'      <div className="presentation-size-indicator"[\s\S]*?\{\/\* Lower Third presentation block \*\/\}',
    '{/* Lower Third presentation block */}',
    content
)

with open(r'd:\alphatable testing\src\pages\PresentationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
