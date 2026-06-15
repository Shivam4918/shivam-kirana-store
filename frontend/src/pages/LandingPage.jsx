import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  FiShoppingBag, FiCheckCircle, FiChevronDown, FiChevronUp,
  FiStar, FiTruck, FiCreditCard, FiShield, FiArrowRight, FiLock, FiArrowDownLeft, FiArrowUpRight
} from 'react-icons/fi';

const LandingPage = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  const reviews = [
    {
      name: "Aarav Sharma",
      role: "Regular Customer",
      comment: "Shivam Kirana has made grocery shopping so easy. The digital Khata system is transparent and I can checkout on credit instantly!",
      rating: 5
    },
    {
      name: "Pooja Patel",
      role: "Verified Buyer",
      comment: "10-minute delivery is actually real! The fresh produce is top-notch, and the web interface is incredibly smooth and easy to use.",
      rating: 5
    },
    {
      name: "Vikram Malhotra",
      role: "Local Resident",
      comment: "Highly professional system. Love the light theme redesign, it feels like using Blinkit or Zepto but with my trusted local store ledger.",
      rating: 5
    }
  ];

  const faqs = [
    {
      q: "How does the Digital Khata credit system work?",
      a: "Registered customers can checkout their groceries directly on credit. Every credit purchase automatically appends a transaction log and updates your outstanding ledger balance. You can clear your ledger debt at the store counter anytime."
    },
    {
      q: "What happens if my Khata account is locked?",
      a: "If the shop administrator locks your ledger access, credit checkouts will be temporarily suspended. You will still be able to browse items, but you must settle your unpaid balances with the store owner to unlock checkouts."
    },
    {
      q: "Is there a delivery fee?",
      a: "We offer free delivery for orders above ₹200 within a 3km radius. Standard deliveries are completed in under 10-15 minutes."
    },
    {
      q: "Can I track my transaction history?",
      a: "Yes! Log in and head over to the 'Digital Khata Book' tab in your dashboard. You will see a complete, downloadable ledger showing purchase descriptions, item prices, quantities, and snapshot balances."
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-secondary flex flex-col relative overflow-x-hidden">

      {/* Background patterns */}
      <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none"></div>

      {/* Guest Navbar */}
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-primary p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <FiShoppingBag className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="font-poppins font-extrabold text-xl tracking-tight text-secondary leading-none block">
              Shivam <span className="text-primary font-bold">Kirana Store</span>
            </span>
            <span className="text-[10px] text-text-secondary font-medium tracking-wide">Instant Delivery & Ledger System</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="text-text-secondary hover:text-secondary text-sm font-bold transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 cursor-pointer transition-all"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero & E-Commerce Mockup Section */}
      <section className="max-w-7xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 flex-1">

        {/* Left Info Column */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 bg-emerald-55 text-primary border border-emerald-100 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <FiTruck className="w-3.5 h-3.5" />
            <span>Delivered in 10-15 Minutes</span>
          </div>

          <h2 className="font-poppins text-4xl sm:text-5xl lg:text-6xl font-extrabold text-secondary tracking-tight leading-[1.1]">
            Your Trusted Local Store, <br />
            Now <span className="text-primary font-bold">Digitized.</span>
          </h2>

          <p className="text-base sm:text-lg text-text-secondary max-w-xl font-light leading-relaxed">
            Order fresh groceries, dairy items, and household essentials instantly. Settle accounts smoothly using our secure digital **Khata Ledger system** tailored for premium customers.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/login"
              className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md shadow-emerald-500/15 flex items-center space-x-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>Shop on Credit Now</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="bg-white hover:bg-slate-50 text-secondary border border-slate-250 font-bold px-6 py-3 rounded-2xl text-sm shadow-sm flex items-center space-x-2 active:scale-95 transition-all cursor-pointer"
            >
              <span>Create Account</span>
            </Link>
          </div>

          {/* Quick value highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-3xl">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-premium flex items-start space-x-3 hover:scale-[1.02] transition-transform duration-200">
              <div className="bg-emerald-50 p-2 rounded-xl text-primary border border-emerald-100 flex-shrink-0">
                <FiTruck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-secondary">Fast Delivery</h4>
                <p className="text-xs text-text-secondary mt-1">Superfast home delivery directly to your door.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-premium flex items-start space-x-3 hover:scale-[1.02] transition-transform duration-200">
              <div className="bg-emerald-50 p-2 rounded-xl text-primary border border-emerald-100 flex-shrink-0">
                <FiCreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-secondary">Khata System</h4>
                <p className="text-xs text-text-secondary mt-1">Buy on trusted shop credit with real-time logs.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-premium flex items-start space-x-3 hover:scale-[1.02] transition-transform duration-200">
              <div className="bg-emerald-50 p-2 rounded-xl text-primary border border-emerald-100 flex-shrink-0">
                <FiShield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-secondary">100% Safe</h4>
                <p className="text-xs text-text-secondary mt-1">Encrypted personal login for secure ledgers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Shop Image Column */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-md group">
            {/* Ambient glowing effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-orange-400 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 -z-10"></div>

            {/* Main Premium Card */}
            <div className="bg-white border border-slate-200/50 rounded-3xl p-3 shadow-premium-lg overflow-hidden relative">
              <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"
                  alt="Shivam Kirana Store - Fresh Produce"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

                {/* Float badges on the image */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/20 shadow-md flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-extrabold tracking-wider text-secondary uppercase">Store Open</span>
                </div>

                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-[10px] font-extrabold tracking-wider uppercase border border-slate-700/50 flex items-center space-x-1">
                  <FiStar className="text-amber-400 fill-amber-400 w-3 h-3" />
                  <span>4.9 Rated</span>
                </div>

                {/* Bottom text inside the image */}
                <div className="absolute bottom-4 left-4 right-4 text-left font-poppins">
                  <span className="text-primary text-[10px] font-extrabold uppercase tracking-widest block mb-1">Trusted & Certified</span>
                  <h3 className="text-white font-extrabold text-xl leading-tight">Freshness Guaranteed, Handpicked Daily</h3>
                </div>
              </div>

              {/* Little stats bar under the image for extra premium feel */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                <div>
                  <span className="text-[9px] font-bold text-text-secondary uppercase block">Range</span>
                  <span className="text-xs font-bold text-secondary">5000+ Items</span>
                </div>
                <div className="border-x border-slate-100">
                  <span className="text-[9px] font-bold text-text-secondary uppercase block">Service</span>
                  <span className="text-xs font-bold text-secondary">Instant Khata</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-text-secondary uppercase block">Location</span>
                  <span className="text-xs font-bold text-secondary">HSR Layout</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </section>

      {/* Categories & Visual Banners Section */}
      <section className="bg-white py-16 border-y border-slate-200/40 relative z-10 text-left">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
            <h3 className="font-poppins font-extrabold text-2xl tracking-tight text-secondary">Browse Categories</h3>
            <p className="text-text-secondary text-sm">Explore our catalog of premium daily grocery categories.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {[
              { name: "Fresh Fruits", img: "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=150&q=80", count: "12 Items" },
              { name: "Vegetables", img: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=150&q=80", count: "18 Items" },
              { name: "Dairy & Eggs", img: "https://images.unsplash.com/photo-1528498033373-3c6c08e93d79?auto=format&fit=crop&w=150&q=80", count: "8 Items" },
              { name: "Bakery & Bread", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80", count: "10 Items" },
              { name: "Beverages", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=150&q=80", count: "15 Items" },
              { name: "Pantry Staples", img: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=150&q=80", count: "25 Items" },
            ].map((cat, i) => (
              <div key={i} className="bg-[#F8FAFC] border border-slate-100 hover:border-emerald-200 rounded-3xl p-4 text-center cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-premium hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden bg-slate-100 mb-3.5 group-hover:scale-105 transition-transform">
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <h4 className="font-semibold text-sm text-secondary group-hover:text-primary transition-colors">{cat.name}</h4>
                <p className="text-[10px] text-text-secondary font-medium mt-0.5">{cat.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive FAQ and Customer Reviews */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">

        {/* Left Side: Testimonials */}
        <div className="lg:col-span-5 space-y-6 text-left flex flex-col justify-center">
          <div className="inline-flex items-center space-x-1.5 text-primary text-xs font-bold uppercase tracking-wider">
            <FiStar className="fill-current w-4 h-4" />
            <span>Customer Stories</span>
          </div>
          <h3 className="font-poppins text-3xl font-extrabold text-secondary tracking-tight">What Our Customers Say</h3>

          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-premium relative min-h-[160px] flex flex-col justify-between">
            <div className="absolute top-[-10px] left-[30px] w-5 h-5 bg-white border-t border-l border-slate-200 rotate-45"></div>
            <p className="text-sm italic text-text-secondary leading-relaxed">
              "{reviews[reviewIndex].comment}"
            </p>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-secondary">{reviews[reviewIndex].name}</h4>
                <span className="text-[10px] text-text-secondary font-medium">{reviews[reviewIndex].role}</span>
              </div>
              <div className="flex space-x-0.5">
                {[...Array(reviews[reviewIndex].rating)].map((_, i) => (
                  <FiStar key={i} className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-1.5 justify-start">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setReviewIndex(i)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${reviewIndex === i ? 'bg-primary w-4' : 'bg-slate-300'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Accordion FAQ */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <h3 className="font-poppins text-3xl font-extrabold text-secondary tracking-tight">Frequently Asked Questions</h3>
          <p className="text-text-secondary text-sm">Everything you need to know about our grocery delivery and credit book system.</p>

          <div className="space-y-3 pt-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <span className="font-semibold text-sm text-secondary">{faq.q}</span>
                  {openFaq === i ? <FiChevronUp className="w-4 h-4 text-slate-500" /> : <FiChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-xs text-text-secondary leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/30">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-column Footer */}
      <footer className="bg-secondary text-white py-12 mt-auto border-t border-slate-800 text-left relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-primary p-2 rounded-xl text-white">
                <FiShoppingBag className="w-5 h-5" />
              </div>
              <span className="font-poppins font-bold text-lg tracking-tight">Shivam Kirana</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Redefining traditional Indian neighborhood grocery shopping into a premium digital credit-ledger e-commerce platform.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">Catalog Products</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ledger Accounts</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Special Offers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Admin Dashboard</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white uppercase tracking-wider mb-4">Help & Info</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">Credit Terms</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Refund Policies</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Delivery Range</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-white uppercase tracking-wider mb-4">Store Location</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Sector 4, HSR Layout, <br />
              Bengaluru, Karnataka, 560102
            </p>
            <p className="text-xs text-slate-400">
              Phone: +91 9988776655
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-800 mt-10 pt-6 text-center text-[10px] text-slate-500">
          <p>© 2026 Shivam Kirana Store. All rights reserved. Designed to compete with Instamart, Zepto, and Blinkit.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
