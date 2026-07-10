const fs = require('fs');
const content = fs.readFileSync('../src/App.jsx', 'utf8');

// A very simple regex-based JSX tag matcher
let tags = [];
let i = 0;
let line = 1;
let col = 1;

while (i < content.length) {
  const char = content[i];
  if (char === '\n') {
    line++;
    col = 1;
    i++;
    continue;
  }

  // Skip comments and strings to avoid matching tags in strings
  if (content.startsWith('/*', i)) {
    const end = content.indexOf('*/', i + 2);
    if (end === -1) break;
    i = end + 2; continue;
  }
  if (content.startsWith('//', i)) {
    const end = content.indexOf('\n', i + 2);
    if (end === -1) break;
    i = end; continue;
  }
  if (char === '"' || char === "'") {
    let quote = char;
    i++;
    while (i < content.length && content[i] !== quote) {
      if (content[i] === '\\') i += 2;
      else i++;
    }
    i++; continue;
  }
  if (char === '`') {
    i++;
    while (i < content.length && content[i] !== '`') {
      if (content[i] === '\\') i += 2;
      else i++;
    }
    i++; continue;
  }

  // Look for tags
  if (char === '<') {
    // Check if it is a comment
    if (content.startsWith('<!--', i)) {
      const end = content.indexOf('-->', i + 4);
      if (end === -1) break;
      i = end + 3; continue;
    }

    // Check if it is a closing tag
    if (content[i + 1] === '/') {
      const end = content.indexOf('>', i + 2);
      if (end === -1) break;
      const tagName = content.slice(i + 2, end).trim().split(/\s+/)[0];
      const last = tags.pop();
      if (!last) {
        console.log(`Unmatched closing tag </${tagName}> on line ${line}`);
      } else if (last.name !== tagName) {
        console.log(`Mismatched tag: opened <${last.name}> on line ${last.line}, closed with </${tagName}> on line ${line}`);
      }
      i = end + 1; continue;
    }

    // Check if it is an opening tag or self-closing tag
    // Allow characters like a-zA-Z, no spaces right after <
    if (/[a-zA-Z]/.test(content[i + 1])) {
      const end = content.indexOf('>', i + 1);
      if (end === -1) break;
      const tagContent = content.slice(i + 1, end).trim();
      const isSelfClosing = tagContent.endsWith('/');
      const tagName = tagContent.split(/\s+/)[0].replace(/\/$/, '');
      
      if (!isSelfClosing && tagName !== 'input' && tagName !== 'img' && tagName !== 'br' && tagName !== 'hr' && tagName !== 'rect' && tagName !== 'path' && tagName !== 'circle' && tagName !== 'line') {
        tags.push({ name: tagName, line });
      }
      i = end + 1; continue;
    }
  }

  i++;
  col++;
}

console.log(`Finished tag check. Unclosed tags remaining:`, tags);
