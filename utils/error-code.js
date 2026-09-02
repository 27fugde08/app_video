/**
 * CreatorOS PRO_V40 - Standardized Error Code System (utils/error-code.js)
 * ==============================================================================
 * Danh sách mã lỗi chuẩn hóa toàn cục của ứng dụng CreatorOS.
 * Kèm mô tả đa ngôn ngữ (Tiếng Việt / Tiếng Anh) và hàm tạo Error Object thống nhất.
 */

export const ERROR_CODES = {
  // 0: Thành công
  SUCCESS: {
    code: 0,
    vi: 'Thao tác thành công.',
    en: 'Operation completed successfully.'
  },

  // 1000 - 1999: Lỗi hệ thống chung
  UNKNOWN_ERROR: {
    code: 1000,
    vi: 'Đã xảy ra lỗi không xác định trong hệ thống.',
    en: 'An unknown system error occurred.'
  },
  INVALID_PARAMS: {
    code: 1001,
    vi: 'Tham số truyền vào không hợp lệ.',
    en: 'Invalid input parameters.'
  },
  FILE_NOT_FOUND: {
    code: 1002,
    vi: 'Tệp tin hoặc đường dẫn không tồn tại.',
    en: 'File or path not found.'
  },
  PERMISSION_DENIED: {
    code: 1003,
    vi: 'Quyền truy cập bị từ chối.',
    en: 'Permission denied.'
  },
  TIMEOUT_EXCEEDED: {
    code: 1004,
    vi: 'Hết thời gian chờ thực thi (Timeout).',
    en: 'Execution timeout exceeded.'
  },
  NETWORK_ERROR: {
    code: 1005,
    vi: 'Lỗi kết nối mạng hoặc server không phản hồi.',
    en: 'Network connection error or server unresponsive.'
  },

  // 2000 - 2999: Lỗi Worker & Job Queue
  WORKER_CRITICAL: {
    code: 2000,
    vi: 'Lỗi nghiêm trọng trong tiến trình Worker.',
    en: 'Critical error in worker process.'
  },
  JOB_CANCELLED: {
    code: 2001,
    vi: 'Tác vụ đã bị hủy bởi người dùng.',
    en: 'Job was cancelled by the user.'
  },
  JOB_ALREADY_EXISTS: {
    code: 2002,
    vi: 'Tác vụ với ID này đã tồn tại trong hàng đợi.',
    en: 'Job with this ID already exists in queue.'
  },
  JOB_QUEUE_FULL: {
    code: 2003,
    vi: 'Hàng đợi tác vụ đã đầy.',
    en: 'Job queue is full.'
  },

  // 3000 - 3999: Lỗi xử lý Media & AI Dubbing
  FFMPEG_EXEC_FAILED: {
    code: 3000,
    vi: 'Lỗi thực thi lệnh FFmpeg xử lý video/audio.',
    en: 'FFmpeg execution error during media processing.'
  },
  DEMUCS_PROCESSING_FAILED: {
    code: 3001,
    vi: 'Lỗi tách nhạc nền và giọng nói (Demucs AI).',
    en: 'Audio vocal separation failed (Demucs AI).'
  },
  STT_TRANSLATION_FAILED: {
    code: 3002,
    vi: 'Lỗi chuyển nhận dạng giọng nói sang văn bản (STT).',
    en: 'Speech-to-text transcription failed.'
  },
  TTS_SYNTHESIS_FAILED: {
    code: 3003,
    vi: 'Lỗi tổng hợp giọng nói AI (TTS).',
    en: 'AI voice synthesis failed.'
  },
  WAV2LIP_MODEL_FAILED: {
    code: 3004,
    vi: 'Lỗi mô hình khớp khẩu hình môi Wav2Lip.',
    en: 'Wav2Lip lip-sync rendering failed.'
  },
  UNSUPPORTED_MEDIA_FORMAT: {
    code: 3005,
    vi: 'Định dạng media không được hỗ trợ.',
    en: 'Unsupported media format.'
  },

  // 4000 - 4999: Lỗi Scanner & Crawler
  SCANNER_TIKTOK_BLOCKED: {
    code: 4000,
    vi: 'TikTok từ chối truy cập hoặc yêu cầu CAPTCHA.',
    en: 'TikTok request blocked or CAPTCHA required.'
  },
  SCANNER_DOUYIN_BLOCKED: {
    code: 4001,
    vi: 'Douyin từ chối truy cập hoặc thay đổi cấu trúc.',
    en: 'Douyin request blocked or structure changed.'
  },
  WATERMARK_REMOVAL_FAILED: {
    code: 4002,
    vi: 'Không thể trích xuất video không logo watermark.',
    en: 'Failed to extract no-watermark video link.'
  },
  VIDEO_URL_EXPIRED: {
    code: 4003,
    vi: 'Đường dẫn video gốc đã hết hạn truy cập.',
    en: 'Original video URL has expired.'
  },

  // 5000 - 5999: Lỗi Đăng bài Mạng Xã Hội
  FB_TOKEN_EXPIRED: {
    code: 5000,
    vi: 'Facebook Access Token hết hạn hoặc không hợp lệ.',
    en: 'Facebook Access Token expired or invalid.'
  },
  FB_GRAPH_API_ERROR: {
    code: 5001,
    vi: 'Lỗi phản hồi từ Facebook Graph API.',
    en: 'Error response from Facebook Graph API.'
  },
  INSTAGRAM_REELS_FAIL: {
    code: 5002,
    vi: 'Đăng Instagram Reels thất bại.',
    en: 'Failed to publish Instagram Reels.'
  },
  ZALO_OA_AUTH_EXPIRED: {
    code: 5003,
    vi: 'Xác thực Zalo Official Account / Cookie hết hạn.',
    en: 'Zalo OA authentication or cookie expired.'
  },
  RATE_LIMIT_EXCEEDED: {
    code: 5004,
    vi: 'Đã vượt quá giới hạn tần suất gửi bài (Rate Limit).',
    en: 'Publishing rate limit exceeded.'
  },

  // 6000 - 6999: Lỗi AI & Gemini
  GEMINI_API_KEY_MISSING: {
    code: 6000,
    vi: 'Thiếu API Key cho Gemini AI Service.',
    en: 'Gemini API Key missing.'
  },
  GEMINI_RESPONSE_BLOCKED: {
    code: 6001,
    vi: 'Phản hồi AI bị chặn do chính sách nội dung.',
    en: 'AI response blocked due to safety policy.'
  },
  GEMINI_QUOTA_EXCEEDED: {
    code: 6002,
    vi: 'Vượt quá hạn ngạch sử dụng Gemini API (Quota Exceeded).',
    en: 'Gemini API quota exceeded.'
  },

  // 7000 - 7999: Lỗi Phiên & Trình Duyệt
  COOKIE_INVALID: {
    code: 7000,
    vi: 'Chuỗi Cookie không đúng định dạng hoặc đã đăng xuất.',
    en: 'Cookie string malformed or logged out.'
  },
  SESSION_EXPIRED: {
    code: 7001,
    vi: 'Phiên làm việc người dùng đã hết hạn.',
    en: 'User session has expired.'
  },
  CHROME_AUTOMATION_FAILED: {
    code: 7002,
    vi: 'Lỗi tự động hóa trình duyệt Puppeteer/Stealth.',
    en: 'Browser automation execution failed.'
  }
};

