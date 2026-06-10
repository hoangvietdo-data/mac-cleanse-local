const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure archives and caches directories exist
const HOME = os.homedir();
const ARCHIVE_DIR = path.join(HOME, '.appslimmer', 'archives');
const ICON_CACHE_DIR = path.join(__dirname, 'cache', 'icons');

if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}
if (!fs.existsSync(ICON_CACHE_DIR)) {
  fs.mkdirSync(ICON_CACHE_DIR, { recursive: true });
}

// Serve cached icons as static files
app.use('/api/icons', express.static(ICON_CACHE_DIR));

// Helper: Read and parse Info.plist (hybrid fast parser)
function readPlist(appPath) {
  try {
    const plistPath = path.join(appPath, 'Contents', 'Info.plist');
    if (!fs.existsSync(plistPath)) return null;

    const buffer = fs.readFileSync(plistPath);
    if (buffer.slice(0, 8).toString() === 'bplist00') {
      // Binary plist: fallback to plutil
      const stdout = execSync(`plutil -convert json -o - "${plistPath}"`, { stdio: ['pipe', 'pipe', 'ignore'] });
      return JSON.parse(stdout.toString());
    }

    // XML plist: parse with regex (super fast, 0 processes)
    const content = buffer.toString('utf8');
    const info = {};

    function getPlistValue(key) {
      const regex = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
      const match = content.match(regex);
      return match ? match[1].trim() : null;
    }

    info.CFBundleIdentifier = getPlistValue('CFBundleIdentifier');
    info.CFBundleName = getPlistValue('CFBundleName');
    info.CFBundleDisplayName = getPlistValue('CFBundleDisplayName');
    info.CFBundleExecutable = getPlistValue('CFBundleExecutable');
    info.CFBundleIconFile = getPlistValue('CFBundleIconFile');
    info.CFBundleIconName = getPlistValue('CFBundleIconName');

    return info;
  } catch (e) {
    return null;
  }
}

// Helper: Convert icns to png
function getAppIcon(appPath, bundleId) {
  if (!bundleId) return null;
  const cachedIconPath = path.join(ICON_CACHE_DIR, `${bundleId}.png`);
  if (fs.existsSync(cachedIconPath)) {
    try {
      if (fs.statSync(cachedIconPath).size <= 10) return null; // Failed placeholder
      return `/api/icons/${bundleId}.png`;
    } catch (e) {
      return null;
    }
  }

  try {
    const info = readPlist(appPath);
    let iconFile = info ? (info.CFBundleIconFile || info.CFBundleIconName) : null;
    let icnsPath = null;

    if (iconFile) {
      if (!iconFile.endsWith('.icns')) {
        iconFile += '.icns';
      }
      icnsPath = path.join(appPath, 'Contents', 'Resources', iconFile);
    }

    if (!icnsPath || !fs.existsSync(icnsPath)) {
      const resourcesDir = path.join(appPath, 'Contents', 'Resources');
      if (fs.existsSync(resourcesDir)) {
        const files = fs.readdirSync(resourcesDir);
        const firstIcns = files.find(f => f.endsWith('.icns'));
        if (firstIcns) {
          icnsPath = path.join(resourcesDir, firstIcns);
        }
      }
    }

    if (icnsPath && fs.existsSync(icnsPath)) {
      execSync(`sips -s format png "${icnsPath}" --out "${cachedIconPath}"`, { stdio: 'ignore' });
      if (fs.existsSync(cachedIconPath)) {
        return `/api/icons/${bundleId}.png`;
      }
    }
  } catch (e) {
    // Fail silently
  }

  // Cache failed icons as empty files
  try {
    fs.writeFileSync(cachedIconPath, '');
  } catch (err) {}
  return null;
}

// Helper: Measure directory size quickly (fallback shell command)
function getFolderSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const duOut = execSync(`du -sk "${dirPath}" 2>/dev/null || true`, { stdio: ['pipe', 'pipe', 'ignore'] });
    const match = duOut.toString().trim().match(/^(\d+)/);
    return match ? parseInt(match[1], 10) * 1024 : 0; // Convert KB to bytes
  } catch (e) {
    return 0;
  }
}

// Helper: Measure directory size in pure JS (0 process spawns, ultra fast)
function getFolderSizeFast(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.lstatSync(filePath);
      if (stats.isDirectory()) {
        totalSize += getFolderSizeFast(filePath);
      } else if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
  } catch (e) {
    // Fail silently on permission blocks
  }
  return totalSize;
}

