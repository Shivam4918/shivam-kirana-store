import { FiX, FiCalendar, FiTrendingUp, FiShoppingBag, FiGift, FiPieChart, FiDollarSign } from 'react-icons/fi';

const SummaryDrawer = ({ isOpen, onClose, monthlyData }) => {
  if (!isOpen) return null;

  const currentMonthName = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  
  // Calculate budget remaining
  const budgetRemaining = Math.max(0, monthlyData.budgetLimit - monthlyData.monthlySpending);
  const isOverBudget = monthlyData.monthlySpending > monthlyData.budgetLimit;

  // Simple SVG donut chart coordinates for visualization
  const progressPercent = monthlyData.monthlyBudgetProgress;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progressPercent, 100) / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between text-left z-10 animate-in slide-in-from-right duration-250">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <FiPieChart className="w-5 h-5 text-[#10B981]" />
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base tracking-tight">Shopping Insights</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Calendar header */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/50 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-[#10B981]">
                <FiCalendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Active Period</p>
                <p className="text-xs font-bold text-slate-800">{currentMonthName}</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Live Data
            </span>
          </div>

          {/* Budget Visualizer Chart */}
          <div className="bg-slate-905 border border-slate-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-lg">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Budget Limit</p>
                <h4 className="text-xl font-black font-mono">₹{monthlyData.monthlySpending} <span className="text-xs text-slate-405 font-normal">/ ₹{monthlyData.budgetLimit}</span></h4>
                <p className="text-[10px] text-slate-350 leading-relaxed font-medium">
                  {isOverBudget 
                    ? `⚠️ You have exceeded your budget by ₹${Math.abs(monthlyData.monthlySpending - monthlyData.budgetLimit).toFixed(2)}.`
                    : `Remaining: ₹${budgetRemaining.toFixed(2)} to spend.`}
                </p>
              </div>

              {/* Mini SVG Donut Chart */}
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Outer circle track */}
                  <circle
                    cx="36"
                    cy="36"
                    r="28"
                    className="stroke-slate-800"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  {/* Fill circle */}
                  <circle
                    cx="36"
                    cy="36"
                    r="28"
                    className={isOverBudget ? "stroke-rose-500" : "stroke-emerald-400"}
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 - (Math.min(progressPercent, 100) / 100) * 2 * Math.PI * 28}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-black font-mono text-white">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Stats Cards list */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Monthly Spending */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-left space-y-1">
              <div className="flex items-center space-x-1.5 text-[#10B981]">
                <FiDollarSign className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Total Spent</span>
              </div>
              <h5 className="text-base font-black text-slate-900 font-mono">₹{monthlyData.monthlySpending}</h5>
              <p className="text-[9px] text-slate-400 font-medium">Accumulated charges</p>
            </div>

            {/* Savings */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-left space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-600">
                <FiGift className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-455">Total Savings</span>
              </div>
              <h5 className="text-base font-black text-emerald-600 font-mono">₹{monthlyData.totalSavings}</h5>
              <p className="text-[9px] text-emerald-500 font-bold">5% instant cashback</p>
            </div>

            {/* Orders */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-left space-y-1">
              <div className="flex items-center space-x-1.5 text-blue-600">
                <FiShoppingBag className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-455">Invoices</span>
              </div>
              <h5 className="text-base font-black text-slate-900 font-mono">{monthlyData.totalOrders}</h5>
              <p className="text-[9px] text-slate-400 font-medium">Orders completed</p>
            </div>

            {/* Points */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-left space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-500">
                <FiTrendingUp className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-455">Points Earned</span>
              </div>
              <h5 className="text-base font-black text-amber-500 font-mono">+{monthlyData.rewardPointsEarned}</h5>
              <p className="text-[9px] text-slate-400 font-medium">Loyalty balance contribution</p>
            </div>

          </div>

          {/* Simple explanation panel */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 text-left space-y-2">
            <h6 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest">About Summary Insights</h6>
            <p className="text-[10px] text-slate-500 leading-normal font-medium">
              Shivam Kirana Store compiles all your grocery credit checkout logs during the calendar month. Your budget limit can be modified on the main dashboard stats settings.
            </p>
          </div>

        </div>

        {/* Footer closing button */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all duration-200 active:scale-98 cursor-pointer text-center"
          >
            Close Insights
          </button>
        </div>

      </div>
    </div>
  );
};

export default SummaryDrawer;
