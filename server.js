const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== تنظیمات CORS برای دسترسی از همه جا =====
app.use(cors({
  origin: '*', // اجازه دسترسی از همه دستگاه‌ها و آدرس‌ها
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== Middleware =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== تنظیمات آپلود عکس =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('فرمت فایل پشتیبانی نمی‌شود'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ===== مسیر فایل دیتابیس =====
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// ===== توابع دیتابیس =====
const readDB = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    const defaultDB = {
      products: [
        { 
          id: 1, 
          name: 'سیب قرمز', 
          price: 25000, 
          discountPrice: 20000,
          image: '🍎',
          imagePath: null,
          unit: 'کیلو', 
          category: 'میوه',
          isSeasonal: true,
          stock: 100,
          shopName: 'فروشگاه رضایی',
          rating: 4.5
        },
        { 
          id: 2, 
          name: 'موز', 
          price: 35000, 
          discountPrice: null,
          image: '🍌',
          imagePath: null,
          unit: 'کیلو', 
          category: 'میوه',
          isSeasonal: false,
          stock: 50,
          shopName: 'فروشگاه رضایی',
          rating: 4.0
        },
        { 
          id: 3, 
          name: 'پرتقال', 
          price: 30000, 
          discountPrice: 25000,
          image: '🍊',
          imagePath: null,
          unit: 'کیلو', 
          category: 'میوه',
          isSeasonal: true,
          stock: 75,
          shopName: 'فروشگاه سارا',
          rating: 3.5
        }
      ],
      orders: [],
      banners: []
    };
    writeDB(defaultDB);
    return defaultDB;
  }
};

const writeDB = (data) => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// ============================================
// ===== API PRODUCTS =====
// ============================================

// دریافت همه محصولات
app.get('/api/products', (req, res) => {
  try {
    const db = readDB();
    const products = db.products.map(p => ({
      ...p,
      imageUrl: p.imagePath ? `https://${req.get('host')}${p.imagePath}` : null
    }));
    res.json(products);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ error: 'خطا در دریافت محصولات' });
  }
});

// دریافت یک محصول با ID
app.get('/api/products/:id', (req, res) => {
  try {
    const db = readDB();
    const product = db.products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }
    res.json({
      ...product,
      imageUrl: product.imagePath ? `https://${req.get('host')}${product.imagePath}` : null
    });
  } catch (error) {
    console.error('Error in GET /api/products/:id:', error);
    res.status(500).json({ error: 'خطا در دریافت محصول' });
  }
});

// افزودن محصول جدید
app.post('/api/products', upload.single('imageFile'), (req, res) => {
  try {
    const db = readDB();
    let productData = {};
    
    try {
      productData = JSON.parse(req.body.productData || '{}');
    } catch (e) {
      productData = {};
    }
    
    const newProduct = {
      id: Date.now(),
      name: productData.name || '',
      price: parseInt(productData.price) || 0,
      discountPrice: productData.discountPrice ? parseInt(productData.discountPrice) : null,
      image: productData.image || '🍎',
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      unit: productData.unit || 'کیلو',
      category: productData.category || 'میوه',
      isSeasonal: productData.isSeasonal || false,
      stock: parseInt(productData.stock) || 0,
      shopName: productData.shopName || 'فروشگاه ماناو',
      rating: productData.rating || 0
    };
    
    db.products.push(newProduct);
    writeDB(db);
    res.status(201).json({
      ...newProduct,
      imageUrl: newProduct.imagePath ? `https://${req.get('host')}${newProduct.imagePath}` : null
    });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ error: 'خطا در افزودن محصول' });
  }
});

