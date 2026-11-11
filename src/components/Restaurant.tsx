import { getLocalISODate } from '../utils/date';
import React, { useState } from 'react';
import {
  Utensils,
  Plus,
  Minus,
  ChefHat,
  ShoppingBag,
  CheckCircle,
  Clock,
  Trash2,
  DollarSign
} from 'lucide-react';
import { Room, RestaurantOrder, RestaurantItem } from '../types';

interface RestaurantProps {
  rooms: Room[];
  orders: RestaurantOrder[];
  currencySymbol: string;
  hotelId: string;
  onSubmitOrder: (order: Omit<RestaurantOrder, 'id'>) => Promise<void>;
  onCompleteOrder: (orderId: string) => Promise<void>;
}

const MENU_ITEMS: RestaurantItem[] = [
  { id: 'm1', name: 'Continental Breakfast', price: 15, category: 'Appetizers', isAvailable: true },
  { id: 'm2', name: 'Fresh Fruit Parfait', price: 9, category: 'Appetizers', isAvailable: true },
  { id: 'm3', name: 'Classic Caesar Salad', price: 12, category: 'Appetizers', isAvailable: true },
  { id: 'm4', name: 'Pan-Seared Salmon Filet', price: 28, category: 'Main Course', isAvailable: true },
  { id: 'm5', name: 'Gourmet Beef Burger', price: 18, category: 'Main Course', isAvailable: true },
  { id: 'm6', name: 'Truffle Mac & Cheese', price: 16, category: 'Main Course', isAvailable: true },
  { id: 'm7', name: 'Warm Lava Cake', price: 10, category: 'Desserts', isAvailable: true },
  { id: 'm8', name: 'Classic Tiramisu', price: 11, category: 'Desserts', isAvailable: true },
  { id: 'm9', name: 'Freshly Brewed Espresso', price: 5, category: 'Beverages', isAvailable: true },
  { id: 'm10', name: 'Artisanal Green Tea', price: 4, category: 'Beverages', isAvailable: true },
  { id: 'm11', name: 'Sparkling Mineral Water', price: 6, category: 'Beverages', isAvailable: true }
];

export default function Restaurant({
  rooms,
  orders,
  currencySymbol,
  hotelId,
  onSubmitOrder,
  onCompleteOrder
}: RestaurantProps) {
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'orders'>('menu');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [orderType, setOrderType] = useState<'Table Order' | 'Room Service'>('Room Service');

  // Shopping Cart States
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (copy[itemId] > 1) {
        copy[itemId] -= 1;
      } else {
        delete copy[itemId];
      }
      return copy;
    });
  };

  const calculateTotal = () => {
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = MENU_ITEMS.find((m) => m.id === itemId);
      return sum + (item?.price || 0) * (qty as number);
    }, 0);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = calculateTotal();
    if (totalAmount === 0 || !selectedRoomId) {
      triggerFeedback('error', 'Please select a room and add items to place an order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = Object.entries(cart).map(([itemId, qty]) => {
        const item = MENU_ITEMS.find((m) => m.id === itemId)!;
        return {
          name: item.name,
          quantity: qty as number,
          price: item.price
        };
      });

      await onSubmitOrder({
        roomId: selectedRoomId,
        items: orderItems,
        totalAmount,
        status: 'Pending',
        orderType,
        orderDate: getLocalISODate(),
        hotelId
      });

      triggerFeedback('success', 'Kitchen Order Ticket (KOT) submitted successfully!');
      setCart({});
      setSelectedRoomId('');
    } catch (err) {
      console.error(err);
      triggerFeedback('error', 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('menu')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'menu'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Menu & Place Orders
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'orders'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Live Kitchen Orders ({orders.filter((o) => o.status === 'Pending').length})
        </button>
      </div>

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

      {activeSubTab === 'menu' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Card Grid */}
          <div className="lg:col-span-2 space-y-6">
            {['Appetizers', 'Main Course', 'Desserts', 'Beverages'].map((category) => (
              <div key={category} className="space-y-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm tracking-wide uppercase border-b border-slate-50 dark:border-slate-800 pb-1">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MENU_ITEMS.filter((m) => m.category === category).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.name}</h4>
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs mt-1">
                          {currencySymbol}
                          {item.price}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddToCart(item.id)}
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Place Order Drawer / Sidebar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>Checkout Order</span>
            </h3>

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Destination</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="Room Service">Room Service</option>
                    <option value="Table Order">Table Order</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Room Number *</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Room --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Basket list */}
              <div className="border-t border-b border-slate-50 dark:border-slate-800 py-3 space-y-3.5 max-h-[220px] overflow-y-auto">
                {Object.entries(cart).map(([itemId, qty]) => {
                  const item = MENU_ITEMS.find((m) => m.id === itemId);
                  if (!item) return null;
                  return (
                    <div key={itemId} className="flex justify-between items-center">
                      <div className="max-w-[130px]">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                        <span className="text-[10px] text-slate-400">
                          {currencySymbol}
                          {item.price} &times; {qty}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(itemId)}
                          className="text-slate-500 hover:text-indigo-600 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 px-1">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(itemId)}
                          className="text-slate-500 hover:text-indigo-600 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(cart).length === 0 && (
                  <p className="text-center text-slate-400 py-6">Select meals on left panel to add to checkout basket.</p>
                )}
              </div>

              {/* Bill calculation */}
              <div className="space-y-1.5 pt-1 font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex justify-between text-slate-800 dark:text-slate-100 font-black text-sm pt-2">
                  <span>Grand Total</span>
                  <span>
                    {currencySymbol}
                    {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || Object.keys(cart).length === 0 || !selectedRoomId}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Sending to Kitchen...' : 'Send Order to Kitchen'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3.5 pl-4">Order ID</th>
                  <th className="py-3.5">Destination Room</th>
                  <th className="py-3.5">Meals Summary</th>
                  <th className="py-3.5 text-right">Order Amount</th>
                  <th className="py-3.5 text-center">Status</th>
                  <th className="py-3.5 text-center pr-4">Kitchen Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {orders.map((o) => {
                  const roomObj = rooms.find((r) => r.id === o.roomId);
                  return (
                    <tr key={o.id} className="text-xs text-slate-700 dark:text-slate-300">
                      <td className="py-4 pl-4 font-mono text-[10px]">#{o.id.slice(0, 6)}</td>
                      <td className="py-4 font-bold text-slate-800 dark:text-slate-100">
                        Room {roomObj?.roomNumber || 'Table order'}
                      </td>
                      <td className="py-4 max-w-sm">
                        <div className="space-y-0.5">
                          {o.items?.map((it, idx) => (
                            <span key={idx} className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] mr-1">
                              {it.name} ({it.quantity}x)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-right font-semibold">
                        {currencySymbol}
                        {o.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === 'Completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 animate-pulse'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 text-center pr-4">
                        {o.status === 'Pending' ? (
                          <button
                            onClick={() => onCompleteOrder(o.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Delivered</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No kitchen orders registered. Place your first breakfast or dinner order above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
