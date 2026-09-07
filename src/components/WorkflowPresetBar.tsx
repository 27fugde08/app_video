import React, { useState } from 'react';
import { Bookmark, Save, Trash2, Check, Sparkles } from 'lucide-react';
import { workflowPresetService, DownloaderConfigPreset } from '../services/workflowPresetService';
import { useToast } from '../context/ToastContext';
import { soundSynth } from '../utils/audioUtils';

interface WorkflowPresetBarProps {
  category: 'downloader' | 'dubbing' | 'full_workflow';
  onSelectPreset: (preset: DownloaderConfigPreset) => void;
  currentConfigToSave?: any;
}

export const WorkflowPresetBar: React.FC<WorkflowPresetBarProps> = ({
  category,
  onSelectPreset,
  currentConfigToSave
}) => {
  const { addToast } = useToast();
  const [presets, setPresets] = useState<DownloaderConfigPreset[]>(() =>
    workflowPresetService.getPresetsByCategory(category)
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');

  const handleApplyPreset = (preset: DownloaderConfigPreset) => {
    setActivePresetId(preset.id);
    soundSynth.playSfx('pop');
    onSelectPreset(preset);
    addToast(`Đã áp dụng cấu hình Mẫu: "${preset.name}"`, 'success');
  };

  const handleSaveCurrentPreset = () => {
    if (!presetName.trim()) {
      addToast('Vui lòng nhập tên cấu hình mẫu!', 'info');
      return;
    }

    const created = workflowPresetService.savePreset({
      name: presetName.trim(),
      description: presetDesc.trim() || 'Cấu hình tùy chỉnh do người dùng tạo',
      category,
      config: currentConfigToSave || {}
    });

    setPresets(workflowPresetService.getPresetsByCategory(category));
    setActivePresetId(created.id);
    setShowSaveModal(false);
    setPresetName('');
    setPresetDesc('');
    soundSynth.playSfx('pop');
    addToast(`Đã lưu mẫu cấu hình mới "${created.name}"`, 'success');
  };

  const handleDeletePreset = (id: string, name: string) => {
    workflowPresetService.deletePreset(id);
    setPresets(workflowPresetService.getPresetsByCategory(category));
    if (activePresetId === id) setActivePresetId(null);
    soundSynth.playSfx('pop');
    addToast(`Đã xóa mẫu cấu hình "${name}"`, 'info');
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar max-w-full py-0.5">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold shrink-0">
          <Bookmark className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-mono">Mẫu Cấu Hình:</span>
        </div>

        {presets.map((p) => {
          const isActive = activePresetId === p.id;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-sm shadow-cyan-500/20'
                  : 'bg-[#07090f] text-slate-300 border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
              onClick={() => handleApplyPreset(p)}
              title={p.description}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{p.name}</span>
              {isActive && <Check className="w-3 h-3 text-cyan-400" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePreset(p.id, p.name);
                }}
                className="ml-1 p-0.5 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                title="Xóa mẫu này"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowSaveModal(true)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 font-semibold border border-violet-500/30 cursor-pointer shrink-0 transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        <span>Lưu Cấu Hình Hiện Tại</span>
      </button>

      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="obsidian-card rounded-2xl max-w-md w-full p-5 border border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
                <Bookmark className="w-4 h-4" />
                <span>Lưu Mẫu Cấu Hình Mới</span>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tên Mẫu Cấu Hình
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Ví dụ: Reels TikTok - GPU High Speed"
                  className="w-full bg-[#07090f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  placeholder="Ví dụ: Dành cho các kênh tin tức ngắn 1080p"
                  className="w-full bg-[#07090f] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCurrentPreset}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-violet-600/30"
              >
                Lưu Mẫu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
