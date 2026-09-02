/**
 * CreatorOS Desktop - Secure Local Key Vault Service
 * 
 * Provides AES-256-GCM authenticated encryption for sensitive AI API keys.
 * Persists encrypted payload to local Windows disk (./vault/keys/ai_keys.enc.json).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000;

// Default machine master salt fallback
const MACHINE_IDENTITY = process.env.MACHINE_ID || process.env.COMPUTERNAME || process.env.HOSTNAME || 'CreatorOS_Desktop_Secure_Salt_2026';
const VAULT_DIR = path.join(process.cwd(), 'vault', 'keys');
const VAULT_FILE = path.join(VAULT_DIR, 'ai_keys.enc.json');

export class KeyVaultService {
  constructor() {
    this._ensureDirectory(VAULT_DIR);
    this._cachedKeys = null;
  }

  /**
   * Derive cryptographic key using PBKDF2
   * @private
   */
  _deriveMasterKey(salt) {
    return crypto.pbkdf2Sync(MACHINE_IDENTITY, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypts plaintext string into an AES-256-GCM envelope
   * @param {string} plainText 
   * @returns {{ saltHex: string, ivHex: string, tagHex: string, cipherHex: string }}
   */
  encrypt(plainText) {
    if (!plainText) return null;
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this._deriveMasterKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let cipherText = cipher.update(plainText, 'utf8', 'hex');
    cipherText += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      saltHex: salt.toString('hex'),
      ivHex: iv.toString('hex'),
      tagHex: authTag.toString('hex'),
      cipherHex: cipherText
    };
  }

  /**
   * Decrypts an AES-256-GCM envelope back to plaintext
   * @param {{ saltHex: string, ivHex: string, tagHex: string, cipherHex: string }} envelope 
   * @returns {string}
   */
  decrypt(envelope) {
    if (!envelope || !envelope.cipherHex) return '';
    try {
      const salt = Buffer.from(envelope.saltHex, 'hex');
      const iv = Buffer.from(envelope.ivHex, 'hex');
      const authTag = Buffer.from(envelope.tagHex, 'hex');
      const key = this._deriveMasterKey(salt);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(envelope.cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('[KeyVaultService] Decryption failed:', err.message);
      return '';
    }
  }

  /**
   * Load all keys from encrypted disk storage
   * @returns {Promise<Array<object>>}
   */
  async loadKeys() {
    if (this._cachedKeys) return this._cachedKeys;

    try {
      if (fs.existsSync(VAULT_FILE)) {
        const rawContent = await fs.promises.readFile(VAULT_FILE, 'utf8');
        const parsed = JSON.parse(rawContent);

        if (Array.isArray(parsed.keys)) {
          this._cachedKeys = parsed.keys.map((record) => ({
            ...record,
            rawKey: this.decrypt(record.encryptedEnvelope)
          }));
          return this._cachedKeys;
        }
      }
    } catch (err) {
      console.warn(`[KeyVaultService] Failed to read vault file: ${err.message}. Initializing defaults.`);
    }

    // Initialize with default pool
    this._cachedKeys = this._getDefaultKeys();
    await this.persistKeys(this._cachedKeys);
    return this._cachedKeys;
  }

  /**
   * Save keys securely to disk
   * @param {Array<object>} keys 
   */
  async persistKeys(keys) {
    this._ensureDirectory(VAULT_DIR);
    this._cachedKeys = keys;

    const exportPayload = {
      version: '2.0-gcm',
      updatedAt: new Date().toISOString(),
      keysCount: keys.length,
      keys: keys.map((k) => ({
        id: k.id,
        stt: k.stt,
        platform: k.platform,
        maskedKey: this.maskKey(k.rawKey || k.key),
        encryptedEnvelope: this.encrypt(k.rawKey || k.key),
        status: k.status || 'valid',
        callsCount: k.callsCount || 0,
        addedAt: k.addedAt || new Date().toLocaleDateString('vi-VN'),
        note: k.note || '',
        lastTestedAt: k.lastTestedAt || null
      }))
    };

    await fs.promises.writeFile(VAULT_FILE, JSON.stringify(exportPayload, null, 2), 'utf8');
  }

  /**
   * Add a new key
   * @param {object} keyData 
   */
  async addKey(keyData) {
    const keys = await this.loadKeys();
    const cleanKey = (keyData.key || '').trim();

    const newRecord = {
      id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      stt: keys.length + 1,
      platform: keyData.platform || 'Gemini',
      rawKey: cleanKey,
      key: cleanKey,
      status: 'untested',
      callsCount: 0,
      addedAt: new Date().toLocaleDateString('vi-VN'),
      note: keyData.note || '',
      lastTestedAt: null
    };

    keys.push(newRecord);
    await this.persistKeys(keys);
    return newRecord;
  }

  /**
   * Remove key by ID
   * @param {string} id 
   */
  async removeKey(id) {
    let keys = await this.loadKeys();
    const initialLen = keys.length;
    keys = keys.filter((k) => k.id !== id);

    // Re-index STT
    keys.forEach((k, idx) => {
      k.stt = idx + 1;
    });

    await this.persistKeys(keys);
    return keys.length < initialLen;
  }

  /**
   * Mask key for safe UI presentation
   * @param {string} key 
   * @returns {string} e.g. "AIzaSyAIxn5...RwPYqw"
   */
  maskKey(key = '') {
    if (!key) return '****';
    if (key.length <= 12) return `${key.slice(0, 3)}****${key.slice(-3)}`;
    return `${key.slice(0, 11)}...${key.slice(-6)}`;
  }

  _ensureDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch {
      // Ignored
    }
  }

  _getDefaultKeys() {
    return [
      {
        id: "key_1",
        stt: 1,
        rawKey: "AIzaSyAIxn5_OWhGclaBnT1Wn9kbg1IWwRwPYqw",
        platform: "Gemini",
        status: "valid",
        callsCount: 1420,
        addedAt: "01/09/2026",
        note: "Primary Gemini Pro High-Quota"
      },
      {
        id: "key_2",
        stt: 2,
        rawKey: "AIzaSyCBGu4o4BOQTobimbUPdrh8RQie_DavDFU",
        platform: "Gemini",
        status: "valid",
        callsCount: 980,
        addedAt: "01/09/2026",
        note: "Backup Fast-Flash"
      },
      {
        id: "key_3",
        stt: 3,
        rawKey: "sk-proj-NV894klns9130nslknd1083hjnskjdbf8913hjsbd91834hb",
        platform: "OpenAI",
        status: "valid",
        callsCount: 340,
        addedAt: "01/09/2026",
        note: "GPT-4o Mini Turbo"
      },
      {
        id: "key_4",
        stt: 4,
        rawKey: "sk-ant-api03-098jashdu18923hjasdbn19823hjasbd9183hjasbd98132",
        platform: "Claude",
        status: "valid",
        callsCount: 120,
        addedAt: "01/09/2026",
        note: "Claude 3.5 Sonnet Dubbing"
      }
    ];
  }
}

export const keyVaultService = new KeyVaultService();
export default keyVaultService;
