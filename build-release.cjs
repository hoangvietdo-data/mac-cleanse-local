const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Building Release Package ===');

const releaseDir = path.join(__dirname, 'release');

// Helper to remove directory recursively
function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// Helper function to copy recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Clean release directory
console.log('Cleaning old release directory...');
cleanDir(releaseDir);
fs.mkdirSync(releaseDir, { recursive: true });

// 2. Build frontend (Vite build + frontend obfuscation)
console.log('Building and obfuscating frontend...');
execSync('npm run build', { stdio: 'inherit' });

// 3. Copy dist/ to release/dist/
console.log('Copying build assets to release...');
fs.mkdirSync(path.join(releaseDir, 'dist'), { recursive: true });
copyRecursiveSync(path.join(__dirname, 'dist'), path.join(releaseDir, 'dist'));

// 4. Obfuscate server.cjs into release/server.cjs
console.log('Obfuscating backend server...');
execSync('npx javascript-obfuscator server.cjs --output release/server.cjs --target node --compact true', { stdio: 'inherit' });

// 5. Copy package.json to release/package.json
console.log('Copying package.json...');
fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(releaseDir, 'package.json'));

// 6. Copy .gitignore
console.log('Creating .gitignore...');
fs.writeFileSync(path.join(releaseDir, '.gitignore'), 'node_modules/\ncache/\n');

// 7. Write start.command in release/start.command
console.log('Creating start.command for release...');
const startCommandContent = `#!/bin/bash
# Di chuyen vao thu muc chua script
cd "$(dirname "$0")"

# Tu dong cai dat dependencies neu chua co node_modules
if [ ! -d "node_modules" ]; then
  echo "=================================================="
  echo " -> Phat hien chua co thu vien node_modules."
  echo " -> Dang tu dong tai va cai dat cac thu vien can thiet..."
  echo " -> Viec nay chi thuc hien 1 lan dau tien."
  echo "=================================================="
  npm install --omit=dev
fi

echo "=================================================="
echo "      KHOI CHAY MACCLEANSE LOCAL (OFFLINE)        "
echo "=================================================="
echo "-> Dang khoi chay may chu local..."
echo "-> Trinh duyet cua ban se tu dong mo trong giay lat..."
echo "-> De dung ung dung, chi can dong cua so Terminal nay."
echo "=================================================="

# Mo trinh duyet tu dong sau 2 giay de doi may chu khoi dong
(sleep 2 && open "http://localhost:3001") &

# Chay may chu local (da duoc xay dung va obfuscate san)
node server.cjs
`;

const startCmdPath = path.join(releaseDir, 'start.command');
fs.writeFileSync(startCmdPath, startCommandContent);
fs.chmodSync(startCmdPath, 0o755); // Make executable

console.log('=== Release Build Completed Successfully! ===');
console.log('Release package is available in: ./release');
