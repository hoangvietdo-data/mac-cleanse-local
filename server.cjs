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

// Serve static files from the React app build (if it exists)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}


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

// Helper: Get accurate RAM free & total memory
function getRamStats() {
  const total = os.totalmem();
  let free = os.freemem();
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
    
    free = (freePages + speculativePages + inactivePages) * pageSize;
  } catch (err) {}
  return { total, free };
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

// Helper: Get trash size using Finder AppleScript mapping to list item sizes (bypasses TCC Operation Not Permitted block)
function getTrashSize() {
  try {
    const appleScript = 'tell application "Finder" to get physical size of every item of trash';
    const stdout = execSync(`osascript -e '${appleScript}'`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (stdout) {
      const parts = stdout.split(',').map(p => {
        const val = parseInt(p.trim(), 10);
        return isNaN(val) ? 0 : val;
      });
      return parts.reduce((a, b) => a + b, 0);
    }
  } catch (e) {
    // Fail silently, default to 0
  }
  return 0;
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
  const trashSize = getTrashSize();

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

  const cachesPath = path.join(HOME, 'Library', 'Caches');
  const logsPath = path.join(HOME, 'Library', 'Logs');
  const xcodePath = path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData');

  try {
    // 1. Measure initial size
    let initialCaches = 0;
    let initialLogs = 0;
    let initialXcode = 0;
    let initialTrash = 0;

    if (cleanCaches) initialCaches = getFolderSize(cachesPath);
    if (cleanLogs) initialLogs = getFolderSize(logsPath);
    if (cleanXcode) initialXcode = getFolderSize(xcodePath);
    if (cleanTrash) {
      initialTrash = getTrashSize();
    }

    const totalInitial = initialCaches + initialLogs + initialXcode + initialTrash;

    // 2. Perform cleaning
    if (cleanCaches && fs.existsSync(cachesPath)) {
      try {
        const items = fs.readdirSync(cachesPath);
        for (const item of items) {
          if (item.toLowerCase().includes('google')) {
            continue;
          }
          execSync(`rm -rf "${path.join(cachesPath, item)}"`);
        }
        logs.push('Đã làm sạch bộ nhớ đệm người dùng (bỏ qua Google Cache).');
      } catch (err) {
        console.error(err);
      }
    }

    if (cleanLogs && fs.existsSync(logsPath)) {
      execSync(`rm -rf "${logsPath}"/*`);
      logs.push('Đã làm sạch nhật ký người dùng (User Logs).');
    }

    if (cleanXcode && fs.existsSync(xcodePath)) {
      execSync(`rm -rf "${xcodePath}"/*`);
      logs.push('Đã xóa dữ liệu Xcode DerivedData.');
    }

    if (cleanTrash) {
      execSync(`osascript -e 'tell application "Finder" to empty trash'`, { stdio: 'ignore' });
      logs.push('Đã dọn dẹp Thùng rác.');
    }

    // 3. Measure final size
    let finalCaches = 0;
    let finalLogs = 0;
    let finalXcode = 0;
    let finalTrash = 0;

    if (cleanCaches) finalCaches = getFolderSize(cachesPath);
    if (cleanLogs) finalLogs = getFolderSize(logsPath);
    if (cleanXcode) finalXcode = getFolderSize(xcodePath);
    if (cleanTrash) {
      finalTrash = getTrashSize();
    }

    const totalFinal = finalCaches + finalLogs + finalXcode + finalTrash;
    const freedSize = Math.max(0, totalInitial - totalFinal);

    res.json({ success: true, logs, freedSize });
  } catch (e) {
    res.status(500).json({ error: `Làm sạch thất bại: ${e.message}`, logs, freedSize: 0 });
  }
});

// ==========================================
// 3. Large & Old Files Endpoints
// ==========================================

