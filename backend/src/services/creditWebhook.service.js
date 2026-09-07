/**
 * CreatorOS Desktop - 100% Standalone Local License Service
 * ==============================================================================
 * Bypasses all cloud credit/billing constraints.
 * Permanently sets license status to "Local Pro / Unlimited".
 * No webhook calls or cloud token dependencies.
 */

export class CreditWebhookService {
  /**
   * Always allows execution with Unlimited Local Pro license
   * @param {string} [userId='local_user']
   * @param {number} [creditsAmount=0]
   * @param {string} [jobId]
   * @returns {{ success: boolean, remainingCredits: string, isUnlimited: boolean }}
   */
  static deductCredits(userId = 'local_user', creditsAmount = 0, jobId) {
    console.log(`[LocalLicense] 🚀 Local Pro License Active (Job: ${jobId}). Không giới hạn lượt render.`);
    return {
      success: true,
      remainingCredits: 'Unlimited (Local Pro)',
      isUnlimited: true
    };
  }

  /**
   * No-op refund for local offline mode
   */
  static async refundCredits(userId = 'local_user', creditsAmount = 0, jobId, failureReason) {
    console.log(`[LocalLicense] ℹ️ Local job failed (${failureReason}). Tài khoản Local Pro vẫn duy trì Unlimited.`);
  }

  static getBalance(userId = 'local_user') {
    return 'Unlimited (Local Pro)';
  }
}

