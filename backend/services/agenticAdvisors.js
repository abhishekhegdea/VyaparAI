const INDIAN_GST_DEFAULT_RATE = 0.18;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getCategoryCampaignTone(category) {
  const normalized = (category || '').toLowerCase();

  if (normalized.includes('station')) {
    return {
      audience: 'Students, parents, and office users',
      hook: 'Daily essentials that feel premium without premium pricing',
      channels: ['WhatsApp broadcast', 'Local school tie-ups', 'Instagram reels with study setups']
    };
  }

  if (normalized.includes('toy')) {
    return {
      audience: 'Parents, gift buyers, and children 4-14 years',
      hook: 'Play-ready, safe, and smile-guaranteed picks',
      channels: ['Instagram short videos', 'Weekend in-store demos', 'Parent community groups']
    };
  }

  if (normalized.includes('gift')) {
    return {
      audience: 'Corporate buyers, event shoppers, and festive buyers',
      hook: 'Ready-to-gift products that look expensive but stay affordable',
      channels: ['Festival campaign posters', 'Corporate outreach by email', 'Bundle promotions on social media']
    };
  }

  return {
    audience: 'Urban families and value-focused shoppers',
    hook: 'Stylish, useful items for every occasion',
    channels: ['Instagram', 'Google Business updates', 'In-store referral cards']
  };
}

function buildMarketingAdvice(product = {}) {
  const tone = getCategoryCampaignTone(product.category);
  const productName = product.name || 'your new item';
  const price = toNumber(product.price, 0);

  const priceBand = price < 100 ? 'impulse buy' : price < 500 ? 'mid-ticket' : 'premium';

  return {
    prompt: `You added ${productName}. Do you want a ${priceBand} marketing campaign generated now?`,
    productSnapshot: {
      name: productName,
      category: product.category || 'General',
      price,
      quantity: toNumber(product.quantity, 0)
    },
    strategy: {
      objective: 'Drive first 30-day product discovery and conversion',
      targetAudience: tone.audience,
      valueHook: tone.hook,
      channels: tone.channels,
      offers: [
        'Launch week: 10% introductory offer for first 50 buyers',
        'Cross-sell with a related existing product',
        'Repeat-customer coupon valid for 7 days'
      ],
      contentIdeas: [
        `${productName} demo reel in under 20 seconds`,
        'Before/after use-case carousel',
        'Customer testimonial screenshot card'
      ],
      cta: 'Visit store / DM now to reserve stock'
    }
  };
}

function calculateTaxBySlabs(amount, slabs) {
  let remaining = amount;
  let tax = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const taxableInThisSlab = Math.min(remaining, slab.limit);
    tax += taxableInThisSlab * slab.rate;
    remaining -= taxableInThisSlab;
  }

  return tax;
}

function estimateIncomeTax(income, regime = 'new') {
  const taxableIncome = Math.max(0, toNumber(income, 0));
  const selectedRegime = regime === 'old' ? 'old' : 'new';

  let tax = 0;
  let notes = [];

  if (selectedRegime === 'new') {
    // Simplified advisory slab model aligned to current new regime style.
    const slabs = [
      { limit: 400000, rate: 0 },
      { limit: 400000, rate: 0.05 },
      { limit: 400000, rate: 0.1 },
      { limit: 400000, rate: 0.15 },
      { limit: 400000, rate: 0.2 },
      { limit: 400000, rate: 0.25 },
      { limit: Infinity, rate: 0.3 }
    ];

    tax = calculateTaxBySlabs(taxableIncome, slabs);

    if (taxableIncome <= 1200000) {
      tax = 0;
      notes.push('Rebate benefit assumed for taxable income up to INR 12,00,000 under new regime.');
    }
  } else {
    const slabs = [
      { limit: 250000, rate: 0 },
      { limit: 250000, rate: 0.05 },
      { limit: 500000, rate: 0.2 },
      { limit: Infinity, rate: 0.3 }
    ];

    tax = calculateTaxBySlabs(taxableIncome, slabs);

    if (taxableIncome <= 500000) {
      tax = 0;
      notes.push('Rebate benefit assumed for taxable income up to INR 5,00,000 under old regime.');
    }
  }

  const cess = tax * 0.04;

  return {
    regime: selectedRegime,
    taxableIncome: round2(taxableIncome),
    estimatedTaxBeforeCess: round2(tax),
    estimatedCess: round2(cess),
    estimatedTotalIncomeTax: round2(tax + cess),
    notes
  };
}

function estimateFinancialAdvice(payload = {}) {
  const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

  const annualRevenue = toNumber(payload.annualRevenue, 0);
  const annualExpenses = toNumber(payload.annualExpenses, 0);
  const inputGstCredit = Math.max(0, toNumber(payload.inputGstCredit, 0));
  const gstRate = toNumber(payload.gstRate, INDIAN_GST_DEFAULT_RATE);
  const regime = payload.regime || 'new';

  const txnTaxableValue = transactions.reduce((sum, txn) => sum + Math.max(0, toNumber(txn.amount, 0)), 0);
  const txnOutputGst = transactions.reduce((sum, txn) => {
    const amount = Math.max(0, toNumber(txn.amount, 0));
    const applicable = txn.gstApplicable !== false;
    const rate = toNumber(txn.gstRate, gstRate);
    return sum + (applicable ? amount * rate : 0);
  }, 0);

  const taxableTurnover = txnTaxableValue > 0 ? txnTaxableValue : annualRevenue;
  const outputGst = txnOutputGst > 0 ? txnOutputGst : taxableTurnover * gstRate;
  const netPayableGst = Math.max(0, outputGst - inputGstCredit);

  const estimatedProfit = Math.max(0, annualRevenue - annualExpenses);
  const incomeTax = estimateIncomeTax(
    payload.annualTaxableIncome !== undefined ? payload.annualTaxableIncome : estimatedProfit,
    regime
  );

  const complianceChecklist = [
    'Verify HSN/SAC code and product-specific GST slab before filing.',
    'Match GSTR-1 sales and GSTR-3B tax liability every month.',
    'Reconcile purchase invoices for valid input tax credit claims.',
    'Confirm final income-tax liability with a CA before return filing.'
  ];

  return {
    summary: {
      annualRevenue: round2(annualRevenue),
      annualExpenses: round2(annualExpenses),
      estimatedProfit: round2(estimatedProfit),
      transactionsAnalysed: transactions.length
    },
    gst: {
      assumedRatePercent: round2(gstRate * 100),
      taxableTurnover: round2(taxableTurnover),
      outputGst: round2(outputGst),
      inputGstCredit: round2(inputGstCredit),
      netPayableGst: round2(netPayableGst)
    },
    incomeTax,
    complianceChecklist,
    disclaimer: 'Advisory estimate only for Indian compliance planning. Final GST and income-tax should be validated by a qualified Chartered Accountant.'
  };
}

module.exports = {
  buildMarketingAdvice,
  estimateFinancialAdvice
};
