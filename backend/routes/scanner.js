const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { requireAuth, requireAdmin } = require('./middleware');

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe');
const BRIDGE_SCRIPT = path.join(PROJECT_ROOT, 'analytics', 'scanner_bridge.py');
const SALES_JSON_PATH = path.join(PROJECT_ROOT, 'sales.json');
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const REPORT_MODEL = 'llama-3.3-70b-versatile';
const ALLOWED_CATEGORIES = new Set(['dairy', 'snacks', 'beverages', 'grocery', 'other']);

function getFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  throw new Error('Fetch API is unavailable in this runtime.');
}

function cleanJsonResponse(rawText) {
  let text = String(rawText || '').trim();

  if (text.startsWith('```')) {
    const lines = text.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines.length && lines[lines.length - 1].startsWith('```')) lines.pop();
    text = lines.join('\n').trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Groq response did not contain valid JSON object data.');
  }

  return text.slice(start, end + 1);
}

function toFloatOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeExpiryDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function normalizeCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  return ALLOWED_CATEGORIES.has(category) ? category : 'other';
}

function normalizeScannedProduct(data) {
  return {
    product_name: String(data.product_name || '').trim(),
    brand: String(data.brand || '').trim(),
    variant: String(data.variant || '').trim(),
    price: toFloatOrNull(data.price),
    mrp: toFloatOrNull(data.mrp),
    expiry_date: normalizeExpiryDate(data.expiry_date),
    category: normalizeCategory(data.category),
    barcode: toIntOrNull(data.barcode),
    quantity_in_pack: toIntOrNull(data.quantity_in_pack),
    scanned_at: new Date().toISOString()
  };
}

async function extractProductJsonWithGroq(imageBase64) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on backend.');
  }

  const prompt = [
    'Read this product label image and return ONLY valid raw JSON.',
    'No markdown, no explanation.',
    'Use exactly these fields: product_name, brand, variant, price, mrp, expiry_date, category, barcode, quantity_in_pack.',
    'Rules: price and mrp must be number or null; expiry_date must be YYYY-MM-DD or null; category must be one of dairy/snacks/beverages/grocery/other; barcode must be number or null; quantity_in_pack must be number or null.'
  ].join(' ');

  const fetchImpl = getFetch();
  const response = await fetchImpl(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq vision request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content || '{}';
  const cleaned = cleanJsonResponse(raw);
  return normalizeScannedProduct(JSON.parse(cleaned));
}

async function appendSalesRecord(record) {
  await fs.promises.appendFile(SALES_JSON_PATH, `${JSON.stringify(record)}\n`, 'utf8');
}

async function readSalesRecords() {
  if (!fs.existsSync(SALES_JSON_PATH)) {
    return [];
  }

  const text = await fs.promises.readFile(SALES_JSON_PATH, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function generateShopReportFromRecords(records) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on backend.');
  }

  const prompt = [
    'You are a retail analyst for a small shop.',
    'Using the provided JSON records, return a plain-English report with:',
    '1) total scans, 2) estimated revenue (sum of price where available), 3) top category, 4) products expiring within 30 days, 5) top brand, 6) one practical business tip.',
    'Keep it concise and easy for a non-technical shopkeeper.'
  ].join(' ');

  const fetchImpl = getFetch();
  const response = await fetchImpl(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: REPORT_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'Return clear plain English text only.' },
        {
          role: 'user',
          content: `${prompt}\n\nRecords JSON:\n${JSON.stringify(records)}`
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq report request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

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

// Mobile/web flow: browser captures image and posts base64 to backend.
router.post('/scan-image', requireAuth, requireAdmin, async (req, res) => {
  try {
    const imageBase64 = String(req.body?.imageBase64 || '').trim();
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const scan = await extractProductJsonWithGroq(imageBase64);
    await appendSalesRecord(scan);

    res.json({ success: true, scan });
  } catch (error) {
    console.error('Scanner scan-image error:', error.message);
    res.status(500).json({ error: error.message || 'Image scan failed' });
  }
});

// Mobile/web flow: generate report from JSONL without Python dependency.
router.get('/report-data', requireAuth, requireAdmin, async (req, res) => {
  try {
    const records = await readSalesRecords();
    if (!records.length) {
      return res.json({ success: true, report: 'No scan records found in sales.json yet.' });
    }

    const report = await generateShopReportFromRecords(records);
    res.json({ success: true, report });
  } catch (error) {
    console.error('Scanner report-data error:', error.message);
    res.status(500).json({ error: error.message || 'Report generation failed' });
  }
});

module.exports = router;