// Helper: Get sizes of all library folders in bulk (caches, app support, containers, etc.)
function getBulkCacheSizes() {
  const sizes = {};
  const libDirs = [
    path.join(HOME, 'Library', 'Caches'),
    path.join(HOME, 'Library', 'Application Support'),
    path.join(HOME, 'Library', 'Containers'),
    path.join(HOME, 'Library', 'Group Containers')
  ];

  for (const dir of libDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const cmd = `du -sk "${dir}"/* 2>/dev/null || true`;
      const stdout = execSync(cmd, { maxBuffer: 20 * 1024 * 1024 }).toString();
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
          const sizeInBytes = parseInt(match[1], 10) * 1024;
          const folderPath = match[2];
          sizes[folderPath] = sizeInBytes;
        }
      }
    } catch (e) {
      console.error(`Failed to get bulk sizes for ${dir}:`, e.message);
    }
  }
  return sizes;
}

// Helper: Get cache and application data directory sizes for an app
function getCacheStats(bundleId, appName, librarySizes) {
  let totalSize = 0;
  const matchedPaths = [];

  const bId = bundleId ? bundleId.toLowerCase() : '';
  const aName = appName ? appName.toLowerCase() : '';

  // Scan library sizes map to match directories belonging to this app
  for (const [folderPath, size] of Object.entries(librarySizes)) {
    const folderName = path.basename(folderPath).toLowerCase();
    
    const isCache = folderPath.includes('/Library/Caches/');
    const isAppSupport = folderPath.includes('/Library/Application Support/');
    const isContainer = folderPath.includes('/Library/Containers/');
    const isGroupContainer = folderPath.includes('/Library/Group Containers/');

    let match = false;
    
    // 1. Exact match on bundleId or appName
    if (bId && folderName === bId) match = true;
    else if (aName && folderName === aName) match = true;
    else if (aName && folderName === `${aName}data`) match = true; // e.g. ZaloData
    // 2. Contains check (e.g. "com.vng.zalo" contains "zalo" or vice versa)
    else if (bId && folderName.includes(bId)) match = true;
    else if (bId && bId.includes(folderName) && folderName.length > 4) match = true;
    else if (aName && folderName.includes(aName)) match = true;
    else if (aName && aName.includes(folderName) && folderName.length > 3) match = true;

    if (match) {
      totalSize += size;
      matchedPaths.push(folderPath);
    }
  }

  // Fallback: If no matches were found in bulk sizes but the directory exists, measure it directly
  if (matchedPaths.length === 0) {
    const defaultPaths = [
      path.join(HOME, 'Library', 'Caches', bundleId || '___invalid___'),
      path.join(HOME, 'Library', 'Caches', appName),
      path.join(HOME, 'Library', 'Application Support', appName),
      path.join(HOME, 'Library', 'Application Support', bundleId || '___invalid___'),
      path.join(HOME, 'Library', 'Application Support', `${appName}Data`)
    ];
    for (const p of defaultPaths) {
      if (fs.existsSync(p) && !matchedPaths.includes(p)) {
        try {
          const stdout = execSync(`du -sk "${p}" 2>/dev/null || true`).toString();
          const match = stdout.trim().match(/^(\d+)\s+/);
          if (match) {
            totalSize += parseInt(match[1], 10) * 1024;
            matchedPaths.push(p);
          }
        } catch (e) {}
      }
    }
  }

  return { 
    cacheSize: totalSize, 
    cachePath: matchedPaths.join('|') 
  };
}

// Helper: Get last used date (fast, 0 process spawns)
function getLastUsedDateFast(appPath) {
  try {
    const stats = fs.statSync(appPath);
    return stats.atime > stats.mtime ? stats.atime : stats.mtime;
  } catch (e) {
    return new Date(0);
  }
}

// Helper: Check if it's a stub app
function checkIfStub(appPath, plistInfo) {
  try {
    const exeName = plistInfo ? plistInfo.CFBundleExecutable : path.basename(appPath, '.app');
    const exePath = path.join(appPath, 'Contents', 'MacOS', exeName);
    if (fs.existsSync(exePath)) {
      const stats = fs.statSync(exePath);
      if (stats.size > 100 * 1024) return false; // Original binary, not a stub
      const content = fs.readFileSync(exePath, 'utf8');
      return content.includes('AppSlimmer - Phục hồi ứng dụng');
    }
  } catch (e) {}
  return false;
}

