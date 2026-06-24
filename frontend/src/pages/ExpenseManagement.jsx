import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiDollarSign, FiCalendar, FiFilter, FiX, FiCheckCircle, FiAlertCircle 
} from 'react-icons/fi';

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ today_expenses: 0, monthly_expenses: 0, yearly_expenses: 0, breakdown: [] });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('MISC');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    { value: 'RENT', label: 'Rent' },
    { value: 'ELECTRICITY', label: 'Electricity' },
    { value: 'INTERNET', label: 'Internet' },
    { value: 'SALARY', label: 'Staff Salary' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'MISC', label: 'Miscellaneous' }
  ];

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = '/expenses/?';
      if (searchQuery) url += `search=${searchQuery}&`;
      if (selectedCategory) url += `category=${selectedCategory}&`;
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}&`;
      
      const res = await api.get(url);
      setExpenses(res.data);
      
      const summaryRes = await api.get('/expenses/summary/');
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(expenses.length / pageSize);
  const paginatedExpenses = expenses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    fetchExpenses();
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, startDate, endDate]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [expenses.length, currentPage, totalPages]);

  const openAddModal = () => {
    setModalType('add');
    setSelectedExpense(null);
    setTitle('');
    setCategory('MISC');
    setAmount('');
    setDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (exp) => {
    setModalType('edit');
    setSelectedExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDescription(exp.description || '');
    setExpenseDate(exp.expense_date);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!title || !amount) {
      setErrorMsg('Title and amount are required fields.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setErrorMsg('Amount must be a positive number.');
      return;
    }

    const payload = {
      title,
      category,
      amount: parseFloat(amount),
      description,
      expense_date: expenseDate
    };

    try {
      if (modalType === 'add') {
        await api.post('/expenses/', payload);
        setSuccessMsg('Expense logged successfully!');
      } else {
        await api.put(`/expenses/${selectedExpense.id}/`, payload);
        setSuccessMsg('Expense updated successfully!');
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Save failed. Check inputs.');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense log?')) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.delete(`/expenses/${id}/`);
      setSuccessMsg('Expense deleted successfully!');
      fetchExpenses();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete expense record.');
    }
  };

  // Find max category for chart scaling
  const maxCategoryTotal = Math.max(...summary.breakdown.map(c => c.total), 1);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50 text-[#111827] flex flex-col justify-start relative text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-poppins font-extrabold text-secondary">Expense Ledger</h2>
          <p className="text-[#6B7280] text-xs sm:text-sm">Track operating costs, utility payments, wages, and maintenance fees.</p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-hover text-white font-bold px-4.5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
        >
          <FiPlus className="w-4.5 h-4.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-55 border border-emerald-200 text-emerald-600 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-medium">
          <FiCheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-250 text-rose-600 p-3.5 rounded-2xl text-xs flex items-center space-x-2 font-medium">
          <FiAlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Today's Expenses */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-emerald-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Today's Expenses</span>
            <p className="text-3xl font-poppins font-extrabold text-secondary">₹{summary.today_expenses.toFixed(2)}</p>
            <p className="text-[10px] text-text-secondary">Expenses logged for today</p>
          </div>
          <div className="bg-emerald-50 text-primary p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
            <FiDollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-blue-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Monthly Expenses</span>
            <p className="text-3xl font-poppins font-extrabold text-primary">₹{summary.monthly_expenses.toFixed(2)}</p>
            <p className="text-[10px] text-text-secondary">Cumulative billing this month</p>
          </div>
          <div className="bg-blue-50 text-blue-500 p-3.5 rounded-2xl border border-blue-100 shadow-sm">
            <FiCalendar className="w-5 h-5" />
          </div>
        </div>

        {/* Yearly Expenses */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center justify-between relative overflow-hidden shadow-sm hover:shadow-premium transition-shadow">
          <div className="absolute top-[-20%] right-[-10%] w-20 h-20 rounded-full bg-amber-500/5 blur-lg"></div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Yearly Expenses</span>
            <p className="text-3xl font-poppins font-extrabold text-secondary">₹{summary.yearly_expenses.toFixed(2)}</p>
            <p className="text-[10px] text-text-secondary">Total overheads logged in 2026</p>
          </div>
          <div className="bg-amber-50 text-amber-500 p-3.5 rounded-2xl border border-amber-100 shadow-sm">
            <FiDollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Graphical Breakdown + Expense Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Filters & Expense Logs List */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filters card */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-secondary text-sm flex items-center space-x-2">
              <FiFilter className="text-primary w-4.5 h-4.5" />
              <span>Filter Expense Logs</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4">
              
              {/* Search Title */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl py-2 pl-9 pr-3 text-xs text-text-primary outline-none transition-all"
                />
              </div>

              {/* Category selector */}
              <div className="flex-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl py-2 px-3 text-xs font-semibold text-secondary outline-none transition-all cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 flex-1">
                <span className="text-[10px] text-text-secondary font-bold">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-secondary outline-none w-full cursor-pointer"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 flex-1">
                <span className="text-[10px] text-text-secondary font-bold">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-secondary outline-none w-full cursor-pointer"
                />
              </div>

            </div>

            {(searchQuery || selectedCategory || startDate || endDate) && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                  <span>Clear Active Filters</span>
                </button>
              </div>
            )}
          </div>

          {/* Table list */}
          {loading ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
          ) : expenses.length > 0 ? (
            <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase font-bold tracking-wider text-[#6B7280] bg-slate-50/70">
                      <th className="py-4 px-6">Expense details</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6 text-right">Amount (₹)</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-secondary capitalize leading-snug">{e.title}</p>
                            <p className="text-xs text-text-secondary mt-1 font-light leading-normal line-clamp-1 max-w-xs">{e.description || 'No notes provided.'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] font-extrabold text-secondary bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md uppercase tracking-wide">
                            {categories.find(c => c.value === e.category)?.label || e.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-text-secondary">
                          <span className="flex items-center space-x-2">
                            <FiCalendar className="text-slate-400 w-4 h-4" />
                            <span>{new Date(e.expense_date).toLocaleDateString()}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-secondary text-right text-sm">₹{parseFloat(e.amount).toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openEditModal(e)}
                              className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-text-secondary hover:text-primary border border-slate-200 hover:border-emerald-250 transition-all shadow-sm cursor-pointer"
                              title="Edit Expense"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-2 rounded-xl bg-white hover:bg-rose-50 text-text-secondary hover:text-rose-500 border border-slate-200 hover:border-rose-250 transition-all shadow-sm cursor-pointer"
                              title="Delete Expense"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                  >
                    <span>&larr; Previous</span>
                  </button>
                  <span className="text-xs font-medium text-text-secondary">
                    Page <span className="font-bold text-secondary">{currentPage}</span> of <span className="font-bold text-secondary">{totalPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3.5 py-2 text-xs font-bold text-secondary border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent rounded-xl cursor-pointer transition-all flex items-center space-x-1"
                  >
                    <span>Next &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl py-16 px-4 flex flex-col items-center justify-center space-y-3.5 text-center shadow-sm">
              <div className="bg-slate-50 p-4 rounded-full text-slate-350">
                <FiDollarSign className="w-8 h-8" />
              </div>
              <h3 className="text-secondary font-bold text-sm">No expenses catalogued</h3>
              <p className="text-text-secondary text-xs max-w-sm text-center">Add operational costs using the "Record Expense" button to build overhead statement history.</p>
            </div>
          )}
        </div>

        {/* Right: Category Breakdown Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-secondary text-sm sm:text-base">Category Overheads</h3>
            <p className="text-text-secondary text-xs mt-1">Breakdown of operating costs aggregated by overhead category.</p>
          </div>

          <div className="space-y-4">
            {summary.breakdown.length > 0 ? (
              summary.breakdown.map((item) => {
                const widthPercent = (item.total / maxCategoryTotal) * 100;
                const label = categories.find(c => c.value === item.category)?.label || item.category;
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium">{label}</span>
                      <span className="text-secondary font-bold">₹{item.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/30">
                      <div 
                        style={{ width: `${widthPercent || 0}%` }}
                        className="h-full rounded-full bg-primary transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2 text-center text-xs text-text-secondary">
                <FiDollarSign className="w-5 h-5 text-slate-400" />
                <span>No expense data logged to chart.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Record/Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-premium-lg relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-secondary p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-poppins font-extrabold text-secondary mb-6 text-left">
              {modalType === 'add' ? 'Record Shop Expense' : 'Modify Expense Log'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Expense Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  placeholder="e.g. May Electricity Bill"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-3 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="1500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Expense Date *</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl py-2.5 px-4 text-sm text-[#111827] focus:ring-2 focus:ring-emerald-100 outline-none transition-all resize-none"
                  placeholder="Record bill references, voucher IDs, or specific payments details..."
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-text-secondary font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer text-center text-sm"
                >
                  {modalType === 'add' ? 'Log Expense' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpenseManagement;
