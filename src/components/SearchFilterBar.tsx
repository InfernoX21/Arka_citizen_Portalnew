import React from 'react';
import { Bookmark, Filter, MapPin, Sparkles, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { IncidentCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: IncidentCategory | 'All';
  onSelectCategory: (cat: IncidentCategory | 'All') => void;
  sortBy: 'latest' | 'nearby' | 'verified' | 'trending';
  onChangeSortBy: (s: 'latest' | 'nearby' | 'verified' | 'trending') => void;
  showSavedOnly: boolean;
  onToggleSavedOnly: () => void;
  activeStatusFilter: 'all' | 'Active' | 'Under Review' | 'Resolved';
  onSelectStatusFilter: (status: 'all' | 'Active' | 'Under Review' | 'Resolved') => void;
  isAiSearching?: boolean;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onChangeSortBy,
  showSavedOnly,
  onToggleSavedOnly,
  activeStatusFilter,
  onSelectStatusFilter,
  isAiSearching = false,
}) => {
  return (
    <div className="w-full space-y-3 mb-5">
      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-zinc-400">
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search natural language (e.g. 'Flood today', 'Road block near airport')..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all shadow-sm"
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          isAiSearching && (
            <span className="absolute right-3 text-[10px] text-orange-500 font-medium">AI Parsing...</span>
          )
        )}
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => onSelectCategory('All')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            selectedCategory === 'All'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>All Incidents</span>
        </button>

        {CATEGORY_LIST.map((catName) => {
          const meta = CATEGORIES[catName];
          const isSelected = selectedCategory === catName;
          return (
            <button
              key={catName}
              onClick={() => onSelectCategory(catName)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                isSelected
                  ? `${meta.bgColor} ${meta.textColor} ${meta.borderColor} font-semibold ring-1 ring-orange-500/30`
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <CategoryIcon category={catName} className="w-3.5 h-3.5" />
              <span>{catName}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Controls: Sort & Status filters */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
        {/* Sort selector */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-medium text-zinc-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onChangeSortBy(e.target.value as any)}
            className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="latest" className="dark:bg-zinc-900">Latest First</option>
            <option value="nearby" className="dark:bg-zinc-900">Nearby (Distance)</option>
            <option value="verified" className="dark:bg-zinc-900">Most Verified</option>
            <option value="trending" className="dark:bg-zinc-900">Trending</option>
          </select>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Active' ? 'all' : 'Active')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeStatusFilter === 'Active'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Active
          </button>
          <span>•</span>
          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Under Review' ? 'all' : 'Under Review')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeStatusFilter === 'Under Review'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold'
                : 'hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Under Review
          </button>
          <span>•</span>
          <button
            onClick={onToggleSavedOnly}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showSavedOnly
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold'
                : 'hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>Saved</span>
          </button>
        </div>
      </div>
    </div>
  );
};
