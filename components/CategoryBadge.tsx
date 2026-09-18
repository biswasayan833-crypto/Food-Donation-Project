import React from 'react';
import { Utensils, Leaf, Drumstick, Apple } from 'lucide-react';

interface CategoryBadgeProps {
  category?: string;
  foodType?: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, foodType, size = 'sm' }: CategoryBadgeProps) {
  const type = (foodType || category || '').toUpperCase();

  let label = type;
  let bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = Leaf;

  switch (type) {
    case 'VEG':
      label = 'Vegetarian';
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      Icon = Leaf;
      break;
    case 'NON_VEG':
      label = 'Non-Veg';
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
      Icon = Drumstick;
      break;
    case 'RAW':
      label = 'Raw / Produce';
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
      Icon = Apple;
      break;
    case 'COOKED':
      label = 'Cooked Food';
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      Icon = Utensils;
      break;
    default:
      label = type || 'Food';
      bgClass = 'bg-slate-50 text-slate-700 border-slate-200';
      Icon = Utensils;
  }

  const sizeClass =
    size === 'sm'
      ? 'text-xs px-2.5 py-1 gap-1.5'
      : 'text-sm px-3 py-1.5 gap-2';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border shadow-2xs ${bgClass} ${sizeClass}`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {label}
    </span>
  );
}
