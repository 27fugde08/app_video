export const APP_CONFIG = {
  name: "CreatorOS Desktop",
  version: "5.0.4-PRO_V48",
  releaseDate: "2026-09-01",
  tier: "PRO_V48",
  licenseOwner: "Thanh Đắc Lộc (Principal Studio)",
  hardwareEngine: "RTX 4070 Dual-NVENC Tensor Core",
  defaultStoragePath: "D:\\Downloads\\CreatorOS\\BatchVault",
  apiEndpoints: {
    telemetry: "/api/hardware/telemetry",
    license: "/api/license/status",
    crawler: "/api/downloader/batch-crawl",
    geminiAi: "/api/ai/process"
  },
  thresholds: {
    cpuAlertPercent: 85,
    ramAlertPercent: 90,
    vramAlertPercent: 92
  }
};
