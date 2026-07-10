const fs = require('fs');
const content = fs.readFileSync('../src/App.jsx', 'utf8');

let braces = 0;
let brackets = 0;
let parens = 0;
let inString = null; // " or ' or ` or null
let escapeNext = false;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (inString) {
      if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
    if (char === '(') parens++;
    if (char === ')') parens--;

    if (braces < 0) {
      console.log(`Unmatched closing brace } on line ${i + 1}:${j + 1}`);
      braces = 0;
    }
    if (brackets < 0) {
      console.log(`Unmatched closing bracket ] on line ${i + 1}:${j + 1}`);
      brackets = 0;
    }
    if (parens < 0) {
      console.log(`Unmatched closing parenthesis ) on line ${i + 1}:${j + 1}`);
      parens = 0;
    }
  }
}

console.log(`Final counts: braces=${braces}, brackets=${brackets}, parens=${parens}`);
