import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, useInView, useAnimation, AnimatePresence } from 'framer-motion';
import {
  FiShoppingBag, FiStar, FiArrowRight, FiShield, FiTrendingUp,
  FiBook, FiPackage, FiUsers, FiBarChart2, FiZap, FiCheck,
  FiChevronLeft, FiChevronRight, FiMapPin, FiPhone, FiMail,
  FiClock, FiLayers, FiActivity, FiCreditCard, FiLock, FiGlobe
} from 'react-icons/fi';

// ─── Animated Counter Hook ───────────────────────────────────────────────────
const useCounter = (target, duration = 2000, inView = true) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, inView]);
  return count;
};

// ─── Section Wrapper with fade-in ───────────────────────────────────────────
const FadeIn = ({ children, delay = 0, direction = 'up', className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const variants = {
    hidden: { opacity: 0, y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0, x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0 },
    visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] } }
  };
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={variants} className={className}>
      {children}
    </motion.div>
  );
};

// ─── Floating Grocery Icon ───────────────────────────────────────────────────
const FloatingEmoji = ({ emoji, x, y, delay, size = 'text-3xl', duration = 4 }) => (
  <motion.div
    className={`absolute ${size} select-none pointer-events-none`}
    style={{ left: x, top: y }}
    animate={{ y: [0, -18, 0], rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
    transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
  >
    {emoji}
  </motion.div>
);

// ─── Gradient Mesh Background ────────────────────────────────────────────────
const MeshBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute w-[800px] h-[800px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', top: '-20%', right: '-15%' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute w-[600px] h-[600px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)', bottom: '5%', left: '-10%' }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
    <motion.div
      className="absolute w-[500px] h-[500px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(6,95,70,0.07) 0%, transparent 70%)', top: '40%', left: '40%' }}
      animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
    />
    {/* Grid dots */}
    <div className="absolute inset-0 opacity-[0.025]" style={{
      backgroundImage: 'radial-gradient(circle, #10B981 1px, transparent 1px)',
      backgroundSize: '40px 40px'
    }} />
  </div>
);

// ─── Glassmorphism Stat Card ─────────────────────────────────────────────────
const GlassStatCard = ({ icon, value, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: 'backOut' }}
    whileHover={{ scale: 1.05, y: -4 }}
    className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl p-4 shadow-xl shadow-black/5 text-left"
    style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)` }}
  >
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
      {icon}
    </div>
    <p className="text-xl font-black text-[#111827]">{value}</p>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
  </motion.div>
);

// ─── Feature Card ────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, gradient, delay }) => (
  <FadeIn delay={delay}>
    <motion.div
      whileHover={{ scale: 1.03, y: -6 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="group relative bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/8 transition-all duration-300 overflow-hidden text-left"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
        style={{ background: gradient, opacity: 0 }}
      />
      {/* Gradient border on hover */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: gradient, padding: '1.5px' }}
      >
        <div className="w-full h-full bg-white rounded-3xl" />
      </div>
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg" style={{ background: gradient.replace('linear-gradient', 'linear-gradient').split(',').slice(0,2).join(',') + ', transparent)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #065F46)' }}>
            {icon}
          </div>
        </div>
        <h3 className="font-bold text-[#111827] text-base mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  </FadeIn>
);

// ─── Trust Card ──────────────────────────────────────────────────────────────
const TrustCard = ({ emoji, title, desc, delay }) => (
  <FadeIn delay={delay}>
    <motion.div
      whileHover={{ scale: 1.04, y: -6 }}
      className="bg-white border border-slate-200/60 rounded-2xl p-5 text-left hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/8 transition-all duration-300 group cursor-pointer"
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 inline-block">{emoji}</div>
      <h3 className="font-bold text-[#111827] text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </motion.div>
  </FadeIn>
);

// ─── Animated Counter ────────────────────────────────────────────────────────
const AnimatedStat = ({ value, suffix, label, delay }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCounter(value, 2000, inView);
  return (
    <FadeIn delay={delay} className="text-center">
      <div ref={ref}>
        <motion.p
          className="text-5xl font-black text-[#111827] font-poppins"
          animate={{ scale: inView ? [1.3, 1] : 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2 }}
        >
          {count.toLocaleString()}{suffix}
        </motion.p>
        <p className="text-sm text-slate-500 mt-2 font-medium">{label}</p>
      </div>
    </FadeIn>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const LandingPage = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setReviewIndex(p => (p + 1) % reviews.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const reviews = [
    { name: 'Aarav Sharma', role: 'Regular Customer, HSR Layout', comment: "Shivam Kirana has completely transformed how I manage my grocery credit. The digital Khata is transparent and I can see every rupee in real time!", rating: 5, avatar: '👨‍💼' },
    { name: 'Pooja Patel', role: 'Verified Buyer, Koramangala', comment: 'Feels like using Blinkit but with the trust of my local store. The checkout is instant and the product range is excellent!', rating: 5, avatar: '👩‍💻' },
    { name: 'Vikram Malhotra', role: 'Local Resident, Indiranagar', comment: 'The balance tracking is brilliant. I cleared my 3-month pending balance using UPI directly on the platform. 10/10 experience!', rating: 5, avatar: '👨‍🔧' },
    { name: 'Meera Nair', role: 'Happy Customer, BTM Layout', comment: "Managing family groceries was never this easy. Digital records for everything! Shivam's store is truly ahead of its time.", rating: 5, avatar: '👩‍🏫' },
  ];

  const faqs = [
    { q: 'How does the Digital Khata credit system work?', a: 'Registered customers can checkout groceries on credit. Every purchase automatically appends to your ledger and updates your balance in real time. Clear your balance at the store or online via UPI.' },
    { q: 'Can I settle my balance online?', a: 'Yes! We support Razorpay UPI payments. Generate a secure payment link from your dashboard, scan the QR code, and your ledger is cleared automatically on payment confirmation.' },
    { q: 'Is my data safe and private?', a: 'All customer data is encrypted and protected using JWT-based authentication. Your ledger is only accessible to you and the store admin.' },
    { q: 'Can I track my entire purchase history?', a: 'Yes! Your Digital Khata Book shows every transaction with dates, amounts, item descriptions, and running balance snapshots — downloadable as PDF or Excel.' },
  ];

  const timelineSteps = [
    { icon: '🏪', label: 'Traditional Kirana', desc: 'Handwritten ledgers and cash-only transactions' },
    { icon: '📒', label: 'Digital Khata', desc: 'Real-time credit tracking on secure digital ledger' },
    { icon: '📦', label: 'Smart Inventory', desc: 'Live stock management with barcode scanning' },
    { icon: '📊', label: 'Business Analytics', desc: 'P&L, cash flow, and GST reporting dashboard' },
    { icon: '🚀', label: 'Modern Retail ERP', desc: 'Full enterprise-grade retail management system' },
  ];

  const khataFlow = [
    { icon: '🛒', label: 'Customer Purchase', color: '#10B981' },
    { icon: '📝', label: 'Khata Entry', color: '#059669' },
    { icon: '🔔', label: 'WhatsApp Alert', color: '#065F46' },
    { icon: '💳', label: 'UPI Settlement', color: '#F97316' },
    { icon: '📈', label: 'Report Generated', color: '#10B981' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111827] flex flex-col overflow-x-hidden font-sans">

      {/* ══════════════════════════════ NAVBAR ══════════════════════════════ */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`w-full fixed top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${
          navScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-500/25"
          >
            <FiShoppingBag className="w-5 h-5" />
          </motion.div>
          <div>
            <span className="font-poppins font-extrabold text-xl text-[#111827] leading-none block">
              Shivam <span className="text-emerald-500">Kirana</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">Smart Retail ERP</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
          <a href="#stats" className="hover:text-emerald-600 transition-colors">Stats</a>
          <a href="#testimonials" className="hover:text-emerald-600 transition-colors">Customers</a>
          <a href="#faq" className="hover:text-emerald-600 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors hidden sm:block">
            Sign In
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/register"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
            >
              Get Started →
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* ══════════════════════════════ HERO ════════════════════════════════ */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-24 pb-16">
        <MeshBackground />

        <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

          {/* Left */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold"
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
              />
              🏪 Now Serving 1000+ Families Digitally
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="font-poppins text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight"
            >
              Your Neighborhood Store,{' '}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">
                  Reimagined
                </span>
                <motion.div
                  className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-emerald-500 to-orange-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                />
              </span>{' '}
              Digitally.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-slate-500 max-w-lg leading-relaxed"
            >
              Shop smarter, manage your digital khata, track purchases, and stay connected with your trusted local kirana store — all in one premium platform.
            </motion.p>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              {['⚡ Instant Checkout', '🔒 Secure Ledger', '📱 Mobile Ready', '🎯 98% Satisfaction'].map((badge, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                  {badge}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap gap-4"
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold px-7 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/25 text-sm transition-all"
                >
                  Shop on Credit Now <FiArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-[#111827] font-bold px-7 py-3.5 rounded-2xl border border-slate-200 shadow-sm text-sm transition-all"
                >
                  Create Free Account
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-4 pt-2"
            >
              <div className="flex -space-x-3">
                {['👨‍💼', '👩‍💻', '👨‍🔧', '👩‍🏫', '👨‍🍳'].map((av, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-sm shadow-sm">
                    {av}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <FiStar key={i} className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Trusted by <strong className="text-[#111827]">1,000+</strong> local families</p>
              </div>
            </motion.div>
          </div>

          {/* Right — Floating 3D Elements + Stat Cards */}
          <div className="relative flex justify-center items-center min-h-[520px]">

            {/* Floating grocery emojis */}
            <FloatingEmoji emoji="🍎" x="5%" y="8%" delay={0} duration={3.5} size="text-4xl" />
            <FloatingEmoji emoji="🥛" x="80%" y="5%" delay={0.5} duration={4} size="text-3xl" />
            <FloatingEmoji emoji="🧅" x="85%" y="60%" delay={1} duration={3.8} size="text-3xl" />
            <FloatingEmoji emoji="🍌" x="0%" y="55%" delay={1.5} duration={4.2} size="text-3xl" />
            <FloatingEmoji emoji="🌾" x="70%" y="80%" delay={0.8} duration={3.6} size="text-3xl" />
            <FloatingEmoji emoji="🥕" x="10%" y="80%" delay={0.3} duration={4.5} size="text-2xl" />
            <FloatingEmoji emoji="🫙" x="45%" y="5%" delay={1.2} duration={3.9} size="text-2xl" />
            <FloatingEmoji emoji="🧄" x="90%" y="35%" delay={0.7} duration={4.1} size="text-2xl" />

            {/* Central glassmorphism card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: 'backOut' }}
              className="relative z-10 w-full max-w-sm"
            >
              {/* Main card */}
              <div
                className="rounded-3xl overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,248,0.9) 100%)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 32px 64px rgba(16,185,129,0.15), 0 0 0 1px rgba(255,255,255,0.5)'
                }}
              >
                {/* Card header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiShoppingBag className="text-white w-5 h-5" />
                    <span className="text-white font-bold text-sm">Shivam Kirana Dashboard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/30" />
                    <div className="w-3 h-3 rounded-full bg-white/50" />
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 space-y-4">
                  {/* Mini chart simulation */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600">Weekly Revenue</span>
                      <span className="text-xs font-bold text-emerald-600">↑ +24.5%</span>
                    </div>
                    <div className="flex items-end gap-1 h-14">
                      {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-t-md"
                          style={{ background: i === 5 ? 'linear-gradient(180deg, #10B981, #065F46)' : 'rgba(16,185,129,0.2)' }}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease: 'backOut' }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mini ledger preview */}
                  <div className="space-y-2">
                    {[
                      { name: 'Aarav Sharma', amount: '₹1,250', type: 'credit', time: '2m ago' },
                      { name: 'Meera Nair', amount: '₹800', type: 'paid', time: '15m ago' },
                      { name: 'Ravi Kumar', amount: '₹450', type: 'credit', time: '1h ago' },
                    ].map((tx, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + i * 0.15 }}
                        className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${tx.type === 'credit' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {tx.type === 'credit' ? '↑' : '↓'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#111827]">{tx.name}</p>
                            <p className="text-[10px] text-slate-400">{tx.time}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${tx.type === 'credit' ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating stat cards */}
              <div className="absolute -top-6 -right-6 w-36">
                <GlassStatCard icon={<FiUsers className="w-4 h-4 text-white" />} value="1,200+" label="Customers" color="bg-gradient-to-br from-blue-400 to-blue-600" delay={1.0} />
              </div>
              <div className="absolute -bottom-6 -left-6 w-36">
                <GlassStatCard icon={<FiPackage className="w-4 h-4 text-white" />} value="1,500+" label="Products" color="bg-gradient-to-br from-orange-400 to-orange-600" delay={1.2} />
              </div>
              <div className="absolute top-1/2 -right-10 w-32">
                <GlassStatCard icon={<FiZap className="w-4 h-4 text-white" />} value="98%" label="Satisfaction" color="bg-gradient-to-br from-emerald-400 to-emerald-600" delay={1.4} />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
        >
          <span className="text-xs font-medium">Scroll to explore</span>
          <div className="w-5 h-8 border-2 border-slate-300 rounded-full flex items-start justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="w-1 h-2 bg-emerald-500 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* ══════════════════ LIVE STATS COUNTERS ═════════════════════════════ */}
      <section id="stats" className="py-20 bg-gradient-to-r from-[#111827] to-[#065F46] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 5000, suffix: '+', label: 'Orders Fulfilled' },
              { value: 1000, suffix: '+', label: 'Happy Customers' },
              { value: 1500, suffix: '+', label: 'Products Listed' },
              { value: 98, suffix: '%', label: 'Satisfaction Rate' },
            ].map((s, i) => (
              <div key={i} className="text-center text-white">
                <AnimatedStat {...s} delay={i * 0.15} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ TRUST SECTION ═══════════════════════════════ */}
      <section className="py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-200 mb-4">Why Families Trust Us</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-[#111827] mb-4">
              Why Families Trust<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">Shivam Kirana Store</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">A neighborhood store with enterprise-grade technology, serving families with transparency and trust for years.</p>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { emoji: '🌿', title: 'Farm-Fresh Products', desc: 'Handpicked daily from trusted local suppliers. Freshness is our non-negotiable promise.', delay: 0 },
              { emoji: '🔐', title: 'Transparent Digital Khata', desc: 'Every rupee tracked in real-time. No hidden fees, no billing surprises — ever.', delay: 0.1 },
              { emoji: '⚡', title: 'Superfast Service', desc: 'From order to delivery or credit checkout — everything under 2 minutes.', delay: 0.2 },
              { emoji: '🧾', title: 'Accurate GST Billing', desc: 'Auto-generated tax invoices with HSN codes, CGST/SGST breakdown for every purchase.', delay: 0.3 },
              { emoji: '🤝', title: 'Community First', desc: 'Built for the neighborhood. Every feature is designed to strengthen local bonds.', delay: 0.4 },
              { emoji: '📱', title: 'Always Accessible', desc: 'Access your khata, shop, settle balances, and download reports from any device.', delay: 0.5 },
            ].map((item, i) => <TrustCard key={i} {...item} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURES SHOWCASE ═══════════════════════════════ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-slate-200 mb-4">Smart Features</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-[#111827] mb-4">
              Everything a Modern Kirana Needs
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">From inventory management to customer ledgers — a complete ERP platform designed for the Indian retail market.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <FiBook className="w-5 h-5 text-white" />, title: 'Digital Khata Management', desc: 'Complete credit ledger system with real-time balance updates, transaction history, and PDF exports.', gradient: 'linear-gradient(135deg, #10B981 0%, #065F46 100%)', delay: 0 },
              { icon: <FiActivity className="w-5 h-5 text-white" />, title: 'Real-Time Balance Tracking', desc: 'Live outstanding balance with automated WhatsApp reminders and UPI payment settlement.', gradient: 'linear-gradient(135deg, #F97316 0%, #c2410c 100%)', delay: 0.1 },
              { icon: <FiPackage className="w-5 h-5 text-white" />, title: 'Smart Inventory Control', desc: 'Barcode scanning, stock alerts, expiry tracking, and supplier purchase management.', gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', delay: 0.2 },
              { icon: <FiBarChart2 className="w-5 h-5 text-white" />, title: 'Business Analytics', desc: 'P&L statements, balance sheets, cash flow reports, and GST audit exports in one click.', gradient: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)', delay: 0.3 },
              { icon: <FiLock className="w-5 h-5 text-white" />, title: 'Secure Customer Access', desc: 'JWT-based authentication with role-based access. Admin and customer portals fully separated.', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', delay: 0.4 },
              { icon: <FiTrendingUp className="w-5 h-5 text-white" />, title: 'Revenue Intelligence', desc: 'Weekly trend charts, debt distribution analysis, and daily earnings snapshots for store owners.', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', delay: 0.5 },
            ].map((f, i) => <FeatureCard key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════ TIMELINE SECTION ════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-br from-[#FAFAF8] to-emerald-50/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-200 mb-4">Our Journey</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-[#111827] mb-4">
              From Handwritten Notes to Modern ERP
            </h2>
          </FadeIn>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-200 via-emerald-400 to-emerald-600 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {timelineSteps.map((step, i) => (
                <FadeIn key={i} delay={i * 0.15} direction="up">
                  <div className="flex flex-col items-center text-center relative">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl mb-4 relative z-10 shadow-lg border-4 border-white"
                      style={{ background: `linear-gradient(135deg, hsl(${150 + i * 10}, 60%, ${88 - i * 5}%) 0%, hsl(${150 + i * 8}, 70%, ${78 - i * 5}%) 100%)` }}
                    >
                      {step.icon}
                    </motion.div>
                    <h3 className="font-bold text-sm text-[#111827] mb-1">{step.label}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                    <div className="absolute top-10 right-0 hidden md:flex items-center justify-center w-4 h-4">
                      {i < 4 && <FiArrowRight className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ DASHBOARD PREVIEW ═══════════════════════════════ */}
      <section className="py-24 bg-[#111827] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle, #10B981 1px, transparent 1px)',
          backgroundSize: '25px 25px'
        }} />
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #10B981, transparent)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-16">
            <span className="inline-block bg-emerald-900/50 text-emerald-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-800 mb-4">Dashboard Preview</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-white mb-4">
              A Premium Admin Experience
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">Manage your entire store from a single, beautiful dashboard. Built for speed, clarity, and control.</p>
          </FadeIn>

          {/* Dashboard mockup */}
          <FadeIn delay={0.2}>
            <div className="rounded-3xl overflow-hidden border border-slate-700 shadow-2xl shadow-black/50">
              {/* Title bar */}
              <div className="bg-slate-800 px-5 py-3 flex items-center gap-3 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 bg-slate-700 rounded-lg px-4 py-1.5 text-xs text-slate-400 text-center font-mono">
                  shivamkirana.store/admin
                </div>
              </div>

              {/* Dashboard content */}
              <div className="bg-slate-900 p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Today's Revenue", val: '₹12,450', icon: '💰', change: '+18%', positive: true },
                    { label: 'Outstanding', val: '₹45,200', icon: '📊', change: '-5%', positive: false },
                    { label: 'Customers', val: '1,243', icon: '👥', change: '+12', positive: true },
                    { label: 'Products', val: '1,508', icon: '📦', change: '+34', positive: true },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      viewport={{ once: true }}
                      className="bg-slate-800 rounded-2xl p-4 border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{card.icon}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.positive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
                          {card.change}
                        </span>
                      </div>
                      <p className="text-white font-black text-lg font-poppins">{card.val}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{card.label}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Chart area */}
                  <div className="col-span-2 bg-slate-800 rounded-2xl p-4 border border-slate-700">
                    <p className="text-slate-400 text-xs font-bold mb-3">Weekly Revenue Trend</p>
                    <div className="flex items-end gap-2 h-24">
                      {[55, 78, 60, 92, 68, 85, 95].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-t-lg"
                          style={{ background: `linear-gradient(180deg, ${i === 6 ? '#10B981' : '#1e3a2e'} 0%, ${i === 6 ? '#065F46' : '#0d2218'} 100%)` }}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ delay: i * 0.1 + 0.5 }}
                          viewport={{ once: true }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <span key={d} className="text-[9px] text-slate-600">{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recent transactions */}
                  <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                    <p className="text-slate-400 text-xs font-bold mb-3">Recent Transactions</p>
                    <div className="space-y-2.5">
                      {[
                        { name: 'Aarav S.', amt: '+₹450', type: 'credit' },
                        { name: 'Meera N.', amt: '-₹1200', type: 'paid' },
                        { name: 'Ravi K.', amt: '+₹890', type: 'credit' },
                        { name: 'Priya M.', amt: '-₹650', type: 'paid' },
                      ].map((t, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${t.type === 'credit' ? 'bg-orange-900/50 text-orange-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                              {t.type === 'credit' ? '↑' : '↓'}
                            </div>
                            <span className="text-[10px] text-slate-300">{t.name}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${t.type === 'credit' ? 'text-orange-400' : 'text-emerald-400'}`}>{t.amt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ DIGITAL KHATA FLOW ══════════════════════════════ */}
      <section className="py-24 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="inline-block bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-orange-200 mb-4">Digital Khata</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-[#111827] mb-4">
              How the Digital Khata Works
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-sm">From a customer's first purchase to full settlement — transparent, instant, and automatic.</p>
          </FadeIn>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {khataFlow.map((step, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-4">
                <FadeIn delay={i * 0.15}>
                  <motion.div
                    whileHover={{ scale: 1.08, y: -4 }}
                    className="relative text-center"
                  >
                    <div
                      className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-white mx-auto"
                      style={{ background: `linear-gradient(135deg, ${step.color}20 0%, ${step.color}40 100%)`, borderColor: step.color + '30' }}
                    >
                      <span className="text-3xl mb-1">{step.icon}</span>
                    </div>
                    <p className="text-xs font-bold text-[#111827] mt-2 max-w-[80px] mx-auto leading-tight">{step.label}</p>
                    {/* Animated indicator */}
                    <motion.div
                      className="w-2 h-2 rounded-full mx-auto mt-1.5"
                      style={{ backgroundColor: step.color }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    />
                  </motion.div>
                </FadeIn>
                {i < khataFlow.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 + 0.3, duration: 0.5 }}
                    className="hidden md:block w-8 h-0.5 bg-gradient-to-r from-emerald-300 to-emerald-500 origin-left"
                  />
                )}
              </div>
            ))}
          </div>

          <FadeIn delay={0.5} className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🔔', title: 'WhatsApp Alerts', desc: 'Instant transaction notifications via WhatsApp on every credit or payment.', color: 'emerald' },
              { icon: '💳', title: 'UPI Settlements', desc: 'Generate Razorpay payment links and QR codes directly from the dashboard.', color: 'orange' },
              { icon: '📄', title: 'Report Exports', desc: 'Download PDF and Excel statements of complete ledger history anytime.', color: 'blue' },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-left"
              >
                <span className="text-2xl block mb-3">{f.icon}</span>
                <h4 className="font-bold text-[#111827] text-sm mb-1">{f.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ════════════════════════════════════ */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-200 mb-4">Customer Stories</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-[#111827] mb-4">
              What Our Families Say
            </h2>
          </FadeIn>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={reviewIndex}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-3xl p-8 shadow-lg text-center">
                  <div className="text-5xl mb-4">{reviews[reviewIndex].avatar}</div>
                  <div className="flex justify-center gap-1 mb-4">
                    {[...Array(reviews[reviewIndex].rating)].map((_, i) => (
                      <FiStar key={i} className="w-4 h-4 text-orange-400 fill-orange-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-slate-700 italic leading-relaxed mb-6">
                    "{reviews[reviewIndex].comment}"
                  </blockquote>
                  <div>
                    <p className="font-bold text-[#111827]">{reviews[reviewIndex].name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{reviews[reviewIndex].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button onClick={() => setReviewIndex(p => (p - 1 + reviews.length) % reviews.length)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm cursor-pointer">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {reviews.map((_, i) => (
                  <button key={i} onClick={() => setReviewIndex(i)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${reviewIndex === i ? 'w-6 h-2.5 bg-emerald-500' : 'w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400'}`}
                  />
                ))}
              </div>
              <button onClick={() => setReviewIndex(p => (p + 1) % reviews.length)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm cursor-pointer">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FAQ ═════════════════════════════════════════════ */}
      <section id="faq" className="py-24 bg-[#FAFAF8]">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="font-poppins text-3xl sm:text-4xl font-extrabold text-[#111827] mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-500 text-sm">Everything you need to know about our platform.</p>
          </FadeIn>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <motion.div
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.01 }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="font-semibold text-sm text-[#111827] group-hover:text-emerald-600 transition-colors">{faq.q}</span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-500 flex-shrink-0 ml-4"
                    >
                      <FiArrowRight className="w-3 h-3" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA SECTION ═════════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 via-emerald-700 to-[#065F46] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-black/10"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-6xl mb-6 inline-block"
            >🚀</motion.div>
            <h2 className="font-poppins text-3xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
              Experience the Future of<br />
              Local Grocery Management
            </h2>
            <p className="text-emerald-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Join 1,000+ families who have transformed their grocery experience. Sign up free and get instant access to your Digital Khata.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-white text-emerald-700 font-extrabold px-8 py-4 rounded-2xl text-sm shadow-2xl shadow-black/20 hover:shadow-white/20 transition-all"
                >
                  Create Free Account <FiArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl text-sm border border-white/20 backdrop-blur-sm transition-all"
                >
                  Sign In to Dashboard
                </Link>
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-10 text-emerald-200 text-xs">
              <span className="flex items-center gap-1.5"><FiCheck className="w-3.5 h-3.5" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><FiCheck className="w-3.5 h-3.5" /> Free forever for customers</span>
              <span className="flex items-center gap-1.5"><FiCheck className="w-3.5 h-3.5" /> Instant setup</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════════════════════════════ */}
      <footer className="bg-[#0d1117] text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-2.5 rounded-xl text-white">
                  <FiShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-poppins font-extrabold text-lg text-white">Shivam Kirana</span>
                  <p className="text-[10px] text-slate-400">Smart Retail ERP</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Redefining traditional Indian neighborhood grocery shopping into a premium digital credit-ledger e-commerce platform.
              </p>
              <div className="flex gap-3">
                {['🐦', '📘', '📸', '▶️'].map((icon, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.2, y: -2 }}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-sm border border-slate-700 cursor-pointer transition-colors"
                  >
                    {icon}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white text-sm mb-5 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-3">
                {[['🛒 Shop Products', '/login'], ['📒 My Khata', '/login'], ['📊 Admin Panel', '/admin'], ['📝 Register', '/register']].map(([label, to], i) => (
                  <li key={i}>
                    <Link to={to} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-bold text-white text-sm mb-5 uppercase tracking-wider">Features</h4>
              <ul className="space-y-3">
                {['Digital Khata System', 'UPI Payment Settlement', 'WhatsApp Notifications', 'GST Invoice Generation', 'Barcode Scanner', 'Business Analytics'].map((f, i) => (
                  <li key={i} className="text-xs text-slate-400 hover:text-emerald-400 cursor-default transition-colors">{f}</li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white text-sm mb-5 uppercase tracking-wider">Store Location</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <FiMapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Sector 4, HSR Layout,<br />Bengaluru, Karnataka 560102</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FiPhone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>+91 99887 76655</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FiMail className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>shivam@kirana.store</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FiClock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>Open 7AM – 10PM, All Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4">
            <p className="text-[11px] text-slate-500">
              © 2026 Shivam Kirana Store. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Built to compete with</span>
              {['Blinkit', 'Zepto', 'Instamart'].map((brand, i) => (
                <span key={i} className="text-[10px] font-bold text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">{brand}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