/**
 * Lấy thông điệp lỗi tương ứng với mã lỗi và ngôn ngữ (mặc định tiếng Việt)
 */
export function getErrorMessage(codeOrKey, lang = 'vi') {
  let errorObj = null;

  if (typeof codeOrKey === 'number') {
    errorObj = Object.values(ERROR_CODES).find((e) => e.code === codeOrKey);
  } else if (typeof codeOrKey === 'string' && ERROR_CODES[codeOrKey]) {
    errorObj = ERROR_CODES[codeOrKey];
  }

  if (!errorObj) {
    return lang === 'en' ? 'Unknown error.' : 'Lỗi không xác định.';
  }

  return errorObj[lang] || errorObj.vi;
}

/**
 * Khởi tạo đối tượng Lỗi ứng dụng CreatorOS tiêu chuẩn
 */
export function createAppError(errorCodeKey, customDetails = null) {
  const meta = ERROR_CODES[errorCodeKey] || ERROR_CODES.UNKNOWN_ERROR;
  const err = new Error(meta.vi);
  err.code = meta.code;
  err.codeKey = errorCodeKey;
  err.descriptionVi = meta.vi;
  err.descriptionEn = meta.en;
  if (customDetails) {
    err.details = customDetails;
  }
  return err;
}

export default {
  CODES: ERROR_CODES,
  getErrorMessage,
  createAppError
};
