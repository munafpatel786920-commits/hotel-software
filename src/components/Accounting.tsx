import { getLocalISODate } from '../utils/date';
import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  TrendingDown,
  TrendingUp,
  Receipt,
  Download,
  AlertTriangle,
  Scale,
  Trash2
} from 'lucide-react';
import { FinancialTransaction } from '../types';

interface AccountingProps {
  transactions: FinancialTransaction[];
  currencySymbol: string;
  hotelId: string;
  onAddTransaction: (tx: Omit<FinancialTransaction, 'id'>) => Promise<void>;
  onDeleteTransaction?: (id: string) => Promise<void>;
}

export default function Accounting({
  transactions,
  currencySymbol,
  hotelId,
  onAddTransaction,
  onDeleteTransaction
}: AccountingProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'add'>('pnl');

  // Deletion & Feedback States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // New Transaction Form States
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState(100);
  const [category, setCategory] = useState('Utility Bills');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  // Calculations
  const incomeTrans = transactions.filter((t) => t.type === 'income');
  const expenseTrans = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTrans.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenseTrans.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || amount <= 0) {
      alert('Please fill out a valid description and amount.');
      return;
    }

    try {
      await onAddTransaction({
        category,
        amount: Number(amount),
        date: getLocalISODate(),
        description: desc,
        type,
        hotelId
      });
      triggerFeedback('success', 'Transaction successfully written to ledger!');
      setDesc('');
      setAmount(100);
      setActiveSubTab('pnl');
    } catch (err) {
      console.error(err);
      triggerFeedback('error', 'Failed to log transaction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Local Feedback Toast/Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold border transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Sub Navigation */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('pnl')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'pnl'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => {
            setActiveSubTab('add');
          }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'add'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Record Transaction
        </button>
      </div>

      {activeSubTab === 'pnl' ? (
        <div className="space-y-6">
          {/* Bento Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Income */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Revenue / Income</span>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {currencySymbol}
                  {totalIncome.toLocaleString()}
                </h3>
                <span className="text-[11px] text-emerald-500 font-medium block mt-1 flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Rooms & Restaurant receipts</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Total Expense */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Expenses</span>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {currencySymbol}
                  {totalExpense.toLocaleString()}
                </h3>
                <span className="text-[11px] text-rose-500 font-medium block mt-1 flex items-center space-x-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Salaries, linen & laundry purchases</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* Net P&L profit */}
            <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${
              netProfit >= 0
                ? 'bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30'
                : 'bg-rose-50/20 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Net Profit / Loss</span>
                <h3 className={`text-xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netProfit >= 0 ? '+' : '-'}
                  {currencySymbol}
                  {Math.abs(netProfit).toLocaleString()}
                </h3>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  ERP Automatic Margin analysis
                </span>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                <Scale className="w-5 h-5" />
              </div>
            </div>
          </div>

           {/* Detailed Transaction Ledger Table */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Financial Ledger Entries</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 pb-3">
                    <th className="pb-3 pl-2">Transaction ID</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-right pr-4">Amount</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 group">
                      <td className="py-3 pl-2 font-mono text-[10px] text-slate-400">#{tx.id.slice(0, 8)}</td>
                      <td className="py-3">{tx.date}</td>
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-100">{tx.description}</td>
                      <td className="py-3">{tx.category}</td>
                      <td className={`py-3 text-right pr-4 font-black ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}
                        {currencySymbol}
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 text-right pr-2">
                        {confirmDeleteId === tx.id ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <span className="text-[10px] font-semibold text-rose-500 animate-pulse">Delete?</span>
                            <button
                              onClick={async () => {
                                try {
                                  if (onDeleteTransaction) {
                                    await onDeleteTransaction(tx.id);
                                    triggerFeedback('success', 'Ledger entry successfully deleted.');
                                  } else {
                                    triggerFeedback('error', 'Deletion handler not configured.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                  triggerFeedback('error', 'Failed to delete transaction.');
                                } finally {
                                  setConfirmDeleteId(null);
                                }
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(tx.id)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        No financial entries logged yet. Settle some checkout bills to populate revenue!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-w-xl">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span>Log Financial Transaction</span>
          </h3>

          <form onSubmit={handleAddTxSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Transaction Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="expense">Expense (Payout)</option>
                  <option value="income">Income (Inflow)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  {type === 'expense' ? (
                    <>
                      <option value="Utility Bills">Utility Bills</option>
                      <option value="Inventory Restock">Inventory Restock</option>
                      <option value="Staff Salaries">Staff Salaries</option>
                      <option value="Taxes Settle">Taxes Settlement</option>
                    </>
                  ) : (
                    <>
                      <option value="Room Tariff">Room Tariff</option>
                      <option value="F&B Sales">Food & Beverage Sales</option>
                      <option value="Hall/Venue Rent">Hall/Venue Rent</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Transaction Description</label>
              <input
                type="text"
                placeholder="e.g. Electricity bill settlement June 2026"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Amount ({currencySymbol})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Transaction</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