// Helper: Get sizes of all applications in one command (bulk)
function getBulkAppSizes() {
  const sizes = {};
  const scanPaths = [];
  
  if (fs.existsSync('/Applications')) {
    scanPaths.push('/Applications/*.app');
  }
  const userApps = path.join(HOME, 'Applications');
  if (fs.existsSync(userApps)) {
    scanPaths.push(`${userApps.replace(/ /g, '\\ ')}/*.app`);
  }

  if (scanPaths.length === 0) return sizes;

  try {
    const cmd = `du -sk ${scanPaths.join(' ')} 2>/dev/null || true`;
    const stdout = execSync(cmd, { maxBuffer: 10 * 1024 * 1024 }).toString();
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (match) {
        const sizeInBytes = parseInt(match[1], 10) * 1024;
        const appPath = match[2];
        sizes[appPath] = sizeInBytes;
      }
    }
  } catch (e) {
    console.error('Failed to get bulk app sizes:', e.message);
  }
  return sizes;
}

// ==========================================
// 1. Applications Endpoints (Slimming)
// ==========================================

app.get('/api/apps', (req, res) => {
  const scanPaths = [
    '/Applications',
    path.join(HOME, 'Applications')
  ];

  const appList = [];
  const appSizes = getBulkAppSizes();
  const cacheSizes = getBulkCacheSizes();
  
  // Get running processes once in bulk (saves spawning 60 times!)
  let psOutput = '';
  try {
    psOutput = execSync('ps aux', { maxBuffer: 10 * 1024 * 1024 }).toString();
  } catch (e) {
    psOutput = '';
  }

  for (const baseDir of scanPaths) {
    if (!fs.existsSync(baseDir)) continue;

    try {
      const files = fs.readdirSync(baseDir);
      for (const file of files) {
        if (!file.endsWith('.app') || file.startsWith('.')) continue;

        const appPath = path.join(baseDir, file);
        const isSystem = baseDir.startsWith('/System');
        
        let bundleId, name, executableName, plistInfo = null;
        if (isSystem) {
          name = file.replace('.app', '');
          bundleId = `com.apple.${name.toLowerCase().replace(/\s+/g, '')}`;
          executableName = null;
        } else {
          plistInfo = readPlist(appPath);
          bundleId = plistInfo ? plistInfo.CFBundleIdentifier : `local.${file.replace('.app', '')}`;
          name = plistInfo ? (plistInfo.CFBundleDisplayName || plistInfo.CFBundleName || file.replace('.app', '')) : file.replace('.app', '');
          executableName = plistInfo ? plistInfo.CFBundleExecutable : null;
        }

        let stats;
        try {
          stats = fs.lstatSync(appPath);
          if (stats.isSymbolicLink()) continue;
        } catch (e) {
          continue;
        }

        const sizeStats = appSizes[appPath] || 0;
        const cacheStats = isSystem ? { cacheSize: 0, cachePath: null } : getCacheStats(bundleId, name, cacheSizes);
        const lastUsed = getLastUsedDateFast(appPath);
        const icon = isSystem ? null : getAppIcon(appPath, bundleId);
        const isRunning = psOutput.includes(appPath) || (executableName && psOutput.includes(executableName));
        const isStub = isSystem ? false : checkIfStub(appPath, plistInfo);
        
        appList.push({
          name,
          path: appPath,
          bundleId,
          executableName,
          isSystem,
          logicalSize: sizeStats,
          physicalSize: sizeStats,
          cacheSize: cacheStats.cacheSize,
          cachePath: cacheStats.cachePath,
          lastUsed: lastUsed.toISOString(),
          icon,
          isRunning,
          isStub,
          isCompressed: false
        });
      }
    } catch (e) {
      console.error(`Error reading directory ${baseDir}:`, e.message);
    }
  }

  res.json(appList);
});

