const { models } = require('../database/database');

const { Product, Bill, User } = models;

const FINANCE_KEYWORDS = [
  'finance',
  'financial',
  'revenue',
  'profit',
  'loss',
  'expense',
  'expenses',
  'gst',
  'tax',
  'cashflow',
  'cash flow',
  'income',
  'margin',
  'arima',
  'forecast',
  'demand',
  'sales'
];

function buildAnalytics(products, bills) {
  const totalProducts = products.length;
  const totalBills = bills.length;
  const totalRevenue = bills.reduce((sum, bill) => sum + (Number(bill.total) || 0), 0);
  const totalGST = bills.reduce((sum, bill) => sum + (Number(bill.GST_amount) || 0), 0);

  const lowStockProducts = products
    .filter((p) => Number(p.quantity) <= 5)
    .sort((a, b) => Number(a.quantity) - Number(b.quantity));

  const outOfStockProducts = products.filter((p) => Number(p.quantity) <= 0);

  const categoryBreakdown = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { products: 0, stockUnits: 0, inventoryValue: 0 };
    }
    acc[category].products += 1;
    acc[category].stockUnits += Number(product.quantity) || 0;
    acc[category].inventoryValue += (Number(product.price) || 0) * (Number(product.quantity) || 0);
    return acc;
  }, {});

  const paymentMethodBreakdown = bills.reduce((acc, bill) => {
    const method = bill.payment_method || 'cash';
    if (!acc[method]) {
      acc[method] = { bills: 0, revenue: 0 };
    }
    acc[method].bills += 1;
    acc[method].revenue += Number(bill.total) || 0;
    return acc;
  }, {});

  const uniqueCustomers = new Set(
    bills
      .map((bill) => (bill.customer_email || bill.customer_phone || bill.customer_name || '').trim())
      .filter(Boolean)
  ).size;

  const recentBills = [...bills]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return {
    totals: {
      totalProducts,
      totalBills,
      totalRevenue,
      totalGST,
      uniqueCustomers
    },
    lowStockProducts,
    outOfStockProducts,
    categoryBreakdown,
    paymentMethodBreakdown,
    recentBills
  };
}

async function getStoreData(ownerAdminID) {
  const adminProfile = await User.findOne(
    { userID: ownerAdminID },
    { _id: 0, password: 0, __v: 0 }
  ).lean();

  const products = await Product.find(
    { ownerAdminID },
    { _id: 0, __v: 0 }
  ).lean();

  const bills = await Bill.find(
    { ownerAdminID },
    { _id: 0, __v: 0 }
  ).lean();

  const analytics = buildAnalytics(products, bills);

  return {
    admin: adminProfile || { userID: ownerAdminID },
    products,
    sales: bills,
    analytics
  };
}

function buildPrompt(storeData, question) {
  const compactData = {
    admin: {
      userID: storeData.admin?.userID,
      name: storeData.admin?.name,
      email: storeData.admin?.email
    },
    analytics: {
      totals: storeData.analytics?.totals,
      categoryBreakdown: storeData.analytics?.categoryBreakdown,
      paymentMethodBreakdown: storeData.analytics?.paymentMethodBreakdown,
      lowStockProducts: (storeData.analytics?.lowStockProducts || []).slice(0, 10).map((p) => ({
        productID: p.productID,
        name: p.name,
        quantity: p.quantity,
        price: p.price
      })),
      recentBills: (storeData.analytics?.recentBills || []).slice(0, 20).map((b) => ({
        billID: b.billID,
        created_at: b.created_at,
        total: b.total,
        GST_amount: b.GST_amount,
        payment_method: b.payment_method,
        customer_name: b.customer_name
      }))
    }
  };

  return `
You are VyaparAI, an AI assistant for a store management system.

You help answer questions about:
- product inventory
- stock levels
- sales analytics
- revenue
- store insights

Answer ONLY questions related to the VyaparAI website and this store data.
If user asks unrelated topics, politely refuse and redirect to website usage.

Use the store data below to answer the user's question.

Store Data:
${JSON.stringify(compactData)}

User Question:
${question}

Use both detailed records and analytics summary while answering.
Respond clearly and concisely.
`;
}

