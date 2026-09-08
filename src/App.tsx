import React, { useState, lazy, Suspense, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Navbar as LayoutNavbar } from "./components/Navbar";
import { ActiveTab } from "./contracts/system.types";
import { QueueProvider } from "./context/QueueContext";
import { ToastProvider } from "./context/ToastContext";
import { GlobalTaskQueueModal } from "./components/GlobalTaskQueueModal";
import { ActivationModal } from "./components/ActivationModal";
import { OtaUpdateModal } from "./components/OtaUpdateModal";
import { GpuAccelerationModal } from "./components/GpuAccelerationModal";
import { SettingsTool } from "./components/SettingsTool";
import { AnimatePresence, motion } from "framer-motion";
import { SkeletonFallback } from "./components/SkeletonFallback";

// Lazy Load Tools for Code Splitting
const BlueprintPresetTool = lazy(() => import("./components/BlueprintPresetTool").then(module => ({ default: module.BlueprintPresetTool })));
const OrchestratorTool = lazy(() => import("./components/OrchestratorTool").then(module => ({ default: module.OrchestratorTool })));
const TranslateVideoTool = lazy(() => import("./components/TranslateVideoTool").then(module => ({ default: module.TranslateVideoTool })));
const BatchDownloaderPro = lazy(() => import("./features/downloader/BatchDownloaderPro").then(module => ({ default: module.default || module.BatchDownloaderPro })));
const DownloadedVideosTool = lazy(() => import("./components/DownloadedVideosTool").then(module => ({ default: module.DownloadedVideosTool })));
const ApiDocsTool = lazy(() => import("./components/ApiDocsTool").then(module => ({ default: module.ApiDocsTool })));
const UserGuideTool = lazy(() => import("./components/UserGuideTool").then(module => ({ default: module.UserGuideTool })));

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("batch-downloader");
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isOtaModalOpen, setIsOtaModalOpen] = useState(false);
  const [isGpuModalOpen, setIsGpuModalOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<any>({
    tier: "Enterprise Studio Pro",
    status: "Licensed",
    expiresAt: "2027-12-31",
    hardwareId: "RTX4090-NVENC-98AB-55CD"
  });

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  const fetchLicenseStatus = async () => {
    try {
      const res = await fetch("/api/license/status");
      const json = await res.json();
      if (json.success && json.data) {
        setLicenseStatus(json.data);
      }
    } catch (e) {
      console.warn("Could not fetch license status", e);
    }
  };

  const renderActiveTool = () => {
    switch (activeTab) {
      case "lipsync":
      case "voice-local":
      case "seo-suite":
      case "highlight":
      case "translate":
      case "review":
      case "ai-comic":
        return <TranslateVideoTool />;
      case "batch-downloader":
        return <BatchDownloaderPro onNavigateToTab={(tab) => setActiveTab(tab as ActiveTab)} />;
      case "downloaded-videos":
        return <DownloadedVideosTool onNavigateToTab={(tab) => setActiveTab(tab as ActiveTab)} />;
      case "settings":
        return <SettingsTool />;
      case "api-docs":
        return <ApiDocsTool />;
      case "user-guide":
        return <UserGuideTool onNavigateToTab={(tab) => setActiveTab(tab)} />;
      default:
        return <BatchDownloaderPro />;
    }
  };

  return (
    <ToastProvider>
      <QueueProvider>
        <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab as ActiveTab)}
            licenseTier={licenseStatus.tier}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
            <LayoutNavbar
              activeTab={activeTab}
              onOpenLicense={() => setIsLicenseModalOpen(true)}
              onOpenOta={() => setIsOtaModalOpen(true)}
              onOpenGpu={() => setIsGpuModalOpen(true)}
            />

            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <Suspense fallback={<SkeletonFallback />}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col min-h-0 h-full w-full"
                  >
                    {renderActiveTool()}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </main>
          </div>

          {/* Modals */}
          <GlobalTaskQueueModal />
          <ActivationModal
            isOpen={isLicenseModalOpen}
            onClose={() => setIsLicenseModalOpen(false)}
            licenseStatus={licenseStatus}
          />
          <OtaUpdateModal
            isOpen={isOtaModalOpen}
            onClose={() => setIsOtaModalOpen(false)}
          />
          <GpuAccelerationModal
            isOpen={isGpuModalOpen}
            onClose={() => setIsGpuModalOpen(false)}
          />
        </div>
      </QueueProvider>
    </ToastProvider>
  );
}
