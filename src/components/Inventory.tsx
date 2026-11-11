import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Contact,
  CheckCircle,
  Truck,
  DollarSign
} from 'lucide-react';
import { InventoryItem, Supplier } from '../types';

interface InventoryProps {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  hotelId: string;
  onAddSupplier: (sup: Omit<Supplier, 'id'>) => Promise<void>;
  onAddInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  onUpdateStock: (itemId: string, newQty: number) => Promise<void>;
}

export default function Inventory({
  inventory,
  suppliers,
  hotelId,
  onAddSupplier,
  onAddInventoryItem,
  onUpdateStock
}: InventoryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'suppliers'>('stock');

  // Supplier Form states
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');

  // Stock Form states
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(10);
  const [itemMinQty, setItemMinQty] = useState(5);
  const [itemCat, setItemCat] = useState('Toiletries');
  const [itemSupId, setItemSupId] = useState('');

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    try {
      await onAddSupplier({
        name: supName,
        contactName: supContact,
        phone: supPhone,
        email: supEmail,
        hotelId
      });
      alert('Supplier registered!');
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
    } catch (err) {
      console.error(err);
      alert('Failed to register supplier');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemSupId) {
      alert('Please fill out all fields and select a registered supplier.');
      return;
    }

    try {
      await onAddInventoryItem({
        name: itemName,
        quantity: Number(itemQty),
        minQuantity: Number(itemMinQty),
        category: itemCat,
        supplierId: itemSupId,
        hotelId
      });
      alert('Stock item created successfully!');
      setItemName('');
      setItemQty(10);
    } catch (err) {
      console.error(err);
      alert('Failed to create stock item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('stock')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'stock'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Stock Ledger & Inventory Levels
        </button>
        <button
          onClick={() => {
            setActiveSubTab('suppliers');
          }}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Suppliers Directory
        </button>
      </div>

      {activeSubTab === 'stock' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Stock Item */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Add Stock Item</span>
            </h3>
            <form onSubmit={handleAddStock} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Toiletries Soap Bars"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Min Threshold</label>
                  <input
                    type="number"
                    value={itemMinQty}
                    onChange={(e) => setItemMinQty(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Category</label>
                <select
                  value={itemCat}
                  onChange={(e) => setItemCat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="Toiletries">Toiletries</option>
                  <option value="Bed Linens">Bed Linens</option>
                  <option value="Minibar Cans">Minibar Cans</option>
                  <option value="Cleaning Agents">Cleaning Agents</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Supplier</label>
                <select
                  value={itemSupId}
                  onChange={(e) => setItemSupId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="text-[10px] text-amber-500 font-bold mt-1.5">No supplier configured. Add a supplier first!</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Stock Item</span>
              </button>
            </form>
          </div>

          {/* Stock Levels List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Stock Ledger</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {inventory.map((item) => {
                const isLow = item.quantity <= item.minQuantity;
                const supObj = suppliers.find((s) => s.id === item.supplierId);
                return (
                  <div key={item.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{item.name}</h4>
                        {isLow && (
                          <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Category: {item.category} • Supplier: {supObj?.name || 'Unknown'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Qty Available</span>
                        <span className={`font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.quantity} units
                        </span>
                      </div>

                      {/* Stock Quick Add button */}
                      <button
                        onClick={() => onUpdateStock(item.id, item.quantity + 10)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold cursor-pointer"
                      >
                        +10 units
                      </button>
                    </div>
                  </div>
                );
              })}
              {inventory.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-12">No stock items added yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Supplier */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <span>Add New Supplier</span>
            </h3>
            <form onSubmit={handleAddSupplier} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Linen Palace Ltd"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Robert Vance"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 0199"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g. orders@linenpalace.com"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Supplier</span>
              </button>
            </form>
          </div>

          {/* Suppliers Directory list */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">Suppliers Directory</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {suppliers.map((sup) => (
                <div key={sup.id} className="py-3.5 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{sup.name}</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Contact: {sup.contactName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Phone: {sup.phone} {sup.email ? `• Email: ${sup.email}` : ''}
                  </p>
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-12">No suppliers registered.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
