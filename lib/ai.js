/**
 * CreatorOS PRO_V40 - AI Orchestrator & Gemini Engine (lib/ai.js)
 * ==============================================================================
 * Tích hợp các API AI (Gemini API qua @google/genai SDK) để hỗ trợ sinh tiêu đề,
 * tóm tắt nội dung, viết lại kịch bản, và tự động hóa prompt trong CreatorOS.
 */

import { GoogleGenAI } from '@google/genai';

class AIServiceManager {
  constructor() {
    this.modelName = 'gemini-3.7-flash';
    this.aiClient = null;
    this.initClient();
  }

  /**
   * Khởi tạo Gemini AI Client với API Key
   */
  initClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        console.log('[AI_LIB] Đã khởi tạo thành công Gemini AI SDK Client.');
      } catch (err) {
        console.warn('[AI_LIB_WARN] Không thể khởi tạo Gemini Client:', err.message);
        this.aiClient = null;
      }
    } else {
      console.log('[AI_LIB_INFO] Chưa cấu hình GEMINI_API_KEY trong môi trường. Sẽ sử dụng bộ tạo nội dung thông minh dự phòng.');
    }
  }

  /**
   * Kiểm tra khả năng hoạt động của Gemini API
   */
  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY && this.aiClient);
  }

  /**
   * 1. Sinh tiêu đề video Viral cho các nền tảng (TikTok, Shorts, Reels, Douyin)
   */
  async generateTitle(topicOrPrompt, options = {}) {
    const platform = options.platform || 'TikTok/Shorts';
    const language = options.language || 'Tiếng Việt';
    const style = options.style || 'Bắt mắt, giật gân, cuốn hút (Viral & Clickthrough)';

    console.log(`[AI_LIB] Tạo tiêu đề video cho [${platform}] - Chủ đề: "${topicOrPrompt}"`);

    if (this.isConfigured()) {
      try {
        const prompt = `Bạn là chuyên gia Sáng tạo Nội dung Short-form hàng đầu. Hãy tạo 5 tiêu đề ngắn gọn (dưới 12 từ), cực kỳ cuốn hút, giật gân và tối ưu tỷ lệ click (CTR) cho nền tảng ${platform}.\n\nChủ đề: "${topicOrPrompt}"\nPhong cách: ${style}\nNgôn ngữ: ${language}\n\nYêu cầu xuất ra danh sách JSON gồm 5 tiêu đề tinh túy nhất.`;

        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction: 'Bạn là chuyên gia tiếp thị video ngắn chuyên sâu về TikTok, YouTube Shorts, Facebook Reels và Douyin.'
          }
        });

        const textOutput = response.text ? response.text.trim() : '';
        if (textOutput) {
          return this.parseTitlesFromResponse(textOutput);
        }
      } catch (err) {
        console.warn('[AI_LIB_WARN] Lỗi gọi Gemini API (generateTitle), chuyển sang bộ tạo dự phòng:', err.message);
      }
    }

    // Dự phòng Local Smart Generator
    return this.fallbackGenerateTitle(topicOrPrompt, platform);
  }

  /**
   * 2. Tóm tắt nội dung tài liệu, bản chép lời (Transcript) hoặc video dài
   */
  async summarizeContent(text, options = {}) {
    const maxWords = options.maxWords || 150;
    const format = options.format || 'bullet_points';

    console.log(`[AI_LIB] Tóm tắt nội dung (${text ? text.length : 0} ký tự)...`);

    if (!text || text.trim().length === 0) {
      return { summary: 'Không có nội dung để tóm tắt.', keyPoints: [] };
    }

    if (this.isConfigured()) {
      try {
        const prompt = `Hãy tóm tắt ngắn gọn đoạn văn bản dưới đây trong khoảng ${maxWords} từ dưới dạng các ý chính (Bullet points):\n\n"${text.substring(0, 8000)}"`;

        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: prompt
        });

        if (response.text) {
          const raw = response.text.trim();
          const points = raw.split('\n').filter((l) => l.trim().length > 0).map((l) => l.replace(/^[-*•\d.]+\s*/, ''));
          return {
            summary: raw,
            keyPoints: points
          };
        }
      } catch (err) {
        console.warn('[AI_LIB_WARN] Lỗi gọi Gemini API (summarizeContent):', err.message);
      }
    }

    // Dự phòng Local Summary
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    const keyPoints = sentences.slice(0, 4).map((s) => s.trim());
    return {
      summary: keyPoints.join('. ') + '.',
      keyPoints
    };
  }

  /**
   * 3. Viết lại Kịch bản Video (Rewrite Script) để lách bản quyền hoặc tối ưu nhịp độ
   */
  async rewriteScript(scriptText, options = {}) {
    const tone = options.tone || 'Hấp dẫn, kịch tính, cuốn hút ngay 3 giây đầu';
    const targetLengthSec = options.targetLengthSec || 60;

    console.log(`[AI_LIB] Viết lại kịch bản video (${scriptText.length} ký tự, Tone: ${tone})...`);

    if (this.isConfigured()) {
      try {
        const prompt = `Hãy viết lại kịch bản video ngắn (${targetLengthSec} giây) dưới đây để đạt điểm số giữ chân người xem (Retention) tối đa, lách trùng lặp bản quyền âm thanh/lời thoại:\n\nKịch bản gốc:\n"${scriptText}"\n\nTông giọng & Phong cách: ${tone}\n\nCấu trúc yêu cầu:\n1. Hook (3s đầu cuốn hút)\n2. Thân bài (súc tích, dồn dập)\n3. Call To Action (Kêu gọi hành động).`;

        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: prompt
        });

        if (response.text) {
          return {
            rewrittenScript: response.text.trim(),
            originalLength: scriptText.length,
            tone
          };
        }
      } catch (err) {
        console.warn('[AI_LIB_WARN] Lỗi gọi Gemini API (rewriteScript):', err.message);
      }
    }

    // Local fallback rewrite
    return {
      rewrittenScript: `[HOOK 3S]: Bạn có biết bí mật đằng sau ${scriptText.substring(0, 40)}?\n\n[NỘI DUNG CHÍNH]: ${scriptText.substring(0, 300)}...\n\n[CALL TO ACTION]: Nhấn Theo Dõi ngay để không bỏ lỡ các video tiếp theo!`,
      originalLength: scriptText.length,
      tone
    };
  }

  /**
   * 4. Sinh Hashtags xu hướng tối ưu hiển thị (Hashtag Generator)
   */
  async generateHashtags(topic, count = 10, platform = 'TikTok') {
    console.log(`[AI_LIB] Sinh ${count} hashtags xu hướng cho chủ đề: "${topic}" (${platform})`);

    if (this.isConfigured()) {
      try {
        const prompt = `Hãy gợi ý ${count} thẻ Hashtag xu hướng (Trending Hashtags) tốt nhất cho video chủ đề "${topic}" trên nền tảng ${platform}. Chỉ trả về các hashtag bắt đầu bằng dấu # cách nhau bởi khoảng trắng.`;

        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: prompt
        });

        if (response.text) {
          const tags = response.text.match(/#[^\s#]+/g) || [];
          if (tags.length > 0) return tags.slice(0, count);
        }
      } catch (err) {
        console.warn('[AI_LIB_WARN] Lỗi gọi Gemini API (generateHashtags):', err.message);
      }
    }

    // Local fallback hashtags
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-0a-zA-Zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/g, '');
    return [
      `#${cleanTopic}`,
      '#creatoros',
      '#xuhuong',
      '#viral',
      '#trending',
      '#fyp',
      `#${platform.toLowerCase()}`,
      '#aivideo',
      '#contentcreator',
      '#shorts'
    ].slice(0, count);
  }

  /**
   * 5. Gói Metadata đầy đủ cho bài viết/video xuất bản
   */
  async generateVideoMetadata(topic, platform = 'TikTok') {
    const titles = await this.generateTitle(topic, { platform });
    const selectedTitle = titles[0] || `Video hot về ${topic}`;
    const hashtags = await this.generateHashtags(topic, 8, platform);

    return {
      title: selectedTitle,
      alternateTitles: titles.slice(1),
      description: `${selectedTitle}\n\nXem ngay video để khám phá chi tiết!\n\n${hashtags.join(' ')}`,
      hashtags,
      cta: '👉 Nhấn Theo Dõi & Thả Tim để cập nhật nội dung mới nhất!'
    };
  }

  /**
   * Helper parse danh sách tiêu đề từ văn bản Gemini
   */
  parseTitlesFromResponse(text) {
    const lines = text.split('\n');
    const titles = [];

    for (const line of lines) {
      const clean = line.replace(/^[\d.*-]+\s*/, '').replace(/^"|"$/g, '').trim();
      if (clean.length > 5) {
        titles.push(clean);
      }
    }

    return titles.length > 0 ? titles.slice(0, 5) : [text.substring(0, 80)];
  }

  /**
   * Fallback sinh tiêu đề thông minh khi không có API Key
   */
  fallbackGenerateTitle(topic, platform) {
    return [
      `🔥 BÍ MẬT VỀ ${topic.toUpperCase()} BẠN CHƯA BIẾT!`,
      `Sự thật đằng sau ${topic} sẽ làm bạn bất ngờ! 😱`,
      `Cách làm ${topic} cực đơn giản chỉ trong 60 giây 🚀`,
      `Top 3 mẹo ${topic} đỉnh cao dành cho Creator năm 2026`,
      `Đừng bỏ lỡ video này nếu bạn đang làm về ${topic}!`
    ];
  }
}

export const aiService = new AIServiceManager();
export default aiService;
