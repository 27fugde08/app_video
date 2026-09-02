/**
 * CreatorOS PRO_V40 - Custom Exception Classes (backend/lib/errors.js)
 * ==============================================================================
 * Định nghĩa các lớp ngoại lệ chuyên biệt phục vụ phân loại và xử lý lỗi hệ thống:
 * - ValidateError: Lỗi kiểm tra tham số, tệp tin đầu vào không tồn tại, định dạng không hỗ trợ.
 * - AccountBreakError: Lỗi phiên đăng nhập, cookie hết hạn/hỏng, tài khoản bị khóa hoặc checkpoint.
 */

export class ValidateError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ValidateError';
    this.code = 'VALIDATE_ERROR';
    this.context = context;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidateError);
    }
  }
}

export class AccountBreakError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'AccountBreakError';
    this.code = 'ACCOUNT_BREAK_ERROR';
    this.context = context;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AccountBreakError);
    }
  }
}

export default {
  ValidateError,
  AccountBreakError
};
