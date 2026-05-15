'use client';

import { useEffect, useState } from 'react';
import { api, type PlacementResponse, type PlacementValue } from '@/lib/api';

interface PlacementPickerProps {
  subNiche: string;
  value: PlacementValue;
  onChange: (placement: PlacementValue) => void;
}

export default function PlacementPicker({ subNiche, value, onChange }: PlacementPickerProps) {
  const [data, setData] = useState<PlacementResponse | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getPlacement(subNiche)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
        // If no preset selected yet, default to the niche-recommended one
        if (!value.preset && !('x' in value)) {
          const defaultPreset = res.nicheDefaults[subNiche] || 'centered-badge';
          onChange({ preset: defaultPreset });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load placement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subNiche]);

  if (loading) return <div className="text-sm text-gray-500">Loading placement...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const selectedPreset = value.preset || data.nicheDefaults[subNiche] || 'centered-badge';
  const presets = Object.entries(data.presets);

  function selectPreset(presetName: string) {
    onChange({ preset: presetName });
    setShowAdvanced(false);
  }

  function updateManual(field: 'x' | 'y' | 'scale', newValue: number) {
    const current = value.preset ? data!.presets[value.preset] : value;
    onChange({
      x: field === 'x' ? newValue : (current.x ?? 0.5),
      y: field === 'y' ? newValue : (current.y ?? 0.5),
      scale: field === 'scale' ? newValue : (current.scale ?? 0.75),
    });
  }

  const isManual = !value.preset && ('x' in value || 'y' in value || 'scale' in value);
  const currentX = isManual ? (value.x ?? 0.5) : data.presets[selectedPreset]?.x ?? 0.5;
  const currentY = isManual ? (value.y ?? 0.5) : data.presets[selectedPreset]?.y ?? 0.5;
  const currentScale = isManual ? (value.scale ?? 0.75) : data.presets[selectedPreset]?.scale ?? 0.75;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Print placement</div>

      {/* Preset cards */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map(([name, preset]) => {
          const isSelected = !isManual && selectedPreset === name;
          const isNicheDefault = data.nicheDefaults[subNiche] === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => selectPreset(name)}
              className={`relative rounded-lg border-2 p-3 text-left transition ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              {/* Visual: tee silhouette with design rect at preset position */}
              <svg viewBox="0 0 80 80" className="mx-auto h-16 w-16 mb-2">
                <path
                  d="M 15 15 L 25 8 L 30 12 L 50 12 L 55 8 L 65 15 L 60 25 L 60 70 L 20 70 L 20 25 Z"
                  fill="currentColor"
                  className="text-gray-300 dark:text-gray-600"
                />
                <rect
                  x={20 + preset.x * 40 - (preset.scale * 30) / 2}
                  y={20 + preset.y * 40 - (preset.scale * 30) / 2}
                  width={preset.scale * 30}
                  height={preset.scale * 30}
                  fill="currentColor"
                  className="text-blue-600"
                  opacity="0.7"
                />
              </svg>
              <div className="text-xs font-semibold">{preset.label}</div>
              {isNicheDefault && (
                <div className="absolute top-1 right-1 rounded bg-green-500 px-1 py-0.5 text-[10px] text-white">
                  Recommended
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Show selected preset description */}
      {!isManual && data.presets[selectedPreset] && (
        <p className="text-xs text-gray-500">{data.presets[selectedPreset].description}</p>
      )}

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="text-xs text-blue-600 hover:underline"
      >
        {showAdvanced ? '▼ Hide advanced' : '▶ Advanced (manual position)'}
      </button>

      {/* Manual sliders */}
      {showAdvanced && (
        <div className="space-y-2 rounded-lg border p-3 bg-gray-50 dark:bg-gray-900">
          <div>
            <label className="text-xs flex justify-between">
              <span>Horizontal position (X)</span>
              <span className="font-mono">{currentX.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={data.manualBounds.x.min}
              max={data.manualBounds.x.max}
              step={data.manualBounds.x.step}
              value={currentX}
              onChange={(e) => updateManual('x', Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs flex justify-between">
              <span>Vertical position (Y)</span>
              <span className="font-mono">{currentY.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={data.manualBounds.y.min}
              max={data.manualBounds.y.max}
              step={data.manualBounds.y.step}
              value={currentY}
              onChange={(e) => updateManual('y', Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs flex justify-between">
              <span>Scale (size)</span>
              <span className="font-mono">{currentScale.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={data.manualBounds.scale.min}
              max={data.manualBounds.scale.max}
              step={data.manualBounds.scale.step}
              value={currentScale}
              onChange={(e) => updateManual('scale', Number(e.target.value))}
              className="w-full"
            />
          </div>
          <p className="text-xs text-gray-500 italic">
            Manual override — preset deselected
          </p>
        </div>
      )}
    </div>
  );
}