function isFinanceQuery(question) {
  const normalized = String(question || '').toLowerCase();
  return FINANCE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function buildLocalFinanceFallback(storeData) {
  const totals = storeData?.analytics?.totals || {};
  const categoryBreakdown = storeData?.analytics?.categoryBreakdown || {};
  const paymentMethodBreakdown = storeData?.analytics?.paymentMethodBreakdown || {};

  const totalRevenue = Number(totals.totalRevenue || 0);
  const totalBills = Number(totals.totalBills || 0);
  const totalGST = Number(totals.totalGST || 0);
  const avgBill = totalBills > 0 ? totalRevenue / totalBills : 0;

  const topCategory = Object.entries(categoryBreakdown)
    .sort((a, b) => Number((b[1] && b[1].inventoryValue) || 0) - Number((a[1] && a[1].inventoryValue) || 0))[0];

  const topPayment = Object.entries(paymentMethodBreakdown)
    .sort((a, b) => Number((b[1] && b[1].revenue) || 0) - Number((a[1] && a[1].revenue) || 0))[0];

  const lines = [
    'Financial snapshot from your current store data:',
    `- Total revenue: INR ${totalRevenue.toFixed(2)}`,
    `- Total bills: ${totalBills}`,
    `- Average bill value: INR ${avgBill.toFixed(2)}`,
    `- Total GST collected: INR ${totalGST.toFixed(2)}`
  ];

  if (topCategory) {
    lines.push(`- Highest inventory value category: ${topCategory[0]} (INR ${Number(topCategory[1].inventoryValue || 0).toFixed(2)})`);
  }

  if (topPayment) {
    lines.push(`- Top payment method by revenue: ${topPayment[0]} (INR ${Number(topPayment[1].revenue || 0).toFixed(2)})`);
  }

  lines.push('Ask a focused question like: monthly revenue trend, GST payable estimate, top category performance, or demand forecast planning.');
  lines.push('Note: Expenses are not stored in bills data, so net profit cannot be exact without expense inputs.');

  return lines.join('\n');
}

async function askWebsiteAssistant(question, ownerAdminID) {
  const storeData = await getStoreData(ownerAdminID);
  const prompt = buildPrompt(storeData, question);

  const preferredProvider = (process.env.AI_PROVIDER || '').toLowerCase();
  const groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  const isGroqKey = typeof groqApiKey === 'string' && groqApiKey.startsWith('gsk_');

  let data;

  try {
    if (preferredProvider === 'groq' || (!preferredProvider && isGroqKey)) {
      const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is missing in backend environment');
      }

      const apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 350,
          messages: [
            { role: 'system', content: 'You are a helpful business analytics AI for the VyaparAI website.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errBody}`);
      }

      data = await response.json();
    } else {
      const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROK_API_KEY is missing in backend environment');
      }

      const apiUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
      const model = process.env.GROK_MODEL || 'grok-2-latest';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful business analytics AI for the VyaparAI website.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Grok API error: ${response.status} ${errBody}`);
      }

      data = await response.json();
    }
  } catch (error) {
    // Graceful fallback for finance questions and temporary LLM/API outages.
    if (isFinanceQuery(question)) {
      return buildLocalFinanceFallback(storeData);
    }
    return 'AI service is temporarily unavailable. You can still ask about revenue, GST, bills, and inventory stats, and I will answer from your stored data.';
  }

  const answer = data?.choices?.[0]?.message?.content
    ? String(data.choices[0].message.content).trim()
    : '';
  return answer || 'I could not generate a response right now.';
}

module.exports = {
  askWebsiteAssistant
};
