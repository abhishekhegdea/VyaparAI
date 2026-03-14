import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, List, BarChart3, Receipt, Users, X, Download, Printer, FileText, TrendingUp, Package, DollarSign, AlertTriangle, Calendar, Clock, Megaphone, Bell, Home, Settings, ArrowLeft, ScanLine, FileSearch, Cuboid } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { apiService } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ThreeSceneBackground from '../components/ThreeSceneBackground';
import './Admin.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const buildUploadedImageUrl = (path) => {
  const normalized = String(path || '').trim();
  if (!normalized) return '';
  if (isHttpUrl(normalized)) return normalized;

  if (normalized.startsWith('/')) {
    return `${API_BASE_URL}${normalized}`;
  }

  return `${API_BASE_URL}/${normalized}`;
};

const buildAiImageFallbackUrl = (productName) => {
  const label = encodeURIComponent(`${productName || 'Product'} photo`);
  return `https://dummyimage.com/1024x1024/f1f5f9/334155&text=${label}`;
};

const resolveAiImageSource = (advice) => {
  const primary = String(advice?.creative?.imageUrl || '').trim();
  const fallback = buildAiImageFallbackUrl(advice?.productSnapshot?.name);
  return {
    primary: isHttpUrl(primary) ? primary : fallback,
    fallback
  };
};

const handleImageLoadError = (event) => {
  const img = event.currentTarget;
  const fallback = img.dataset.fallbackSrc;

  if (fallback && img.src !== fallback) {
    img.src = fallback;
    return;
  }

  img.style.display = 'none';
};

