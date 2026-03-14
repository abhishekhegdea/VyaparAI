const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { requireAuth, requireAdmin } = require('./middleware');

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe');
const BRIDGE_SCRIPT = path.join(PROJECT_ROOT, 'analytics', 'scanner_bridge.py');

function runScannerBridge(action) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_EXECUTABLE, [BRIDGE_SCRIPT, action], {
      cwd: PROJECT_ROOT,
      env: process.env,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start scanner bridge: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const output = (stderr || stdout || `Scanner bridge exited with code ${code}`).trim();
        reject(new Error(output));
        return;
      }

      resolve((stdout || '').trim());
    });
  });
}

router.post('/scan', requireAuth, requireAdmin, async (req, res) => {
  try {
    const output = await runScannerBridge('scan');
    const parsed = JSON.parse(output);

    if (parsed && parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    res.json({ success: true, scan: parsed });
  } catch (error) {
    console.error('Scanner scan error:', error.message);
    res.status(500).json({ error: error.message || 'Scan failed' });
  }
});

router.get('/report', requireAuth, requireAdmin, async (req, res) => {
  try {
    const output = await runScannerBridge('report');

    try {
      const parsed = JSON.parse(output);
      if (parsed && parsed.error) {
        return res.status(400).json({ error: parsed.error });
      }
    } catch {
      // Plain text report is expected.
    }

    res.json({ success: true, report: output });
  } catch (error) {
    console.error('Scanner report error:', error.message);
    res.status(500).json({ error: error.message || 'Report generation failed' });
  }
});

module.exports = router;