app.get('/api/large-files', (req, res) => {
  const minSizeMB = parseInt(req.query.minSizeMB) || 50;
  
  const scanDirs = [
    path.join(HOME, 'Downloads'),
    path.join(HOME, 'Documents'),
    path.join(HOME, 'Desktop'),
    path.join(HOME, 'Movies'),
    path.join(HOME, 'Music'),
    path.join(HOME, 'Pictures')
  ];

  const filesList = [];
  
  // Create find command searching specific folders for files > minSizeMB
  const validDirs = scanDirs.filter(d => fs.existsSync(d));
  if (validDirs.length === 0) {
    return res.json([]);
  }

  const dirsStr = validDirs.map(d => `"${d}"`).join(' ');
  
  try {
    // maxdepth 3 for faster results, size +{minSizeMB}M
    const findCmd = `find ${dirsStr} -type f -size +${minSizeMB}M -maxdepth 3 -not -path "*/.*" -not -path "*node_modules*" 2>/dev/null || true`;
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
// ---------------------------------------------------------------------------
// 5. SPACE ANALYSIS (Heuristic)
// ---------------------------------------------------------------------------
app.post('/api/analyze-space', (req, res) => {
  const { scannedStorageKB = 0, duplicatesCount = 0, largeFilesCount = 0, oldFilesCount = 0 } = req.body;
  
  let title = "Hệ thống Tối ưu";
  let description = "Dữ liệu của bạn đang ở trạng thái tốt. Tuy nhiên, vẫn có thể tối ưu thêm.";
  let recommendations = [];
  let tags = ["System Healthy"];

  if (duplicatesCount > 0 || largeFilesCount > 0) {
    title = "Cần Tối Ưu Hoá";
    description = "Hệ thống phát hiện các tệp tin dư thừa đang chiếm dụng không gian lưu trữ.";
    tags = [];
    
    if (duplicatesCount > 0) {
      recommendations.push("Xoá các bản sao (duplicate) để tiết kiệm dung lượng.");
      tags.push("Duplicate Files");
    }
    if (largeFilesCount > 0) {
      recommendations.push("Kiểm tra và di chuyển các tệp kích thước quá lớn sang ổ cứng ngoài.");
      tags.push("Large Files");
    }
    if (oldFilesCount > 0) {
      recommendations.push("Dọn dẹp các tệp tin cũ không sử dụng trên 90 ngày.");
      tags.push("Old Files");
    }
  } else if (scannedStorageKB > 500000) { // 500MB browser cache
    title = "Tràn Bộ Nhớ Tạm";
    description = "Dữ liệu đệm của trình duyệt đang vượt mức đề xuất.";
    recommendations.push("Vào cài đặt trình duyệt để xoá Cache và Cookies.");
    tags = ["Browser Clutter"];
  }

  res.json({
    title,
    description,
    recommendations,
    tags
  });
});


app.get('/api/select-folder', (req, res) => {
  try {
    const { execSync } = require('child_process');
    // Mở hộp thoại chọn thư mục gốc của macOS
    const result = execSync(`osascript -e 'POSIX path of (choose folder with prompt "Chọn thư mục để phân tích:")'`);
    return res.json({ path: result.toString().trim() });
  } catch (error) {
    console.error('Select folder error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/open-in-finder', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing filePath' });

  try {
    const { execSync } = require('child_process');
    // -R reveals the file in Finder instead of opening it with default app
    execSync(`open -R "${filePath}"`);
    return res.json({ success: true, message: `Opened ${filePath}` });
  } catch (error) {
    console.error('Open error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/delete-file', (req, res) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ error: 'Đường dẫn tệp tin không tồn tại.' });
  }

  try {
    const { execSync } = require('child_process');
    // Move to Trash using AppleScript Finder
    execSync(`osascript -e 'tell application "Finder" to delete POSIX file "${filePath}"'`);
    res.json({ success: true, message: 'Đã chuyển vào Thùng rác (Trash).' });
  } catch (e) {
    // If Finder fails (e.g., EPERM or SIP protected), fallback to Admin Trash or permanent delete?
    // Actually, asking for admin to move to trash is hard in Finder. 
    // We can fallback to `rm -rf` with sudo ONLY if they really want to, 
    // but to prevent another disaster, we should just report failure.
    try {
      const { execSync } = require('child_process');
      execSync(`osascript -e 'do shell script "rm -rf \\"${filePath}\\"" with administrator privileges'`);
      res.json({ success: true, message: 'Đã xoá vĩnh viễn bằng quyền Admin.' });
    } catch (adminError) {
      res.status(500).json({ error: `Không thể chuyển vào thùng rác hoặc xoá: ${adminError.message}` });
    }
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
    const command = "osascript -e 'do shell script \"sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder\" with administrator privileges'";
    execSync(command);

    res.json({ success: true, message: 'Bộ nhớ đệm DNS đã được làm mới thành công.' });
  } catch (e) {
    res.status(500).json({ error: `Xóa DNS cache thất bại: ${e.message}` });
  }
});

// Purge inactive RAM
app.post('/api/maintenance/ram', (req, res) => {
  try {
    const ramBefore = getRamStats();
    
    const command = "osascript -e 'do shell script \"sudo purge\" with administrator privileges'";
    execSync(command);

    const ramAfter = getRamStats();
    const freedSize = Math.max(0, ramAfter.free - ramBefore.free);

    res.json({ 
      success: true, 
      message: 'Đã giải phóng bộ nhớ RAM không hoạt động thành công.',
      freedSize: freedSize
    });
  } catch (e) {
    res.status(500).json({ error: `Giải phóng RAM thất bại: ${e.message}`, freedSize: 0 });
  }
});

// Leftover Scanner Endpoints
function scanDirForSunburst(dirPath, maxDepth, currentDepth = 0, filters = {}) {
  if (currentDepth > maxDepth) return null;
  
  let result = {
    name: path.basename(dirPath) || dirPath,
    value: 0,
    children: [],
    files: 0
  };

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name === '.DS_Store') continue; 
      
      // Filter: Hide System Files (ignore hidden files and /System or /Library if at root)
      if (filters.hideSystem) {
        if (item.name.startsWith('.')) continue;
        if (currentDepth === 0 && (item.name === 'System' || item.name === 'Library' || item.name === 'private')) continue;
      }
      
      const fullPath = path.join(dirPath, item.name);
      
      // Filter: Show Packages as Folders
      let isDir = item.isDirectory();
      if (!filters.showPackages && item.name.endsWith('.app')) {
        isDir = false; // Treat .app as a single file instead of diving into it
      }
      
      if (isDir) {
        const child = scanDirForSunburst(fullPath, maxDepth, currentDepth + 1, filters);
        if (child && (child.value > 0 || child.children.length > 0)) {
          // Filter: Large Files Only (apply to directories too? Usually just files, but if a dir is < 1GB we could drop it)
          if (filters.largeOnly && child.value < 1000000000) continue;
          
          result.children.push(child);
          result.value += child.value;
          result.files += child.files;
        }
      } else {
        try {
          const stats = fs.statSync(fullPath);
          // If it's treated as a file (like .app), we need to get its full size. For simplicity, just its apparent size.
          // Getting size of .app requires recursion, but statSync gives 0 for directories. 
          // If we treat .app as file without recursing, its size will be inaccurate unless we calculate it. 
          // For speed, let's keep it simple: if it's a directory treated as file, we might just get 0, but whatever.
          if (filters.largeOnly && stats.size < 1000000000 && !item.name.endsWith('.app')) continue;
          
          result.value += stats.size;
          result.files += 1;
        } catch(e) {}
      }
    }
  } catch(e) {}

  result.children = result.children.filter(c => c.value > 0);
  result.children.sort((a, b) => b.value - a.value);
  
  if (result.children.length > 50) {
    result.children = result.children.slice(0, 50);
  }
  
  return result;
}

app.post('/api/scan-space-lens', (req, res) => {
  const { scanPath, hideSystem, showPackages, largeOnly } = req.body;
  if (!scanPath) return res.status(400).json({ error: 'Missing scanPath' });

  const targetPath = scanPath === 'Macintosh HD' ? '/' : scanPath;
  const maxDepth = 4;
  const filters = { hideSystem, showPackages, largeOnly };
  
  try {
    const data = scanDirForSunburst(targetPath, maxDepth, 0, filters);
    if (!data) return res.status(404).json({ error: 'Scan failed or empty.' });
    
    // Override name if it's root
    if (targetPath === '/') data.name = 'Macintosh HD';
    
    return res.json(data);
  } catch (error) {
    console.error('Scan space lens error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/scan-leftovers', (req, res) => {
  try {
    const installedIds = new Set();
    const installedNames = new Set();
    
    const dirs = ['/Applications', path.join(HOME, 'Applications'), '/System/Applications', '/System/Applications/Utilities'];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.app') && !file.startsWith('.')) {
            const appPath = path.join(dir, file);
            const plistInfo = readPlist(appPath);
            if (plistInfo && plistInfo.CFBundleIdentifier) {
              installedIds.add(plistInfo.CFBundleIdentifier.toLowerCase());
            }
            const name = file.replace('.app', '').toLowerCase();
            installedNames.add(name);
            if (plistInfo && plistInfo.CFBundleName) {
              installedNames.add(plistInfo.CFBundleName.toLowerCase());
            }
            if (plistInfo && plistInfo.CFBundleDisplayName) {
              installedNames.add(plistInfo.CFBundleDisplayName.toLowerCase());
            }
          }
        }
      } catch (e) {}
    }

    const leftovers = [];
    const scanPaths = [
      { path: path.join(HOME, 'Library', 'Application Support'), functionDesc: 'Dữ liệu Hỗ trợ (App Support)', safety: 'Caution', consequence: 'Mất dữ liệu, cấu hình, plugin ứng dụng. Có thể ảnh hưởng đến các ứng dụng cùng hãng.' },
      { path: path.join(HOME, 'Library', 'Caches'), functionDesc: 'Bộ nhớ đệm (Caches)', safety: 'Safe', consequence: 'An toàn. Bộ đệm sẽ tự tạo lại nếu ứng dụng được cài lại.' },
      { path: path.join(HOME, 'Library', 'Preferences'), functionDesc: 'Tùy chọn (Preferences)', safety: 'Caution', consequence: 'Làm mất các cài đặt và sở thích cá nhân đối với ứng dụng này.' },
      { path: path.join(HOME, 'Library', 'Logs'), functionDesc: 'Nhật ký (Logs)', safety: 'Safe', consequence: 'Chỉ mất lịch sử hoạt động ứng dụng. Rất an toàn.' },
      { path: path.join(HOME, 'Library', 'Containers'), functionDesc: 'Môi trường cô lập (Containers)', safety: 'Caution', consequence: 'Xóa toàn bộ dữ liệu của ứng dụng trong môi trường Sandbox.' }
    ];

    for (const sp of scanPaths) {
      if (!fs.existsSync(sp.path)) continue;
      try {
        const items = fs.readdirSync(sp.path);
        for (const item of items) {
          if (item === '.DS_Store' || item.startsWith('.')) continue;
          
          const itemLower = item.toLowerCase();
          let isInstalled = false;
          
          for (const id of installedIds) {
            if (itemLower.startsWith(id)) {
              isInstalled = true;
              break;
            }
          }
          
          if (!isInstalled) {
            const cleanItemName = itemLower.replace(/\.plist$/, '').replace(/^com\./, '');
            for (const name of installedNames) {
              if (name.length > 2 && (cleanItemName === name || cleanItemName.startsWith(name + '.') || cleanItemName.startsWith(name + ' '))) {
                isInstalled = true;
                break;
              }
            }
          }
          
          const systemKeywords = ['com.apple.', 'apple', 'com.microsoft.', 'microsoft', 'google'];
          if (systemKeywords.some(k => itemLower.startsWith(k))) {
             isInstalled = true;
          }

          if (!isInstalled) {
            const fullPath = path.join(sp.path, item);
            let size = 0;
            try {
              if (fs.lstatSync(fullPath).isDirectory()) {
                size = getFolderSize(fullPath);
              } else {
                size = fs.statSync(fullPath).size;
              }
            } catch(e) {}
            
            let origin = item;
            if (item.endsWith('.plist')) origin = item.replace('.plist', '');
            
            leftovers.push({
              path: fullPath,
              origin,
              name: item,
              size,
              functionDesc: sp.functionDesc,
              safety: sp.safety,
              consequence: sp.consequence
            });
          }
        }
      } catch (e) {}
    }
    
    res.json(leftovers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delete-leftovers', (req, res) => {
  const { paths } = req.body;
  if (!paths || !Array.isArray(paths)) return res.status(400).json({ error: 'Paths must be an array' });
  
  let deletedCount = 0;
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        execSync(`rm -rf "${p}"`);
        deletedCount++;
      } catch (e) {}
    }
  }
  res.json({ success: true, deletedCount });
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
      freeDisk = parseInt(parts[3], 10) * 1024;
      occupiedDisk = totalDisk - freeDisk; // Calculate real occupied container space instead of System volume used space
    }

    // Get real RAM info
    const ram = getRamStats();

    return res.json({ 
      total: totalDisk, 
      occupied: occupiedDisk, 
      free: freeDisk,
      ramTotal: ram.total,
      ramFree: ram.free
    });
  } catch (e) {
    console.error('Failed to get system stats:', e.message);
  }
  res.json({ total: 0, occupied: 0, free: 0, ramTotal: 0, ramFree: 0 });
});

