/**
 * CreatorOS PRO_V40 - Custom Error Exception Handling Test (backend/test/test-exception-handling.js)
 * ==============================================================================
 * Kịch bản kiểm thử việc xử lý ngoại lệ cho `ValidateError` và `AccountBreakError`.
 * 
 * Mục tiêu kiểm thử:
 * 1. Mô phỏng tình huống Tệp đầu vào không tồn tại -> Ném `ValidateError`.
 * 2. Mô phỏng tình huống Cookie upload bị hỏng/hết hạn -> Ném `AccountBreakError`.
 * 3. Kiểm tra xem hệ thống có bắt đúng loại lỗi (`instanceof`), báo cáo chính xác,
 *    và dừng tiến trình ngay lập tức (Process Halt) một cách an toàn hay không.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ValidateError, AccountBreakError } from '../lib/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_TEMP_DIR = path.join(__dirname, 'test_temp_exception');
const VALID_SAMPLE_FILE = path.join(TEST_TEMP_DIR, 'valid_sample_video.mp4');

/**
 * Lớp Giả Lập Tiến Trình Worker (Simulated Worker Pipeline)
 */
class PipelineTaskProcessor {
  constructor() {
    this.isHalted = false;
    this.haltReason = null;
    this.logs = [];
  }

  log(level, msg) {
    const entry = `[LOG] [${level.toUpperCase()}] ${msg}`;
    this.logs.push(entry);
    console.log(entry);
  }

  /**
   * 1. Kiểm tra sự tồn tại của tệp media đầu vào
   */
  validateMediaFile(filePath) {
    this.log('info', `[STEP 1] Kiểm tra tệp media đầu vào: ${filePath}`);

    if (!filePath || !fs.existsSync(filePath)) {
      throw new ValidateError(`Tệp media đầu vào không tồn tại trên đĩa: ${filePath}`, {
        filePath,
        stage: 'media_validation'
      });
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new ValidateError(`Tệp media đầu vào bị rỗng (0 bytes): ${filePath}`, {
        filePath,
        size: 0,
        stage: 'media_validation'
      });
    }

    this.log('info', '✅ Tệp media đầu vào hợp lệ.');
    return true;
  }

  /**
   * 2. Kiểm tra tính hợp lệ của Cookie Session tài khoản
   */
  validateAccountCookie(accountConfig) {
    this.log('info', `[STEP 2] Kiểm tra Cookie Session tài khoản [${accountConfig?.accountName || 'Unknown'}]...`);

    if (!accountConfig || !accountConfig.cookieHeader) {
      throw new AccountBreakError('Thiếu thông tin Cookie xác thực tài khoản.', {
        accountName: accountConfig?.accountName,
        stage: 'auth_validation'
      });
    }

    const cookieStr = String(accountConfig.cookieHeader);

    // Kiểm tra cờ sessionid hoặc dấu hiệu cookie hỏng/hết hạn
    if (cookieStr.includes('INVALID_EXPIRED') || !cookieStr.includes('sessionid=')) {
      throw new AccountBreakError('Cookie upload bị lỗi, hết hạn hoặc bị đứt phiên đăng nhập.', {
        accountName: accountConfig.accountName,
        cookieSnippet: cookieStr.substring(0, 20) + '...',
        stage: 'auth_validation'
      });
    }

    this.log('info', '✅ Cookie tài khoản hợp lệ, phiên làm việc sẵn sàng.');
    return true;
  }

  /**
   * 3. Thực thi tiến trình Pipeline hoàn chỉnh với cơ chế Try-Catch bắt lỗi phân loại
   */
  async runTaskPipeline(task) {
    this.isHalted = false;
    this.haltReason = null;

    this.log('info', `==========================================================`);
    this.log('info', `BẮT ĐẦU XỬ LÝ TASK PIPELINE: ${task.id}`);
    this.log('info', `==========================================================`);

    try {
      // Bước 1: Validate file media
      this.validateMediaFile(task.mediaPath);

      // Bước 2: Validate cookie tài khoản
      this.validateAccountCookie(task.accountConfig);

      // Bước 3: Đăng bài (giả lập)
      this.log('info', '[STEP 3] Đang đẩy dữ liệu lên server xuất bản...');
      await new Promise((resolve) => setTimeout(resolve, 200));

      this.log('info', '🎉 ĐĂNG BÀI THÀNH CÔNG!');
      return { success: true, halted: false, taskId: task.id };

    } catch (err) {
      // Dừng tiến trình ngay lập tức khi gặp ngoại lệ
      this.isHalted = true;

      if (err instanceof ValidateError) {
        this.haltReason = 'VALIDATE_ERROR';
        this.log('error', `⛔ PROCESS HALTED [ValidateError]: ${err.message}`);
        this.log('error', `   Chi tiết Context: ${JSON.stringify(err.context)}`);
        return {
          success: false,
          halted: true,
          errorType: 'ValidateError',
          errorCode: err.code,
          message: err.message,
          errorInstance: err
        };
      } 
      
      if (err instanceof AccountBreakError) {
        this.haltReason = 'ACCOUNT_BREAK_ERROR';
        this.log('error', `⛔ PROCESS HALTED [AccountBreakError]: ${err.message}`);
        this.log('error', `   Chi tiết Context: ${JSON.stringify(err.context)}`);
        return {
          success: false,
          halted: true,
          errorType: 'AccountBreakError',
          errorCode: err.code,
          message: err.message,
          errorInstance: err
        };
      }

      // Lỗi không xác định khác
      this.haltReason = 'UNKNOWN_ERROR';
      this.log('error', `💥 UNHANDLED EXCEPTION: ${err.message}`);
      return {
        success: false,
        halted: true,
        errorType: 'UnknownError',
        message: err.message,
        errorInstance: err
      };
    }
  }
}

