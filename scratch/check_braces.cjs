const fs = require('fs');
const content = fs.readFileSync('../src/App.jsx', 'utf8');

let braces = [];
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
  
  // Skip block comments
  if (content.startsWith('/*', i)) {
    const end = content.indexOf('*/', i + 2);
    if (end === -1) {
      console.log(`Unclosed comment starting on line ${line}:${col}`);
      break;
    }
    const comment = content.slice(i, end + 2);
    const lines = comment.split('\n');
    line += lines.length - 1;
    if (lines.length > 1) {
      col = lines[lines.length - 1].length + 1;
    } else {
      col += comment.length;
    }
    i = end + 2;
    continue;
  }
  
  // Skip line comments
  if (content.startsWith('//', i)) {
    const end = content.indexOf('\n', i + 2);
    if (end === -1) break;
    i = end;
    continue;
  }
  
  // Skip single/double quote strings
  if (char === '"' || char === "'") {
    let quote = char;
    let startLine = line;
    let startCol = col;
    i++; col++;
    while (i < content.length && content[i] !== quote) {
      if (content[i] === '\\') {
        i += 2;
        col += 2;
      } else if (content[i] === '\n') {
        line++;
        col = 1;
        i++;
      } else {
        i++;
        col++;
      }
    }
    if (i >= content.length) {
      console.log(`Unclosed string starting on line ${startLine}:${startCol}`);
    }
    i++; col++;
    continue;
  }

  // Skip backtick strings (template literals)
  if (char === '`') {
    let startLine = line;
    let startCol = col;
    i++; col++;
    while (i < content.length && content[i] !== '`') {
      if (content[i] === '\\') {
        i += 2;
        col += 2;
      } else if (content.startsWith('${', i)) {
        // We have an expression inside template literal!
        // We push a marker
        braces.push({ type: 'template_expr', line, col });
        i += 2;
        col += 2;
      } else if (content[i] === '\n') {
        line++;
        col = 1;
        i++;
      } else {
        i++;
        col++;
      }
    }
    i++; col++;
    continue;
  }
  
  if (char === '{') {
    braces.push({ type: 'brace', line, col });
  } else if (char === '}') {
    const last = braces.pop();
    if (!last) {
      console.log(`Unmatched closing brace } on line ${line}:${col}`);
    } else if (last.type === 'template_expr') {
      // closed a template expression, which behaves like a brace but we are back inside the template literal string
    }
  }
  
  i++;
  col++;
}

if (braces.length > 0) {
  console.log(`Unclosed braces left:`);
  for (const b of braces) {
    console.log(`  { opened on line ${b.line}:${b.col} (${b.type})`);
  }
} else {
  console.log('No unmatched braces found!');
}
