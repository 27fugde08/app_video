export interface GpuMetrics {
  name: string;
  vramTotal: number;
  vramUsed: number;
  vramPercent: number;
  utilization: number;
  temperature: number;
}

export interface HardwareTelemetryState {
  cpu: number;
  ram: {
    total: number;
    used: number;
    percent: number;
  };
  gpus: GpuMetrics[];
  vramAlert: {
    triggered: boolean;
    gpuName: string;
    percent: number;
    threshold: number;
  } | null;
  diskFreeGb: number;
  activeThreads: number;
  connectedWs: boolean;
}
