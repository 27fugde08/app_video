import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  HardDrive, 
  ChevronRight, 
  Check, 
  X, 
  Monitor, 
  Sparkles,
  ArrowUp
} from 'lucide-react';
import { soundSynth } from '../utils/audioUtils';

interface FolderPickerModalProps {
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
}

// Preset popular system directories
const PRESET_PATHS = [
  { name: 'Downloads/CreatorOS', path: 'D:/Downloads/CreatorOS', drive: 'D:' },
  { name: 'Thư mục Videos hệ thống', path: 'C:/Users/Admin/Videos/CreatorOS', drive: 'C:' },
  { name: 'Kho Video TikTok', path: 'D:/CreatorOS_Vault/TikTok', drive: 'D:' },
  { name: 'Kho Video Douyin', path: 'D:/CreatorOS_Vault/Douyin', drive: 'D:' },
  { name: 'Dịch & Lồng tiếng AI', path: 'E:/Dubbing_Studio/Source_Videos', drive: 'E:' }
];

// Mock Directory Structure for visual browsing
const MOCK_DRIVES: Record<string, string[]> = {
  'C:': ['Users', 'Program Files', 'Windows', 'Videos', 'Downloads'],
  'D:': ['Downloads', 'CreatorOS_Vault', 'TikTok_Batch', 'Douyin_Raw', 'YouTube_Shorts', 'Projects_2026'],
  'E:': ['Dubbing_Studio', 'Video_Renders', 'Backup_Data']
};

