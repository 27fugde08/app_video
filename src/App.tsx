import React, { useState, useEffect, Suspense, lazy } from "react";
import { ActiveTab, LicenseStatus } from "../shared/types";
import { WindowHeader } from "./components/layout/WindowHeader";
import { Sidebar } from "./components/layout/Sidebar";
import { Footer } from "./components/layout/Footer";
import { QueueProvider } from "./context/QueueContext";
import { ToastProvider } from "./context/ToastContext";
import { GlobalTaskQueueModal } from "./components/GlobalTaskQueueModal";
import { ActivationModal } from "./components/ActivationModal";
import { OtaUpdateModal } from "./components/OtaUpdateModal";
import { AnimatePresence, motion } from "framer-motion";
import { SkeletonFallback } from "./components/SkeletonFallback";
import { CSharpWpfStudioTool } from "./components/CSharpWpfStudioTool";

// Lazy Load All Tools for Code Splitting
const WorkflowBuilderTool = lazy(() => import("./components/WorkflowBuilderTool").then(module => ({ default: module.WorkflowBuilderTool })));
const LanClusterTool = lazy(() => import("./components/LanClusterTool").then(module => ({ default: module.LanClusterTool })));
const LipSyncStudioTool = lazy(() => import("./components/LipSyncStudioTool").then(module => ({ default: module.LipSyncStudioTool })));
const BlueprintPresetTool = lazy(() => import("./components/BlueprintPresetTool").then(module => ({ default: module.BlueprintPresetTool })));
const OrchestratorTool = lazy(() => import("./components/OrchestratorTool").then(module => ({ default: module.OrchestratorTool })));
const HighlightTool = lazy(() => import("./components/HighlightTool").then(module => ({ default: module.HighlightTool })));
const ReviewTool = lazy(() => import("./components/ReviewTool").then(module => ({ default: module.ReviewTool })));
const TranslateVideoTool = lazy(() => import("./components/TranslateVideoTool").then(module => ({ default: module.TranslateVideoTool })));
const SemiContentTool = lazy(() => import("./components/SemiContentTool").then(module => ({ default: module.SemiContentTool })));
const LocalVoiceTool = lazy(() => import("./components/LocalVoiceTool").then(module => ({ default: module.LocalVoiceTool })));
const SeoSuiteTool = lazy(() => import("./components/SeoSuiteTool").then(module => ({ default: module.SeoSuiteTool })));
const BatchDownloaderPro = lazy(() => import("./features/downloader/BatchDownloaderPro").then(module => ({ default: module.default || module.BatchDownloaderPro })));
const DownloadedVideosTool = lazy(() => import("./components/DownloadedVideosTool").then(module => ({ default: module.DownloadedVideosTool })));
const AccountManagerTool = lazy(() => import("./components/AccountManagerTool").then(module => ({ default: module.AccountManagerTool })));
const ProxyManagerTool = lazy(() => import("./components/ProxyManagerTool").then(module => ({ default: module.ProxyManagerTool })));
const PostScheduleTool = lazy(() => import("./components/PostScheduleTool").then(module => ({ default: module.PostScheduleTool })));
const BulkSchedulerTool = lazy(() => import("./components/BulkSchedulerTool").then(module => ({ default: module.BulkSchedulerTool })));
const FanpageReelsTool = lazy(() => import("./components/FanpageReelsTool").then(module => ({ default: module.FanpageReelsTool })));
const TiktokPostTool = lazy(() => import("./components/TiktokPostTool").then(module => ({ default: module.TiktokPostTool })));
const AiManagerTool = lazy(() => import("./components/AiManagerTool").then(module => ({ default: module.AiManagerTool })));
const AiComicTool = lazy(() => import("./components/AiComicTool").then(module => ({ default: module.AiComicTool })));
const PhoneFarmTool = lazy(() => import("./components/PhoneFarmTool").then(module => ({ default: module.PhoneFarmTool })));
const FbSuiteTool = lazy(() => import("./components/FbSuiteTool").then(module => ({ default: module.FbSuiteTool })));
const DashboardTool = lazy(() => import("./components/DashboardTool").then(module => ({ default: module.DashboardTool })));
const ApiDocsTool = lazy(() => import("./components/ApiDocsTool").then(module => ({ default: module.ApiDocsTool })));
const UserGuideTool = lazy(() => import("./components/UserGuideTool").then(module => ({ default: module.UserGuideTool })));

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("csharp-wpf");
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isOtaModalOpen, setIsOtaModalOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>({
    is_activated: true,
    tier: "PRO_V48",
    license_key: "CR-PRO_V48-A93F2B1C-LIFETIME-8E99FA12",
    fingerprint_bound: "CR-F89A-4B21-9CE3-77F1",
    owner_name: "Thanh Đắc Lộc (Principal Studio)",
    issued_at: Date.now() - 86400000 * 30,
    expires_at: 0,
    max_nvenc_streams: 2,
    features: {
      unlimited_dag: true,
      demucs_gpu_isolation: true,
      local_voice_cloning: true,
      no_strike_matrix: true,
      batch_fb_phone_farm: true,
      ota_priority_updates: true
    }
  });

  useEffect(() => {
    fetchLicenseStatus();

    const handleNav = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail as ActiveTab);
      }
    };
    window.addEventListener("creatoros:navigate", handleNav);
    return () => window.removeEventListener("creatoros:navigate", handleNav);
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
      case "csharp-wpf":
        return <CSharpWpfStudioTool />;
      case "workflow":
        return <WorkflowBuilderTool />;
      case "lan-cluster":
        return <LanClusterTool />;
      case "lipsync":
        return <LipSyncStudioTool />;
      case "presets":
        return <BlueprintPresetTool />;
      case "orchestrator":
        return <OrchestratorTool />;
      case "highlight":
        return <HighlightTool />;
      case "review":
        return <ReviewTool />;
      case "translate":
        return <TranslateVideoTool />;
      case "semi-edit":
        return <SemiContentTool />;
      case "voice-local":
        return <LocalVoiceTool />;
      case "seo-suite":
        return <SeoSuiteTool />;
      case "batch-downloader":
        return <BatchDownloaderPro />;
      case "downloaded-videos":
        return <DownloadedVideosTool onNavigateToTab={(tab) => setActiveTab(tab as ActiveTab)} />;
      case "account-manager":
        return <AccountManagerTool />;
      case "proxy-manager":
        return <ProxyManagerTool />;
      case "post-schedule":
        return <PostScheduleTool />;
      case "bulk-scheduler":
        return <BulkSchedulerTool />;
      case "fanpage-reels":
        return <FanpageReelsTool />;
      case "tiktok-post":
        return <TiktokPostTool />;
      case "ai-manager":
        return <AiManagerTool />;
      case "ai-comic":
        return <AiComicTool />;
      case "phone-farm":
        return <PhoneFarmTool />;
      case "fb-suite":
        return <FbSuiteTool />;
      case "dashboard":
        return <DashboardTool />;
      case "api-docs":
        return <ApiDocsTool />;
      case "user-guide":
        return <UserGuideTool onNavigateToTab={(tab) => setActiveTab(tab)} />;
      default:
        return <CSharpWpfStudioTool />;
    }
  };

  return (
    <ToastProvider>
      <QueueProvider>
        <div 
          className="h-screen w-screen bg-[#05060a] text-[#e0e0e0] flex flex-col font-sans antialiased overflow-hidden relative select-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, #111422 0%, #05060a 70%)" }}
        >
          {/* Ambient Lighting Glows */}
          <div className="absolute top-[-100px] left-[20%] w-[600px] h-[600px] bg-cyan-500/[0.06] rounded-full blur-[150px] pointer-events-none z-0"></div>
          <div className="absolute bottom-[-60px] right-[15%] w-[550px] h-[550px] bg-purple-600/[0.06] rounded-full blur-[150px] pointer-events-none z-0"></div>

          {/* Top Windows Header */}
          <WindowHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
            onOpenOtaModal={() => setIsOtaModalOpen(true)}
            licenseTier={licenseStatus?.tier || "PRO_V48"}
          />

          {/* Main Desktop Container */}
          <div className="flex flex-1 overflow-hidden relative z-10">
            {/* Left Sidebar */}
            <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} onOpenLicenseModal={() => setIsLicenseModalOpen(true)} onOpenOtaModal={() => setIsOtaModalOpen(true)} />

            {/* Main Content Workspace */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-transparent custom-scrollbar">
              <div className="w-full max-w-[1680px] mx-auto h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="h-full"
                  >
                    <Suspense fallback={<SkeletonFallback />}>
                      {renderActiveTool()}
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>

          {/* Windows Desktop Status Bar Footer */}
          <Footer />

          {/* Global Task Queue Modal Drawer */}
          <GlobalTaskQueueModal />

          {/* DRM License Activation Modal */}
          <ActivationModal
            isOpen={isLicenseModalOpen}
            onClose={() => setIsLicenseModalOpen(false)}
            licenseStatus={licenseStatus}
            onLicenseUpdated={(newLic) => setLicenseStatus(newLic)}
          />

          {/* OTA Secure Update Modal */}
          <OtaUpdateModal
            isOpen={isOtaModalOpen}
            onClose={() => setIsOtaModalOpen(false)}
          />
        </div>
      </QueueProvider>
    </ToastProvider>
  );
}