const Admin = ({ showToast }) => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProducts: 0,
    totalBills: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    recentBills: [],
    lowStockItems: []
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: 'Stationaries',
    expiry_date: '',
    image: null,
    GST_applicable: false,
    productID: null
  });
  const [billingForm, setBillingForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    items: [],
    applyGST: true,
    paymentMethod: 'cash',
    notes: '',
    sale_date: new Date().toISOString().split('T')[0]
  });
  const [allBills, setAllBills] = useState([]);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('day');
  const [salesAnalytics, setSalesAnalytics] = useState({
    byDay: [],
    byWeek: [],
    byMonth: [],
    byYear: [],
    topSellingProducts: []
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastProductID, setForecastProductID] = useState('');
  const [forecastHorizon, setForecastHorizon] = useState(14);
  const [productForecast, setProductForecast] = useState(null);
  const [marketingAdvice, setMarketingAdvice] = useState(null);
  const [latestAddedProduct, setLatestAddedProduct] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi, I am Ask DukaanSaathi. I can help only with this website: login/register, products, inventory, billing, reports, Marketing AI, and Finance AI.'
    }
  ]);
  const [taxAlert, setTaxAlert] = useState(null);
  const [financeAdvice, setFinanceAdvice] = useState(null);
  const [nearExpiryAlerts, setNearExpiryAlerts] = useState([]);
  const [photoStyle, setPhotoStyle] = useState('studio-white');
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scannerReportLoading, setScannerReportLoading] = useState(false);
  const [latestScanResult, setLatestScanResult] = useState(null);
  const [latestScannerReport, setLatestScannerReport] = useState('');
  const [showScannerCamera, setShowScannerCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [enableHeroScene] = useState(() => {
    if (typeof window === 'undefined') return false;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCpu = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 0) > 0 && navigator.hardwareConcurrency <= 4;
    const smallScreen = window.innerWidth <= 900;
    return !reducedMotion && !lowCpu && !smallScreen;
  });
  const videoRef = useRef(null);

  const categories = ['Stationaries', 'Fancy Items', 'Toys', 'Gifts', 'Beverages', 'Food'];
  const paymentMethods = ['cash', 'card', 'upi', 'bank_transfer'];

  const tr = (en, hi) => (language === 'hi' ? hi : en);

  const getCategoryLabel = (category) => {
    const labels = {
      Stationaries: tr('Stationaries', 'स्टेशनरी'),
      'Fancy Items': tr('Fancy Items', 'फैंसी आइटम्स'),
      Toys: tr('Toys', 'खिलौने'),
      Gifts: tr('Gifts', 'गिफ्ट्स'),
      Beverages: tr('Beverages', 'पेय पदार्थ'),
      Food: tr('Food', 'खाद्य पदार्थ')
    };

    return labels[category] || category;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: tr('Cash', 'कैश'),
      card: tr('Card', 'कार्ड'),
      upi: tr('UPI', 'यूपीआई'),
      bank_transfer: tr('Bank Transfer', 'बैंक ट्रांसफर')
    };

    return labels[method] || method;
  };

  const notifyOncePerSession = (key, message, type = 'warning') => {
    if (sessionStorage.getItem(key)) {
      return;
    }
    showToast(message, type);
    sessionStorage.setItem(key, '1');
  };

  const isConsumableCategory = (category) => {
    const normalized = String(category || '').toLowerCase();
    return normalized.includes('food') || normalized.includes('beverage');
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin()) {
        showToast(tr('You are not authorized to view this page.', 'आपको इस पेज को देखने की अनुमति नहीं है।'), 'error');
        navigate('/');
      } else {
        fetchProducts();
        fetchStats();
        fetchAllBills();
        fetchTransactions();
        fetchSalesAnalytics();
        checkLowStock();
      }
    }
  }, [authLoading, navigate, showToast, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!forecastProductID && products.length > 0) {
      const autoId = String(products[0].productID);
      setForecastProductID(autoId);
      // Auto-run forecast on first product load so the chart is immediately visible
      if (!productForecast && !forecastLoading) {
        fetchProductForecast(autoId, forecastHorizon);
      }
    }
  }, [forecastProductID, products]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!forecastProductID || products.length === 0) {
      return;
    }
    fetchProductForecast(forecastProductID, forecastHorizon);
  }, [forecastProductID, forecastHorizon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'transactions') {
      return;
    }

    const hasSeries =
      (salesAnalytics.byDay || []).length > 0 ||
      (salesAnalytics.byWeek || []).length > 0 ||
      (salesAnalytics.byMonth || []).length > 0 ||
      (salesAnalytics.byYear || []).length > 0;

    if (!hasSeries && !analyticsLoading) {
      fetchSalesAnalytics();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showScannerCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showScannerCamera, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const fetchProducts = async () => {
    try {
      const response = await apiService.getProducts({ includeOutOfStock: true });
      setProducts(response.data.products || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showToast(tr('Failed to load products', 'प्रोडक्ट्स लोड नहीं हो सके'), 'error');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [productsResponse, billsResponse] = await Promise.all([
        apiService.getProducts({ includeOutOfStock: true }),
        apiService.getAdminBills()
      ]);
      
      const totalProducts = productsResponse.data.products?.length || 0;
      const bills = billsResponse.data.bills || [];
      const totalRevenue = bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
      
      // Calculate period-based revenue
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());
      
      const todayRevenue = bills
        .filter(bill => new Date(bill.created_at) >= today)
        .reduce((sum, bill) => sum + (bill.total || 0), 0);
      
      const weekRevenue = bills
        .filter(bill => new Date(bill.created_at) >= weekAgo)
        .reduce((sum, bill) => sum + (bill.total || 0), 0);
      
      const monthRevenue = bills
        .filter(bill => new Date(bill.created_at) >= monthAgo)
        .reduce((sum, bill) => sum + (bill.total || 0), 0);
      
      // Check for low stock items
      const lowStockItems = productsResponse.data.products?.filter(product => product.quantity <= 5) || [];
      const nearExpiryItems = (productsResponse.data.products || [])
        .filter((product) => product.expiry_date)
        .map((product) => {
          const expiry = new Date(product.expiry_date);
          const daysToExpire = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
          return { ...product, daysToExpire };
        })
        .filter((product) => product.daysToExpire <= 7)
        .sort((a, b) => a.daysToExpire - b.daysToExpire);
      
      setStats({
        totalRevenue,
        totalProducts,
        totalBills: bills.length,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        recentBills: bills.slice(0, 5),
        lowStockItems
      });
      setTaxAlert(checkTaxAlert(bills));
      setNearExpiryAlerts(nearExpiryItems);

      if (nearExpiryItems.length > 0) {
        notifyOncePerSession(
          'expiryAlertToastShown',
          `Replace these foods/beverages soon: ${nearExpiryItems.length} items near expiry`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      showToast(tr('Failed to fetch dashboard stats', 'डैशबोर्ड आँकड़े नहीं मिल सके'), 'error');
    }
  };

  const checkLowStock = () => {
    const lowStock = products.filter(product => product.quantity <= 5);
    
    if (lowStock.length > 0) {
      notifyOncePerSession('lowStockToastShown', tr(`${lowStock.length} items are running low on stock!`, `${lowStock.length} आइटम्स का स्टॉक कम हो रहा है!`), 'warning');
    }
  };

  // India new-regime income-tax slabs (FY 2024-25) + 4% health & education cess
  const computeIncomeTax = (income) => {
    const slabs = [
      { min: 0,        max: 300000,   rate: 0.00 },
      { min: 300000,   max: 700000,   rate: 0.05 },
      { min: 700000,   max: 1000000,  rate: 0.10 },
      { min: 1000000,  max: 1200000,  rate: 0.15 },
      { min: 1200000,  max: 1500000,  rate: 0.20 },
      { min: 1500000,  max: Infinity, rate: 0.30 },
    ];
    let tax = 0;
    for (const slab of slabs) {
      if (income <= slab.min) break;
      const taxable = Math.min(income, slab.max) - slab.min;
      tax += taxable * slab.rate;
    }
    return Math.round(tax + tax * 0.04); // add 4% cess
  };

  const checkTaxAlert = (bills) => {
    const TAX_THRESHOLD = 1500000; // ₹15,00,000
    // Indian financial year: April 1 – March 31
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);

    const fyBills = bills.filter(bill => new Date(bill.created_at) >= fyStart);
    const annualRevenue = fyBills.reduce((sum, bill) => sum + (bill.total || 0), 0);

    const monthsElapsed = Math.max(1, (now - fyStart) / (1000 * 60 * 60 * 24 * 30.44));
    const monthlyAverage = annualRevenue / monthsElapsed;
    const projectedNextMonth = annualRevenue + monthlyAverage;

    if (annualRevenue >= TAX_THRESHOLD) {
      return {
        level: 'danger',
        annualRevenue,
        estimatedTax: computeIncomeTax(annualRevenue),
        remaining: 0,
      };
    } else if (projectedNextMonth >= TAX_THRESHOLD) {
      const remaining = Math.round(TAX_THRESHOLD - annualRevenue);
      const daysUntilCross = Math.max(1, Math.round(remaining / (monthlyAverage / 30)));
      return {
        level: 'warning',
        annualRevenue,
        estimatedTax: computeIncomeTax(TAX_THRESHOLD),
        remaining,
        daysUntilCross,
      };
    }
    return null;
  };

  const fetchAllBills = async () => {
    try {
      const response = await apiService.getAdminBills();
      setAllBills(response.data.bills || []);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      showToast(tr('Failed to load bills', 'बिल्स लोड नहीं हो सके'), 'error');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await apiService.getAdminBills();
      const bills = response.data.bills || [];
      const transactionsData = bills.map(bill => ({
        id: bill.billID,
        type: 'sale',
        amount: bill.total,
        customer: bill.customerName || 'Walk-in Customer',
        date: bill.created_at,
        items: bill.items?.length || 0,
        paymentMethod: bill.paymentMethod || 'cash'
      }));
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchSalesAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await apiService.getAdminSalesAnalytics();
      const analytics = response?.data?.analytics || {};
      const topProducts = analytics.topSellingProducts || [];

      setSalesAnalytics({
        byDay: analytics.byDay || [],
        byWeek: analytics.byWeek || [],
        byMonth: analytics.byMonth || [],
        byYear: analytics.byYear || [],
        topSellingProducts: topProducts
      });
    } catch (error) {
      console.error('Failed to fetch sales analytics:', error);
      showToast(tr('Failed to load sales analytics', 'सेल्स एनालिटिक्स लोड नहीं हो सका'), 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchProductForecast = async (productID, horizon = forecastHorizon) => {
    if (!productID) {
      return;
    }

    const normalizedProductID = Number(productID);
    const hasProduct = products.some((p) => Number(p.productID) === normalizedProductID);
    if (!hasProduct) {
      const fallback = products[0];
      if (fallback) {
        setForecastProductID(String(fallback.productID));
      }
      return;
    }

    try {
      setForecastLoading(true);
      const response = await apiService.getProductDemandForecast({
        productID: normalizedProductID,
        horizon: Number(horizon)
      });
      setProductForecast(response?.data?.forecast || null);
    } catch (error) {
      console.error('Failed to fetch product forecast:', error);
      setProductForecast(null);

      const notFound = error?.response?.status === 404;
      if (notFound && products.length > 0) {
        const fallbackProductID = String(products[0].productID);
        if (String(productID) !== fallbackProductID) {
          setForecastProductID(fallbackProductID);
          showToast(tr('Selected product no longer exists. Switched to first available product.', 'चुना गया प्रोडक्ट अब उपलब्ध नहीं है। पहले उपलब्ध प्रोडक्ट पर स्विच किया गया।'), 'warning');
          return;
        }
      }

      showToast(tr('Failed to generate ARIMA forecast', 'ARIMA फोरकास्ट जनरेट नहीं हो सका'), 'error');
    } finally {
      setForecastLoading(false);
    }
  };

  const getTrendSeriesByPeriod = () => {
    if (statsPeriod === 'week') return salesAnalytics.byWeek || [];
    if (statsPeriod === 'month') return salesAnalytics.byMonth || [];
    if (statsPeriod === 'year') return salesAnalytics.byYear || [];
    return salesAnalytics.byDay || [];
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm({ ...form, [name]: files[0] });
    } else if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else {
      const updatedForm = { ...form, [name]: value };
      if (name === 'category' && !isConsumableCategory(value)) {
        updatedForm.expiry_date = '';
      }
      setForm(updatedForm);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      quantity: '',
      category: 'Stationaries',
      expiry_date: '',
      image: null,
      GST_applicable: false,
      productID: null
    });
    const fileInput = document.getElementById('image');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (key !== 'productID') {
        formData.append(key, form[key]);
      }
    });

    try {
      if (form.productID) {
        await apiService.updateProduct(form.productID, formData);
        showToast(tr('Product updated successfully', 'प्रोडक्ट सफलतापूर्वक अपडेट हुआ'), 'success');
      } else {
        const response = await apiService.addProduct(formData);
        if (response?.data?.product) {
          setLatestAddedProduct(response.data.product);
        }

        if (response?.data?.marketingAgent) {
          setMarketingAdvice(response.data.marketingAgent);
          const shouldOpen = window.confirm(`${response.data.marketingAgent.prompt}\n\nOpen Marketing AI tab now?`);
          if (shouldOpen) {
            setActiveTab('marketingAI');
          }
        }
        showToast(tr('Product added successfully', 'प्रोडक्ट सफलतापूर्वक जोड़ा गया'), 'success');
      }
      fetchProducts();
      resetForm();
      setShowProductModal(false);
    } catch (error) {
      console.error('Form submission error:', error);
      showToast(tr('Failed to submit product', 'प्रोडक्ट सबमिट नहीं हो सका'), 'error');
    }
  };

  const generateMarketingAdvice = async (product = latestAddedProduct, style = photoStyle) => {
    if (!product) {
      showToast(tr('Add or select a product first to generate marketing strategy', 'मार्केटिंग रणनीति बनाने के लिए पहले प्रोडक्ट जोड़ें या चुनें'), 'warning');
      return;
    }

    try {
      setAgentLoading(true);
      const response = await apiService.getMarketingAdvice({ product, photoStyle: style });
      setMarketingAdvice(response.data.advice);
      showToast(tr('Marketing AI strategy generated', 'मार्केटिंग AI रणनीति तैयार हो गई'), 'success');
    } catch (error) {
      console.error('Marketing AI error:', error);
      showToast(tr('Failed to generate marketing advice', 'मार्केटिंग सलाह जनरेट नहीं हो सकी'), 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const runFinanceAdvisor = async (e) => {
    e.preventDefault();

    try {
      setAgentLoading(true);
      const response = await apiService.getFinanceAdvice({});
      setFinanceAdvice(response.data.advice);
      showToast(tr('GST compliance audit ready', 'GST अनुपालन ऑडिट तैयार है'), 'success');
    } catch (error) {
      console.error('Finance AI error:', error);
      showToast(tr('Failed to generate financial advice', 'वित्तीय सलाह जनरेट नहीं हो सकी'), 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const askWebsiteAssistant = async (e) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) {
      return;
    }

    setChatMessages((prev) => [...prev, { role: 'user', content: query }]);
    setChatInput('');

    try {
      setChatLoading(true);
      const response = await apiService.askWebsiteAssistant(query);
      const answer = response?.data?.answer || tr('I could not answer that right now.', 'मैं अभी इसका उत्तर नहीं दे सका।');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      console.error('Website chatbot error:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: tr('Sorry, Ask DukaanSaathi is unavailable right now. Please try again.', 'क्षमा करें, Ask DukaanSaathi अभी उपलब्ध नहीं है। कृपया फिर से प्रयास करें।')
        }
      ]);
      showToast(tr('Ask DukaanSaathi is temporarily unavailable', 'Ask DukaanSaathi अस्थायी रूप से उपलब्ध नहीं है'), 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      expiry_date: product.expiry_date ? new Date(product.expiry_date).toISOString().split('T')[0] : '',
      image: null,
      GST_applicable: !!product.GST_applicable,
      productID: product.productID
    });
    setShowProductModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm(tr('Are you sure you want to delete this product?', 'क्या आप वाकई इस प्रोडक्ट को हटाना चाहते हैं?'))) {
      try {
        await apiService.deleteProduct(productId);
        showToast(tr('Product deleted successfully', 'प्रोडक्ट सफलतापूर्वक हटाया गया'), 'success');
        fetchProducts();
      } catch (error) {
        console.error('Delete error:', error);
        showToast(tr('Failed to delete product', 'प्रोडक्ट हटाया नहीं जा सका'), 'error');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm((prev) => ({ ...prev, image: file || null }));
  };

  // Enhanced Billing functions
  const addItemToBilling = (product) => {
    // Check stock availability
    if (product.quantity <= 0) {
      showToast(`${product.name} is out of stock!`, 'error');
      return;
    }
    
    if (product.quantity <= 5) {
      showToast(`Warning: Only ${product.quantity} ${product.name} left in stock!`, 'warning');
    }
    
    const existingItem = billingForm.items.find(item => item.productID === product.productID);
    
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        showToast(`Cannot add more ${product.name}. Only ${product.quantity} available.`, 'error');
        return;
      }
      setBillingForm(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.productID === product.productID
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
    } else {
      setBillingForm(prev => ({
        ...prev,
        items: [...prev.items, {
          productID: product.productID,
          name: product.name,
          price: product.price,
          quantity: 1,
          GST_applicable: product.GST_applicable
        }]
      }));
    }
  };

  const updateBillingItemQuantity = (productID, quantity) => {
    const product = products.find(p => p.productID === productID);
    
    if (quantity > product.quantity) {
      showToast(`Cannot add more ${product.name}. Only ${product.quantity} available.`, 'error');
      return;
    }
    
    if (quantity <= 0) {
      setBillingForm(prev => ({
        ...prev,
        items: prev.items.filter(item => item.productID !== productID)
      }));
    } else {
      setBillingForm(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.productID === productID
            ? { ...item, quantity }
            : item
        )
      }));
    }
  };

  const calculateBillingTotal = () => {
    const subtotal = billingForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstAmount = billingForm.applyGST ? billingForm.items.reduce((sum, item) => {
      return sum + (item.GST_applicable ? (item.price * item.quantity * 0.18) : 0);
    }, 0) : 0;
    const total = subtotal + gstAmount;
    
    return { subtotal, gstAmount, total };
  };

  const handleBillingSubmit = async (e) => {
    e.preventDefault();
    
    if (!billingForm.customerName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }
    
    if (billingForm.items.length === 0) {
      showToast('Please add items to the bill', 'error');
      return;
    }

    // Final stock check
    for (const item of billingForm.items) {
      const product = products.find(p => p.productID === item.productID);
      if (item.quantity > product.quantity) {
        showToast(`Insufficient stock for ${product.name}. Only ${product.quantity} available.`, 'error');
        return;
      }
    }

    try {
      const billData = {
        items: billingForm.items.map(item => ({
          productID: item.productID,
          quantity: item.quantity
        })),
        customerName: billingForm.customerName,
        customerPhone: billingForm.customerPhone,
        customerEmail: billingForm.customerEmail,
        applyGST: billingForm.applyGST,
        paymentMethod: billingForm.paymentMethod,
        notes: billingForm.notes,
        sale_date: billingForm.sale_date || new Date().toISOString().split('T')[0]
      };

      const response = await apiService.generateAdminBill(billData);
      showToast('Bill generated successfully! 🎉', 'success');
      
      // Reset form
      setBillingForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        items: [],
        applyGST: true,
        paymentMethod: 'cash',
        notes: '',
        sale_date: new Date().toISOString().split('T')[0]
      });
      setShowBillingModal(false);
      
      // Refresh data
      fetchAllBills();
      fetchStats();
      fetchTransactions();
      checkLowStock();
      
      // Show the generated bill
      if (response.data.bill) {
        setSelectedBill(response.data.bill);
        setShowBillModal(true);
      }
    } catch (error) {
      console.error('Billing error:', error);
      showToast('Failed to generate bill', 'error');
    }
  };

  const downloadBill = (bill) => {
    const billContent = generateBillContent(bill);
    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DukaanSaathi_Bill_${bill.billID}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast('Bill downloaded successfully! 📄', 'success');
  };

  const printBill = (bill) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>DukaanSaathi - Bill #${bill.billID}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 20px; 
              background: white;
              color: #333;
            }
            .bill-container {
              max-width: 400px;
              margin: 0 auto;
              border: 2px solid #333;
              padding: 20px;
              background: white;
            }
            .bill-header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .bill-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
              color: #333;
            }
            .bill-subtitle {
              font-size: 14px;
              margin: 5px 0;
              color: #666;
            }
            .bill-details {
              margin-bottom: 20px;
            }
            .bill-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 12px;
            }
            .bill-items {
              border-top: 1px solid #333;
              border-bottom: 1px solid #333;
              padding: 15px 0;
              margin: 20px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .bill-total {
              border-top: 2px solid #333;
              padding-top: 15px;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .bill-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="bill-container">
            <div class="bill-header">
              <h1 class="bill-title">DUKAANSAATHI</h1>
              <p class="bill-subtitle">Quality Products & Gifts</p>
              <p class="bill-subtitle">Bill #${bill.billID.toString().padStart(6, '0')}</p>
            </div>
            
            <div class="bill-details">
              <div class="bill-row">
                <span>Date:</span>
                <span>${new Date(bill.created_at).toLocaleDateString()}</span>
              </div>
              <div class="bill-row">
                <span>Time:</span>
                <span>${new Date(bill.created_at).toLocaleTimeString()}</span>
              </div>
              <div class="bill-row">
                <span>Customer:</span>
                <span>${bill.customerName || 'Walk-in Customer'}</span>
              </div>
              ${bill.customerPhone ? `<div class="bill-row"><span>Phone:</span><span>${bill.customerPhone}</span></div>` : ''}
            </div>
            
            <div class="bill-items">
              ${bill.items?.map(item => {
                const itemTotal = item.price * item.quantity;
                return `
                  <div class="item-row">
                    <span>${item.name} x${item.quantity}</span>
                    <span>₹${itemTotal.toFixed(2)}</span>
                  </div>
                `;
              }).join('') || '<div class="item-row">No items found</div>'}
            </div>
            
            <div class="bill-total">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${calculateBillTotal(bill).subtotal.toFixed(2)}</span>
              </div>
              ${bill.applyGST ? `<div class="total-row"><span>GST (18%):</span><span>₹${calculateBillTotal(bill).gstAmount.toFixed(2)}</span></div>` : ''}
              <div class="total-row">
                <span>TOTAL:</span>
                <span>₹${calculateBillTotal(bill).total.toFixed(2)}</span>
              </div>
              <div class="bill-row">
                <span>Payment:</span>
                <span>${bill.paymentMethod || 'Cash'}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for shopping with DukaanSaathi!</p>
              <p>Visit us again for more amazing products</p>
              <p>Contact: +91 XXXXXXXXXX | Email: info@dukaansaathi.com</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    showToast('Bill printed successfully! 🖨️', 'success');
  };

  const generateBillContent = (bill) => {
    const { subtotal, gstAmount, total } = calculateBillTotal(bill);
    
    return `
╔══════════════════════════════════════════════════════════════╗
  ║                    DUKAANSAATHI                   ║
║                    Quality Products & Gifts                  ║
║                                                              ║
║  Bill #: ${bill.billID.toString().padStart(6, '0')}                    ║
║  Date: ${new Date(bill.created_at).toLocaleDateString()}                    ║
║  Time: ${new Date(bill.created_at).toLocaleTimeString()}                    ║
╠══════════════════════════════════════════════════════════════╣
║  Customer: ${bill.customerName || 'Walk-in Customer'}                    ║
║  Phone: ${bill.customerPhone || 'N/A'}                    ║
║  Email: ${bill.customerEmail || 'N/A'}                    ║
╠══════════════════════════════════════════════════════════════╣
║  ITEM DESCRIPTION                    QTY    PRICE     TOTAL  ║
╠══════════════════════════════════════════════════════════════╣
${bill.items?.map(item => {
  const itemTotal = item.price * item.quantity;
  return `║  ${item.name.padEnd(35)} ${item.quantity.toString().padStart(3)}   ${item.price.toFixed(2).padStart(8)}  ${itemTotal.toFixed(2).padStart(8)}  ║`;
}).join('\n') || '║  No items found                                              ║'}
╠══════════════════════════════════════════════════════════════╣
║  Subtotal:                                    ${subtotal.toFixed(2).padStart(8)}  ║
${bill.applyGST ? `║  GST (18%):                                    ${gstAmount.toFixed(2).padStart(8)}  ║` : ''}
║  TOTAL:                                       ${total.toFixed(2).padStart(8)}  ║
╠══════════════════════════════════════════════════════════════╣
║  Payment Method: ${bill.paymentMethod || 'Cash'}                    ║
║                                                              ║
║  Thank you for shopping with DukaanSaathi!       ║
║  Visit us again for more amazing products!                 ║
║                                                              ║
║  Contact: +91 XXXXXXXXXX | Email: info@dukaansaathi.com     ║
╚══════════════════════════════════════════════════════════════╝
    `;
  };

  const calculateBillTotal = (bill) => {
    const subtotal = bill.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const gstAmount = bill.applyGST ? bill.items?.reduce((sum, item) => {
      return sum + (item.GST_applicable ? (item.price * item.quantity * 0.18) : 0);
    }, 0) || 0 : 0;
    const total = subtotal + gstAmount;
    
    return { subtotal, gstAmount, total };
  };

  const formatPrice = (price) => {
    return `₹${price.toFixed(2)}`;
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= 5) return 'low-stock';
    return 'in-stock';
  };

  const closeScannerCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowScannerCamera(false);
  };

  const handleDesktopScan = async () => {
    if (scanInProgress) return;

    try {
      setCameraError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      setCameraStream(stream);
      setShowScannerCamera(true);
    } catch (error) {
      const msg = error?.message || 'Unable to open camera';
      setCameraError(msg);
      showToast(msg, 'error');
    }
  };

  const captureScannerFrame = async () => {
    if (!videoRef.current || scanInProgress) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (!width || !height) {
      showToast('Camera not ready yet. Please wait a second.', 'warning');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showToast('Unable to process camera frame.', 'error');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const imageBase64 = imageDataUrl.split(',')[1];

    setScanInProgress(true);
    try {
      closeScannerCamera();
      const response = await apiService.scanProductFromImage(imageBase64);
      const scan = response?.data?.scan;
      setLatestScanResult(scan || null);
      showToast('Product scanned and saved to sales.json', 'success');
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'Scan failed';
      showToast(msg, 'error');
    } finally {
      setScanInProgress(false);
    }
  };

  const handleScannerReport = async () => {
    if (scannerReportLoading) return;
    setScannerReportLoading(true);

    try {
      const response = await apiService.getScannerDataReport();
      const report = response?.data?.report || '';
      setLatestScannerReport(report);
      showToast('Scanner report generated', 'success');
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'Report failed';
      showToast(msg, 'error');
    } finally {
      setScannerReportLoading(false);
    }
  };

  const HomeScreen = () => {
    const getGreeting = () => {
      const h = new Date().getHours();
      if (h < 12) return tr('Good Morning', 'सुप्रभात');
      if (h < 17) return tr('Good Afternoon', 'नमस्कार');
      return tr('Good Evening', 'शुभ संध्या');
    };

    const trendSeries = getTrendSeriesByPeriod();
    const topSellingChartData = (salesAnalytics.topSellingProducts || []).slice(0, 7).map((item) => ({
      ...item,
      shortName: item.name?.length > 14 ? `${item.name.slice(0, 14)}...` : item.name
    }));

    const forecastSeries = productForecast?.combinedSeries || [];
    const topProduct = salesAnalytics.topSellingProducts?.[0] || null;
    const rangeRevenue = trendSeries.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
    const rangeItems = trendSeries.reduce((sum, item) => sum + Number(item.itemsSold || 0), 0);
    const trendHeadline = statsPeriod === 'day'
      ? tr('Last 14 days', 'पिछले 14 दिन')
      : statsPeriod === 'week'
        ? tr('Last 12 weeks', 'पिछले 12 सप्ताह')
        : statsPeriod === 'month'
          ? tr('Last 12 months', 'पिछले 12 महीने')
          : tr('Last 5 years', 'पिछले 5 वर्ष');

    return (
      <div className="home-screen">
        <div className="dashboard-hero-shell">
          {enableHeroScene && <ThreeSceneBackground className="dashboard-hero-scene" />}
          <div className="dashboard-hero-overlay" />
          <div className="dashboard-hero-content">
            <div className="greeting-section dashboard-hero-copy">
              <span className="dashboard-hero-tag">{tr('Retail command center', 'रिटेल कमांड सेंटर')}</span>
              <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
              <p>{tr('Track revenue, identify your most selling products, and predict demand before stock runs low.', 'राजस्व ट्रैक करें, सबसे अधिक बिकने वाले प्रोडक्ट पहचानें और स्टॉक कम होने से पहले मांग का अनुमान लगाएं।')}</p>
            </div>

            <div className="dashboard-hero-metrics">
              <div className="hero-metric-card">
                <span className="hero-metric-label">{tr('Analytics Window', 'एनालिटिक्स विंडो')}</span>
                <strong>{trendHeadline}</strong>
                <small>{language === 'hi' ? `${rangeItems} आइटम्स बिके` : `${rangeItems} items sold`}</small>
              </div>
              <div className="hero-metric-card">
                <span className="hero-metric-label">{tr('Revenue in View', 'दिख रहा राजस्व')}</span>
                <strong>₹{rangeRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                <small>{language === 'hi' ? `${trendSeries.length} प्लॉटेड पॉइंट्स` : `${trendSeries.length} plotted points`}</small>
              </div>
              <div className="hero-metric-card">
                <span className="hero-metric-label">{tr('Top Product', 'टॉप प्रोडक्ट')}</span>
                <strong>{topProduct?.name || tr('Waiting for sales', 'सेल्स का इंतजार')}</strong>
                <small>{topProduct ? (language === 'hi' ? `${topProduct.totalQuantity} यूनिट्स बिकीं` : `${topProduct.totalQuantity} units sold`) : tr('No transactions yet', 'अभी कोई ट्रांजैक्शन नहीं')}</small>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-cards-list">
          <div className="stat-card-item">
            <div className="sci-icon teal"><DollarSign size={20} /></div>
            <div className="sci-body">
              <span className="sci-label">{tr("Today's Sales", 'आज की बिक्री')}</span>
              <span className="sci-value">₹{stats.todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <span className="sci-badge green">+12%</span>
          </div>
          <div className="stat-card-item">
            <div className="sci-icon blue"><Users size={20} /></div>
            <div className="sci-body">
              <span className="sci-label">{tr('Customers Today', 'आज के ग्राहक')}</span>
              <span className="sci-value">{stats.totalBills}</span>
            </div>
            <span className="sci-badge green">+5%</span>
          </div>
          <div className="stat-card-item">
            <div className="sci-icon red"><AlertTriangle size={20} /></div>
            <div className="sci-body">
              <span className="sci-label">{tr('Low Stock Items', 'कम स्टॉक आइटम्स')}</span>
              <span className="sci-value">{language === 'hi' ? `${stats.lowStockItems?.length || 0} आइटम्स` : `${stats.lowStockItems?.length || 0} items`}</span>
            </div>
            <span className="sci-badge red">{tr('Alert', 'अलर्ट')}</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>{tr('Sales Trend', 'बिक्री रुझान')}</h3>
            <div className="range-toggle">
              <button className={`range-btn ${statsPeriod === 'day' ? 'active' : ''}`} onClick={() => setStatsPeriod('day')}>{tr('Day', 'दिन')}</button>
              <button className={`range-btn ${statsPeriod === 'week' ? 'active' : ''}`} onClick={() => setStatsPeriod('week')}>{tr('Week', 'सप्ताह')}</button>
              <button className={`range-btn ${statsPeriod === 'month' ? 'active' : ''}`} onClick={() => setStatsPeriod('month')}>{tr('Month', 'महीना')}</button>
              <button className={`range-btn ${statsPeriod === 'year' ? 'active' : ''}`} onClick={() => setStatsPeriod('year')}>{tr('Year', 'वर्ष')}</button>
            </div>
          </div>

          {analyticsLoading ? (
            <p className="chart-empty">{tr('Loading sales charts...', 'सेल्स चार्ट लोड हो रहे हैं...')}</p>
          ) : trendSeries.length === 0 ? (
            <p className="chart-empty">{tr('No sales data available yet.', 'अभी बिक्री डेटा उपलब्ध नहीं है।')}</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendSeries} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === 'Revenue' ? [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue'] : [value, name]} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#0f8a8d" strokeWidth={2.5} dot={false} name="Revenue" isAnimationActive={false} />
                  <Line type="monotone" dataKey="itemsSold" stroke="#f57c00" strokeWidth={2} dot={false} name="Items Sold" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>{tr('Most Selling Products', 'सबसे ज्यादा बिकने वाले प्रोडक्ट')}</h3>
          </div>
          {topSellingChartData.length === 0 ? (
            <p className="chart-empty">{tr('Top products will appear after sales start.', 'बिक्री शुरू होने के बाद टॉप प्रोडक्ट दिखेंगे।')}</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSellingChartData} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === 'Revenue' ? [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue'] : [value, name]} />
                  <Legend />
                  <Bar dataKey="totalQuantity" name="Qty Sold" fill="#0f8a8d" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#4285f4" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>{tr('Hybrid ARIMA + SARIMA Forecast', 'हाइब्रिड ARIMA + SARIMA पूर्वानुमान')}</h3>
          </div>

          <div className="forecast-controls">
            <select
              className="form-control"
              value={forecastProductID}
              onChange={(e) => setForecastProductID(e.target.value)}
            >
              <option value="">{tr('Select product', 'प्रोडक्ट चुनें')}</option>
              {products.map((product) => (
                <option key={product.productID} value={String(product.productID)}>
                  {product.name}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={forecastHorizon}
              onChange={(e) => setForecastHorizon(Number(e.target.value))}
            >
              <option value={7}>{tr('Next 7 days', 'अगले 7 दिन')}</option>
              <option value={14}>{tr('Next 14 days', 'अगले 14 दिन')}</option>
              <option value={21}>{tr('Next 21 days', 'अगले 21 दिन')}</option>
              <option value={30}>{tr('Next 30 days', 'अगले 30 दिन')}</option>
            </select>

            <button
              className="btn btn-primary"
              type="button"
              onClick={() => fetchProductForecast(forecastProductID, forecastHorizon)}
              disabled={forecastLoading || !forecastProductID}
            >
              {forecastLoading ? tr('Predicting...', 'पूर्वानुमान चल रहा है...') : tr('Run Hybrid Forecast', 'हाइब्रिड फोरकास्ट चलाएं')}
            </button>
          </div>

          {productForecast && (
            <div className="forecast-summary">
              <p>
                <strong>{productForecast.productName}</strong> | {tr('Method', 'विधि')}: {productForecast.method} | {tr('Suggested stock for next', 'अगले लिए सुझाया गया स्टॉक')} {productForecast.horizonDays} {tr('days', 'दिन')}:
                {' '}<strong>{productForecast.suggestedStock} {tr('items', 'आइटम्स')}</strong>
              </p>
            </div>
          )}

          {forecastSeries.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={forecastSeries} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actualQuantity" stroke="#0f8a8d" strokeWidth={2.5} dot={false} name="Historical Qty" isAnimationActive={false} />
                  <Line type="monotone" dataKey="predictedQuantity" stroke="#ea4335" strokeWidth={2.5} dot={false} strokeDasharray="6 4" name="Predicted Qty" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="chart-empty">{tr('Select a product and run hybrid forecast to view demand prediction.', 'मांग पूर्वानुमान देखने के लिए प्रोडक्ट चुनें और हाइब्रिड फोरकास्ट चलाएं।')}</p>
          )}
        </div>

        {taxAlert && (
          <div className={`tax-alert-banner ${taxAlert.level}`}>
            <div className="tax-alert-icon">
              {taxAlert.level === 'danger' ? '🚨' : '⚠️'}
            </div>
            <div className="tax-alert-body">
              <strong>
                {taxAlert.level === 'danger'
                  ? 'Income Tax Threshold Crossed!'
                  : 'Income Tax Alert — 1 Month Warning'}
              </strong>
              <p>
                {taxAlert.level === 'danger'
                  ? `Your FY revenue ₹${taxAlert.annualRevenue.toLocaleString('en-IN')} has exceeded the ₹15,00,000 threshold. Estimated income tax payable: ₹${taxAlert.estimatedTax.toLocaleString('en-IN')} (New Regime + 4% cess). Please consult a tax advisor.`
                  : `At your current sales rate, your FY revenue will cross ₹15,00,000 in approximately ${taxAlert.daysUntilCross} days. Current FY revenue: ₹${taxAlert.annualRevenue.toLocaleString('en-IN')} | Remaining before threshold: ₹${taxAlert.remaining.toLocaleString('en-IN')} | Estimated tax at threshold: ₹${taxAlert.estimatedTax.toLocaleString('en-IN')} (New Regime + 4% cess).`}
              </p>
            </div>
            <button className="tax-alert-close" onClick={() => setTaxAlert(null)} aria-label="Dismiss tax alert">✕</button>
          </div>
        )}

        {nearExpiryAlerts.length > 0 && (
          <div className="expiry-alert-banner">
            <div className="tax-alert-icon">⚠️</div>
            <div className="tax-alert-body">
              <strong>Expiry Alert: Replace These Foods/Beverages Soon</strong>
              <p>
                {nearExpiryAlerts
                  .slice(0, 4)
                  .map((item) => `${item.name} (${item.daysToExpire < 0 ? `${Math.abs(item.daysToExpire)} days expired` : `${item.daysToExpire} days left`})`)
                  .join(', ')}
                {nearExpiryAlerts.length > 4 ? ` and ${nearExpiryAlerts.length - 4} more.` : ''}
              </p>
            </div>
            <button className="tax-alert-close" onClick={() => setNearExpiryAlerts([])} aria-label="Dismiss expiry alert">✕</button>
          </div>
        )}

        {marketingAdvice?.creative && (() => {
          const { primary, fallback } = resolveAiImageSource(marketingAdvice);

          return (
          <div className="dashboard-photo-card">
            <div className="dashboard-photo-head">
              <strong>{tr('Latest AI Product Photo', 'नवीनतम AI प्रोडक्ट फोटो')}</strong>
              <button className="btn btn-outline btn-small" onClick={() => setActiveTab('marketingAI')}>
                {tr('Open Marketing AI', 'मार्केटिंग AI खोलें')}
              </button>
            </div>
            <img
              src={primary}
              data-fallback-src={fallback}
              alt={`${marketingAdvice.productSnapshot?.name || 'Product'} AI generated photography`}
              className="dashboard-generated-photo"
              loading="lazy"
              onError={handleImageLoadError}
            />
            <p className="agent-disclaimer">
              {marketingAdvice.productSnapshot?.name || tr('Product', 'प्रोडक्ट')} • {marketingAdvice.creative?.selectedStyle || 'studio-white'}
            </p>
          </div>
          );
        })()}

        <div className="ai-banner" onClick={() => setActiveTab('marketingAI')} role="button" tabIndex={0} onKeyDown={() => {}}>
          <div className="ai-banner-text">
            <strong>{tr('Ask DukaanSaathi', 'Ask DukaanSaathi')}</strong>
            <p>{tr('Get instant answers about your inventory, sales, and more.', 'इन्वेंट्री, बिक्री और अन्य प्रश्नों के तुरंत उत्तर पाएं।')}</p>
            <button className="btn-ask" onClick={(e) => { e.stopPropagation(); setActiveTab('marketingAI'); }}>{tr('Ask Now', 'अभी पूछें')}</button>
          </div>
          <div className="ai-banner-bot">🤖</div>
        </div>

        <div className="quick-actions">
          <h3>{tr('Quick Actions', 'त्वरित कार्य')}</h3>
          <div className="qa-grid">
            <button className="qa-card" onClick={() => setShowBillingModal(true)}>
              <div className="qa-card-icon"><Receipt size={22} /></div>
              <span>{tr('Create Bill', 'बिल बनाएं')}</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('manageProducts')}>
              <div className="qa-card-icon"><Package size={22} /></div>
              <span>{tr('Inventory', 'इन्वेंट्री')}</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('transactions')}>
              <div className="qa-card-icon"><BarChart3 size={22} /></div>
              <span>{tr('Sales Analytics', 'सेल्स एनालिटिक्स')}</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('billing')}>
              <div className="qa-card-icon"><List size={22} /></div>
              <span>{tr('Billing History', 'बिलिंग हिस्ट्री')}</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('manageProducts')}>
              <div className="qa-card-icon"><AlertTriangle size={22} /></div>
              <span>{tr('Expiry Alerts', 'एक्सपायरी अलर्ट्स')}</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('addProduct')}>
              <div className="qa-card-icon"><Users size={22} /></div>
              <span>{tr('New Customer', 'नया ग्राहक')}</span>
            </button>
            <button className="qa-card" onClick={handleDesktopScan} disabled={scanInProgress}>
              <div className="qa-card-icon"><ScanLine size={22} /></div>
              <span>{scanInProgress ? tr('Scanning...', 'स्कैन हो रहा है...') : tr('Scan Product', 'प्रोडक्ट स्कैन करें')}</span>
            </button>
            <button className="qa-card" onClick={handleScannerReport} disabled={scannerReportLoading}>
              <div className="qa-card-icon"><FileSearch size={22} /></div>
              <span>{scannerReportLoading ? tr('Generating...', 'बन रहा है...') : tr('Scan Report', 'स्कैन रिपोर्ट')}</span>
            </button>
          </div>
        </div>

        {(latestScanResult || latestScannerReport) && (
          <div className="analytics-card">
            <div className="analytics-head">
              <h3>{tr('Scanner Output', 'स्कैनर आउटपुट')}</h3>
            </div>
            {latestScanResult && (
              <div className="scanner-output-block">
                <h4>{tr('Latest Scan JSON', 'नवीनतम स्कैन JSON')}</h4>
                <pre>{JSON.stringify(latestScanResult, null, 2)}</pre>
              </div>
            )}
            {latestScannerReport && (
              <div className="scanner-output-block">
                <h4>{tr('Latest Report', 'नवीनतम रिपोर्ट')}</h4>
                <p>{latestScannerReport}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const ManageProducts = () => (
    <div className="products-list">
      <div className="billing-header">
        <h2>{tr('Manage Products', 'प्रोडक्ट प्रबंधन')}</h2>
        <button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowProductModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          {tr('Add Product', 'प्रोडक्ट जोड़ें')}
        </button>
      </div>

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>{tr('Image', 'इमेज')}</th>
              <th>{tr('Product', 'प्रोडक्ट')}</th>
              <th>{tr('Category', 'श्रेणी')}</th>
              <th>{tr('Price', 'कीमत')}</th>
              <th>{tr('Stock', 'स्टॉक')}</th>
              <th>{tr('GST', 'GST')}</th>
              <th>{tr('Actions', 'कार्रवाई')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.productID}>
                <td>
                  {product.image_url ? (
                    <img
                      src={buildUploadedImageUrl(product.image_url)}
                      alt={product.name}
                      className="product-thumbnail"
                      onError={handleImageLoadError}
                      data-fallback-src={buildAiImageFallbackUrl(product.name)}
                    />
                  ) : (
                    <div className="no-image">{tr('No Image', 'कोई इमेज नहीं')}</div>
                  )}
                </td>
                <td>
                  <div className="product-info">
                    <strong>{product.name}</strong>
                    <small>{product.description}</small>
                    {product.expiry_date && (
                      <small className="expiry-meta">{tr('Expiry', 'एक्सपायरी')}: {new Date(product.expiry_date).toLocaleDateString('en-IN')}</small>
                    )}
                  </div>
                </td>
                <td>{getCategoryLabel(product.category)}</td>
                <td>{formatPrice(product.price)}</td>
                <td>
                  <span className={`stock ${getStockStatus(product.quantity)}`}>
                    {product.quantity}
                  </span>
                </td>
                <td>
                  {product.GST_applicable ? (
                    <span className="gst-badge">{tr('Yes', 'हाँ')}</span>
                  ) : (
                    <span className="no-gst">{tr('No', 'नहीं')}</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(product)}
                      className="btn btn-outline btn-small"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.productID)}
                      className="btn btn-secondary btn-small"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const Billing = () => {
    return (
      <div className="billing-section">
        <div className="billing-header">
          <h2>{tr('Admin Billing', 'एडमिन बिलिंग')}</h2>
          <button
            onClick={() => setShowBillingModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            {tr('Create New Bill', 'नया बिल बनाएं')}
          </button>
        </div>

        <div className="bills-list">
          <h3>{tr('All Bills', 'सभी बिल्स')}</h3>
          <div className="bills-table">
            <table>
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>{tr('Customer', 'ग्राहक')}</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>{tr('Actions', 'कार्रवाई')}</th>
                </tr>
              </thead>
              <tbody>
                {allBills.map(bill => {
                  const { subtotal, gstAmount, total } = calculateBillTotal(bill);
                  return (
                    <tr key={bill.billID}>
                      <td>#{bill.billID}</td>
                      <td>{bill.customerName || tr('Walk-in Customer', 'वॉक-इन ग्राहक')}</td>
                      <td>{language === 'hi' ? `${bill.items ? bill.items.length : 0} आइटम्स` : `${bill.items ? bill.items.length : 0} items`}</td>
                      <td>{formatPrice(subtotal)}</td>
                      <td>{bill.applyGST ? formatPrice(gstAmount) : 'N/A'}</td>
                      <td>{formatPrice(total)}</td>
                      <td>{getPaymentMethodLabel((bill.paymentMethod || 'cash').toLowerCase())}</td>
                      <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowBillModal(true);
                            }}
                            className="btn btn-outline btn-small"
                            title="View Bill"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            onClick={() => downloadBill(bill)}
                            className="btn btn-outline btn-small"
                            title="Download Bill"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => printBill(bill)}
                            className="btn btn-outline btn-small"
                            title="Print Bill"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const Transactions = () => {
    const trendSeries = getTrendSeriesByPeriod();
    const topSellingChartData = (salesAnalytics.topSellingProducts || []).slice(0, 7).map((item) => ({
      ...item,
      shortName: item.name?.length > 14 ? `${item.name.slice(0, 14)}...` : item.name
    }));

    return (
      <div className="transactions-section">
        <h2>{tr('Reports & Visualizations', 'रिपोर्ट्स और विज़ुअलाइजेशन')}</h2>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>{tr('Sales Trend', 'बिक्री रुझान')}</h3>
            <div className="range-toggle">
              <button className={`range-btn ${statsPeriod === 'day' ? 'active' : ''}`} onClick={() => setStatsPeriod('day')}>{tr('Day', 'दिन')}</button>
              <button className={`range-btn ${statsPeriod === 'week' ? 'active' : ''}`} onClick={() => setStatsPeriod('week')}>{tr('Week', 'सप्ताह')}</button>
              <button className={`range-btn ${statsPeriod === 'month' ? 'active' : ''}`} onClick={() => setStatsPeriod('month')}>{tr('Month', 'महीना')}</button>
              <button className={`range-btn ${statsPeriod === 'year' ? 'active' : ''}`} onClick={() => setStatsPeriod('year')}>{tr('Year', 'वर्ष')}</button>
            </div>
          </div>

          {analyticsLoading ? (
            <p className="chart-empty">{tr('Loading sales charts...', 'सेल्स चार्ट लोड हो रहे हैं...')}</p>
          ) : trendSeries.length === 0 ? (
            <p className="chart-empty">{tr('No sales data available yet.', 'अभी बिक्री डेटा उपलब्ध नहीं है।')}</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendSeries} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === 'Revenue' ? [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue'] : [value, name]} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#0f8a8d" strokeWidth={2.5} dot={false} name="Revenue" isAnimationActive={false} />
                  <Line type="monotone" dataKey="itemsSold" stroke="#f57c00" strokeWidth={2} dot={false} name="Items Sold" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>{tr('Most Selling Products', 'सबसे ज्यादा बिकने वाले प्रोडक्ट')}</h3>
          </div>

          {topSellingChartData.length === 0 ? (
            <p className="chart-empty">{tr('Top products will appear after sales start.', 'बिक्री शुरू होने के बाद टॉप प्रोडक्ट दिखेंगे।')}</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSellingChartData} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === 'Revenue' ? [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue'] : [value, name]} />
                  <Legend />
                  <Bar dataKey="totalQuantity" name="Qty Sold" fill="#0f8a8d" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="#4285f4" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <h2 style={{ marginTop: 20 }}>{tr('Transaction History', 'लेनदेन इतिहास')}</h2>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                  <th>{tr('Payment Method', 'भुगतान विधि')}</th>
                  <th>{tr('Actions', 'कार्रवाई')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.date).toLocaleDateString()}</td>
                  <td>#{transaction.id}</td>
                  <td>{transaction.customer}</td>
                  <td>{language === 'hi' ? `${transaction.items} आइटम्स` : `${transaction.items} items`}</td>
                  <td>{formatPrice(transaction.amount)}</td>
                  <td>{getPaymentMethodLabel((transaction.paymentMethod || '').toLowerCase())}</td>
                  <td>
                    <button
                      onClick={() => {
                        const bill = allBills.find(b => b.billID === transaction.id);
                        if (bill) {
                          setSelectedBill(bill);
                          setShowBillModal(true);
                        }
                      }}
                      className="btn btn-outline btn-small"
                    >
                      <FileText size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const MarketingAI = () => (
    <div className="agent-section">
      <div className="agent-header">
        <h2>{tr('Marketing Agent AI', 'मार्केटिंग एजेंट AI')}</h2>
        <button
          className="btn btn-primary"
          onClick={() => generateMarketingAdvice()}
          disabled={agentLoading}
        >
          <Megaphone size={16} />
          {agentLoading ? tr('Generating...', 'बन रहा है...') : tr('Generate Strategy', 'रणनीति बनाएं')}
        </button>
      </div>

      {latestAddedProduct && (
        <div className="agent-card">
          <p><strong>Latest Product:</strong> {latestAddedProduct.name} ({latestAddedProduct.category})</p>
          <p><strong>Price:</strong> {formatPrice(Number(latestAddedProduct.price || 0))}</p>
          <p><strong>Stock:</strong> {latestAddedProduct.quantity}</p>
          <div className="form-row" style={{ marginTop: '10px' }}>
            <div className="form-group">
              <label>{tr('Photo Style', 'फोटो स्टाइल')}</label>
              <select className="form-control" value={photoStyle} onChange={(e) => setPhotoStyle(e.target.value)}>
                <option value="studio-white">{tr('Studio White', 'स्टूडियो व्हाइट')}</option>
                <option value="dark-luxury">{tr('Dark Luxury', 'डार्क लग्जरी')}</option>
                <option value="lifestyle-desk">{tr('Lifestyle Desk', 'लाइफस्टाइल डेस्क')}</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => generateMarketingAdvice(latestAddedProduct, photoStyle)}
                disabled={agentLoading}
              >
                {tr('Regenerate Product Photo', 'प्रोडक्ट फोटो फिर से बनाएं')}
              </button>
            </div>
          </div>
        </div>
      )}

      {marketingAdvice ? (
        <div className="agent-card">
          <h3>{marketingAdvice.prompt}</h3>
          {marketingAdvice.strategyMeta?.engine && (
            <p><strong>Strategy Engine:</strong> {marketingAdvice.strategyMeta.engine}</p>
          )}
          {marketingAdvice.creative?.selectedStyle && (
            <p><strong>Photo Style:</strong> {marketingAdvice.creative.selectedStyle}</p>
          )}
          <p><strong>Objective:</strong> {marketingAdvice.strategy?.objective}</p>
          <p><strong>Target Audience:</strong> {marketingAdvice.strategy?.targetAudience}</p>
          <p><strong>Value Hook:</strong> {marketingAdvice.strategy?.valueHook}</p>
          <p><strong>CTA:</strong> {marketingAdvice.strategy?.cta}</p>

          {marketingAdvice.creative && (() => {
            const { primary, fallback } = resolveAiImageSource(marketingAdvice);

            return (
            <div className="marketing-image-wrap">
              <h4>{tr('AI Product Photography', 'AI प्रोडक्ट फोटोग्राफी')}</h4>
              <img
                src={primary}
                data-fallback-src={fallback}
                alt={`${marketingAdvice.productSnapshot?.name || 'Product'} product photography`}
                className="marketing-generated-image"
                loading="lazy"
                onError={handleImageLoadError}
              />
              <p className="agent-disclaimer">{marketingAdvice.creative.note}</p>
            </div>
            );
          })()}

          <h4>{tr('Recommended Channels', 'सुझाए गए चैनल')}</h4>
          <ul className="agent-list">
            {(marketingAdvice.strategy?.channels || []).map((channel) => (
              <li key={channel}>{channel}</li>
            ))}
          </ul>

          <h4>{tr('Offer Ideas', 'ऑफर आइडियाज')}</h4>
          <ul className="agent-list">
            {(marketingAdvice.strategy?.offers || []).map((offer) => (
              <li key={offer}>{offer}</li>
            ))}
          </ul>

          <h4>{tr('Content Ideas', 'कंटेंट आइडियाज')}</h4>
          <ul className="agent-list">
            {(marketingAdvice.strategy?.contentIdeas || []).map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="agent-card empty-state">
          <p>{tr('Add a product and generate a marketing strategy to see campaign suggestions here.', 'यहां अभियान सुझाव देखने के लिए प्रोडक्ट जोड़ें और मार्केटिंग रणनीति बनाएं।')}</p>
        </div>
      )}

      <div className="agent-card chatbot-card">
        <h3>{tr('Ask DukaanSaathi', 'Ask DukaanSaathi')}</h3>
        <p className="chatbot-subtitle">{tr('Website help only. Ask about features, workflows, and troubleshooting in this app.', 'केवल वेबसाइट सहायता। इस ऐप में फीचर्स, वर्कफ़्लो और समस्या समाधान के बारे में पूछें।')}</p>

        <div className="chatbot-window">
          {chatMessages.map((msg, idx) => (
            <div key={`${msg.role}-${idx}`} className={`chat-msg ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {chatLoading && <div className="chat-msg assistant">{tr('Thinking...', 'सोच रहा है...')}</div>}
        </div>

        <form className="chatbot-form" onSubmit={askWebsiteAssistant}>
          <input
            type="text"
            className="form-control"
            placeholder={tr('Ask about DukaanSaathi website usage', 'DukaanSaathi वेबसाइट उपयोग के बारे में पूछें')}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={500}
          />
          <button type="submit" className="btn btn-primary" disabled={chatLoading || !chatInput.trim()}>
            {tr('Ask', 'पूछें')}
          </button>
        </form>
      </div>
    </div>
  );

  const FinanceAI = () => {
    const complianceIssues = financeAdvice?.complianceIssues || [];
    const issueText = complianceIssues.map((item) => String(item?.complianceIssue || '').toLowerCase()).join(' ');

    const ruleChecklist = [
      {
        key: 'slab',
        label: '1. Correct GST slab per product',
        covered: issueText.includes('slab') || (financeAdvice?.productGstClassification || []).length > 0
      },
      {
        key: 'wrong-rate',
        label: '2. Incorrect GST rate in invoices',
        covered: issueText.includes('incorrect gst rates') || issueText.includes('rate mismatch')
      },
      {
        key: 'hsn',
        label: '3. Missing or incorrect HSN codes',
        covered: issueText.includes('hsn') || (financeAdvice?.productGstClassification || []).some((p) => p.hsnStatus)
      },
      {
        key: 'registration',
        label: '4. GST registration threshold eligibility',
        covered: issueText.includes('registration threshold')
      },
      {
        key: 'composition',
        label: '5. Composition scheme eligibility',
        covered: issueText.includes('composition scheme')
      },
      {
        key: 'eway',
        label: '6. E-Way bill requirement above Rs. 50,000',
        covered: issueText.includes('e-way') || Array.isArray(financeAdvice?.highValueTransactions)
      },
      {
        key: 'itc',
        label: '7. Input Tax Credit opportunities',
        covered: issueText.includes('input tax credit') || issueText.includes('itc')
      },
      {
        key: 'filings',
        label: '8. Filing obligations (GSTR-1 and GSTR-3B)',
        covered: issueText.includes('gstr-1') || issueText.includes('gstr-3b') || issueText.includes('return filing obligations')
      },
      {
        key: 'risk',
        label: '9. Tax risk or penalty exposure',
        covered: issueText.includes('risk') || issueText.includes('penalty')
      },
      {
        key: 'actions',
        label: '10. Actionable compliance steps',
        covered: issueText.includes('action plan') || issueText.includes('ongoing compliance')
      }
    ];

    const coveredCount = ruleChecklist.filter((item) => item.covered).length;

    return (
      <div className="agent-section">
        <div className="agent-header">
          <h2>{tr('GST Compliance Advisor (India)', 'GST अनुपालन सलाहकार (भारत)')}</h2>
        </div>

        <div className="agent-card">
          <p>
            This advisor automatically analyzes your product catalog, billing transactions, GST rates, and inventory-linked sales records.
            It then gives clear GST compliance recommendations for small Indian businesses.
          </p>
          <form className="agent-form" onSubmit={runFinanceAdvisor}>
            <div className="modal-footer" style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={agentLoading}>
                <FileSearch size={16} />
                {agentLoading ? tr('Analyzing...', 'विश्लेषण हो रहा है...') : tr('Run GST Compliance Audit', 'GST अनुपालन ऑडिट चलाएं')}
              </button>
            </div>
          </form>
        </div>

        {financeAdvice && (
          <div className="agent-card">
            <h3>Compliance Summary ({financeAdvice.period})</h3>
            <p><strong>Products analyzed:</strong> {financeAdvice.summary?.productsAnalysed || 0}</p>
            <p><strong>Invoices analyzed:</strong> {financeAdvice.summary?.invoicesAnalysed || 0}</p>
            <p><strong>Taxable turnover:</strong> {formatPrice(Number(financeAdvice.summary?.taxableTurnover || 0))}</p>
            <p><strong>Output GST from invoices:</strong> {formatPrice(Number(financeAdvice.summary?.outputGstFromInvoices || 0))}</p>
            <p><strong>Potential underpaid GST:</strong> {formatPrice(Number(financeAdvice.summary?.potentialUnderPaidGst || 0))}</p>
            <p><strong>Potential excess charged GST:</strong> {formatPrice(Number(financeAdvice.summary?.potentialOverPaidGst || 0))}</p>

            <div className="scanner-output-block" style={{ marginBottom: '12px' }}>
              <h4>Rule Coverage</h4>
              <div className="rule-coverage-headline">
                <p><strong>Coverage:</strong> {coveredCount}/10 rules applied</p>
                <span className={`rule-coverage-pill ${coveredCount === 10 ? 'complete' : 'partial'}`}>
                  {coveredCount === 10 ? 'All rules covered' : 'Review remaining rules'}
                </span>
              </div>
              <ul className="agent-list rule-coverage-list">
                {ruleChecklist.map((rule) => (
                  <li key={rule.key} className="rule-coverage-item">
                    <span className={`rule-status-badge ${rule.covered ? 'covered' : 'missing'}`}>
                      {rule.covered ? 'Yes' : 'No'}
                    </span>
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h4>Compliance Issues</h4>
            {complianceIssues.map((issue, idx) => (
              <div key={`${issue.complianceIssue}-${idx}`} className="scanner-output-block" style={{ marginBottom: '12px' }}>
                <p><strong>Compliance Issue:</strong> {issue.complianceIssue}</p>
                <p><strong>Explanation of Rule:</strong> {issue.explanationOfRule}</p>
                <p><strong>Risk Level:</strong> {issue.riskLevel}</p>
                <p><strong>Suggested Action:</strong> {issue.suggestedAction}</p>
                <p><strong>Estimated Tax Impact:</strong> {issue.estimatedTaxImpact}</p>
                {issue.regulationReference && <p><strong>Regulation:</strong> {issue.regulationReference}</p>}
              </div>
            ))}

            {(financeAdvice.invoiceRateMismatchSample || []).length > 0 && (
              <>
                <h4>Invoice Rate Mismatch Sample</h4>
                <ul className="agent-list">
                  {financeAdvice.invoiceRateMismatchSample.map((mismatch) => (
                    <li key={`${mismatch.billID}-${mismatch.productID}`}>
                      Bill #{mismatch.billID} - {mismatch.productName}: observed {mismatch.observedRatePercent}% vs expected {mismatch.expectedRatePercent}%
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(financeAdvice.highValueTransactions || []).length > 0 && (
              <>
                <h4>Transactions Above Rs. 50,000 (E-Way Bill Check)</h4>
                <ul className="agent-list">
                  {financeAdvice.highValueTransactions.map((txn) => (
                    <li key={txn.billID}>
                      Bill #{txn.billID}: {formatPrice(Number(txn.amount || 0))}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="agent-disclaimer">{financeAdvice.disclaimer}</p>
          </div>
        )}
      </div>
    );
  };

  const ScannerHub = () => (
    <div className="agent-section">
      <div className="agent-header">
        <h2>{tr('Product Scanner', 'प्रोडक्ट स्कैनर')}</h2>
      </div>

      <div className="agent-card">
        <p>{tr('Use your webcam to scan product labels and store structured JSON in sales.json.', 'प्रोडक्ट लेबल स्कैन करने और structured JSON को sales.json में सेव करने के लिए वेबकैम का उपयोग करें।')}</p>
        <div className="form-row" style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" type="button" onClick={handleDesktopScan} disabled={scanInProgress}>
            <ScanLine size={16} />
            {scanInProgress ? tr('Processing...', 'प्रोसेस हो रहा है...') : tr('Scan Product', 'प्रोडक्ट स्कैन करें')}
          </button>
          <button className="btn btn-outline" type="button" onClick={handleScannerReport} disabled={scannerReportLoading}>
            <FileSearch size={16} />
            {scannerReportLoading ? tr('Generating...', 'बन रहा है...') : tr('Generate Report', 'रिपोर्ट बनाएं')}
          </button>
        </div>
        <p className="agent-disclaimer">{tr('Tip: Open camera, align label, then tap Capture & Scan.', 'सुझाव: कैमरा खोलें, लेबल को ठीक करें, फिर Capture & Scan दबाएं।')}</p>
      </div>

      {(latestScanResult || latestScannerReport) && (
        <div className="agent-card">
          <h3>{tr('Scanner Output', 'स्कैनर आउटपुट')}</h3>

          {latestScanResult && (
            <div className="scanner-output-block">
              <h4>{tr('Latest Scan JSON', 'नवीनतम स्कैन JSON')}</h4>
              <pre>{JSON.stringify(latestScanResult, null, 2)}</pre>
            </div>
          )}

          {latestScannerReport && (
            <div className="scanner-output-block">
              <h4>{tr('Latest Report', 'नवीनतम रिपोर्ट')}</h4>
              <p>{latestScannerReport}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const DigitalTwin = () => {
    const trendSeries = getTrendSeriesByPeriod();
    const topProduct = salesAnalytics.topSellingProducts?.[0] || null;
    const lowStockCount = stats.lowStockItems?.length || 0;
    const latestRevenue = trendSeries.reduce((sum, item) => sum + Number(item.revenue || 0), 0);

    return (
      <div className="agent-section digital-twin-screen">
        <div className="agent-header">
          <h2>{tr('Digital Twin View', 'डिजिटल ट्विन व्यू')}</h2>
        </div>

        <div className="digital-twin-stage">
          {enableHeroScene ? <ThreeSceneBackground className="digital-twin-scene" density="ambient" /> : <div className="digital-twin-fallback">3D twin is simplified on this device for better performance.</div>}
          <div className="digital-twin-overlay" />
          <div className="digital-twin-copy">
            <span className="digital-twin-tag">{tr('Store Mirror', 'स्टोर मिरर')}</span>
            <h3>{tr('Live retail snapshot', 'लाइव रिटेल स्नैपशॉट')}</h3>
            <p>{tr('Use this view to monitor sales momentum, stock pressure, and your top-selling product in one place.', 'इस व्यू से बिक्री की गति, स्टॉक दबाव और सबसे ज्यादा बिकने वाले प्रोडक्ट को एक ही जगह देखें।')}</p>
          </div>
        </div>

        <div className="digital-twin-grid">
          <div className="digital-twin-card">
            <span>{tr('Revenue in current view', 'वर्तमान व्यू में राजस्व')}</span>
            <strong>{formatPrice(latestRevenue)}</strong>
            <small>{statsPeriod === 'day' ? tr('Recent days', 'हाल के दिन') : tr('Selected reporting window', 'चयनित रिपोर्टिंग विंडो')}</small>
          </div>
          <div className="digital-twin-card">
            <span>{tr('Top product', 'टॉप प्रोडक्ट')}</span>
            <strong>{topProduct?.name || tr('No sales yet', 'अभी बिक्री नहीं')}</strong>
            <small>{topProduct ? (language === 'hi' ? `${topProduct.totalQuantity} यूनिट्स बिकीं` : `${topProduct.totalQuantity} units sold`) : tr('Start billing to see product demand', 'प्रोडक्ट मांग देखने के लिए बिलिंग शुरू करें')}</small>
          </div>
          <div className="digital-twin-card">
            <span>{tr('Low stock pressure', 'कम स्टॉक दबाव')}</span>
            <strong>{lowStockCount}</strong>
            <small>{lowStockCount > 0 ? tr('Items need restocking soon', 'आइटम्स को जल्द रीस्टॉक करना होगा') : tr('Inventory looks healthy', 'इन्वेंट्री स्वस्थ दिख रही है')}</small>
          </div>
        </div>

        <div className="agent-card">
          <h3>{tr('Operational Controls', 'ऑपरेशनल कंट्रोल्स')}</h3>
          <div className="form-row" style={{ marginTop: '12px' }}>
            <button className="btn btn-primary" type="button" onClick={() => setActiveTab('transactions')}>
              <BarChart3 size={16} />
              {tr('Open Reports', 'रिपोर्ट्स खोलें')}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setActiveTab('manageProducts')}>
              <Package size={16} />
              {tr('Review Stock', 'स्टॉक देखें')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddProduct = () => (
    <div className="add-product">
      <h2>{tr('Add New Product', 'नया प्रोडक्ट जोड़ें')}</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>{tr('Product Name', 'प्रोडक्ट नाम')}</label>
          <input
            type="text"
            value={form.name}
            onChange={handleInputChange}
            name="name"
            required
            className="form-control"
            placeholder={tr('Enter product name', 'प्रोडक्ट नाम दर्ज करें')}
            style={{ color: '#333', backgroundColor: 'white' }}
          />
        </div>

        <div className="form-group">
          <label>{tr('Category', 'श्रेणी')}</label>
          <select
            value={form.category}
            onChange={handleInputChange}
            name="category"
            required
            className="form-control"
            style={{ color: '#333', backgroundColor: 'white' }}
          >
            <option value="">{tr('Select Category', 'श्रेणी चुनें')}</option>
            {categories.map(category => (
              <option key={category} value={category}>{getCategoryLabel(category)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{tr('Description', 'विवरण')}</label>
          <textarea
            value={form.description}
            onChange={handleInputChange}
            name="description"
            required
            className="form-control"
            rows="3"
            placeholder={tr('Enter product description', 'प्रोडक्ट विवरण दर्ज करें')}
            style={{ color: '#333', backgroundColor: 'white' }}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (₹)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={handleInputChange}
              name="price"
              required
              className="form-control"
              placeholder="0.00"
              style={{ color: '#333', backgroundColor: 'white' }}
            />
          </div>

          <div className="form-group">
            <label>{tr('Stock Quantity', 'स्टॉक मात्रा')}</label>
            <input
              type="number"
              value={form.quantity}
              onChange={handleInputChange}
              name="quantity"
              required
              className="form-control"
              placeholder="0"
              style={{ color: '#333', backgroundColor: 'white' }}
            />
          </div>
        </div>

        {isConsumableCategory(form.category) && (
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={handleInputChange}
              name="expiry_date"
              required
              className="form-control"
              style={{ color: '#333', backgroundColor: 'white' }}
            />
          </div>
        )}

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.GST_applicable}
              onChange={handleInputChange}
              name="GST_applicable"
            />
            {tr('GST Applicable', 'GST लागू')}
          </label>
        </div>

        <div className="form-group">
          <label>{tr('Product Image', 'प्रोडक्ट इमेज')}</label>
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="form-control"
            name="image"
            style={{ color: '#333', backgroundColor: 'white' }}
          />
        </div>

        <div className="modal-footer">
          <button type="submit" className="btn btn-primary">
            {tr('Add Product', 'प्रोडक्ट जोड़ें')}
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{tr('Loading admin dashboard...', 'एडमिन डैशबोर्ड लोड हो रहा है...')}</p>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <header className="app-topbar">
        {activeTab !== 'dashboard' ? (
          <button className="topbar-back-btn" onClick={() => setActiveTab('dashboard')} aria-label="Back to dashboard">
            <ArrowLeft size={17} />
            <span>{tr('Back', 'वापस')}</span>
          </button>
        ) : (
          <span className="app-brand" aria-label="DukaanSaathi">
            <span className="brand-dukaan">Dukaan</span>
            <span className="brand-saathi">Saathi</span>
          </span>
        )}
        <div className="app-topbar-right">
          <NotificationBell />
          <div className="avatar-circle">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'dashboard' && HomeScreen()}
        {activeTab === 'digitalTwin' && DigitalTwin()}
        {activeTab === 'manageProducts' && ManageProducts()}
        {activeTab === 'addProduct' && AddProduct()}
        {activeTab === 'billing' && Billing()}
        {activeTab === 'transactions' && Transactions()}
        {activeTab === 'financeAI' && FinanceAI()}
        {activeTab === 'marketingAI' && MarketingAI()}
        {activeTab === 'scanner' && ScannerHub()}
      </main>

      <nav className="app-bottom-nav">
        <button onClick={() => setActiveTab('dashboard')} className={`bnav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <Home size={20} /><span>{tr('Home', 'होम')}</span>
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`bnav-item ${activeTab === 'transactions' ? 'active' : ''}`}>
          <BarChart3 size={20} /><span>{tr('Reports', 'रिपोर्ट्स')}</span>
        </button>
        <button onClick={() => setActiveTab('manageProducts')} className={`bnav-item ${activeTab === 'manageProducts' ? 'active' : ''}`}>
          <Package size={20} /><span>{tr('Stock', 'स्टॉक')}</span>
        </button>
        <button onClick={() => setActiveTab('scanner')} className={`bnav-item ${activeTab === 'scanner' ? 'active' : ''}`}>
          <ScanLine size={20} /><span>{tr('Scanner', 'स्कैनर')}</span>
        </button>
        <button onClick={() => setActiveTab('financeAI')} className={`bnav-item ${activeTab === 'financeAI' ? 'active' : ''}`}>
          <Settings size={20} /><span>{tr('Finance', 'फाइनेंस')}</span>
        </button>
      </nav>

      <div className="floating-action-rail" aria-label="Quick mobile actions">
        <button
          type="button"
          className="floating-action-btn floating-twin-btn"
          onClick={() => setActiveTab('digitalTwin')}
          aria-label="View digital twin"
        >
          <Cuboid size={17} />
          <span>{tr('View Digital Twin', 'डिजिटल ट्विन देखें')}</span>
        </button>
        <button
          type="button"
          className="floating-action-btn floating-add-btn"
          onClick={() => setShowBillingModal(true)}
          aria-label="Create bill"
        >
          <Plus size={24} />
        </button>
      </div>

      {showScannerCamera && (
        <div className="scanner-camera-overlay" onClick={closeScannerCamera}>
          <div className="scanner-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-camera-head">
              <h3>{tr('Capture Product', 'प्रोडक्ट कैप्चर करें')}</h3>
              <button className="modal-close" onClick={closeScannerCamera} aria-label="Close scanner camera">
                <X size={22} />
              </button>
            </div>
            <video ref={videoRef} className="scanner-camera-preview" autoPlay playsInline muted />
            {cameraError && <p className="scanner-camera-error">{cameraError}</p>}
            <div className="scanner-camera-actions">
              <button className="btn btn-outline" onClick={closeScannerCamera}>{tr('Cancel', 'रद्द करें')}</button>
              <button className="btn btn-primary" onClick={captureScannerFrame} disabled={scanInProgress}>
                {scanInProgress ? tr('Processing...', 'प्रोसेस हो रहा है...') : tr('Capture & Scan', 'कैप्चर और स्कैन')}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? tr('Edit Product', 'प्रोडक्ट संपादित करें') : tr('Add New Product', 'नया प्रोडक्ट जोड़ें')}</h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                  <label>{tr('Product Name', 'प्रोडक्ट नाम')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleInputChange}
                  name="name"
                  required
                  className="form-control"
                  placeholder="Enter product name"
                  style={{ color: '#333', backgroundColor: 'white' }}
                />
              </div>

              <div className="form-group">
                  <label>{tr('Category', 'श्रेणी')}</label>
                <select
                  value={form.category}
                  onChange={handleInputChange}
                  name="category"
                  required
                  className="form-control"
                  style={{ color: '#333', backgroundColor: 'white' }}
                >
                  <option value="">{tr('Select Category', 'श्रेणी चुनें')}</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{getCategoryLabel(category)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                  <label>{tr('Description', 'विवरण')}</label>
                <textarea
                  value={form.description}
                  onChange={handleInputChange}
                  name="description"
                  required
                  className="form-control"
                  rows="3"
                  placeholder="Enter product description"
                  style={{ color: '#333', backgroundColor: 'white' }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={handleInputChange}
                    name="price"
                    required
                    className="form-control"
                    placeholder="0.00"
                    style={{ color: '#333', backgroundColor: 'white' }}
                  />
                </div>

                <div className="form-group">
                  <label>{tr('Stock Quantity', 'स्टॉक मात्रा')}</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={handleInputChange}
                    name="quantity"
                    required
                    className="form-control"
                    placeholder="0"
                    style={{ color: '#333', backgroundColor: 'white' }}
                  />
                </div>
              </div>

              {isConsumableCategory(form.category) && (
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={handleInputChange}
                    name="expiry_date"
                    required
                    className="form-control"
                    style={{ color: '#333', backgroundColor: 'white' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.GST_applicable}
                    onChange={handleInputChange}
                    name="GST_applicable"
                  />
                  {tr('GST Applicable', 'GST लागू')}
                </label>
              </div>

              <div className="form-group">
                <label>{tr('Product Image', 'प्रोडक्ट इमेज')}</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="form-control"
                  name="image"
                  style={{ color: '#333', backgroundColor: 'white' }}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="btn btn-secondary"
                >
                  {tr('Cancel', 'रद्द करें')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? tr('Update Product', 'प्रोडक्ट अपडेट करें') : tr('Add Product', 'प्रोडक्ट जोड़ें')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {showBillingModal && (() => {
        const { subtotal, gstAmount, total } = calculateBillingTotal();
        return (
          <div className="modal-overlay" onClick={() => setShowBillingModal(false)}>
            <div className="modal-content billing-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{tr('Create New Bill', 'नया बिल बनाएं')}</h2>
                <button
                  onClick={() => setShowBillingModal(false)}
                  className="modal-close"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleBillingSubmit} className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>{tr('Customer Name *', 'ग्राहक का नाम *')}</label>
                    <input
                      type="text"
                      value={billingForm.customerName}
                      onChange={(e) => setBillingForm({ ...billingForm, customerName: e.target.value })}
                      name="customerName"
                      required
                      className="form-control"
                      placeholder={tr('Enter customer name', 'ग्राहक का नाम दर्ज करें')}
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>{tr('Sale Date *', 'बिक्री तिथि *')}</label>
                    <input
                      type="date"
                      value={billingForm.sale_date}
                      onChange={(e) => setBillingForm({ ...billingForm, sale_date: e.target.value })}
                      name="sale_date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="form-control"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{tr('Customer Phone', 'ग्राहक फोन')}</label>
                    <input
                      type="text"
                      value={billingForm.customerPhone}
                      onChange={(e) => setBillingForm({ ...billingForm, customerPhone: e.target.value })}
                      name="customerPhone"
                      className="form-control"
                      placeholder={tr('Enter customer phone', 'ग्राहक फोन दर्ज करें')}
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>{tr('Customer Email', 'ग्राहक ईमेल')}</label>
                    <input
                      type="email"
                      value={billingForm.customerEmail}
                      onChange={(e) => setBillingForm({ ...billingForm, customerEmail: e.target.value })}
                      name="customerEmail"
                      className="form-control"
                      placeholder={tr('Enter customer email', 'ग्राहक ईमेल दर्ज करें')}
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{tr('Payment Method', 'भुगतान विधि')}</label>
                    <select
                      value={billingForm.paymentMethod}
                      onChange={(e) => setBillingForm({ ...billingForm, paymentMethod: e.target.value })}
                      name="paymentMethod"
                      className="form-control"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    >
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>
                          {getPaymentMethodLabel(method)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={billingForm.applyGST}
                        onChange={(e) => setBillingForm({ ...billingForm, applyGST: e.target.checked })}
                        name="applyGST"
                      />
                      {tr('Apply GST (18%)', 'GST लागू करें (18%)')}
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>{tr('Add Products', 'प्रोडक्ट जोड़ें')}</label>
                  <div className="products-selector">
                    <select
                      onChange={(e) => {
                        const productId = e.target.value;
                        if (productId) {
                          const product = products.find(p => p.productID === parseInt(productId));
                          if (product) {
                            addItemToBilling(product);
                          }
                          e.target.value = '';
                        }
                      }}
                      className="form-control"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    >
                      <option value="">{tr('Select a product to add', 'जोड़ने के लिए प्रोडक्ट चुनें')}</option>
                      {products.map(product => (
                        <option key={product.productID} value={product.productID}>
                          {product.name} - ₹{product.price} ({tr('Stock', 'स्टॉक')}: {product.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>{tr('Bill Items', 'बिल आइटम्स')}</label>
                  <div className="items-list">
                    {billingForm.items.length === 0 ? (
                      <p className="no-items">{tr('No items added yet. Select products above to add them.', 'अभी कोई आइटम नहीं जोड़ा गया। ऊपर से प्रोडक्ट चुनें।')}</p>
                    ) : (
                      billingForm.items.map(item => (
                        <div key={item.productID} className="item-row">
                          <div className="item-info">
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">₹{item.price} {tr('each', 'प्रति')}</span>
                          </div>
                          <div className="item-quantity">
                            <button
                              type="button"
                              onClick={() => updateBillingItemQuantity(item.productID, item.quantity - 1)}
                              className="qty-btn"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateBillingItemQuantity(item.productID, Number(e.target.value))}
                              min="1"
                              className="qty-input"
                              style={{ color: '#333', backgroundColor: 'white' }}
                            />
                            <button
                              type="button"
                              onClick={() => updateBillingItemQuantity(item.productID, item.quantity + 1)}
                              className="qty-btn"
                            >
                              +
                            </button>
                          </div>
                          <div className="item-total">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {billingForm.items.length > 0 && (
                  <div className="bill-summary">
                    <div className="summary-row">
                      <span>{tr('Subtotal:', 'उप-योग:')}</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {billingForm.applyGST && (
                      <div className="summary-row">
                        <span>{tr('GST (18%):', 'GST (18%):')}</span>
                        <span>{formatPrice(gstAmount)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>{tr('Total:', 'कुल:')}</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>{tr('Notes', 'नोट्स')}</label>
                  <textarea
                    value={billingForm.notes}
                    onChange={(e) => setBillingForm({ ...billingForm, notes: e.target.value })}
                    name="notes"
                    className="form-control"
                    rows="3"
                    placeholder={tr('Any additional notes...', 'कोई अतिरिक्त नोट्स...')}
                    style={{ color: '#333', backgroundColor: 'white' }}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowBillingModal(false)}
                    className="btn btn-secondary"
                  >
                    {tr('Cancel', 'रद्द करें')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={billingForm.items.length === 0}
                  >
                    {tr('Generate Bill', 'बिल बनाएं')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* Bill Modal */}
      {showBillModal && selectedBill && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal-content bill-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bill #{selectedBill.billID}</h2>
              <button
                onClick={() => setShowBillModal(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bill-content">
              <pre>{generateBillContent(selectedBill)}</pre>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowBillModal(false)}
                className="btn btn-secondary"
              >
                {tr('Close', 'बंद करें')}
              </button>
              <button
                onClick={() => downloadBill(selectedBill)}
                className="btn btn-primary"
              >
                <Download size={16} />
                {tr('Download Bill', 'बिल डाउनलोड करें')}
              </button>
              <button
                onClick={() => printBill(selectedBill)}
                className="btn btn-primary"
              >
                <Printer size={16} />
                {tr('Print Bill', 'बिल प्रिंट करें')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin; 