import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import MasterVideoPipelineOrchestrator from '../src/services/masterVideoPipelineOrchestrator.js';

test('rejects a missing input before starting subprocesses', async () => {
  const orchestrator = new MasterVideoPipelineOrchestrator({
    id: 'DUB-TEST-MISSING',
    filePath: path.join(os.tmpdir(), 'creatoros-missing-input.mp4')
  });

  await assert.rejects(
    () => orchestrator.execute(),
    /Video dau vao khong ton tai/
  );
});

test('cancel terminates tracked children and removes the temp workspace', async () => {
  const tempDir = path.join(os.tmpdir(), 'CreatorOS_DUB-TEST-CANCEL');
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'probe.txt'), 'temporary');

  const orchestrator = new MasterVideoPipelineOrchestrator({
    id: 'DUB-TEST-CANCEL',
    filePath: path.join(os.tmpdir(), 'creatoros-missing-input.mp4')
  });
  orchestrator.tempDir = tempDir;
  orchestrator.cancel('test cancellation');
  await orchestrator._cleanup();

  assert.equal(fs.existsSync(tempDir), false);
});