// ویرایش محصول
app.put('/api/products/:id', upload.single('imageFile'), (req, res) => {
  try {
    const db = readDB();
    const index = db.products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }
    
    let productData = {};
    try {
      productData = JSON.parse(req.body.productData || '{}');
    } catch (e) {
      productData = {};
    }
    
    if (req.file && db.products[index].imagePath) {
      const oldImagePath = path.join(__dirname, db.products[index].imagePath);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    db.products[index] = {
      id: db.products[index].id,
      name: productData.name || db.products[index].name,
      price: parseInt(productData.price) || db.products[index].price,
      discountPrice: productData.discountPrice ? parseInt(productData.discountPrice) : null,
      image: productData.image || db.products[index].image,
      imagePath: req.file ? `/uploads/${req.file.filename}` : db.products[index].imagePath,
      unit: productData.unit || db.products[index].unit,
      category: productData.category || db.products[index].category,
      isSeasonal: productData.isSeasonal !== undefined ? productData.isSeasonal : db.products[index].isSeasonal,
      stock: parseInt(productData.stock) || db.products[index].stock,
      shopName: productData.shopName || db.products[index].shopName || 'فروشگاه ماناو',
      rating: productData.rating || db.products[index].rating || 0
    };
    
    writeDB(db);
    res.json({
      ...db.products[index],
      imageUrl: db.products[index].imagePath ? `https://${req.get('host')}${db.products[index].imagePath}` : null
    });
  } catch (error) {
    console.error('Error in PUT /api/products/:id:', error);
    res.status(500).json({ error: 'خطا در ویرایش محصول' });
  }
});

// حذف محصول
app.delete('/api/products/:id', (req, res) => {
  try {
    const db = readDB();
    const index = db.products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }
    
    if (db.products[index].imagePath) {
      const imagePath = path.join(__dirname, db.products[index].imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    db.products.splice(index, 1);
    writeDB(db);
    res.json({ message: 'محصول با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error in DELETE /api/products/:id:', error);
    res.status(500).json({ error: 'خطا در حذف محصول' });
  }
});

// بروزرسانی موجودی
app.put('/api/products/:id/stock', (req, res) => {
  try {
    const db = readDB();
    const index = db.products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'محصول یافت نشد' });
    }
    
    const quantity = parseInt(req.body.quantity) || 0;
    const newStock = db.products[index].stock - quantity;
    
    if (newStock < 0) {
      return res.status(400).json({ error: 'موجودی کافی نیست' });
    }
    
    db.products[index].stock = newStock;
    writeDB(db);
    res.json({ 
      message: 'موجودی با موفقیت بروزرسانی شد',
      newStock: newStock
    });
  } catch (error) {
    console.error('Error in PUT /api/products/:id/stock:', error);
    res.status(500).json({ error: 'خطا در بروزرسانی موجودی' });
  }
});

// ============================================
// ===== API ORDERS =====
// ============================================

// دریافت همه سفارشات
app.get('/api/orders', (req, res) => {
  try {
    const db = readDB();
    res.json(db.orders || []);
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    res.status(500).json({ error: 'خطا در دریافت سفارشات' });
  }
});

// ثبت سفارش جدید
app.post('/api/orders', (req, res) => {
  try {
    const db = readDB();
    
    const items = req.body.items || [];
    for (const item of items) {
      const productIndex = db.products.findIndex(p => p.id === item.id);
      if (productIndex !== -1) {
        const newStock = db.products[productIndex].stock - item.quantity;
        if (newStock < 0) {
          return res.status(400).json({ 
            error: `موجودی ${db.products[productIndex].name} کافی نیست` 
          });
        }
        db.products[productIndex].stock = newStock;
      }
    }
    
    const newOrder = {
      id: Date.now(),
      items: items,
      total: parseInt(req.body.total) || 0,
      customerName: req.body.customerName || 'مهمان',
      customerPhone: req.body.customerPhone || '',
      customerAddress: req.body.customerAddress || '',
      status: 'پرداخت شده',
      createdAt: new Date().toISOString()
    };
    
    if (!db.orders) db.orders = [];
    db.orders.push(newOrder);
    writeDB(db);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    res.status(500).json({ error: 'خطا در ثبت سفارش' });
  }
});

// ============================================
// ===== API BANNERS =====
// ============================================

// دریافت همه بنرها
app.get('/api/banners', (req, res) => {
  try {
    const db = readDB();
    const banners = (db.banners || []).map(b => ({
      ...b,
      imageUrl: b.image ? `https://${req.get('host')}${b.image}` : null
    }));
    res.json(banners);
  } catch (error) {
    console.error('Error in GET /api/banners:', error);
    res.status(500).json({ error: 'خطا در دریافت بنرها' });
  }
});

