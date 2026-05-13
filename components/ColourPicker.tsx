'use client';

import { useState, useEffect } from 'react';
import { api, type ColourMeta } from '@/lib/api';

interface ColourPickerProps {
  selected: string[];
  onChange: (colours: string[]) => void;
  productType?: 'tee' | 'mug';
}

export default function ColourPicker({ selected, onChange, productType = 'tee' }: ColourPickerProps) {
  const [colours, setColours] = useState<ColourMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getVariants(productType)
      .then((res) => {
        if (cancelled) return;
        setColours(res.colours);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load colours');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productType]);

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter((c) => c !== name));
    } else {
      onChange([...selected, name]);
    }
  }

  function selectAll() {
    onChange(colours.map((c) => c.name));
  }

  function deselectAll() {
    onChange([]);
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading colours...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Colours ({selected.length}/{colours.length})
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-blue-600 hover:underline"
          >
            All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-xs text-blue-600 hover:underline"
          >
            None
          </button>
        </div>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {colours.map((colour) => {
          const isSelected = selected.includes(colour.name);
          const isLight = ['White', 'Soft Cream', 'Heather Stone', 'Heather Dust'].includes(colour.name);
          return (
            <button
              key={colour.name}
              type="button"
              onClick={() => toggle(colour.name)}
              title={colour.name}
              className={`
                relative aspect-square rounded-full border-2 transition-all
                ${isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200 scale-105'
                  : 'border-gray-300 hover:border-gray-500'}
                ${isLight ? 'shadow-inner' : ''}
              `}
              style={{ backgroundColor: colour.hex }}
              aria-label={`${colour.name}, ${isSelected ? 'selected' : 'not selected'}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    color: isLight ? '#000' : '#fff',
                    textShadow: isLight ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Click swatches to toggle. {selected.length === 0 && 'Select at least one colour to publish.'}
      </p>
    </div>
  );
}
