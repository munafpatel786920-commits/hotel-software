import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  DollarSign,
  Percent,
  Check,
  Languages,
  Clock,
  MapPin,
  Phone,
  Mail,
  Sliders,
  Sparkles,
  Paperclip,
  X,
  Image,
  Globe,
  Receipt,
  Landmark
} from 'lucide-react';
import { Hotel, RoomType } from '../types';
import { COUNTRY_CONFIGS } from '../translations';

interface HotelSetupProps {
  hotel: Hotel;
  roomTypes: RoomType[];
  onUpdateHotel: (updated: Partial<Hotel>) => Promise<void>;
  onAddRoomType: (rt: Omit<RoomType, 'id'>) => Promise<void>;
  onDeleteRoomType: (id: string) => Promise<void>;
}

export default function HotelSetup({
  hotel,
  roomTypes,
  onUpdateHotel,
  onAddRoomType,
  onDeleteRoomType
}: HotelSetupProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'categories'>('profile');

  // Profile Form States
  const [name, setName] = useState(hotel.name || '');
  const [country, setCountry] = useState(hotel.country || 'India');
  const [state, setState] = useState(hotel.state || 'Gujarat');
  const [customState, setCustomState] = useState('');
  const [currency, setCurrency] = useState(hotel.currency || 'INR');
  const [currencySymbol, setCurrencySymbol] = useState(hotel.currencySymbol || '₹');
  const [taxLabel, setTaxLabel] = useState(hotel.taxLabel || 'GST');
  const [taxRate, setTaxRate] = useState<number>(hotel.taxRate !== undefined ? hotel.taxRate : 18);
  const [address, setAddress] = useState(hotel.address || '');
  const [phone, setPhone] = useState(hotel.phone || '');
  const [email, setEmail] = useState(hotel.email || '');
  const [taxNumber, setTaxNumber] = useState(hotel.taxNumber || '');
  const [logo, setLogo] = useState(hotel.logo || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Room Type Form States
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrice, setNewTypePrice] = useState(100);
  const [newTypeCapacity, setNewTypeCapacity] = useState(2);
  const [newTypeAmenities, setNewTypeAmenities] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState('');

  // Synchronize when hotel prop changes
  useEffect(() => {
    if (hotel) {
      setName(hotel.name || '');
      setCountry(hotel.country || 'India');
      setState(hotel.state || 'Gujarat');
      setCurrency(hotel.currency || 'INR');
      setCurrencySymbol(hotel.currencySymbol || '₹');
      setTaxLabel(hotel.taxLabel || 'GST');
      setTaxRate(hotel.taxRate !== undefined ? hotel.taxRate : 18);
      setAddress(hotel.address || '');
      setPhone(hotel.phone || '');
      setEmail(hotel.email || '');
      setTaxNumber(hotel.taxNumber || '');
      setLogo(hotel.logo || '');
    }
  }, [hotel]);

  // When Country changes, update currency, symbol, states list, and default state/tax
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const config = COUNTRY_CONFIGS[newCountry];
    if (config) {
      setCurrency(config.currency);
      setCurrencySymbol(config.symbol);
      
      const availableStates = config.states || [];
      const defaultState = availableStates.length > 0 ? availableStates[0].name : '';
      setState(defaultState);
      setCustomState('');

      // Find state tax or fall back to country tax
      const stateObj = availableStates.find((s) => s.name === defaultState);
      const newTaxRate = stateObj?.taxRate ?? config.taxRate;
      const newTaxLabel = stateObj?.taxLabel ?? config.taxLabel;
      setTaxRate(newTaxRate);
      setTaxLabel(newTaxLabel);
    }
  };

  // When State changes, suggest state tax if available, while keeping user's manual editing capability
  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    if (selectedState === 'Other') {
      return;
    }
    const config = COUNTRY_CONFIGS[country];
    if (config?.states) {
      const stateObj = config.states.find((s) => s.name === selectedState);
      if (stateObj) {
        if (stateObj.taxRate !== undefined) setTaxRate(stateObj.taxRate);
        if (stateObj.taxLabel) setTaxLabel(stateObj.taxLabel);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const config = COUNTRY_CONFIGS[country];
      const finalState = state === 'Other' ? (customState.trim() || 'Other') : state;
      
      const updatedData: Partial<Hotel> = {
        name: name.trim(),
        country,
        state: finalState,
        address,
        phone,
        email,
        taxNumber,
        taxLabel: taxLabel.trim() || 'Tax',
        taxRate: Number(taxRate) || 0,
        currency: currency || config?.currency || 'INR',
        currencySymbol: currencySymbol.trim() || config?.symbol || '₹',
        timezone: config?.timezone || 'Asia/Kolkata',
        language: config?.defaultLang || 'en',
        logo
      };
      
      await onUpdateHotel(updatedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert('Image size should be less than 1.5MB to save securely.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      await onAddRoomType({
        name: newTypeName,
        basePrice: Number(newTypePrice),
        capacity: Number(newTypeCapacity),
        amenities: newTypeAmenities,
        hotelId: hotel.id
      });
      setNewTypeName('');
      setNewTypePrice(100);
      setNewTypeCapacity(2);
      setNewTypeAmenities([]);
      alert('Room category added!');
    } catch (err) {
      console.error(err);
      alert('Failed to create category');
    }
  };

  const addAmenity = () => {
    if (amenityInput.trim() && !newTypeAmenities.includes(amenityInput.trim())) {
      setNewTypeAmenities([...newTypeAmenities, amenityInput.trim()]);
      setAmenityInput('');
    }
  };

  const removeAmenity = (index: number) => {
    setNewTypeAmenities(newTypeAmenities.filter((_, i) => i !== index));
  };

  const activeCountryConfig = COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS['India'];
  const availableStates = activeCountryConfig?.states || [];

  // Common tax presets for quick manual selection
  const indiaTaxPresets = [
    { label: '0% Exempt', rate: 0 },
    { label: '5% Budget', rate: 5 },
    { label: '12% Non-Luxury', rate: 12 },
    { label: '18% Standard GST', rate: 18 },
    { label: '28% Star Suite', rate: 28 }
  ];

  const internationalTaxPresets = [
    { label: '0% None', rate: 0 },
    { label: '5% VAT', rate: 5 },
    { label: '8% Tax', rate: 8 },
    { label: '10% Tax', rate: 10 },
    { label: '13% HST', rate: 13 },
    { label: '15% VAT', rate: 15 },
    { label: '18% VAT', rate: 18 },
    { label: '20% VAT', rate: 20 }
  ];

  const activePresets = country === 'India' ? indiaTaxPresets : internationalTaxPresets;

  return (
    <div className="space-y-6">
      {/* Setup Sub Navigation Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hotel Profile, Regional & Tax Setup</span>
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Room Categories & Pricing Setup</span>
        </button>
      </div>

      {activeSubTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Hotel Configuration & Regional Tax Settings</span>
              </h3>
              {saveSuccess && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3.5 h-3.5" />
                  <span>Settings Updated Successfully!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Hotel Logo Attachment */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Hotel Brand Logo
                </label>
                <div className="flex items-center space-x-4">
                  {logo ? (
                    <div className="relative">
                      <img
                        src={logo}
                        alt="Hotel Logo Preview"
                        className="w-20 h-20 object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-all cursor-pointer"
                        title="Remove Logo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <Image className="w-6 h-6 stroke-[1.5]" />
                      <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider">No Logo</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="flex items-center space-x-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold cursor-pointer transition-all w-fit">
                      <Paperclip className="w-4 h-4" />
                      <span>Attach Logo File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Supports JPG, PNG, WEBP. Maximum file size 1.5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* General Information */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Hotel Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Grand Heritage Palace"
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Country & State Selection */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                  <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Country & State Localization</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Country Dropdown */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Country Location
                    </label>
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    >
                      {Object.keys(COUNTRY_CONFIGS).map((cName) => (
                        <option key={cName} value={cName}>
                          {cName}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Auto-sets base currency, default tax model & timezone
                    </span>
                  </div>

                  {/* State Dropdown */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      State / Province / Region
                    </label>
                    {availableStates.length > 0 ? (
                      <select
                        value={state}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                      >
                        {availableStates.map((st) => (
                          <option key={st.name} value={st.name}>
                            {st.name} {st.taxRate !== undefined ? `(${st.taxRate}% ${st.taxLabel || 'Tax'})` : ''}
                          </option>
                        ))}
                        <option value="Other">Other / Custom State</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Enter state or province"
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                    )}

                    {state === 'Other' && (
                      <input
                        type="text"
                        value={customState}
                        onChange={(e) => setCustomState(e.target.value)}
                        placeholder="Type custom state name..."
                        className="mt-2 w-full px-3.5 py-2 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      State selection determines applicable regional taxes & invoice headers
                    </span>
                  </div>
                </div>

                {/* Currency Symbol Display & Customization */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Currency Symbol & Code
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-indigo-700 dark:text-indigo-300 font-bold text-base min-w-[50px] text-center shadow-xs">
                        {currencySymbol}
                      </div>
                      <input
                        type="text"
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="Symbol (e.g. ₹, $, £, Rs.)"
                        className="flex-1 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-medium"
                      />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                        {currency}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      This symbol will appear across all guest bills, booking cards, and POS receipts
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Tax Name / System Label
                    </label>
                    <div className="relative">
                      <Receipt className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={taxLabel}
                        onChange={(e) => setTaxLabel(e.target.value)}
                        placeholder="e.g. GST, VAT, Sales Tax"
                        className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-medium"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Title shown on checkout folios and tax invoices
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax Rate Manual Input & Quick Presets */}
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase text-indigo-900 dark:text-indigo-300 tracking-wider">
                    <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Tax Rate Setup (Manual Input Allowed)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 rounded-full">
                    Current: {taxRate}% {taxLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Manual Tax Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        required
                        placeholder="Enter percentage (e.g. 18 or 12)"
                        className="w-full pl-3.5 pr-10 py-2.5 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold block text-[11px] text-slate-800 dark:text-slate-200">
                      Live Invoice Tax Preview:
                    </span>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      On a {currencySymbol}1,000 charge: <span className="font-bold text-indigo-600 dark:text-indigo-400">{taxLabel} ({taxRate}%)</span> = <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{((1000 * Number(taxRate || 0)) / 100).toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Presets for Convenient Manual Selection */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Quick Rate Presets (Click to apply or type custom above):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTaxRate(preset.rate)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          taxRate === preset.rate
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact & Legal Tax Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="+91 99999 88888"
                      className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="manager@hotel.com"
                      className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Street Address & Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    required
                    placeholder="Complete physical street address, city, pin code"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Official Tax Registration Number ({taxLabel} / GSTIN / VAT ID)
                </label>
                <div className="relative">
                  <Landmark className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="e.g. 24AAAAA0000A1Z5 or US EIN / VAT Registration"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400">
                  All changes will instantly update bills, reports, and currency displays.
                </p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60 flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving Profile...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Regional Settings Preview Side Card */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Applied Regional Settings</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Summary of active currency, state taxation, and regional localization for this property.
              </p>

              <div className="space-y-3.5 pt-1">
                {/* Country & State */}
                <div className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Country & Jurisdiction
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {country}
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      State: {state === 'Other' ? (customState || 'Custom') : state}
                    </span>
                  </div>
                </div>

                {/* Currency */}
                <div className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold text-lg">
                    {currencySymbol}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Active Currency
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {currencySymbol} ({currency})
                    </p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Applied across all reservations & bills
                    </span>
                  </div>
                </div>

                {/* Tax Configuration */}
                <div className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Tax System & Manual Rate
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {taxLabel}: {taxRate}%
                    </p>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                      User Overridable
                    </span>
                  </div>
                </div>

                {/* Timezone */}
                <div className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Timezone
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {activeCountryConfig?.timezone || 'Asia/Kolkata'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Category Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>Create Room Type</span>
            </h3>
            <form onSubmit={handleAddRoomType} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Deluxe Suite"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Price per Night</label>
                  <input
                    type="number"
                    value={newTypePrice}
                    onChange={(e) => setNewTypePrice(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newTypeCapacity}
                    onChange={(e) => setNewTypeCapacity(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Add Amenity</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Free WiFi"
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-transparent rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={addAmenity}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {newTypeAmenities.map((am, idx) => (
                    <span
                      key={idx}
                      onClick={() => removeAmenity(idx)}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-lg flex items-center space-x-1 cursor-pointer hover:bg-rose-50 hover:text-rose-600"
                    >
                      <span>{am}</span>
                      <span>&times;</span>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Active Room Categories</h3>
            <div className="space-y-3.5">
              {roomTypes.map((rt) => (
                <div
                  key={rt.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{rt.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Capacity: {rt.capacity} guests</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rt.amenities?.map((am, idx) => (
                        <span key={idx} className="bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-medium">
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400">Base Price</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        {hotel.currencySymbol}
                        {rt.basePrice}/night
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteRoomType(rt.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {roomTypes.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No categories set up yet. Setup your first room category above!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