// افزودن بنر جدید
app.post('/api/banners', upload.single('image'), (req, res) => {
  try {
    const db = readDB();
    
    const newBanner = {
      id: Date.now(),
      title: req.body.title || '',
      subtitle: req.body.subtitle || '',
      link: req.body.link || '/products',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };
    
    if (!db.banners) db.banners = [];
    db.banners.push(newBanner);
    writeDB(db);
    res.status(201).json({
      ...newBanner,
      imageUrl: newBanner.image ? `https://${req.get('host')}${newBanner.image}` : null
    });
  } catch (error) {
    console.error('Error in POST /api/banners:', error);
    res.status(500).json({ error: 'خطا در افزودن بنر' });
  }
});

// حذف بنر
app.delete('/api/banners/:id', (req, res) => {
  try {
    const db = readDB();
    if (!db.banners) db.banners = [];
    
    const index = db.banners.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'بنر یافت نشد' });
    }
    
    if (db.banners[index].image) {
      const imagePath = path.join(__dirname, db.banners[index].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    db.banners.splice(index, 1);
    writeDB(db);
    res.json({ message: 'بنر با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error in DELETE /api/banners/:id:', error);
    res.status(500).json({ error: 'خطا در حذف بنر' });
  }
});

// تغییر ترتیب بنرها
app.put('/api/banners/order', (req, res) => {
  try {
    const db = readDB();
    db.banners = req.body.banners || [];
    writeDB(db);
    res.json({ message: 'ترتیب بنرها با موفقیت تغییر کرد' });
  } catch (error) {
    console.error('Error in PUT /api/banners/order:', error);
    res.status(500).json({ error: 'خطا در تغییر ترتیب بنرها' });
  }
});

// ============================================
// ===== API SEARCH (تکمیل خودکار) =====
// ============================================

app.get('/api/search/suggestions', (req, res) => {
  try {
    const query = req.query.q || '';
    const db = readDB();
    const products = db.products || [];
    
    if (query.length < 1) {
      return res.json({ suggestions: [] });
    }
    
    const searchLower = query.toLowerCase();
    
    const productSuggestions = products
      .filter(p => p.name && p.name.toLowerCase().includes(searchLower))
      .map(p => ({
        type: 'product',
        label: p.name,
        value: p.name,
        image: p.imageUrl || p.image || '🍎',
        shopName: p.shopName || 'فروشگاه ماناو'
      }));
    
    const shopMap = new Map();
    products.forEach(p => {
      if (p.shopName && p.shopName.toLowerCase().includes(searchLower)) {
        if (!shopMap.has(p.shopName)) {
          shopMap.set(p.shopName, {
            type: 'shop',
            label: p.shopName,
            value: p.shopName,
            image: '🏪'
          });
        }
      }
    });
    const shopSuggestions = Array.from(shopMap.values());
    
    const suggestions = [...productSuggestions, ...shopSuggestions];
    
    suggestions.sort((a, b) => {
      const aExact = a.label.toLowerCase().startsWith(searchLower);
      const bExact = b.label.toLowerCase().startsWith(searchLower);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.label.localeCompare(b.label);
    });
    
    res.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error('Error in GET /api/search/suggestions:', error);
    res.status(500).json({ error: 'خطا در دریافت پیشنهادات' });
  }
});

// ============================================
// ===== START SERVER =====
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
  console.log(`📦 API Endpoints:`);
  console.log(`   GET    /api/products              - دریافت همه محصولات`);
  console.log(`   GET    /api/products/:id          - دریافت یک محصول`);
  console.log(`   POST   /api/products              - افزودن محصول جدید (با عکس)`);
  console.log(`   PUT    /api/products/:id          - ویرایش محصول (با عکس)`);
  console.log(`   DELETE /api/products/:id          - حذف محصول`);
  console.log(`   PUT    /api/products/:id/stock    - بروزرسانی موجودی`);
  console.log(`   GET    /api/orders                - دریافت سفارشات`);
  console.log(`   POST   /api/orders                - ثبت سفارش جدید`);
  console.log(`   GET    /api/banners               - دریافت بنرها`);
  console.log(`   POST   /api/banners               - افزودن بنر جدید`);
  console.log(`   DELETE /api/banners/:id           - حذف بنر`);
  console.log(`   PUT    /api/banners/order         - تغییر ترتیب بنرها`);
  console.log(`   GET    /api/search/suggestions    - تکمیل خودکار جستجو`);
});
