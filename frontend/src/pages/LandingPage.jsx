import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  FiShoppingBag, FiStar, FiArrowRight, FiTrendingUp,
  FiBook, FiPackage, FiUsers, FiBarChart2, FiZap, FiCheck,
  FiChevronLeft, FiChevronRight, FiMapPin, FiPhone, FiMail,
  FiClock, FiActivity, FiLock
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
    hidden: { 
      opacity: 0, 
      y: direction === 'up' ? 30 : direction === 'down' ? -30 : 0, 
      x: direction === 'left' ? 30 : direction === 'right' ? -30 : 0 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      x: 0, 
      transition: { duration: 0.6, delay, ease: [0.215, 0.61, 0.355, 1] } 
    }
  };
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={variants} className={className}>
      {children}
    </motion.div>
  );
};

// ─── Floating Grocery Icon ───────────────────────────────────────────────────
const FloatingEmoji = ({ emoji, x, y, delay, size = 'text-3xl', duration = 5 }) => (
  <motion.div
    className={`absolute ${size} select-none pointer-events-none opacity-40`}
    style={{ left: x, top: y }}
    animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
    transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
  >
    {emoji}
  </motion.div>
);

// ─── Gradient Mesh Background ────────────────────────────────────────────────
const MeshBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute w-[600px] h-[600px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', top: '-10%', right: '-5%' }}
      animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute w-[500px] h-[500px] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)', bottom: '10%', left: '-5%' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
    />
    {/* Grid dots */}
    <div className="absolute inset-0 opacity-[0.015]" style={{
      backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
      backgroundSize: '30px 30px'
    }} />
  </div>
);

// ─── Flat Minimalist Stat Card ─────────────────────────────────────────────────
const FlatStatCard = ({ icon, value, label, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -3 }}
    className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm text-left flex items-center space-x-3.5 hover:border-slate-350 transition-all duration-200"
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-lg font-semibold text-slate-900 font-mono tracking-tight leading-none">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  </motion.div>
);

// ─── Feature Card ────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, delay }) => (
  <FadeIn delay={delay}>
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl p-6 border border-slate-200/50 shadow-sm hover:border-slate-350 hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between h-full group"
    >
      <div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#10B981] flex items-center justify-center mb-5 border border-emerald-100 group-hover:bg-[#10B981] group-hover:text-white transition-colors duration-200">
          {icon}
        </div>
        <h3 className="font-semibold text-slate-900 text-base mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed font-normal">{desc}</p>
      </div>
    </motion.div>
  </FadeIn>
);

// ─── Trust Card ──────────────────────────────────────────────────────────────
const TrustCard = ({ emoji, title, desc, delay }) => (
  <FadeIn delay={delay}>
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-white border border-slate-200/50 rounded-xl p-6 text-left hover:border-slate-350 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="text-3xl mb-4">{emoji}</div>
      <h3 className="font-semibold text-slate-900 text-sm mb-1.5 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed font-normal">{desc}</p>
    </motion.div>
  </FadeIn>
);

