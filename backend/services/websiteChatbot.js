const { models } = require('../database/database');

const { Product, Bill, User } = models;

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
${JSON.stringify(storeData)}

User Question:
${question}

Use both detailed records and analytics summary while answering.
Respond clearly and concisely.
`;
}

async function askWebsiteAssistant(question, ownerAdminID) {
  const storeData = await getStoreData(ownerAdminID);
  const prompt = buildPrompt(storeData, question);

  const preferredProvider = (process.env.AI_PROVIDER || '').toLowerCase();
  const groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  const isGroqKey = typeof groqApiKey === 'string' && groqApiKey.startsWith('gsk_');

  let data;

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

  const answer = data?.choices?.[0]?.message?.content
    ? String(data.choices[0].message.content).trim()
    : '';
  return answer || 'I could not generate a response right now.';
}

module.exports = {
  askWebsiteAssistant
};