const MOCK_SUBFOLDERS: Record<string, string[]> = {
  'Downloads': ['CreatorOS', 'Telegram_Desktop', 'Compressed'],
  'CreatorOS': ['TikTok_Downloaded', 'Douyin_Downloaded', 'Reels_Downloaded', 'Extracted_MP3'],
  'CreatorOS_Vault': ['TikTok', 'Douyin', 'YouTube', 'Facebook_Reels'],
  'Videos': ['CreatorOS', 'Screen_Captures', 'CapCut_Exports'],
  'Dubbing_Studio': ['Source_Videos', 'Voiceovers', 'Rendered_Outputs']
};

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  isOpen,
  currentPath,
  onClose,
  onSelectFolder
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(currentPath || 'D:/Downloads/CreatorOS');
  const [currentDrive, setCurrentDrive] = useState<string>('D:');
  const [pathHistory, setPathHistory] = useState<string[]>(['D:', 'Downloads', 'CreatorOS']);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [customFoldersMap, setCustomFoldersMap] = useState<Record<string, string[]>>({});

  if (!isOpen) return null;

  // Compute active breadcrumbs & current visual subfolder list
  const currentFolderName = pathHistory[pathHistory.length - 1] || 'Downloads';
  
  // Combine default mock subfolders with dynamically added folders
  const baseSubfolders = MOCK_SUBFOLDERS[currentFolderName] || MOCK_DRIVES[currentFolderName] || ['General_Media', 'Raw_Videos', 'Exports'];
  const customList = customFoldersMap[currentFolderName] || [];
  const activeSubfolders = Array.from(new Set([...baseSubfolders, ...customList]));

  // Build full string path from path history
  const computedPathString = pathHistory.join('/');

  // Navigate deeper into subfolder
  const handleOpenFolder = (folderName: string) => {
    soundSynth.playSfx('pop');
    const newHistory = [...pathHistory, folderName];
    setPathHistory(newHistory);
    setSelectedPath(newHistory.join('/'));
  };

  // Navigate back to parent folder
  const handleGoUp = () => {
    if (pathHistory.length > 1) {
      soundSynth.playSfx('pop');
      const newHistory = pathHistory.slice(0, pathHistory.length - 1);
      setPathHistory(newHistory);
      setSelectedPath(newHistory.join('/'));
    }
  };

  // Switch drive
  const handleSelectDrive = (drive: string) => {
    soundSynth.playSfx('pop');
    setCurrentDrive(drive);
    setPathHistory([drive, 'Downloads', 'CreatorOS']);
    setSelectedPath(`${drive}/Downloads/CreatorOS`);
  };

  // Select Preset
  const handleSelectPreset = (presetPath: string, drive: string) => {
    soundSynth.playSfx('success');
    setSelectedPath(presetPath);
    setCurrentDrive(drive);
    const parts = presetPath.split('/');
    setPathHistory(parts);
  };

  // Create new folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    soundSynth.playSfx('success');
    const createdName = newFolderName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    setCustomFoldersMap(prev => ({
      ...prev,
      [currentFolderName]: [...(prev[currentFolderName] || []), createdName]
    }));
    setNewFolderName('');
    setIsCreatingFolder(false);
    
    // Automatically open the newly created folder
    handleOpenFolder(createdName);
  };

  // Native Browser System Directory Picker Fallback
  const handleNativePicker = async () => {
    try {
      soundSynth.playSfx('pop');
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker();
        if (handle && handle.name) {
          const path = `D:/Downloads/${handle.name}`;
          setSelectedPath(path);
          soundSynth.playSfx('success');
        }
      } else {
        alert('Trình duyệt của bạn đang chạy trong môi trường Sandbox Sandbox. Bạn có thể sử dụng Giao diện Chọn Thư Mục Trực Quan bên dưới.');
      }
    } catch (err) {
      console.log('Directory selection cancelled');
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    soundSynth.playSfx('success');
    onSelectFolder(selectedPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Chọn Thư Mục Lưu Video Tải Về
              </h3>
              <p className="text-xs text-slate-400">
                Giao diện chọn đĩa cứng và vị trí thư mục lưu file trên hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* System Drive Selectors */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              1. Chọn ổ đĩa lưu trữ (Disks):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['C:', 'D:', 'E:'].map((drive) => {
                const isSelected = currentDrive === drive;
                return (
                  <button
                    key={drive}
                    type="button"
                    onClick={() => handleSelectDrive(drive)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <HardDrive className={`w-4 h-4 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold">Ổ đĩa ({drive})</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {drive === 'C:' ? 'System (SSD)' : drive === 'D:' ? 'Data Storage' : 'Expansion HDD'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Presets Quick Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              2. Đề xuất vị trí lưu phổ biến:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PATHS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset.path, preset.drive)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedPath === preset.path
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Folder Explorer */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            {/* Explorer Toolbar / Breadcrumbs */}
            <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono font-medium text-slate-700 py-0.5 scrollbar-none">
                <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {pathHistory.map((folder, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                    <button
                      type="button"
                      onClick={() => {
                        soundSynth.playSfx('pop');
                        const newHist = pathHistory.slice(0, index + 1);
                        setPathHistory(newHist);
                        setSelectedPath(newHist.join('/'));
                      }}
                      className="hover:text-rose-600 hover:underline shrink-0 cursor-pointer font-bold text-slate-800"
                    >
                      {folder}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={pathHistory.length <= 1}
                  onClick={handleGoUp}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                  title="Lên một cấp thư mục"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Lên cấp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Tạo thư mục</span>
                </button>
              </div>
            </div>

            {/* Inline Create Folder Input */}
            {isCreatingFolder && (
              <div className="p-2.5 bg-rose-50/60 border-b border-rose-100 flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
                <FolderPlus className="w-4 h-4 text-rose-600 shrink-0" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="Nhập tên thư mục mới..."
                  className="flex-1 bg-white border border-rose-300 rounded px-2.5 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded cursor-pointer transition-all"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Folder Items Grid */}
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {activeSubfolders.map((folderName, index) => {
                const itemFullPath = `${computedPathString}/${folderName}`;
                const isSelected = selectedPath === itemFullPath;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      soundSynth.playSfx('pop');
                      setSelectedPath(itemFullPath);
                    }}
                    onDoubleClick={() => handleOpenFolder(folderName)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-amber-500 group-hover:scale-110 transition-transform'}`} />
                      <span className="text-xs truncate font-mono">{folderName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFolder(folderName);
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                    >
                      Mở
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Path Preview Box */}
          <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between gap-3 shadow-inner">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Đường dẫn thư mục đang chọn:
              </span>
              <div className="text-xs font-mono font-bold text-amber-400 truncate mt-0.5">
                {selectedPath}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNativePicker}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 shrink-0 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Mở System Explorer</span>
            </button>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Xác nhận chọn thư mục này</span>
          </button>
        </div>

      </div>
    </div>
  );
};
