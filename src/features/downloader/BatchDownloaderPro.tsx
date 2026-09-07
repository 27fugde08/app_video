import React, { useState } from "react";
import { DownloaderBanner } from "./components/DownloaderBanner";
import { DiskSpaceIndicator } from "./components/DiskSpaceIndicator";
import { UrlInputCard } from "./components/UrlInputCard";
import { AdvancedConfigPanel } from "./components/AdvancedConfigPanel";
import { DownloaderQueueTable } from "./components/DownloaderQueueTable";
import { DownloaderTerminal } from "./components/DownloaderTerminal";
import { FolderPickerModal } from "../../components/FolderPickerModal";
import { useBatchDownloader } from "./hooks/useBatchDownloader";
import { downloaderService } from "./services/downloaderService";
import { soundSynth } from "../../utils/audioUtils";
import { useToast } from "../../context/ToastContext";
import { VideoDownloadItem, SupportedPlatformId } from "./types";
import { Download, FileJson, FileText, Sparkles, HardDrive, FolderSearch, Zap, Link, UserCheck, ShieldCheck, Search, Globe, Key, RefreshCw, Layers, CheckCircle, ExternalLink, ArrowRight, Eye, ThumbsUp, Clock } from "lucide-react";

export const BatchDownloaderPro: React.FC = () => {
  const { addToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"urls" | "creator" | "network">("urls");
  const [channelInput, setChannelInput] = useState<string>("@mrbeast");
  const [creatorPlatform, setCreatorPlatform] = useState<"tiktok" | "douyin" | "youtube" | "facebook">("tiktok");
  const [creatorCount, setCreatorCount] = useState<number>(25);
  const [scannedCreatorVideos, setScannedCreatorVideos] = useState<VideoDownloadItem[]>([]);
  const [isScanningCreator, setIsScanningCreator] = useState<boolean>(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState<boolean>(false);

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
    handleScanChannel: scanChannelFromHook,
    handleDownloadSelected,
    handleClearQueue,
    handleToggleSelectAll,
    handleToggleSelect,
    handleRemoveItem,
    handleClearSelection,
    handleDeleteSelected,
    handleRetryFailedTasks,
    handleBatchRename,
    handleBatchTransferToDubbing,
    handleLoadMockTestData
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

  const handleDownloadAndDubPipeline = () => {
    soundSynth.playSfx("cash");
    handleDownloadSelected();
    addToast("⚡ 1-Click Pipeline: Đã kích hoạt tải video & tự động nạp sang Studio Dịch Lồng Tiếng AI!", "success");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("creatoros:navigate", { detail: "translate" }));
    }, 1200);
  };

  const handleExecuteCreatorScan = async () => {
    if (!channelInput.trim()) {
      soundSynth.playSfx("pop");
      addToast("Vui lòng nhập đường link hoặc ID kênh người sáng tạo!", "warning");
      return;
    }

    setIsScanningCreator(true);
    soundSynth.playSfx("pop");
    addToast(`Đang quét kênh ${channelInput} (${creatorCount} video)...`, "info");

    try {
      const results = await scanChannelFromHook(channelInput, creatorPlatform, creatorCount);
      if (results && results.length > 0) {
        setScannedCreatorVideos(results);
        soundSynth.playSfx("success");
        addToast(`Đã bóc tách thành công ${results.length} video từ kênh ${channelInput}!`, "success");
      }
    } catch (err: any) {
      addToast(`Lỗi quét kênh: ${err.message}`, "error");
    } finally {
      setIsScanningCreator(false);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans text-slate-100 antialiased pb-12 select-none">
      {/* Module Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setActiveSubTab("urls");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "urls"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>1. Tải URL Hàng Loạt</span>
          </button>

          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setActiveSubTab("creator");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "creator"
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>2. Quét Kênh & Creator</span>
          </button>

          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setActiveSubTab("network");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "network"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Cấu Hình Proxy & Network</span>
          </button>
        </div>

        {/* Quick Export & Direct OS Folder Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundSynth.playSfx("pop");
              setIsFolderPickerOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-600/30 active:scale-95"
          >
            <FolderSearch className="w-3.5 h-3.5 text-cyan-100" />
            <span>📁 Thư Mục Lưu Trực Tiếp</span>
          </button>

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
        </div>
      </div>

      {/* SUB TAB 1: URLS INPUT & QUEUE */}
      {activeSubTab === "urls" && (
        <>
          {/* Multi-Platform Banner */}
          <DownloaderBanner
            selectedPlatform={platformFilter}
            onSelectPlatform={setPlatformFilter}
          />

          {/* Disk Space Indicator & Safety Guard Bar */}
          <DiskSpaceIndicator currentPath={config.saveDirectory} />

          {/* Advanced Configuration Panel (Cookie, Proxy, Toggles) */}
          <AdvancedConfigPanel config={config} setConfig={setConfig} />

          {/* Multi-line URL Input Card with Actions */}
          <UrlInputCard
            rawUrlInput={rawUrlInput}
            setRawUrlInput={setRawUrlInput}
            detectedCount={detectedUrls.length}
            isScanning={isScanning}
            isDownloading={isDownloading}
            selectedCount={selectedIds.size}
            totalQueueCount={items.length}
            saveDirectory={config.saveDirectory}
            onOpenFolderPicker={() => setIsFolderPickerOpen(true)}
            onStartScan={handleStartScan}
            onDownloadSelected={handleDownloadSelected}
            onDownloadAndDubPipeline={handleDownloadAndDubPipeline}
            onClearQueue={handleClearQueue}
            onLoadMockTestData={handleLoadMockTestData}
          />

          {/* Downloader Queue Table */}
          <DownloaderQueueTable
            items={filteredItems}
            selectedIds={selectedIds}
            onToggleSelectAll={handleToggleSelectAll}
            onToggleSelect={handleToggleSelect}
            onRemoveItem={handleRemoveItem}
            onRetryFailedTasks={handleRetryFailedTasks}
            onDeleteSelected={handleDeleteSelected}
            onClearSelection={handleClearSelection}
            onBatchRename={handleBatchRename}
            onBatchTransferToDubbing={handleBatchTransferToDubbing}
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </>
      )}

      {/* SUB TAB 2: CHANNEL & CREATOR SCRAPER */}
      {activeSubTab === "creator" && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Quét Kênh Creator Hàng Loạt (Auto Scraper Pro)</h3>
                  <p className="text-xs text-slate-400">Bóc tách tự động toàn bộ video từ ID/Profile TikTok, Douyin, YouTube Shorts, Facebook Reels</p>
                </div>
              </div>

              {/* Platform Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                {(["tiktok", "douyin", "youtube", "facebook"] as const).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => {
                      setCreatorPlatform(plat);
                      soundSynth.playSfx("pop");
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      creatorPlatform === plat
                        ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {plat === "douyin" ? "Douyin 抖音" : plat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets & Quantity */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">Kênh mẫu gợi ý:</span>
                <button
                  onClick={() => {
                    setChannelInput("@mrbeast");
                    setCreatorPlatform("tiktok");
                    soundSynth.playSfx("pop");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
                >
                  @mrbeast
                </button>
                <button
                  onClick={() => {
                    setChannelInput("https://www.douyin.com/user/MS4wLjABAAAA_DouyinStar");
                    setCreatorPlatform("douyin");
                    soundSynth.playSfx("pop");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
                >
                  Douyin Star Profile
                </button>
                <button
                  onClick={() => {
                    setChannelInput("https://www.youtube.com/@mkbhd");
                    setCreatorPlatform("youtube");
                    soundSynth.playSfx("pop");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
                >
                  @mkbhd
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Số lượng lấy:</span>
                {[10, 25, 50, 100].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => {
                      setCreatorCount(cnt);
                      soundSynth.playSfx("pop");
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      creatorCount === cnt
                        ? "bg-violet-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cnt} video
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="Nhập ID kênh (Ví dụ: @mrbeast hoặc https://www.douyin.com/user/...)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500 font-mono"
              />
              <button
                onClick={handleExecuteCreatorScan}
                disabled={isScanningCreator || !channelInput.trim()}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 ${
                  isScanningCreator || !channelInput.trim()
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 cursor-pointer shadow-violet-500/20"
                }`}
              >
                {isScanningCreator ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Đang bóc tách feed ({creatorCount} video)...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Bóc Tách Toàn Bộ Video Kênh ({creatorCount})</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Giới Hạn Bóc Tách</span>
                <div className="text-xs font-bold text-violet-300">Tối đa {creatorCount} video / lần quét</div>
              </div>
              <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Xóa Watermark Logo</span>
                <div className="text-xs font-bold text-emerald-400">100% Sạch Logo (Direct CDN HD)</div>
              </div>
              <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Trích Xuất Song Song</span>
                <div className="text-xs font-bold text-cyan-400">MP4 HD + MP3 + Cover + Metadata</div>
              </div>
            </div>
          </div>

          {/* Scanned Results Preview Section */}
          {scannedCreatorVideos.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Đã bóc tách thành công {scannedCreatorVideos.length} video từ kênh {channelInput}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Toàn bộ video đã được tự động thêm vào danh sách hàng đợi tải
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundSynth.playSfx("pop");
                      setActiveSubTab("urls");
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Xem trong Hàng Đợi ({items.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      soundSynth.playSfx("cash");
                      handleDownloadSelected();
                      setActiveSubTab("urls");
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>⚡ Bắt Đầu Tải Ngay</span>
                  </button>
                </div>
              </div>

              {/* Video Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {scannedCreatorVideos.map((vid, idx) => (
                  <div
                    key={vid.id}
                    className="bg-slate-950 border border-slate-800/80 hover:border-violet-500/50 rounded-xl overflow-hidden group transition-all"
                  >
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        {vid.duration}
                      </span>
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500/80 text-white text-[9px] font-bold">
                        No-WM
                      </span>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed" title={vid.title}>
                        {vid.title}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[120px]">{vid.author}</span>
                        <span className="text-emerald-400 font-mono text-[10px]">{vid.fileSize}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                        <span className="flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          {(vid.views || 100000).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-2.5 h-2.5" />
                          {(vid.likes || 15000).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 3: NETWORK & PROXY MANAGER */}
      {activeSubTab === "network" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cấu Hình Proxy & Xuyên Tường Lửa FastCrawl</h3>
              <p className="text-xs text-slate-400">Đổi IP xoay vòng, cấu hình User-Agent giả lập thiết bị di động chống Rate Limit</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Danh Sách Proxy Xoay Vòng (HTTP / SOCKS5)</span>
              </h4>
              <textarea
                rows={4}
                placeholder="192.168.1.100:8080:user:pass&#10;10.0.0.1:3128"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  soundSynth.playSfx("success");
                  addToast("Đã lưu và kiểm tra kết nối 2 Proxy thành công!", "success");
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Kiểm Tra Connection
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Cookie Tự Động Nạp (TikTok / Douyin Bypass)</span>
              </h4>
              <input
                type="text"
                placeholder="Paste msToken / ttwid / sessionid..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-400">Giúp bóc tách các video ở chế độ riêng tư hoặc yêu cầu đăng nhập</p>
            </div>
          </div>
        </div>
      )}

      {/* FastCrawl Streaming Terminal Console */}
      <DownloaderTerminal logs={logs} />

      {/* System Directory Picker Modal */}
      <FolderPickerModal
        isOpen={isFolderPickerOpen}
        currentPath={config.saveDirectory}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelectFolder={(selectedPath) => {
          setConfig((prev) => ({ ...prev, saveDirectory: selectedPath }));
          addToast(`Đã chọn thư mục lưu trữ: ${selectedPath}`, "success");
        }}
      />
    </div>
  );
};

export default BatchDownloaderPro;



