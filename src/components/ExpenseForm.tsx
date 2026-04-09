'use client';

import { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, CATEGORIES, CATEGORY_ICONS } from '@/types/expense';
import { todayISO } from '@/lib/format';

interface ExpenseFormProps {
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  initialData?: Expense | null;
  onCancel: () => void;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export default function ExpenseForm({ onSubmit, initialData, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDescription(initialData.description);
      setDate(initialData.date);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (parseFloat(amount) > 999999.99) {
      newErrors.amount = 'Amount cannot exceed $999,999.99';
    }
    if (!description.trim()) {
      newErrors.description = 'Please enter a description';
    }
    if (description.trim().length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }
    if (!date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ amount: true, description: true, date: true });

    if (!validate()) return;

    onSubmit({
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      category,
      description: description.trim(),
      date,
    });

    if (!initialData) {
      setAmount('');
      setDescription('');
      setDate(todayISO());
      setCategory('Food');
      setTouched({});
      setErrors({});
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="999999.99"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => handleBlur('amount')}
            placeholder="0.00"
            className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
              touched.amount && errors.amount
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
            }`}
          />
        </div>
        {touched.amount && errors.amount && (
          <p className="mt-1.5 text-sm text-red-500">{errors.amount}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                category === cat
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span className="truncate">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => handleBlur('description')}
          placeholder="e.g., Lunch at restaurant"
          maxLength={200}
          className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
            touched.description && errors.description
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
          }`}
        />
        {touched.description && errors.description && (
          <p className="mt-1.5 text-sm text-red-500">{errors.description}</p>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => handleBlur('date')}
          max={todayISO()}
          className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-colors ${
            touched.date && errors.date
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
          }`}
        />
        {touched.date && errors.date && (
          <p className="mt-1.5 text-sm text-red-500">{errors.date}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
        >
          {initialData ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}
