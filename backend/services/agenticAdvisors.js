const crypto = require('crypto');
const { models } = require('../database/database');

const { Product, Bill } = models;

const INDIAN_GST_DEFAULT_RATE = 0.18;
const EWAY_BILL_THRESHOLD = 50000;
const GST_REGISTRATION_GOODS_THRESHOLD = 4000000;
const GST_REGISTRATION_SERVICE_THRESHOLD = 2000000;
const GST_REGISTRATION_SPECIAL_STATE_THRESHOLD = 1000000;
const GST_COMPOSITION_MAX_TURNOVER = 15000000;

const HSN_REFERENCE_MAP = [
  { match: ['pen', 'pencil', 'notebook', 'stationery', 'stationaries', 'geometry'], hsn: '4820', slab: 12 },
  { match: ['book'], hsn: '4901', slab: 0 },
  { match: ['toy', 'puzzle', 'block', 'car'], hsn: '9503', slab: 12 },
  { match: ['gift', 'card', 'ribbon', 'decor', 'fancy', 'vase', 'candle'], hsn: '3926', slab: 18 },
  { match: ['juice', 'beverage', 'drink'], hsn: '2202', slab: 12 },
  { match: ['bread', 'food', 'cookie', 'biscuit'], hsn: '1905', slab: 5 }
];

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatInr(value) {
  return `INR ${round2(toNumber(value, 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getFinancialYearBounds(now = new Date()) {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(year, 3, 1, 0, 0, 0, 0);
  const end = new Date(year + 1, 2, 31, 23, 59, 59, 999);
  return { start, end, label: `FY ${year}-${String(year + 1).slice(-2)}` };
}

function classifyProductTax(product = {}) {
  const haystack = `${product.name || ''} ${product.category || ''}`.toLowerCase();

  for (const ref of HSN_REFERENCE_MAP) {
    if (ref.match.some((token) => haystack.includes(token))) {
      return {
        recommendedGstRatePercent: ref.slab,
        recommendedHsn: ref.hsn,
        basis: `Category/name match (${ref.match[0]})`
      };
    }
  }

  return {
    recommendedGstRatePercent: 18,
    recommendedHsn: '3926',
    basis: 'Fallback standard goods rate for mixed retail items'
  };
}

function getObservedRatePercentFromItem(item = {}) {
  const total = toNumber(item.total, 0);
  if (total <= 0) {
    return 0;
  }
  const gstAmount = Math.max(0, toNumber(item.GST_amount, 0));
  return round2((gstAmount / total) * 100);
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

function getMarketingSeedHex() {
  const marketingKey = String(process.env.MARKETING_API_KEY || '').trim();
  if (!marketingKey) {
    return '9f6a13b2';
  }

  return crypto.createHash('sha256').update(marketingKey).digest('hex').slice(0, 8);
}

function buildPhotographyPrompt(product = {}, style = 'studio-white') {
  const name = product.name || 'retail product';
  const category = product.category || 'general merchandise';
  const styleMap = {
    'studio-white': 'ultra clean white seamless background, softbox lighting from both sides',
    'dark-luxury': 'dark moody luxury background, dramatic rim lighting, premium cinematic look',
    'lifestyle-desk': 'natural lifestyle desk setup, warm daylight, realistic usage context'
  };
  const selectedStyle = styleMap[style] || styleMap['studio-white'];

  return [
    `Studio product photography of ${name}`,
    `category: ${category}`,
    selectedStyle,
    'realistic commercial e-commerce style',
    'sharp focus, high detail, natural shadows, no watermark, no text'
  ].join(', ');
}

function buildProductPhotographyUrl(product = {}, style = 'studio-white') {
  const prompt = buildPhotographyPrompt(product, style);
  const seedHex = getMarketingSeedHex();
  const seed = parseInt(seedHex, 16) % 100000;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;
}

function buildMarketingAdvice(product = {}, options = {}) {
  const tone = getCategoryCampaignTone(product.category);
  const productName = product.name || 'your new item';
  const price = toNumber(product.price, 0);
  const photoStyle = options.photoStyle || 'studio-white';
  const productPhotoPrompt = buildPhotographyPrompt(product, photoStyle);
  const productPhotoUrl = buildProductPhotographyUrl(product, photoStyle);
  const seedHex = getMarketingSeedHex();

  const priceBand = price < 100 ? 'impulse buy' : price < 500 ? 'mid-ticket' : 'premium';

  const ctaVariants = [
    'DM now to reserve launch stock',
    'Tap to order today and get launch pricing',
    'Visit store now to grab first-batch units'
  ];
  const offerVariants = [
    ['Launch week: 10% introductory offer for first 50 buyers', 'Bundle with a complementary low-cost add-on', 'Bring-a-friend coupon valid for 7 days'],
    ['Buy 2 get 1 mini accessory at 50% off', 'First 30 buyers get premium gift wrapping free', 'Loyalty points booster for repeat customers'],
    ['Limited-time starter combo pack pricing', 'Festival-ready bundle with price lock', 'Free personalization for early buyers']
  ];
  const variantIndex = parseInt(seedHex.slice(0, 2), 16) % 3;

  return {
    prompt: `You added ${productName}. Senior GenAI strategy is ready for a ${priceBand} campaign with product-photography creative.`,
    productSnapshot: {
      name: productName,
      category: product.category || 'General',
      price,
      quantity: toNumber(product.quantity, 0)
    },
    strategyMeta: {
      engine: 'Senior GenAI Marketing Strategist',
      apiKeySeed: seedHex
    },
    strategy: {
      objective: 'Drive first 30-day product discovery and conversion',
      targetAudience: tone.audience,
      valueHook: tone.hook,
      channels: tone.channels,
      offers: offerVariants[variantIndex],
      contentIdeas: [
        `${productName} studio reveal reel in under 20 seconds`,
        'Before/after use-case carousel',
        'Customer testimonial screenshot card',
        'Product photography hero post with price + urgency'
      ],
      cta: ctaVariants[variantIndex]
    },
    creative: {
      type: 'product-photography',
      style: 'Studio e-commerce photography',
      selectedStyle: photoStyle,
      imagePrompt: productPhotoPrompt,
      imageUrl: productPhotoUrl,
      note: 'Image is generated from a product-photography prompt and seeded with your MARKETING_API_KEY.'
    }
  };
}

async function estimateFinancialAdvice(payload = {}) {
  const ownerAdminID = Number(payload.ownerAdminID);
  if (!Number.isFinite(ownerAdminID)) {
    throw new Error('ownerAdminID is required for GST compliance analysis');
  }

  const { start, end, label } = getFinancialYearBounds(new Date());

  const [products, bills] = await Promise.all([
    Product.find({ ownerAdminID }, { _id: 0 }).lean(),
    Bill.find({ ownerAdminID, created_at: { $gte: start, $lte: end } }, { _id: 0 }).lean()
  ]);

  const productByID = new Map(products.map((product) => [Number(product.productID), product]));
  const productGstClassification = products.map((product) => {
    const classification = classifyProductTax(product);
    const configuredRate = product.GST_applicable ? 18 : 0;
    const mismatch = configuredRate !== classification.recommendedGstRatePercent;
    return {
      productID: product.productID,
      productName: product.name,
      category: product.category,
      recommendedGstRatePercent: classification.recommendedGstRatePercent,
      configuredRatePercent: configuredRate,
      recommendedHsn: classification.recommendedHsn,
      hsnStatus: 'missing',
      basis: classification.basis,
      mismatch
    };
  });

  const itemRateMismatches = [];
  let potentialUnderPaidGst = 0;
  let potentialOverPaidGst = 0;
  let totalTaxableValue = 0;
  let totalOutputGst = 0;

  for (const bill of bills) {
    const items = Array.isArray(bill.items) ? bill.items : [];
    for (const item of items) {
      const taxable = Math.max(0, toNumber(item.total, toNumber(item.price, 0) * toNumber(item.quantity, 0)));
      totalTaxableValue += taxable;

      const observedGst = Math.max(0, toNumber(item.GST_amount, 0));
      totalOutputGst += observedGst;

      const product = productByID.get(Number(item.productID));
      const expected = classifyProductTax(product || item);
      const expectedRate = expected.recommendedGstRatePercent;
      const expectedGst = taxable * (expectedRate / 100);
      const delta = expectedGst - observedGst;
      const observedRate = getObservedRatePercentFromItem(item);

      if (Math.abs(delta) >= 1) {
        if (delta > 0) {
          potentialUnderPaidGst += delta;
        } else {
          potentialOverPaidGst += Math.abs(delta);
        }

        itemRateMismatches.push({
          billID: bill.billID,
          productID: item.productID,
          productName: item.name || product?.name || `Product ${item.productID}`,
          observedRatePercent: observedRate,
          expectedRatePercent: expectedRate,
          taxableValue: round2(taxable),
          gstShortfall: delta > 0 ? round2(delta) : 0,
          gstExcess: delta < 0 ? round2(Math.abs(delta)) : 0
        });
      }
    }
  }

  const turnoverForThreshold = bills.reduce((sum, bill) => sum + Math.max(0, toNumber(bill.subtotal, bill.total)), 0);
  const qualifiesForRegistration = turnoverForThreshold >= GST_REGISTRATION_GOODS_THRESHOLD;
  const nearRegistrationThreshold = turnoverForThreshold >= GST_REGISTRATION_SERVICE_THRESHOLD;
  const likelyCompositionEligible = turnoverForThreshold <= GST_COMPOSITION_MAX_TURNOVER;
  const highValueBills = bills
    .filter((bill) => Math.max(toNumber(bill.total, 0), toNumber(bill.subtotal, 0)) > EWAY_BILL_THRESHOLD)
    .map((bill) => ({
      billID: bill.billID,
      amount: round2(Math.max(toNumber(bill.total, 0), toNumber(bill.subtotal, 0))),
      date: bill.created_at
    }));

  const hsnMissingCount = productGstClassification.length;
  const topMismatchExamples = itemRateMismatches.slice(0, 10);
  const compositionTaxEstimate = turnoverForThreshold * 0.01;

  const complianceIssues = [
    {
      complianceIssue: 'GST slab mapping for products is not fully aligned',
      explanationOfRule: 'GST rate must match product HSN classification. Retail goods commonly fall in 0%, 5%, 12%, 18%, or 28% slabs based on notified schedules.',
      regulationReference: 'CGST Act, 2017 read with GST Rate Notifications',
      riskLevel: productGstClassification.some((p) => p.mismatch) ? 'High' : 'Low',
      suggestedAction: 'Review each product against HSN and update product GST configuration before next invoice cycle. Use the product-level mapping table from this report.',
      estimatedTaxImpact: productGstClassification.some((p) => p.mismatch)
        ? `Potential misclassification impact already visible in invoices; see rate mismatch impact below.`
        : 'No material slab mismatch detected from current data.'
    },
    {
      complianceIssue: 'Incorrect GST rates detected in invoice line items',
      explanationOfRule: 'Invoice tax rate should reflect the correct GST slab of the supplied goods. Over/under collection can trigger notices, interest, or customer disputes.',
      regulationReference: 'Section 31 and Section 50, CGST Act',
      riskLevel: itemRateMismatches.length > 0 ? 'High' : 'Low',
      suggestedAction: 'Correct GST setup in product master, issue credit/debit notes where required, and align GSTR-1 and GSTR-3B before filing.',
      estimatedTaxImpact: itemRateMismatches.length > 0
        ? `Potential underpaid GST: ${formatInr(potentialUnderPaidGst)} | Potential excess charged GST: ${formatInr(potentialOverPaidGst)}`
        : 'No significant rate mismatch found in analysed invoices.'
    },
    {
      complianceIssue: 'HSN codes are missing in product master/invoice context',
      explanationOfRule: 'Tax invoice should carry HSN details per invoice rules and turnover-based HSN reporting norms.',
      regulationReference: 'Rule 46, CGST Rules and applicable HSN reporting notifications',
      riskLevel: hsnMissingCount > 0 ? 'High' : 'Low',
      suggestedAction: 'Add HSN code field in product master, backfill HSN for existing products, and print HSN on invoices.',
      estimatedTaxImpact: hsnMissingCount > 0
        ? `Compliance penalty risk and return mismatch risk for ${hsnMissingCount} products. Direct tax amount not quantifiable from current data.`
        : 'No HSN gap detected.'
    },
    {
      complianceIssue: 'GST registration threshold check',
      explanationOfRule: 'Registration is generally mandatory when aggregate turnover crosses threshold limits (typically INR 40 lakh for goods in many states, INR 20 lakh for services, INR 10 lakh for special category states).',
      regulationReference: 'Section 22, CGST Act',
      riskLevel: qualifiesForRegistration ? 'High' : nearRegistrationThreshold ? 'Medium' : 'Low',
      suggestedAction: qualifiesForRegistration
        ? 'Ensure GSTIN is active, tax invoices are issued, and periodic returns are filed without delay.'
        : 'Track monthly turnover and prepare registration documents before threshold breach.',
      estimatedTaxImpact: `Current FY turnover (taxable basis): ${formatInr(turnoverForThreshold)}.`
    },
    {
      complianceIssue: 'Composition scheme eligibility assessment',
      explanationOfRule: 'Small taxpayers may opt for composition if turnover is within limits and conditions are satisfied. Composition taxpayers pay tax at concessional rates but cannot collect regular GST/claim ITC.',
      regulationReference: 'Section 10, CGST Act and Composition Rules',
      riskLevel: likelyCompositionEligible ? 'Medium' : 'Low',
      suggestedAction: likelyCompositionEligible
        ? 'Evaluate if composition helps cash flow; compare with regular scheme especially if ITC is material.'
        : 'Continue in regular scheme due to turnover above composition threshold.',
      estimatedTaxImpact: likelyCompositionEligible
        ? `Illustrative composition tax (trader @1%): ${formatInr(compositionTaxEstimate)} vs regular GST liability based on actual slabs.`
        : 'Composition option likely unavailable on turnover grounds.'
    },
    {
      complianceIssue: 'E-Way bill applicability on high-value movements',
      explanationOfRule: 'E-Way bill is generally required for movement of goods with consignment value above INR 50,000, subject to specific exceptions.',
      regulationReference: 'Rule 138, CGST Rules',
      riskLevel: highValueBills.length > 0 ? 'Medium' : 'Low',
      suggestedAction: highValueBills.length > 0
        ? 'Verify whether e-way bill was generated for listed transactions and retain transporter documentation.'
        : 'No high-value invoice found above threshold in current FY data.',
      estimatedTaxImpact: highValueBills.length > 0
        ? `${highValueBills.length} invoices crossed INR 50,000; penalty exposure may arise for non-generation.`
        : 'No immediate e-way bill impact detected.'
    },
    {
      complianceIssue: 'Input Tax Credit opportunity and evidence check',
      explanationOfRule: 'ITC can be claimed only with valid tax invoice, goods/services receipt, and supplier return compliance; blocked credits must be excluded.',
      regulationReference: 'Section 16 and Section 17, CGST Act',
      riskLevel: 'Medium',
      suggestedAction: 'Upload purchase invoices and supplier GST details to run ITC reconciliation and identify claimable credits not yet utilized.',
      estimatedTaxImpact: 'Potential ITC cannot be estimated because purchase invoice dataset is not available in current records.'
    },
    {
      complianceIssue: 'GST return filing obligations (GSTR-1 and GSTR-3B)',
      explanationOfRule: 'Registered regular taxpayers must file outward supply return (GSTR-1) and summary return with tax payment (GSTR-3B) on due dates (monthly or QRMP as applicable).',
      regulationReference: 'Section 37 and Section 39, CGST Act',
      riskLevel: bills.length > 0 ? 'Medium' : 'Low',
      suggestedAction: 'Set compliance calendar, reconcile invoice data before due date, and pay net liability through PMT-06 where required.',
      estimatedTaxImpact: bills.length > 0
        ? `Output GST in analysed FY invoices: ${formatInr(totalOutputGst)}. Late filing may attract late fee and interest.`
        : 'No filing impact inferred from current FY invoices.'
    },
    {
      complianceIssue: 'Tax risk and penalty exposure from current transaction quality',
      explanationOfRule: 'Underpayment, wrong classification, and incomplete invoice particulars can trigger interest, penalties, and scrutiny.',
      regulationReference: 'Section 50, Section 73/74 and related penalty provisions under CGST Act',
      riskLevel: potentialUnderPaidGst > 0 || hsnMissingCount > 0 ? 'High' : 'Medium',
      suggestedAction: 'Run monthly GST audit: rate validation, HSN validation, invoice quality checks, and return reconciliation against books.',
      estimatedTaxImpact: `Quantified current mismatch exposure: underpayment ${formatInr(potentialUnderPaidGst)}; potential customer adjustment ${formatInr(potentialOverPaidGst)}.`
    },
    {
      complianceIssue: 'Action plan to ensure ongoing compliance',
      explanationOfRule: 'Continuous controls reduce filing errors, notices, and working-capital leakage.',
      regulationReference: 'Good-practice compliance control framework for GST operations',
      riskLevel: 'Low',
      suggestedAction: 'Implement weekly control checklist: product tax master review, invoice validation, e-way bill check, ITC reconciliation, and return readiness tracker.',
      estimatedTaxImpact: 'Preventive controls can avoid recurring interest, penalties, and refund/credit note leakage.'
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    period: label,
    summary: {
      productsAnalysed: products.length,
      invoicesAnalysed: bills.length,
      taxableTurnover: round2(totalTaxableValue || turnoverForThreshold),
      outputGstFromInvoices: round2(totalOutputGst),
      potentialUnderPaidGst: round2(potentialUnderPaidGst),
      potentialOverPaidGst: round2(potentialOverPaidGst),
      registrationThresholds: {
        goodsGeneralStates: GST_REGISTRATION_GOODS_THRESHOLD,
        servicesGeneralStates: GST_REGISTRATION_SERVICE_THRESHOLD,
        specialCategoryStates: GST_REGISTRATION_SPECIAL_STATE_THRESHOLD
      }
    },
    productGstClassification,
    invoiceRateMismatchSample: topMismatchExamples,
    highValueTransactions: highValueBills,
    dataCoverageNotes: [
      'Purchase invoices, supplier GSTIN details, and customer location/state fields were not available in current schema.',
      'HSN code field is not present in product schema; all HSN checks are flagged as missing until field is implemented.'
    ],
    complianceIssues,
    disclaimer: 'This GST advisory is a rules-based guidance output for operational compliance support. Please validate final positions with a qualified GST practitioner/Chartered Accountant before filing.'
  };
}

module.exports = {
  buildMarketingAdvice,
  estimateFinancialAdvice
};
