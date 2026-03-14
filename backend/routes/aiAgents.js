const express = require('express');
const { requireAuth, requireAdmin } = require('./middleware');
const { buildMarketingAdvice, estimateFinancialAdvice } = require('../services/agenticAdvisors');
const { askWebsiteAssistant } = require('../services/websiteChatbot');
const { models } = require('../database/database');
const { persistMarketingAdviceImage } = require('../services/imageStorage');

const router = express.Router();
const { Product } = models;

const WEBSITE_SCOPE_KEYWORDS = [
  'vyaparai',
  'website',
  'dashboard',
  'login',
  'register',
  'admin',
  'product',
  'inventory',
  'stock',
  'bill',
  'billing',
  'transaction',
  'marketing ai',
  'finance ai',
  'report',
  'api',
  'account',
  'store',
  'summary',
  'data',
  'sales',
  'revenue',
  'customer',
  'analytics',
  'finance',
  'financial',
  'gst',
  'tax',
  'profit',
  'loss',
  'expense',
  'income',
  'cashflow',
  'cash flow',
  'forecast',
  'arima',
  'demand'
];

function isWebsiteScopedQuery(query) {
  const normalized = String(query || '').toLowerCase();
  return WEBSITE_SCOPE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function buildWebsiteScopeFallback() {
  return [
    'I can only help with VyaparAI website usage.',
    'Try asking about: login/register, inventory management, product add/edit, billing, reports, Marketing AI, or Finance AI.'
  ].join(' ');
}

router.post('/finance-advice', requireAuth, requireAdmin, async (req, res) => {
  try {
    const advice = estimateFinancialAdvice(req.body || {});
    res.json({ message: 'Financial advisory generated', advice });
  } catch (error) {
    console.error('Finance advisory error:', error);
    res.status(500).json({ error: 'Failed to generate financial advisory' });
  }
});

router.post('/marketing-advice', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { product, photoStyle } = req.body || {};

    if (!product || !product.name) {
      return res.status(400).json({ error: 'Product details are required' });
    }

    const advice = await persistMarketingAdviceImage(buildMarketingAdvice(product, { photoStyle }));
    res.json({ message: 'Marketing advisory generated', advice });
  } catch (error) {
    console.error('Marketing advisory error:', error);
    res.status(500).json({ error: 'Failed to generate marketing advisory' });
  }
});

router.post('/marketing-advice/product/:productID', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { photoStyle } = req.body || {};
    const product = await Product.findOne(
      { productID: Number(req.params.productID), ownerAdminID: req.user.userID },
      { _id: 0 }
    ).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const advice = await persistMarketingAdviceImage(buildMarketingAdvice(product, { photoStyle }));
    res.json({ message: 'Marketing advisory generated', advice, product });
  } catch (error) {
    console.error('Marketing advisory by product error:', error);
    res.status(500).json({ error: 'Failed to generate product marketing advisory' });
  }
});

router.post('/website-chat', requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = String(req.body?.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!isWebsiteScopedQuery(query)) {
      return res.json({
        answer: buildWebsiteScopeFallback(),
        outOfScope: true
      });
    }

    const answer = await askWebsiteAssistant(query, req.user.userID);
    res.json({ answer, outOfScope: false });
  } catch (error) {
    console.error('Website chat error:', error);
    res.status(500).json({
      error: 'Failed to generate chatbot response',
      answer: 'I am currently unavailable. Please try again in a moment.'
    });
  }
});

module.exports = router;