// ─── Animated Stat ────────────────────────────────────────────────────────
const AnimatedStat = ({ value, suffix, label, delay }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCounter(value, 2000, inView);
  return (
    <FadeIn delay={delay} className="text-center">
      <div ref={ref}>
        <motion.p
          className="text-5xl font-semibold tracking-tight text-white font-mono"
          animate={{ scale: inView ? [1.1, 1] : 1 }}
          transition={{ duration: 0.4, delay: delay + 0.1 }}
        >
          {count.toLocaleString()}{suffix}
        </motion.p>
        <p className="text-xs text-emerald-200/70 font-semibold uppercase tracking-wider mt-2.5">{label}</p>
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
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setNavScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setReviewIndex(p => (p + 1) % reviews.length), 6000);
    return () => clearInterval(interval);
  }, []);

  const reviews = [
    { name: 'Aarav Sharma', role: 'Regular Customer, HSR Layout', comment: "Shivam Kirana has completely transformed how I manage my grocery credit. The digital Khata is transparent and I can see every rupee in real time!", rating: 5, avatar: '👨‍B' },
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col overflow-x-hidden font-sans antialiased">

      {/* ══════════════════════════════ NAVBAR ══════════════════════════════ */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`w-full fixed top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-200 ${
          navScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/40 shadow-sm py-3' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="bg-[#10B981] p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center">
            <FiShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="font-poppins font-semibold text-lg text-slate-900 tracking-tight leading-none block">
              Shivam <span className="text-[#10B981] font-bold">Kirana</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">Smart Retail ERP</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#stats" className="hover:text-slate-900 transition-colors">Stats</a>
          <a href="#testimonials" className="hover:text-slate-900 transition-colors">Customers</a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
            Sign In
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/register"
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 shadow-sm"
            >
              Get Started &rarr;
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* ══════════════════════════════ HERO ════════════════════════════════ */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
        <MeshBackground />

        <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* Left */}
          <div className="space-y-8 flex flex-col items-start text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 text-[#10B981] px-3.5 py-1.5 rounded-full text-xs font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Serving 1,000+ Families Digitally
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="font-poppins text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.1] max-w-2xl"
            >
              Your Neighborhood Store,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#059669]">
                Reimagined
              </span>{' '}
              Digitally.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-slate-500 text-base sm:text-lg max-w-lg leading-relaxed font-normal"
            >
              Shop smarter, track your digital ledger, and stay connected with your trusted neighborhood store — all in one premium platform.
            </motion.p>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-2.5"
            >
              {['⚡ Instant Checkout', '🔒 Secure Ledger', '📱 Mobile Ready', '🎯 98% Satisfaction'].map((badge, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                  {badge}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-6 py-3 rounded-lg shadow-sm text-sm transition-all"
                >
                  Shop on Credit Now <FiArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-lg border border-slate-200 shadow-sm text-sm transition-all"
                >
                  Create Free Account
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-4 pt-4"
            >
              <div className="flex -space-x-2">
                {['👨‍💼', '👩‍💻', '👨‍🔧', '👩‍🏫', '👨‍🍳'].map((av, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs shadow-sm">
                    {av}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => <FiStar key={i} className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Trusted by <strong className="text-slate-900 font-bold">1,000+</strong> local families</p>
              </div>
            </motion.div>
          </div>

          {/* Right — Flat Mockup + Stats */}
          <div className="relative flex justify-center items-center min-h-[480px]">

            {/* Floating Emojis */}
            <FloatingEmoji emoji="🍎" x="5%" y="10%" delay={0} duration={4} size="text-3xl" />
            <FloatingEmoji emoji="🥛" x="85%" y="8%" delay={0.5} duration={4.5} size="text-2xl" />
            <FloatingEmoji emoji="🧅" x="80%" y="65%" delay={1} duration={4.2} size="text-2xl" />
            <FloatingEmoji emoji="🍌" x="2%" y="60%" delay={1.5} duration={4.8} size="text-2xl" />

            {/* Mockup Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative z-10 w-full max-w-sm"
            >
              {/* Vercel style Mockup */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg shadow-slate-100">
                
                {/* Title bar */}
                <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">shivamkirana.store/dashboard</span>
                  <div className="w-12"></div>
                </div>

                {/* Card body */}
                <div className="p-5 space-y-5 text-left">
                  {/* Revenue trend mini visualization */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Revenue</span>
                      <span className="text-xs font-semibold text-[#10B981]">↑ +24.5%</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-14">
                      {[30, 55, 40, 75, 50, 85, 70].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-t origin-bottom"
                          style={{ 
                            background: i === 5 ? '#10B981' : '#F1F5F9',
                            height: `${h}%`,
                            willChange: 'transform'
                          }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Ledger lines */}
                  <div className="space-y-3 pt-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Activity</div>
                    {[
                      { name: 'Aarav Sharma', amount: '₹1,250', type: 'credit', time: '2m ago' },
                      { name: 'Meera Nair', amount: '₹800', type: 'paid', time: '15m ago' },
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] ${tx.type === 'credit' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-[#10B981]'}`}>
                            {tx.type === 'credit' ? 'CR' : 'PD'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 leading-none">{tx.name}</p>
                            <p className="text-[9px] text-slate-400 mt-1">{tx.time}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold font-mono ${tx.type === 'credit' ? 'text-orange-600' : 'text-[#10B981]'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Minimal floating stats */}
              <div className="absolute -top-6 -right-6 w-32">
                <FlatStatCard icon={<FiUsers className="w-3.5 h-3.5" />} value="1,200+" label="Customers" color="bg-blue-500" delay={0.6} />
              </div>
              <div className="absolute -bottom-6 -left-6 w-32">
                <FlatStatCard icon={<FiPackage className="w-3.5 h-3.5" />} value="1,500+" label="Products" color="bg-orange-500" delay={0.7} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════ LIVE STATS COUNTERS ═════════════════════════════ */}
      <section id="stats" className="py-20 bg-[#0F172A] relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 5000, suffix: '+', label: 'Orders Fulfilled' },
              { value: 1000, suffix: '+', label: 'Happy Customers' },
              { value: 1500, suffix: '+', label: 'Products Listed' },
              { value: 98, suffix: '%', label: 'Satisfaction Rate' },
            ].map((s, i) => (
              <div key={i} className="text-center text-white">
                <AnimatedStat {...s} delay={i * 0.1} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ TRUST SECTION ═══════════════════════════════ */}
      <section className="py-32 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-20">
            <span className="inline-block bg-emerald-50 text-[#10B981] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100 mb-4">Why Families Trust Us</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
              Building Neighborhood Trust through Technology
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">A neighborhood store with enterprise-grade technology, serving families with transparency and trust for years.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '🌿', title: 'Farm-Fresh Products', desc: 'Handpicked daily from trusted local suppliers. Freshness is our non-negotiable promise.', delay: 0 },
              { emoji: '🔐', title: 'Transparent Digital Khata', desc: 'Every rupee tracked in real-time. No hidden fees, no billing surprises — ever.', delay: 0.05 },
              { emoji: '⚡', title: 'Superfast Service', desc: 'From order placement to credit checkout — everything under 2 minutes.', delay: 0.1 },
              { emoji: '🧾', title: 'Accurate GST Billing', desc: 'Auto-generated tax invoices with HSN codes, CGST/SGST breakdown for every purchase.', delay: 0.15 },
              { emoji: '🤝', title: 'Community First', desc: 'Built for the neighborhood. Every feature is designed to strengthen local bonds.', delay: 0.2 },
              { emoji: '📱', title: 'Always Accessible', desc: 'Access your khata, shop, settle balances, and download reports from any device.', delay: 0.25 },
            ].map((item, i) => <TrustCard key={i} {...item} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURES SHOWCASE ═══════════════════════════════ */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-20">
            <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-200 mb-4">Smart Features</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
              Everything a Modern Kirana Needs
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">From inventory management to customer ledgers — a complete ERP platform designed for the Indian retail market.</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <FiBook className="w-4 h-4" />, title: 'Digital Khata Management', desc: 'Complete credit ledger system with real-time balance updates, transaction history, and PDF exports.', delay: 0 },
              { icon: <FiActivity className="w-4 h-4" />, title: 'Real-Time Balance Tracking', desc: 'Live outstanding balance with automated WhatsApp reminders and UPI payment settlement.', delay: 0.05 },
              { icon: <FiPackage className="w-4 h-4" />, title: 'Smart Inventory Control', desc: 'Barcode scanning, stock alerts, expiry tracking, and supplier purchase management.', delay: 0.1 },
              { icon: <FiBarChart2 className="w-4 h-4" />, title: 'Business Analytics', desc: 'P&L statements, balance sheets, cash flow reports, and GST audit exports in one click.', delay: 0.15 },
              { icon: <FiLock className="w-4 h-4" />, title: 'Secure Customer Access', desc: 'JWT-based authentication with role-based access. Admin and customer portals fully separated.', delay: 0.2 },
              { icon: <FiTrendingUp className="w-4 h-4" />, title: 'Revenue Intelligence', desc: 'Weekly trend charts, debt distribution analysis, and daily earnings snapshots for store owners.', delay: 0.25 },
            ].map((f, i) => <FeatureCard key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════ TIMELINE SECTION ════════════════════════════════ */}
      <section className="py-32 bg-[#F8FAFC] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-20">
            <span className="inline-block bg-emerald-50 text-[#10B981] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100 mb-4">Our Journey</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
              From Handwritten Notes to Modern ERP
            </h2>
          </FadeIn>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-12 left-0 right-0 h-[1.5px] bg-slate-200 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {timelineSteps.map((step, i) => (
                <FadeIn key={i} delay={i * 0.1} direction="up">
                  <div className="flex flex-col items-center text-center relative bg-white border border-slate-200/50 rounded-xl p-5 shadow-sm hover:border-slate-350 transition-all duration-200">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4 relative z-10 shadow-sm border border-slate-100"
                      style={{ background: '#F8FAFC' }}
                    >
                      {step.icon}
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 mb-1.5 tracking-tight">{step.label}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-normal">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ DASHBOARD PREVIEW ═══════════════════════════════ */}
      <section className="py-32 bg-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle, #10B981 1px, transparent 1px)',
          backgroundSize: '25px 25px'
        }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <FadeIn className="text-center mb-20">
            <span className="inline-block bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-700 mb-4">Dashboard Preview</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-4">
              A Premium Admin Experience
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">Manage your entire store from a single, beautiful dashboard. Built for speed, clarity, and control.</p>
          </FadeIn>

          {/* Dashboard mockup */}
          <FadeIn delay={0.1}>
            <div className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0d1117] max-w-4xl mx-auto">
              {/* Title bar */}
              <div className="bg-[#161b22] px-5 py-3.5 flex items-center gap-3 border-b border-slate-800">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                </div>
                <div className="flex-1 bg-[#0d1117] border border-slate-800 rounded-lg px-4 py-1 text-[11px] text-slate-500 text-center font-mono">
                  shivamkirana.store/admin
                </div>
                <div className="w-12"></div>
              </div>

              {/* Mockup Dashboard content */}
              <div className="p-6 bg-[#0d1117] text-left">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Today's Revenue", val: '₹12,450', change: '+18%', positive: true },
                    { label: 'Outstanding', val: '₹45,200', change: '-5%', positive: false },
                    { label: 'Customers', val: '1,243', change: '+12', positive: true },
                    { label: 'Products', val: '1,508', change: '+34', positive: true },
                  ].map((card, i) => (
                    <div key={i} className="bg-[#161b22] rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${card.positive ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950 text-rose-400 border border-rose-900/50'}`}>
                            {card.change}
                          </span>
                        </div>
                        <p className="text-white font-semibold font-mono text-xl tracking-tight">{card.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Chart area */}
                  <div className="lg:col-span-2 bg-[#161b22] rounded-xl p-4 border border-slate-800">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-4">Weekly Revenue Trend</p>
                    <div className="flex items-end gap-2.5 h-24">
                      {[55, 78, 60, 92, 68, 85, 95].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{ 
                            height: `${h}%`, 
                            background: i === 6 ? '#10B981' : '#21262d' 
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2.5">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <span key={d} className="text-[9px] font-mono text-slate-500">{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recent transactions */}
                  <div className="bg-[#161b22] rounded-xl p-4 border border-slate-800">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-4">Recent Actions</p>
                    <div className="space-y-3">
                      {[
                        { name: 'Aarav Sharma', amt: '+₹450', type: 'credit' },
                        { name: 'Meera Nair', amt: '-₹1,200', type: 'paid' },
                        { name: 'Ravi Kumar', amt: '+₹890', type: 'credit' },
                      ].map((t, i) => (
                        <div key={i} className="flex items-center justify-between pb-1.5 border-b border-slate-800 last:border-0 last:pb-0">
                          <span className="text-[11px] text-slate-300 font-semibold">{t.name}</span>
                          <span className={`text-[11px] font-mono font-semibold ${t.type === 'credit' ? 'text-orange-400' : 'text-[#10B981]'}`}>{t.amt}</span>
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
      <section className="py-32 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-20">
            <span className="inline-block bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-orange-100 mb-4">Digital Khata</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
              How the Digital Khata Works
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">From a customer's first purchase to full settlement — transparent, instant, and automatic.</p>
          </FadeIn>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {khataFlow.map((step, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <FadeIn delay={i * 0.08} className="w-full md:w-auto">
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="bg-white border border-slate-200/50 rounded-xl p-5 text-center flex flex-col items-center justify-center w-full md:w-28 shadow-sm"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center border mx-auto"
                      style={{ background: `${step.color}08`, borderColor: step.color + '20' }}
                    >
                      <span className="text-2xl">{step.icon}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 mt-3 max-w-[80px] leading-tight tracking-tight mx-auto">{step.label}</p>
                    <div
                      className="w-1.5 h-1.5 rounded-full mx-auto mt-2"
                      style={{ backgroundColor: step.color }}
                    />
                  </motion.div>
                </FadeIn>
                {i < khataFlow.length - 1 && (
                  <div className="hidden md:block w-6 h-[1.5px] bg-slate-200" />
                )}
              </div>
            ))}
          </div>

          <FadeIn delay={0.3} className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🔔', title: 'WhatsApp Alerts', desc: 'Instant transaction notifications via WhatsApp on every credit or payment.' },
              { icon: '💳', title: 'UPI Settlements', desc: 'Generate Razorpay payment links and QR codes directly from the dashboard.' },
              { icon: '📄', title: 'Report Exports', desc: 'Download PDF and Excel statements of complete ledger history anytime.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200/50 shadow-sm text-left">
                <span className="text-2xl block mb-4">{f.icon}</span>
                <h4 className="font-semibold text-slate-900 text-sm mb-1.5 tracking-tight">{f.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">{f.desc}</p>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ TESTIMONIALS ════════════════════════════════════ */}
      <section id="testimonials" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-20">
            <span className="inline-block bg-emerald-50 text-[#10B981] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100 mb-4">Customer Stories</span>
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-4">
              Trusted by Your Neighborhood
            </h2>
          </FadeIn>

          <div className="relative max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={reviewIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <div className="bg-[#F8FAFC] border border-slate-200/60 rounded-xl p-8 sm:p-10 shadow-sm text-center">
                  <span className="text-4xl block mb-4">{reviews[reviewIndex].avatar}</span>
                  <div className="flex justify-center gap-0.5 mb-5">
                    {[...Array(reviews[reviewIndex].rating)].map((_, i) => (
                      <FiStar key={i} className="w-4 h-4 text-orange-400 fill-orange-400" />
                    ))}
                  </div>
                  <blockquote className="text-base sm:text-lg text-slate-700 italic leading-relaxed mb-6 font-normal">
                    "{reviews[reviewIndex].comment}"
                  </blockquote>
                  <div>
                    <p className="font-semibold text-slate-900 tracking-tight text-sm">{reviews[reviewIndex].name}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{reviews[reviewIndex].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button 
                onClick={() => setReviewIndex(p => (p - 1 + reviews.length) % reviews.length)}
                className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-slate-350 transition-all shadow-sm cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex gap-2">
                {reviews.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setReviewIndex(i)}
                    className={`transition-all duration-300 rounded-full cursor-pointer h-1.5 ${reviewIndex === i ? 'w-4 bg-slate-800' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
                  />
                ))}
              </div>
              <button 
                onClick={() => setReviewIndex(p => (p + 1) % reviews.length)}
                className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-slate-350 transition-all shadow-sm cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ FAQ ═════════════════════════════════════════════ */}
      <section id="faq" className="py-32 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="text-center mb-20">
            <h2 className="font-poppins text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-500 text-sm">Everything you need to know about our platform.</p>
          </FadeIn>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-slate-950 transition-colors tracking-tight">{faq.q}</span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 90 : 0 }}
                      className="w-5 h-5 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0 ml-4 group-hover:border-slate-350 transition-colors"
                    >
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ willChange: 'height, opacity' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 text-slate-500 text-xs sm:text-sm leading-relaxed border-t border-slate-100 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA SECTION ═════════════════════════════════════ */}
      <section className="py-32 bg-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'radial-gradient(circle, #FFF 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
          <FadeIn className="space-y-6">
            <div className="text-5xl inline-block">🚀</div>
            <h2 className="font-poppins text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
              Experience the Future of<br />
              Local Grocery Management
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed font-normal">
              Join 1,000+ families who have transformed their grocery experience. Sign up free and get instant access to your Digital Khata.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-8 py-3.5 rounded-lg text-sm shadow-sm transition-all"
                >
                  Create Free Account <FiArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-3.5 rounded-lg text-sm border border-slate-700 transition-all"
                >
                  Sign In to Dashboard
                </Link>
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 text-slate-500 text-xs font-medium">
              <span className="flex items-center gap-1.5"><FiCheck className="w-3.5 h-3.5 text-[#10B981]" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><FiCheck className="w-3.5 h-3.5 text-[#10B981]" /> Free forever for customers</span>
              <span className="flex items-center gap-1.5"><FiCheck className="w-3.5 h-3.5 text-[#10B981]" /> Instant setup</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════════════════════════════ */}
      <footer className="bg-[#0F172A] border-t border-slate-800 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-slate-850">
            {/* Brand */}
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="bg-[#10B981] p-2.5 rounded-xl text-white">
                  <FiShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-poppins font-semibold text-lg text-white tracking-tight">Shivam Kirana</span>
                  <p className="text-[10px] text-slate-500">Smart Retail ERP</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-normal">
                Redefining traditional Indian neighborhood grocery shopping into a premium digital credit-ledger e-commerce platform.
              </p>
            </div>

            {/* Quick Links */}
            <div className="text-left">
              <h4 className="font-semibold text-white text-xs mb-5 uppercase tracking-wider font-poppins">Quick Links</h4>
              <ul className="space-y-3.5">
                {[
                  ['🛒 Shop Products', '/login'], 
                  ['📒 My Khata', '/login'], 
                  ['📊 Admin Panel', '/admin'], 
                  ['📝 Register', '/register']
                ].map(([label, to], i) => (
                  <li key={i}>
                    <Link to={to} className="text-xs text-slate-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div className="text-left">
              <h4 className="font-semibold text-white text-xs mb-5 uppercase tracking-wider font-poppins">Features</h4>
              <ul className="space-y-3.5">
                {['Digital Khata System', 'UPI Payment Settlement', 'WhatsApp Notifications', 'GST Invoice Generation', 'Barcode Scanner', 'Business Analytics'].map((f, i) => (
                  <li key={i} className="text-xs text-slate-400 cursor-default">{f}</li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="text-left">
              <h4 className="font-semibold text-white text-xs mb-5 uppercase tracking-wider font-poppins">Store Location</h4>
              <div className="space-y-3.5">
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <FiMapPin className="w-3.5 h-3.5 text-[#10B981] mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">Sector 4, HSR Layout,<br />Bengaluru, Karnataka 560102</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FiPhone className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                  <span>+91 99887 76655</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FiMail className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                  <span>shivam@kirana.store</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <FiClock className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                  <span>Open 7AM – 10PM, All Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4">
            <p className="text-[11px] text-slate-500 font-medium">
              © 2026 Shivam Kirana Store. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 font-medium">Built to compete with</span>
              {['Blinkit', 'Zepto', 'Instamart'].map((brand, i) => (
                <span key={i} className="text-[10px] font-bold text-slate-500 border border-slate-800 px-2.5 py-0.5 rounded-full">{brand}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