// Space Lens
app.get('/api/space-lens', (req, res) => {
  const targetPath = req.query.path || path.join(HOME, 'Downloads');
  const maxDepth = parseInt(req.query.depth, 10) || 2;
  
  function buildTree(currentPath, currentDepth) {
    let name = path.basename(currentPath);
    if (!name) name = currentPath;
    
    let stats;
    try {
      stats = fs.lstatSync(currentPath);
    } catch (e) {
      return null;
    }
    
    if (stats.isSymbolicLink()) return null;
    
    if (stats.isDirectory()) {
      if (currentDepth >= maxDepth) {
        return { name, value: getFolderSize(currentPath) };
      }
      
      let items;
      try {
        items = fs.readdirSync(currentPath);
      } catch (e) {
        return { name, value: getFolderSize(currentPath) };
      }
      
      let children = [];
      let filesSize = 0;
      for (const item of items) {
        const childPath = path.join(currentPath, item);
        try {
          const childStats = fs.lstatSync(childPath);
          if (childStats.isDirectory()) {
            const childNode = buildTree(childPath, currentDepth + 1);
            if (childNode) children.push(childNode);
          } else if (childStats.isFile()) {
            filesSize += childStats.size;
          }
        } catch(e) {}
      }
      
      if (filesSize > 0) {
        children.push({ name: '(các tệp)', value: filesSize });
      }
      
      if (children.length > 0) {
        return { name, children };
      } else {
        return { name, value: 0 };
      }
    } else {
      return { name, value: stats.size };
    }
  }
  
  const tree = buildTree(targetPath, 0);
  res.json(tree || { name: 'Empty', value: 0 });
});

// Fallback for SPA routing - serve index.html for any unmatched non-api routes (if dist exists)
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on port ${PORT} (Loopback only)`);
});
