import React from "react";
import { DownloaderBanner } from "./components/DownloaderBanner";
import { UrlInputCard } from "./components/UrlInputCard";
import { AdvancedConfigPanel } from "./components/AdvancedConfigPanel";
import { DownloaderQueueTable } from "./components/DownloaderQueueTable";
import { DownloaderTerminal } from "./components/DownloaderTerminal";
import { useBatchDownloader } from "./hooks/useBatchDownloader";
import { downloaderService } from "./services/downloaderService";
import { soundSynth } from "../../utils/audioUtils";
import { useToast } from "../../context/ToastContext";
import { Download, FileJson, FileText, Sparkles, HardDrive, CheckCircle2 } from "lucide-react";

export const BatchDownloaderPro: React.FC = () => {
  const { addToast } = useToast();
  const {
    rawUrlInput,
    setRawUrlInput,
    detectedUrls,
    items,
    filteredItems,
    selectedIds,
    config,
    setConfig,
    isScanning,
    isDownloading,
    platformFilter,
    setPlatformFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    logs,
    stats,
    handleStartScan,
    handleDownloadSelected,
    handleClearQueue,
    handleToggleSelectAll,
    handleToggleSelect,
    handleRemoveItem
  } = useBatchDownloader();

  const handleExportJson = () => {
    soundSynth.playSfx("pop");
    downloaderService.exportCatalog(items, "json");
    addToast("Đã xuất danh mục video sang định dạng JSON!", "success");
  };

  const handleExportTxt = () => {
    soundSynth.playSfx("pop");
    downloaderService.exportCatalog(items, "txt");
    addToast("Đã xuất danh sách URL sang định dạng TXT!", "success");
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 antialiased pb-12 select-none">
      {/* Top Header Summary & Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Đã tải hoàn tất:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              {stats.completed} / {stats.total} video
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tổng dung lượng: <strong className="text-cyan-300">{stats.totalDownloadedMb.toFixed(1)} MB</strong></span>
          </div>
        </div>

        {/* Quick Export Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            disabled={items.length === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              items.length === 0
                ? "bg-transparent text-slate-600 border-transparent cursor-not-allowed"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/10 hover:border-cyan-500/30"
            }`}
            title="Xuất danh mục JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>Xuất JSON</span>
          </button>

          <button
            onClick={handleExportTxt}
            disabled={items.length === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              items.length === 0
                ? "bg-transparent text-slate-600 border-transparent cursor-not-allowed"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/10 hover:border-violet-500/30"
            }`}
            title="Xuất danh sách URL TXT"
          >
            <FileText className="w-3.5 h-3.5 text-violet-400" />
            <span>Xuất TXT</span>
          </button>
        </div>
      </div>

      {/* 1. Multi-Platform Banner */}
      <DownloaderBanner
        selectedPlatform={platformFilter}
        onSelectPlatform={setPlatformFilter}
      />

      {/* 2. Advanced Configuration Panel (Cookie, Proxy, Toggles) */}
      <AdvancedConfigPanel config={config} setConfig={setConfig} />

      {/* 3. Multi-line URL Input Card with Actions */}
      <UrlInputCard
        rawUrlInput={rawUrlInput}
        setRawUrlInput={setRawUrlInput}
        detectedCount={detectedUrls.length}
        isScanning={isScanning}
        isDownloading={isDownloading}
        selectedCount={selectedIds.size}
        totalQueueCount={items.length}
        onStartScan={handleStartScan}
        onDownloadSelected={handleDownloadSelected}
        onClearQueue={handleClearQueue}
      />

      {/* 4. Downloader Queue Table */}
      <DownloaderQueueTable
        items={filteredItems}
        selectedIds={selectedIds}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelect={handleToggleSelect}
        onRemoveItem={handleRemoveItem}
        platformFilter={platformFilter}
        setPlatformFilter={setPlatformFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 5. FastCrawl Streaming Terminal Console */}
      <DownloaderTerminal logs={logs} />
    </div>
  );
};