// App Compress, Offload, Restore, Clean, Uninstall endpoints from previous implementation
app.post('/api/compress', (req, res) => {
  const { appPath } = req.body;
  if (!appPath || !fs.existsSync(appPath)) {
    return res.status(400).json({ error: 'Đường dẫn ứng dụng không hợp lệ.' });
  }
  if (isAppRunning(appPath)) {
    return res.status(400).json({ error: 'Ứng dụng đang chạy. Vui lòng đóng ứng dụng trước khi nén.' });
  }

  try {
    const parentDir = path.dirname(appPath);
    const tempPath = `${appPath}.tmp`;
    const isWritable = (() => {
      try { fs.accessSync(parentDir, fs.constants.W_OK); return true; } catch (e) { return false; }
    })();

    const compressCmd = `ditto --hfsCompression --preserveMetadata "${appPath}" "${tempPath}" && rm -rf "${appPath}" && mv "${tempPath}" "${appPath}"`;

    if (isWritable) {
      execSync(compressCmd);
    } else {
      const appleScript = `do shell script "${compressCmd.replace(/"/g, '\\"')}" with administrator privileges`;
      execSync(`osascript -e "${appleScript}"`);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/offload', (req, res) => {
  const { appPath, bundleId, executableName } = req.body;
  if (!appPath || !fs.existsSync(appPath)) {
    return res.status(400).json({ error: 'Đường dẫn không hợp lệ.' });
  }
  if (isAppRunning(appPath)) {
    return res.status(400).json({ error: 'Ứng dụng đang chạy.' });
  }

  try {
    const appDir = path.dirname(appPath);
    const appName = path.basename(appPath);
    const archivePath = path.join(ARCHIVE_DIR, `${bundleId}.zip`);
    const info = readPlist(appPath);
    const exeName = executableName || (info ? info.CFBundleExecutable : null) || appName.replace('.app', '');

    execSync(`cd "${appDir}" && zip -r "${archivePath}" "${appName}"`, { stdio: 'ignore' });

    const tempStubPath = path.join('/tmp', `stub_${bundleId}.app`);
    execSync(`rm -rf "${tempStubPath}"`);
    fs.mkdirSync(path.join(tempStubPath, 'Contents', 'MacOS'), { recursive: true });
    fs.mkdirSync(path.join(tempStubPath, 'Contents', 'Resources'), { recursive: true });

    const originalPlistPath = path.join(appPath, 'Contents', 'Info.plist');
    if (fs.existsSync(originalPlistPath)) {
      fs.copyFileSync(originalPlistPath, path.join(tempStubPath, 'Contents', 'Info.plist'));
    }

    let iconFile = info ? (info.CFBundleIconFile || info.CFBundleIconName) : null;
    if (iconFile) {
      if (!iconFile.endsWith('.icns')) iconFile += '.icns';
      const originalIconPath = path.join(appPath, 'Contents', 'Resources', iconFile);
      if (fs.existsSync(originalIconPath)) {
        fs.copyFileSync(originalIconPath, path.join(tempStubPath, 'Contents', 'Resources', iconFile));
      }
    }

    const stubScriptPath = path.join(tempStubPath, 'Contents', 'MacOS', exeName);
    const stubScriptContent = `#!/bin/bash
RESPONSE=$(osascript -e 'display dialog "Ứng dụng này đã được giải phóng (offload) để tiết kiệm dung lượng. Bạn có muốn phục hồi và mở ứng dụng ngay bây giờ không?" with title "AppSlimmer - Phục hồi ứng dụng" buttons {"Hủy bỏ", "Phục hồi & Mở"} default button "Phục hồi & Mở" with icon note')

if [ "$RESPONSE" = "button returned:Phục hồi & Mở" ]; then
    SCRIPT_PATH="$(cd "$(dirname "$0")"; pwd)"
    APP_PATH="$(cd "$SCRIPT_PATH/../.."; pwd)"
    ARCHIVE_PATH="$HOME/.appslimmer/archives/${bundleId}.zip"
    
    osascript -e 'display notification "Đang phục hồi ứng dụng..." with title "AppSlimmer"'
    
    if [ -f "$ARCHIVE_PATH" ]; then
        PARENT_DIR=$(dirname "$APP_PATH")
        if [ -w "$PARENT_DIR" ]; then
            unzip -o "$ARCHIVE_PATH" -d "$PARENT_DIR"
        else
            osascript -e 'do shell script "unzip -o \\"'"$ARCHIVE_PATH"'\\" -d \\"'"$PARENT_DIR"'\\"" with administrator privileges'
        fi
        
        osascript -e 'display notification "Phục hồi thành công!" with title "AppSlimmer"'
        open "$APP_PATH"
    else
        osascript -e 'display alert "Lỗi" message "Không tìm thấy file lưu trữ tại '"$ARCHIVE_PATH"'. Vui lòng kiểm tra lại." as critical'
    fi
fi
`;
    fs.writeFileSync(stubScriptPath, stubScriptContent, { mode: 0o755 });

    const isWritable = (() => {
      try { fs.accessSync(appDir, fs.constants.W_OK); return true; } catch (e) { return false; }
    })();

    const replaceCmd = `rm -rf "${appPath}" && cp -R "${tempStubPath}" "${appPath}" && rm -rf "${tempStubPath}"`;

    if (isWritable) {
      execSync(replaceCmd);
    } else {
      const appleScript = `do shell script "${replaceCmd.replace(/"/g, '\\"')}" with administrator privileges`;
      execSync(`osascript -e "${appleScript}"`);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/restore', (req, res) => {
  const { appPath, bundleId } = req.body;
  const archivePath = path.join(ARCHIVE_DIR, `${bundleId}.zip`);
  if (!fs.existsSync(archivePath)) {
    return res.status(400).json({ error: 'Không tìm thấy file lưu trữ.' });
  }

  try {
    const parentDir = path.dirname(appPath);
    const isWritable = (() => {
      try { fs.accessSync(parentDir, fs.constants.W_OK); return true; } catch (e) { return false; }
    })();

    const unzipCmd = `unzip -o "${archivePath}" -d "${parentDir}" && rm -f "${archivePath}"`;

    if (isWritable) {
      execSync(unzipCmd);
    } else {
      const appleScript = `do shell script "${unzipCmd.replace(/"/g, '\\"')}" with administrator privileges`;
      execSync(`osascript -e "${appleScript}"`);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clean-cache', (req, res) => {
  const { cachePath } = req.body;
  if (!cachePath) {
    return res.status(400).json({ error: 'Đường dẫn cache không hợp lệ.' });
  }
  try {
    const paths = cachePath.split('|');
    let cleanedCount = 0;
    for (const p of paths) {
      if (p && fs.existsSync(p)) {
        execSync(`rm -rf "${p}"/*`);
        cleanedCount++;
      }
    }
    res.json({ success: true, cleanedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/uninstall', (req, res) => {
  const { appPath, cachePath } = req.body;
  if (!appPath || !fs.existsSync(appPath)) {
    return res.status(400).json({ error: 'Đường dẫn ứng dụng không hợp lệ.' });
  }
  if (isAppRunning(appPath)) {
    return res.status(400).json({ error: 'Ứng dụng đang chạy.' });
  }

  try {
    const parentDir = path.dirname(appPath);
    const isWritable = (() => {
      try { fs.accessSync(parentDir, fs.constants.W_OK); return true; } catch (e) { return false; }
    })();

    if (cachePath) {
      const paths = cachePath.split('|');
      for (const p of paths) {
        if (p && fs.existsSync(p)) {
          execSync(`rm -rf "${p}"`);
        }
      }
    }

    const deleteCmd = `rm -rf "${appPath}"`;
    if (isWritable) {
      execSync(deleteCmd);
    } else {
      const appleScript = `do shell script "${deleteCmd.replace(/"/g, '\\"')}" with administrator privileges`;
      execSync(`osascript -e "${appleScript}"`);
    }

    // Delete corresponding archive if exists
    try {
      const fileBase = path.basename(appPath, '.app');
      const files = fs.readdirSync(ARCHIVE_DIR);
      for (const file of files) {
        if (file.includes(fileBase)) {
          fs.unlinkSync(path.join(ARCHIVE_DIR, file));
        }
      }
    } catch (err) {}

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// 2. System Junk Endpoints
// ==========================================

app.get('/api/junk-stats', (req, res) => {
  const cachePath = path.join(HOME, 'Library', 'Caches');
  const logsPath = path.join(HOME, 'Library', 'Logs');
  const xcodePath = path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData');

  const cacheSize = getFolderSize(cachePath);
  const logsSize = getFolderSize(logsPath);
  const xcodeSize = getFolderSize(xcodePath);

  // Read trash size via AppleScript Finder API to avoid TCC block
  let trashSize = 0;
  try {
    const appleScript = 'tell application "Finder" to get physical size of trash';
    const stdout = execSync(`osascript -e '${appleScript}'`).toString().trim();
    if (stdout && stdout !== 'missing value') {
      trashSize = parseInt(stdout, 10);
    }
  } catch (e) {
    trashSize = 0;
  }

  res.json({
    userCaches: cacheSize,
    userCachesPath: cachePath,
    userLogs: logsSize,
    userLogsPath: logsPath,
    xcodeDerivedData: xcodeSize,
    xcodeDerivedDataPath: xcodePath,
    trash: trashSize
  });
});

app.post('/api/clean-junk', (req, res) => {
  const { cleanCaches, cleanLogs, cleanXcode, cleanTrash } = req.body;
  const logs = [];

  try {
    if (cleanCaches) {
      const p = path.join(HOME, 'Library', 'Caches');
      if (fs.existsSync(p)) {
        execSync(`rm -rf "${p}"/*`);
        logs.push('Đã làm sạch bộ nhớ đệm người dùng (User Caches).');
      }
    }

    if (cleanLogs) {
      const p = path.join(HOME, 'Library', 'Logs');
      if (fs.existsSync(p)) {
        execSync(`rm -rf "${p}"/*`);
        logs.push('Đã làm sạch nhật ký người dùng (User Logs).');
      }
    }

    if (cleanXcode) {
      const p = path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData');
      if (fs.existsSync(p)) {
        execSync(`rm -rf "${p}"/*`);
        logs.push('Đã xóa dữ liệu Xcode DerivedData.');
      }
    }

    if (cleanTrash) {
      execSync(`osascript -e 'tell application "Finder" to empty trash'`, { stdio: 'ignore' });
      logs.push('Đã dọn dẹp Thùng rác.');
    }

    res.json({ success: true, logs });
  } catch (e) {
    res.status(500).json({ error: `Làm sạch thất bại: ${e.message}`, logs });
  }
});

// ==========================================
// 3. Large & Old Files Endpoints
// ==========================================

app.get('/api/large-files', (req, res) => {
  const scanDirs = [
    path.join(HOME, 'Downloads'),
    path.join(HOME, 'Documents'),
    path.join(HOME, 'Desktop'),
    path.join(HOME, 'Movies'),
    path.join(HOME, 'Music'),
    path.join(HOME, 'Pictures')
  ];

  const filesList = [];
  
  // Create find command searching specific folders for files > 50MB
  const validDirs = scanDirs.filter(d => fs.existsSync(d));
  if (validDirs.length === 0) {
    return res.json([]);
  }

  const dirsStr = validDirs.map(d => `"${d}"`).join(' ');
  
  try {
    // maxdepth 3 for faster results, size +50M
    const findCmd = `find ${dirsStr} -type f -size +50M -maxdepth 3 -not -path "*/.*" -not -path "*node_modules*" 2>/dev/null || true`;
    const stdout = execSync(findCmd, { maxBuffer: 10 * 1024 * 1024 }).toString();
    const filePaths = stdout.trim().split('\n').filter(Boolean);

    for (const filePath of filePaths) {
      try {
        const stats = fs.statSync(filePath);
        const name = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        let category = 'Other';
        if (['.mp4', '.mkv', '.avi', '.mov', '.flv'].includes(ext)) category = 'Video';
        else if (['.zip', '.rar', '.7z', '.tar', '.gz', '.dmg', '.pkg'].includes(ext)) category = 'Archive';
        else if (['.pdf', '.docx', '.xlsx', '.pptx', '.epub', '.txt'].includes(ext)) category = 'Document';
        else if (['.mp3', '.wav', '.aac', '.flac', '.m4a'].includes(ext)) category = 'Audio';
        else if (['.jpg', '.png', '.gif', '.psd', '.heic'].includes(ext)) category = 'Image';

        filesList.push({
          name,
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          category
        });
      } catch (err) {}
    }
  } catch (e) {
    console.error('Error scanning large files:', e.message);
  }

  // Sort by size descending
  filesList.sort((a, b) => b.size - a.size);
  res.json(filesList);
});

app.post('/api/delete-file', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: 'Đường dẫn tệp tin không tồn tại.' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: `Xóa tệp thất bại: ${e.message}` });
  }
});

// ==========================================
// 4. Optimization & Processes Endpoints
// ==========================================

app.get('/api/processes', (req, res) => {
  try {
    // Get processes sorted by memory usage
    // PID, COMM, %CPU, %MEM
    const stdout = execSync('ps -Ao pid,comm,%cpu,%mem -m | head -n 30', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const lines = stdout.trim().split('\n').slice(1); // Skip header

    const processes = lines.map(line => {
      const trimLine = line.trim();
      if (!trimLine) return null;
      const parts = trimLine.split(/\s+/);
      if (parts.length < 4) return null;

      const pid = parseInt(parts[0], 10);
      const mem = parseFloat(parts[parts.length - 1]);
      const cpu = parseFloat(parts[parts.length - 2]);
      const comm = parts.slice(1, parts.length - 2).join(' ');
      const name = path.basename(comm);

      // Filter out helper processes with 0 usage to keep list relevant
      if (isNaN(pid) || (cpu === 0 && mem === 0)) return null;

      return { pid, name, path: comm, cpu, mem };
    }).filter(Boolean);

    res.json(processes);
  } catch (e) {
    res.status(500).json({ error: `Quét tiến trình thất bại: ${e.message}` });
  }
});

app.post('/api/kill-process', (req, res) => {
  const { pid } = req.body;
  if (!pid) {
    return res.status(400).json({ error: 'Mã tiến trình (PID) không hợp lệ.' });
  }

  try {
    execSync(`kill -9 ${pid}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: `Không thể tắt tiến trình: ${e.message}` });
  }
});

// ==========================================
// 5. Maintenance Endpoints
// ==========================================

// Flush DNS cache
app.post('/api/maintenance/dns', (req, res) => {
  try {
    // Flush command
    const flushCmd = 'dscacheutil -flushcache; killall -HUP mDNSResponder';
    
    // Attempt standard run, if fails prompt admin privileges
    try {
      execSync(flushCmd);
    } catch (err) {
      const appleScript = `do shell script "${flushCmd.replace(/"/g, '\\"')}" with administrator privileges`;
      execSync(`osascript -e "${appleScript}"`);
    }

    res.json({ success: true, message: 'Bộ nhớ đệm DNS đã được làm mới thành công.' });
  } catch (e) {
    res.status(500).json({ error: `Xóa DNS cache thất bại: ${e.message}` });
  }
});

// Purge inactive RAM
app.post('/api/maintenance/ram', (req, res) => {
  try {
    // macOS purge command
    try {
      execSync('purge');
    } catch (err) {
      const appleScript = 'do shell script "purge" with administrator privileges';
      execSync(`osascript -e "${appleScript}"`);
    }

    res.json({ success: true, message: 'Đã giải phóng bộ nhớ RAM không hoạt động thành công.' });
  } catch (e) {
    res.status(500).json({ error: `Giải phóng RAM thất bại: ${e.message}` });
  }
});

// System Stats (disk space & RAM stats)
app.get('/api/system-stats', (req, res) => {
  try {
    const dfOut = execSync('df -k /', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const lines = dfOut.trim().split('\n');
    let totalDisk = 0, occupiedDisk = 0, freeDisk = 0;
    if (lines.length >= 2) {
      const parts = lines[1].replace(/\s+/g, ' ').split(' ');
      totalDisk = parseInt(parts[1], 10) * 1024; // KB to Bytes
      occupiedDisk = parseInt(parts[2], 10) * 1024;
      freeDisk = parseInt(parts[3], 10) * 1024;
    }

    // Get real RAM info
    const totalRam = os.totalmem();
    let freeRam = os.freemem();
    
    // Use vm_stat for accurate macOS free memory calculation
    try {
      const vmstat = execSync('vm_stat', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const pageSizeMatch = vmstat.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 4096;
      
      const getPages = (name) => {
        const match = vmstat.match(new RegExp(`${name}:\\s+(\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
      };
      
      const freePages = getPages('Pages free');
      const speculativePages = getPages('Pages speculative');
      const inactivePages = getPages('Pages inactive');
      
      freeRam = (freePages + speculativePages + inactivePages) * pageSize;
    } catch (err) {}

    return res.json({ 
      total: totalDisk, 
      occupied: occupiedDisk, 
      free: freeDisk,
      ramTotal: totalRam,
      ramFree: freeRam
    });
  } catch (e) {
    console.error('Failed to get system stats:', e.message);
  }
  res.json({ total: 0, occupied: 0, free: 0, ramTotal: 0, ramFree: 0 });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on port ${PORT} (Loopback only)`);
});
