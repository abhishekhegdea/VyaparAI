import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, List, BarChart3, Receipt, Users, X, Download, Printer, FileText, TrendingUp, Package, DollarSign, AlertTriangle, Calendar, Clock, Megaphone, Calculator, Bell, Home, Settings, ArrowLeft, ScanLine, FileSearch } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { apiService } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
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
      content: 'Hi, I am Ask VyaparAI. I can help only with this website: login/register, products, inventory, billing, reports, Marketing AI, and Finance AI.'
    }
  ]);
  const [taxAlert, setTaxAlert] = useState(null);
  const [financeInput, setFinanceInput] = useState({
    annualRevenue: '',
    annualExpenses: '',
    inputGstCredit: '',
    annualTaxableIncome: '',
    gstRate: '0.18',
    regime: 'new'
  });
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
  const videoRef = useRef(null);

  const categories = ['Stationaries', 'Fancy Items', 'Toys', 'Gifts', 'Beverages', 'Food'];
  const paymentMethods = ['cash', 'card', 'upi', 'bank_transfer'];

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
        showToast('You are not authorized to view this page.', 'error');
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
      showToast('Failed to load products', 'error');
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
      showToast('Failed to fetch dashboard stats', 'error');
    }
  };

  const checkLowStock = () => {
    const lowStock = products.filter(product => product.quantity <= 5);
    
    if (lowStock.length > 0) {
      notifyOncePerSession('lowStockToastShown', `${lowStock.length} items are running low on stock!`, 'warning');
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
      showToast('Failed to load bills', 'error');
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
      showToast('Failed to load sales analytics', 'error');
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
          showToast('Selected product no longer exists. Switched to first available product.', 'warning');
          return;
        }
      }

      showToast('Failed to generate ARIMA forecast', 'error');
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
        showToast('Product updated successfully', 'success');
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
        showToast('Product added successfully', 'success');
      }
      fetchProducts();
      resetForm();
      setShowProductModal(false);
    } catch (error) {
      console.error('Form submission error:', error);
      showToast('Failed to submit product', 'error');
    }
  };

  const generateMarketingAdvice = async (product = latestAddedProduct, style = photoStyle) => {
    if (!product) {
      showToast('Add or select a product first to generate marketing strategy', 'warning');
      return;
    }

    try {
      setAgentLoading(true);
      const response = await apiService.getMarketingAdvice({ product, photoStyle: style });
      setMarketingAdvice(response.data.advice);
      showToast('Marketing AI strategy generated', 'success');
    } catch (error) {
      console.error('Marketing AI error:', error);
      showToast('Failed to generate marketing advice', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  const runFinanceAdvisor = async (e) => {
    e.preventDefault();

    try {
      setAgentLoading(true);
      const payload = {
        annualRevenue: Number(financeInput.annualRevenue || 0),
        annualExpenses: Number(financeInput.annualExpenses || 0),
        inputGstCredit: Number(financeInput.inputGstCredit || 0),
        annualTaxableIncome: financeInput.annualTaxableIncome ? Number(financeInput.annualTaxableIncome) : undefined,
        gstRate: Number(financeInput.gstRate || 0.18),
        regime: financeInput.regime
      };

      const response = await apiService.getFinanceAdvice(payload);
      setFinanceAdvice(response.data.advice);
      showToast('Finance AI advisory ready', 'success');
    } catch (error) {
      console.error('Finance AI error:', error);
      showToast('Failed to generate financial advice', 'error');
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
      const answer = response?.data?.answer || 'I could not answer that right now.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      console.error('Website chatbot error:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, Ask VyaparAI is unavailable right now. Please try again.'
        }
      ]);
      showToast('Ask VyaparAI is temporarily unavailable', 'error');
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
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiService.deleteProduct(productId);
        showToast('Product deleted successfully', 'success');
        fetchProducts();
      } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete product', 'error');
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
    a.download = `VyaparAI_Bill_${bill.billID}_${new Date().toISOString().split('T')[0]}.txt`;
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
          <title>VyaparAI - Bill #${bill.billID}</title>
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
              <h1 class="bill-title">VYAPARAI</h1>
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
              <p>Thank you for shopping with VyaparAI!</p>
              <p>Visit us again for more amazing products</p>
              <p>Contact: +91 XXXXXXXXXX | Email: info@vyaparai.com</p>
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
║                    VYAPARAI                       ║
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
║  Thank you for shopping with VyaparAI!           ║
║  Visit us again for more amazing products!                 ║
║                                                              ║
║  Contact: +91 XXXXXXXXXX | Email: info@vyaparai.com         ║
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
      if (h < 12) return 'Good Morning';
      if (h < 17) return 'Good Afternoon';
      return 'Good Evening';
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
      ? 'Last 14 days'
      : statsPeriod === 'week'
        ? 'Last 12 weeks'
        : statsPeriod === 'month'
          ? 'Last 12 months'
          : 'Last 5 years';

    return (
      <div className="home-screen">
        <div className="dashboard-hero-shell">
          <ThreeSceneBackground className="dashboard-hero-scene" />
          <div className="dashboard-hero-overlay" />
          <div className="dashboard-hero-content">
            <div className="greeting-section dashboard-hero-copy">
              <span className="dashboard-hero-tag">Retail command center</span>
              <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
              <p>Track revenue, identify your most selling products, and predict demand before stock runs low.</p>
            </div>

            <div className="dashboard-hero-metrics">
              <div className="hero-metric-card">
                <span className="hero-metric-label">Analytics Window</span>
                <strong>{trendHeadline}</strong>
                <small>{rangeItems} items sold</small>
              </div>
              <div className="hero-metric-card">
                <span className="hero-metric-label">Revenue in View</span>
                <strong>₹{rangeRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                <small>{trendSeries.length} plotted points</small>
              </div>
              <div className="hero-metric-card">
                <span className="hero-metric-label">Top Product</span>
                <strong>{topProduct?.name || 'Waiting for sales'}</strong>
                <small>{topProduct ? `${topProduct.totalQuantity} units sold` : 'No transactions yet'}</small>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-cards-list">
          <div className="stat-card-item">
            <div className="sci-icon teal"><DollarSign size={20} /></div>
            <div className="sci-body">
              <span className="sci-label">Today&apos;s Sales</span>
              <span className="sci-value">₹{stats.todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <span className="sci-badge green">+12%</span>
          </div>
          <div className="stat-card-item">
            <div className="sci-icon blue"><Users size={20} /></div>
            <div className="sci-body">
              <span className="sci-label">Customers Today</span>
              <span className="sci-value">{stats.totalBills}</span>
            </div>
            <span className="sci-badge green">+5%</span>
          </div>
          <div className="stat-card-item">
            <div className="sci-icon red"><AlertTriangle size={20} /></div>
            <div className="sci-body">
              <span className="sci-label">Low Stock Items</span>
              <span className="sci-value">{stats.lowStockItems?.length || 0} items</span>
            </div>
            <span className="sci-badge red">Alert</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Sales Trend</h3>
            <div className="range-toggle">
              <button className={`range-btn ${statsPeriod === 'day' ? 'active' : ''}`} onClick={() => setStatsPeriod('day')}>Day</button>
              <button className={`range-btn ${statsPeriod === 'week' ? 'active' : ''}`} onClick={() => setStatsPeriod('week')}>Week</button>
              <button className={`range-btn ${statsPeriod === 'month' ? 'active' : ''}`} onClick={() => setStatsPeriod('month')}>Month</button>
              <button className={`range-btn ${statsPeriod === 'year' ? 'active' : ''}`} onClick={() => setStatsPeriod('year')}>Year</button>
            </div>
          </div>

          {analyticsLoading ? (
            <p className="chart-empty">Loading sales charts...</p>
          ) : trendSeries.length === 0 ? (
            <p className="chart-empty">No sales data available yet.</p>
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
            <h3>Most Selling Products</h3>
          </div>
          {topSellingChartData.length === 0 ? (
            <p className="chart-empty">Top products will appear after sales start.</p>
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
            <h3>Hybrid ARIMA + SARIMA Forecast</h3>
          </div>

          <div className="forecast-controls">
            <select
              className="form-control"
              value={forecastProductID}
              onChange={(e) => setForecastProductID(e.target.value)}
            >
              <option value="">Select product</option>
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
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={21}>Next 21 days</option>
              <option value={30}>Next 30 days</option>
            </select>

            <button
              className="btn btn-primary"
              type="button"
              onClick={() => fetchProductForecast(forecastProductID, forecastHorizon)}
              disabled={forecastLoading || !forecastProductID}
            >
              {forecastLoading ? 'Predicting...' : 'Run Hybrid Forecast'}
            </button>
          </div>

          {productForecast && (
            <div className="forecast-summary">
              <p>
                <strong>{productForecast.productName}</strong> | Method: {productForecast.method} | Suggested stock for next {productForecast.horizonDays} days:
                {' '}<strong>{productForecast.suggestedStock} items</strong>
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
            <p className="chart-empty">Select a product and run hybrid forecast to view demand prediction.</p>
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
              <strong>Latest AI Product Photo</strong>
              <button className="btn btn-outline btn-small" onClick={() => setActiveTab('marketingAI')}>
                Open Marketing AI
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
              {marketingAdvice.productSnapshot?.name || 'Product'} • {marketingAdvice.creative?.selectedStyle || 'studio-white'}
            </p>
          </div>
          );
        })()}

        <div className="ai-banner" onClick={() => setActiveTab('marketingAI')} role="button" tabIndex={0} onKeyDown={() => {}}>
          <div className="ai-banner-text">
            <strong>Ask VyaparAI</strong>
            <p>Get instant answers about your inventory, sales, and more.</p>
            <button className="btn-ask" onClick={(e) => { e.stopPropagation(); setActiveTab('marketingAI'); }}>Ask Now</button>
          </div>
          <div className="ai-banner-bot">🤖</div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="qa-grid">
            <button className="qa-card" onClick={() => setShowBillingModal(true)}>
              <div className="qa-card-icon"><Receipt size={22} /></div>
              <span>Create Bill</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('manageProducts')}>
              <div className="qa-card-icon"><Package size={22} /></div>
              <span>Inventory</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('transactions')}>
              <div className="qa-card-icon"><BarChart3 size={22} /></div>
              <span>Sales Analytics</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('billing')}>
              <div className="qa-card-icon"><List size={22} /></div>
              <span>Billing History</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('manageProducts')}>
              <div className="qa-card-icon"><AlertTriangle size={22} /></div>
              <span>Expiry Alerts</span>
            </button>
            <button className="qa-card" onClick={() => setActiveTab('addProduct')}>
              <div className="qa-card-icon"><Users size={22} /></div>
              <span>New Customer</span>
            </button>
            <button className="qa-card" onClick={handleDesktopScan} disabled={scanInProgress}>
              <div className="qa-card-icon"><ScanLine size={22} /></div>
              <span>{scanInProgress ? 'Scanning...' : 'Scan Product'}</span>
            </button>
            <button className="qa-card" onClick={handleScannerReport} disabled={scannerReportLoading}>
              <div className="qa-card-icon"><FileSearch size={22} /></div>
              <span>{scannerReportLoading ? 'Generating...' : 'Scan Report'}</span>
            </button>
          </div>
        </div>

        {(latestScanResult || latestScannerReport) && (
          <div className="analytics-card">
            <div className="analytics-head">
              <h3>Scanner Output</h3>
            </div>
            {latestScanResult && (
              <div className="scanner-output-block">
                <h4>Latest Scan JSON</h4>
                <pre>{JSON.stringify(latestScanResult, null, 2)}</pre>
              </div>
            )}
            {latestScannerReport && (
              <div className="scanner-output-block">
                <h4>Latest Report</h4>
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
        <h2>Manage Products</h2>
        <button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowProductModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>GST</th>
              <th>Actions</th>
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
                    <div className="no-image">No Image</div>
                  )}
                </td>
                <td>
                  <div className="product-info">
                    <strong>{product.name}</strong>
                    <small>{product.description}</small>
                    {product.expiry_date && (
                      <small className="expiry-meta">Expiry: {new Date(product.expiry_date).toLocaleDateString('en-IN')}</small>
                    )}
                  </div>
                </td>
                <td>{product.category}</td>
                <td>{formatPrice(product.price)}</td>
                <td>
                  <span className={`stock ${getStockStatus(product.quantity)}`}>
                    {product.quantity}
                  </span>
                </td>
                <td>
                  {product.GST_applicable ? (
                    <span className="gst-badge">Yes</span>
                  ) : (
                    <span className="no-gst">No</span>
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
          <h2>Admin Billing</h2>
          <button
            onClick={() => setShowBillingModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create New Bill
          </button>
        </div>

        <div className="bills-list">
          <h3>All Bills</h3>
          <div className="bills-table">
            <table>
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allBills.map(bill => {
                  const { subtotal, gstAmount, total } = calculateBillTotal(bill);
                  return (
                    <tr key={bill.billID}>
                      <td>#{bill.billID}</td>
                      <td>{bill.customerName || 'Walk-in Customer'}</td>
                      <td>{bill.items ? bill.items.length : 0} items</td>
                      <td>{formatPrice(subtotal)}</td>
                      <td>{bill.applyGST ? formatPrice(gstAmount) : 'N/A'}</td>
                      <td>{formatPrice(total)}</td>
                      <td>{bill.paymentMethod || 'Cash'}</td>
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
        <h2>Reports & Visualizations</h2>

        <div className="analytics-card">
          <div className="analytics-head">
            <h3>Sales Trend</h3>
            <div className="range-toggle">
              <button className={`range-btn ${statsPeriod === 'day' ? 'active' : ''}`} onClick={() => setStatsPeriod('day')}>Day</button>
              <button className={`range-btn ${statsPeriod === 'week' ? 'active' : ''}`} onClick={() => setStatsPeriod('week')}>Week</button>
              <button className={`range-btn ${statsPeriod === 'month' ? 'active' : ''}`} onClick={() => setStatsPeriod('month')}>Month</button>
              <button className={`range-btn ${statsPeriod === 'year' ? 'active' : ''}`} onClick={() => setStatsPeriod('year')}>Year</button>
            </div>
          </div>

          {analyticsLoading ? (
            <p className="chart-empty">Loading sales charts...</p>
          ) : trendSeries.length === 0 ? (
            <p className="chart-empty">No sales data available yet.</p>
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
            <h3>Most Selling Products</h3>
          </div>

          {topSellingChartData.length === 0 ? (
            <p className="chart-empty">Top products will appear after sales start.</p>
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

        <h2 style={{ marginTop: 20 }}>Transaction History</h2>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.date).toLocaleDateString()}</td>
                  <td>#{transaction.id}</td>
                  <td>{transaction.customer}</td>
                  <td>{transaction.items} items</td>
                  <td>{formatPrice(transaction.amount)}</td>
                  <td>{transaction.paymentMethod}</td>
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
        <h2>Marketing Agent AI</h2>
        <button
          className="btn btn-primary"
          onClick={() => generateMarketingAdvice()}
          disabled={agentLoading}
        >
          <Megaphone size={16} />
          {agentLoading ? 'Generating...' : 'Generate Strategy'}
        </button>
      </div>

      {latestAddedProduct && (
        <div className="agent-card">
          <p><strong>Latest Product:</strong> {latestAddedProduct.name} ({latestAddedProduct.category})</p>
          <p><strong>Price:</strong> {formatPrice(Number(latestAddedProduct.price || 0))}</p>
          <p><strong>Stock:</strong> {latestAddedProduct.quantity}</p>
          <div className="form-row" style={{ marginTop: '10px' }}>
            <div className="form-group">
              <label>Photo Style</label>
              <select className="form-control" value={photoStyle} onChange={(e) => setPhotoStyle(e.target.value)}>
                <option value="studio-white">Studio White</option>
                <option value="dark-luxury">Dark Luxury</option>
                <option value="lifestyle-desk">Lifestyle Desk</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => generateMarketingAdvice(latestAddedProduct, photoStyle)}
                disabled={agentLoading}
              >
                Regenerate Product Photo
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
              <h4>AI Product Photography</h4>
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

          <h4>Recommended Channels</h4>
          <ul className="agent-list">
            {(marketingAdvice.strategy?.channels || []).map((channel) => (
              <li key={channel}>{channel}</li>
            ))}
          </ul>

          <h4>Offer Ideas</h4>
          <ul className="agent-list">
            {(marketingAdvice.strategy?.offers || []).map((offer) => (
              <li key={offer}>{offer}</li>
            ))}
          </ul>

          <h4>Content Ideas</h4>
          <ul className="agent-list">
            {(marketingAdvice.strategy?.contentIdeas || []).map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="agent-card empty-state">
          <p>Add a product and generate a marketing strategy to see campaign suggestions here.</p>
        </div>
      )}

      <div className="agent-card chatbot-card">
        <h3>Ask VyaparAI</h3>
        <p className="chatbot-subtitle">Website help only. Ask about features, workflows, and troubleshooting in this app.</p>

        <div className="chatbot-window">
          {chatMessages.map((msg, idx) => (
            <div key={`${msg.role}-${idx}`} className={`chat-msg ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {chatLoading && <div className="chat-msg assistant">Thinking...</div>}
        </div>

        <form className="chatbot-form" onSubmit={askWebsiteAssistant}>
          <input
            type="text"
            className="form-control"
            placeholder="Ask about VyaparAI website usage"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={500}
          />
          <button type="submit" className="btn btn-primary" disabled={chatLoading || !chatInput.trim()}>
            Ask
          </button>
        </form>
      </div>
    </div>
  );

  const FinanceAI = () => (
    <div className="agent-section">
      <div className="agent-header">
        <h2>Finance Agent AI (India GST + Income Tax)</h2>
      </div>

      <form className="agent-form" onSubmit={runFinanceAdvisor}>
        <div className="form-row">
          <div className="form-group">
            <label>Annual Revenue (INR)</label>
            <input
              type="number"
              className="form-control"
              value={financeInput.annualRevenue}
              onChange={(e) => setFinanceInput({ ...financeInput, annualRevenue: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Annual Expenses (INR)</label>
            <input
              type="number"
              className="form-control"
              value={financeInput.annualExpenses}
              onChange={(e) => setFinanceInput({ ...financeInput, annualExpenses: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Input GST Credit (INR)</label>
            <input
              type="number"
              className="form-control"
              value={financeInput.inputGstCredit}
              onChange={(e) => setFinanceInput({ ...financeInput, inputGstCredit: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>GST Rate</label>
            <select
              className="form-control"
              value={financeInput.gstRate}
              onChange={(e) => setFinanceInput({ ...financeInput, gstRate: e.target.value })}
            >
              <option value="0">0%</option>
              <option value="0.05">5%</option>
              <option value="0.12">12%</option>
              <option value="0.18">18%</option>
              <option value="0.28">28%</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Income Tax Regime</label>
            <select
              className="form-control"
              value={financeInput.regime}
              onChange={(e) => setFinanceInput({ ...financeInput, regime: e.target.value })}
            >
              <option value="new">New Regime</option>
              <option value="old">Old Regime</option>
            </select>
          </div>
          <div className="form-group">
            <label>Taxable Income Override (Optional)</label>
            <input
              type="number"
              className="form-control"
              value={financeInput.annualTaxableIncome}
              onChange={(e) => setFinanceInput({ ...financeInput, annualTaxableIncome: e.target.value })}
              placeholder="Leave empty to use Revenue - Expenses"
            />
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '8px' }}>
          <button type="submit" className="btn btn-primary" disabled={agentLoading}>
            <Calculator size={16} />
            {agentLoading ? 'Calculating...' : 'Run Finance Agent'}
          </button>
        </div>
      </form>

      {financeAdvice && (
        <div className="agent-card">
          <h3>Estimated Tax Output</h3>
          <p><strong>Estimated Profit:</strong> {formatPrice(Number(financeAdvice.summary?.estimatedProfit || 0))}</p>
          <p><strong>GST Output:</strong> {formatPrice(Number(financeAdvice.gst?.outputGst || 0))}</p>
          <p><strong>Input GST Credit:</strong> {formatPrice(Number(financeAdvice.gst?.inputGstCredit || 0))}</p>
          <p><strong>Net GST Payable:</strong> {formatPrice(Number(financeAdvice.gst?.netPayableGst || 0))}</p>
          <p><strong>Estimated Income Tax:</strong> {formatPrice(Number(financeAdvice.incomeTax?.estimatedTotalIncomeTax || 0))}</p>
          <p><strong>Regime:</strong> {financeAdvice.incomeTax?.regime?.toUpperCase()}</p>

          <h4>Compliance Checklist</h4>
          <ul className="agent-list">
            {(financeAdvice.complianceChecklist || []).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <p className="agent-disclaimer">{financeAdvice.disclaimer}</p>
        </div>
      )}
    </div>
  );

  const ScannerHub = () => (
    <div className="agent-section">
      <div className="agent-header">
        <h2>Product Scanner</h2>
      </div>

      <div className="agent-card">
        <p>Use your webcam to scan product labels and store structured JSON in sales.json.</p>
        <div className="form-row" style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" type="button" onClick={handleDesktopScan} disabled={scanInProgress}>
            <ScanLine size={16} />
            {scanInProgress ? 'Processing...' : 'Scan Product'}
          </button>
          <button className="btn btn-outline" type="button" onClick={handleScannerReport} disabled={scannerReportLoading}>
            <FileSearch size={16} />
            {scannerReportLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        <p className="agent-disclaimer">Tip: Open camera, align label, then tap Capture &amp; Scan.</p>
      </div>

      {(latestScanResult || latestScannerReport) && (
        <div className="agent-card">
          <h3>Scanner Output</h3>

          {latestScanResult && (
            <div className="scanner-output-block">
              <h4>Latest Scan JSON</h4>
              <pre>{JSON.stringify(latestScanResult, null, 2)}</pre>
            </div>
          )}

          {latestScannerReport && (
            <div className="scanner-output-block">
              <h4>Latest Report</h4>
              <p>{latestScannerReport}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const AddProduct = () => (
    <div className="add-product">
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Product Name</label>
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
          <label>Category</label>
          <select
            value={form.category}
            onChange={handleInputChange}
            name="category"
            required
            className="form-control"
            style={{ color: '#333', backgroundColor: 'white' }}
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
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
            <label>Stock Quantity</label>
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
            GST Applicable
          </label>
        </div>

        <div className="form-group">
          <label>Product Image</label>
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
            Add Product
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <header className="app-topbar">
        {activeTab !== 'dashboard' ? (
          <button className="topbar-back-btn" onClick={() => setActiveTab('dashboard')} aria-label="Back to dashboard">
            <ArrowLeft size={17} />
            <span>Back</span>
          </button>
        ) : (
          <span className="app-brand">VyaparAI</span>
        )}
        <div className="app-topbar-right">
          <NotificationBell />
          <div className="avatar-circle">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'dashboard' && HomeScreen()}
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
          <Home size={20} /><span>Home</span>
        </button>
        <button onClick={() => setActiveTab('transactions')} className={`bnav-item ${activeTab === 'transactions' ? 'active' : ''}`}>
          <BarChart3 size={20} /><span>Reports</span>
        </button>
        <button onClick={() => setShowBillingModal(true)} className="bnav-fab">
          <Plus size={24} />
        </button>
        <button onClick={() => setActiveTab('manageProducts')} className={`bnav-item ${activeTab === 'manageProducts' ? 'active' : ''}`}>
          <Package size={20} /><span>Stock</span>
        </button>
        <button onClick={() => setActiveTab('scanner')} className={`bnav-item ${activeTab === 'scanner' ? 'active' : ''}`}>
          <ScanLine size={20} /><span>Scanner</span>
        </button>
        <button onClick={() => setActiveTab('financeAI')} className={`bnav-item ${activeTab === 'financeAI' ? 'active' : ''}`}>
          <Settings size={20} /><span>Finance</span>
        </button>
      </nav>

      {showScannerCamera && (
        <div className="scanner-camera-overlay" onClick={closeScannerCamera}>
          <div className="scanner-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-camera-head">
              <h3>Capture Product</h3>
              <button className="modal-close" onClick={closeScannerCamera} aria-label="Close scanner camera">
                <X size={22} />
              </button>
            </div>
            <video ref={videoRef} className="scanner-camera-preview" autoPlay playsInline muted />
            {cameraError && <p className="scanner-camera-error">{cameraError}</p>}
            <div className="scanner-camera-actions">
              <button className="btn btn-outline" onClick={closeScannerCamera}>Cancel</button>
              <button className="btn btn-primary" onClick={captureScannerFrame} disabled={scanInProgress}>
                {scanInProgress ? 'Processing...' : 'Capture & Scan'}
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
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Product Name</label>
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
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={handleInputChange}
                  name="category"
                  required
                  className="form-control"
                  style={{ color: '#333', backgroundColor: 'white' }}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
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
                  <label>Stock Quantity</label>
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
                  GST Applicable
                </label>
              </div>

              <div className="form-group">
                <label>Product Image</label>
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
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
                <h2>Create New Bill</h2>
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
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      value={billingForm.customerName}
                      onChange={(e) => setBillingForm({ ...billingForm, customerName: e.target.value })}
                      name="customerName"
                      required
                      className="form-control"
                      placeholder="Enter customer name"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Sale Date *</label>
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
                    <label>Customer Phone</label>
                    <input
                      type="text"
                      value={billingForm.customerPhone}
                      onChange={(e) => setBillingForm({ ...billingForm, customerPhone: e.target.value })}
                      name="customerPhone"
                      className="form-control"
                      placeholder="Enter customer phone"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Customer Email</label>
                    <input
                      type="email"
                      value={billingForm.customerEmail}
                      onChange={(e) => setBillingForm({ ...billingForm, customerEmail: e.target.value })}
                      name="customerEmail"
                      className="form-control"
                      placeholder="Enter customer email"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={billingForm.paymentMethod}
                      onChange={(e) => setBillingForm({ ...billingForm, paymentMethod: e.target.value })}
                      name="paymentMethod"
                      className="form-control"
                      style={{ color: '#333', backgroundColor: 'white' }}
                    >
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>
                          {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
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
                      Apply GST (18%)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Add Products</label>
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
                      <option value="">Select a product to add</option>
                      {products.map(product => (
                        <option key={product.productID} value={product.productID}>
                          {product.name} - ₹{product.price} (Stock: {product.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Bill Items</label>
                  <div className="items-list">
                    {billingForm.items.length === 0 ? (
                      <p className="no-items">No items added yet. Select products above to add them.</p>
                    ) : (
                      billingForm.items.map(item => (
                        <div key={item.productID} className="item-row">
                          <div className="item-info">
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">₹{item.price} each</span>
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
                      <span>Subtotal:</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {billingForm.applyGST && (
                      <div className="summary-row">
                        <span>GST (18%):</span>
                        <span>{formatPrice(gstAmount)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total:</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={billingForm.notes}
                    onChange={(e) => setBillingForm({ ...billingForm, notes: e.target.value })}
                    name="notes"
                    className="form-control"
                    rows="3"
                    placeholder="Any additional notes..."
                    style={{ color: '#333', backgroundColor: 'white' }}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowBillingModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={billingForm.items.length === 0}
                  >
                    Generate Bill
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
                Close
              </button>
              <button
                onClick={() => downloadBill(selectedBill)}
                className="btn btn-primary"
              >
                <Download size={16} />
                Download Bill
              </button>
              <button
                onClick={() => printBill(selectedBill)}
                className="btn btn-primary"
              >
                <Printer size={16} />
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin; 