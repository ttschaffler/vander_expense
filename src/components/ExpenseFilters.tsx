'use client';

import { CATEGORIES } from '@/types/expense';
import { ExpenseFilters as Filters } from '@/types/expense';

interface ExpenseFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
}

export default function ExpenseFilters({
  filters,
  onChange,
  resultCount,
}: ExpenseFiltersProps) {
  const update = (partial: Partial<Filters>) => {
    onChange({ ...filters, ...partial });
  };

  const clearFilters = () => {
    onChange({
      search: '',
      category: 'All',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.category !== 'All' ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search expenses..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        {/* Category filter */}
        <select
          value={filters.category}
          onChange={(e) => update({ category: e.target.value as Filters['category'] })}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          title="From date"
        />

        {/* Date To */}
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          title="To date"
        />

        {/* Sort */}
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [
              Filters['sortBy'],
              Filters['sortOrder']
            ];
            update({ sortBy, sortOrder });
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl font-medium transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-500">
        {resultCount} expense{resultCount !== 1 ? 's' : ''} found
      </p>
    </div>
  );
}