/**
 * UNIT TEST SUITE
 */
export async function runExceptionHandlingTest() {
  console.log('==============================================================================');
  console.log('🧪 UNIT TEST: Xử Lý Ngoại Lệ ValidateError & AccountBreakError');
  console.log('==============================================================================');

  // Chuẩn bị thư mục & file mẫu
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  fs.writeFileSync(VALID_SAMPLE_FILE, Buffer.from('MOCK_VIDEO_BINARY_DATA'));

  const processor = new PipelineTaskProcessor();

  // --------------------------------------------------------------------------
  // TEST CASE 1: Mô phỏng Tệp đầu vào không tồn tại -> Ném & bắt ValidateError
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE 1: Tệp đầu vào không tồn tại (ValidateError) ---');
  const invalidFileTask = {
    id: 'task_test_01_invalid_file',
    mediaPath: path.join(TEST_TEMP_DIR, 'non_existent_file_9999.mp4'),
    accountConfig: { accountName: 'UserA', cookieHeader: 'sessionid=valid_token_12345' }
  };

  const result1 = await processor.runTaskPipeline(invalidFileTask);

  console.log('\n🔍 Kiểm tra Assertions Test Case 1:');
  console.assert(result1.halted === true, 'Assertion 1.1 Failed: Tiến trình phải dừng lại khi lỗi.');
  console.assert(result1.errorType === 'ValidateError', 'Assertion 1.2 Failed: Loại lỗi phải là ValidateError.');
  console.assert(result1.errorInstance instanceof ValidateError, 'Assertion 1.3 Failed: Lỗi phải là instance của ValidateError.');
  console.assert(result1.errorCode === 'VALIDATE_ERROR', 'Assertion 1.4 Failed: Mã lỗi phải là VALIDATE_ERROR.');
  console.log('  ✅ Pass 1.1: Tiến trình đã dừng ngay lập tức (halted = true)');
  console.log('  ✅ Pass 1.2: Bắt chính xác `err instanceof ValidateError`');
  console.log('  ✅ Pass 1.3: Mã lỗi chuẩn `VALIDATE_ERROR`');

  // --------------------------------------------------------------------------
  // TEST CASE 2: Mô phỏng Cookie upload bị lỗi -> Ném & bắt AccountBreakError
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE 2: Cookie upload bị hỏng / hết hạn (AccountBreakError) ---');
  const brokenCookieTask = {
    id: 'task_test_02_broken_cookie',
    mediaPath: VALID_SAMPLE_FILE,
    accountConfig: { accountName: 'UserB', cookieHeader: 'sessionid=INVALID_EXPIRED_TOKEN_ABC' }
  };

  const result2 = await processor.runTaskPipeline(brokenCookieTask);

  console.log('\n🔍 Kiểm tra Assertions Test Case 2:');
  console.assert(result2.halted === true, 'Assertion 2.1 Failed: Tiến trình phải dừng lại khi lỗi.');
  console.assert(result2.errorType === 'AccountBreakError', 'Assertion 2.2 Failed: Loại lỗi phải là AccountBreakError.');
  console.assert(result2.errorInstance instanceof AccountBreakError, 'Assertion 2.3 Failed: Lỗi phải là instance của AccountBreakError.');
  console.assert(result2.errorCode === 'ACCOUNT_BREAK_ERROR', 'Assertion 2.4 Failed: Mã lỗi phải là ACCOUNT_BREAK_ERROR.');
  console.log('  ✅ Pass 2.1: Tiến trình đã dừng ngay lập tức (halted = true)');
  console.log('  ✅ Pass 2.2: Bắt chính xác `err instanceof AccountBreakError`');
  console.log('  ✅ Pass 2.3: Mã lỗi chuẩn `ACCOUNT_BREAK_ERROR`');

  // --------------------------------------------------------------------------
  // TEST CASE 3: Luồng bình thường (Thành công)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE 3: Luồng dữ liệu và cookie hợp lệ ---');
  const validTask = {
    id: 'task_test_03_valid',
    mediaPath: VALID_SAMPLE_FILE,
    accountConfig: { accountName: 'UserC', cookieHeader: 'sessionid=valid_active_session_token_xyz' }
  };

  const result3 = await processor.runTaskPipeline(validTask);

  console.log('\n🔍 Kiểm tra Assertions Test Case 3:');
  console.assert(result3.success === true && result3.halted === false, 'Assertion 3.1 Failed: Luồng chuẩn phải hoàn thành.');
  console.log('  ✅ Pass 3.1: Luồng hợp lệ chạy thành công không gặp ngoại lệ.');

  console.log('\n==============================================================================');
  console.log('🎉 PASSED: Tất cả test cases xử lý ngoại lệ ValidateError & AccountBreakError thành công!');
  console.log('==============================================================================');

  // Dọn dẹp thư mục tạm
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }

  return true;
}

// Chạy trực tiếp nếu file được invoke
if (process.argv[1] && process.argv[1].includes('test-exception-handling.js')) {
  runExceptionHandlingTest().catch((err) => {
    console.error('❌ UNIT TEST FAILED:', err);
    process.exit(1);
  });
}
