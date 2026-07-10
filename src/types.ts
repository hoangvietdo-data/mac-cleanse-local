export interface StorageItem {
  id: string;
  type: "LocalStorage" | "SessionStorage" | "Cookie";
  key: string;
  value: string;
  size: number; // in bytes
}

export interface FileItem {
  id: string;
  name: string;
  size: number; // in bytes
  type: string;
  lastModified: number;
  isLarge: boolean;
  isOld: boolean;
  duplicateGroup?: string;
}

export interface CleaningRecommendation {
  target: string;
  action: string;
  impact: string;
  safe: boolean;
}

export interface SpaceAnalysisAdvice {
  id: string;
  title: string;
  description: string; // Poetic editorial Vietnamese critique
  recommendations: CleaningRecommendation[];
  tags: string[];
  timestamp: string;
  metricsSummary: {
    totalScannedMB: number;
    browserStorageKB: number;
    duplicatesCount: number;
    largeFilesCount: number;
  };
}

export interface SystemDiagnostics {
  usedStorageMB: number;
  quotaStorageMB: number;
  percentageUsed: number;
  cpuCores: number;
  os: string;
  browser: string;
  memoryJSHeapMB?: number;
}
