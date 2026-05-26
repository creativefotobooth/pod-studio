'use client';

import { useEffect, useState } from 'react';
import { api, type ColourMeta } from '@/lib/api';

interface MockupPreviewProps {
  jobId: string;
  designTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onPublishClick: () => void;
}

export default function MockupPreview({
  jobId,
  designTitle,
  isOpen,
  onClose,
  onPublishClick,
}: MockupPreviewProps) {
  const [colours, setColours] = useState<ColourMeta[]>([]);
  const [selectedColour, setSelectedColour] = useState<ColourMeta | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load colours when opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.getVariants('tee')
      .then((res) => {
        if (cancelled) return;
        setColours(res.colours);
        // Pick a sensible default — Black
        const defaultColour = res.colours.find((c) => c.name === 'Black') || res.colours[0];
        setSelectedColour(defaultColour);
      })
      .catch((err) => console.error('Variants load failed:', err));
    return () => { cancelled = true; };
  }, [isOpen]);

  // Load design image as object URL
  useEffect(() => {
    if (!isOpen || !jobId) return;
    let cancelled = false;
    let url: string | null = null;
    setLoading(true);
    api.getJobImage(jobId, 'composite')
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch((err) => console.error('Image load failed:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [jobId, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Preview: {designTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-2xl leading-none"
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mock tee preview */}
          <div
            className="relative mx-auto rounded-lg overflow-hidden shadow-md"
            style={{
              width: '320px',
              height: '380px',
              backgroundColor: selectedColour?.hex || '#1B1B1B',
              backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.15))`,
              border: selectedColour?.name === 'White' || selectedColour?.name === 'Soft Cream'
                ? '1px solid #e5e7eb' : 'none',
            }}
          >
            {/* Subtle tee-shape SVG overlay for context */}
            <svg
              viewBox="0 0 320 380"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 0.06 }}
            >
              <path
                d="M70 30 L40 80 L20 100 L40 130 L70 110 L70 360 L250 360 L250 110 L280 130 L300 100 L280 80 L250 30 L200 50 L180 70 L160 75 L140 70 L120 50 Z"
                fill="white"
                stroke="none"
              />
            </svg>

            {/* Design overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                Loading design...
              </div>
            )}
            {imageUrl && (
              <div
                className="absolute"
                style={{
                  top: '22%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '55%',
                  height: '50%',
                }}
              >
                <img
                  src={imageUrl}
                  alt={designTitle}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>
            )}
          </div>

          {/* Colour info */}
          <div className="text-center">
            <p className="text-sm text-gray-500">Showing on:</p>
            <p className="text-lg font-medium">{selectedColour?.name || '—'}</p>
          </div>

          {/* Colour swatches */}
          <div>
            <p className="text-sm font-medium mb-2 text-center">
              Click a colour to preview ({colours.length} available)
            </p>
            <div className="grid grid-cols-8 sm:grid-cols-11 gap-2 max-w-2xl mx-auto">
              {colours.map((colour) => {
                const isSelected = selectedColour?.name === colour.name;
                const isLight = ['White', 'Soft Cream', 'Heather Stone', 'Heather Dust'].includes(colour.name);
                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    title={colour.name}
                    className={`
                      aspect-square rounded-full border-2 transition-all
                      ${isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 scale-110'
                        : 'border-gray-300 hover:border-gray-500'}
                      ${isLight ? 'shadow-inner' : ''}
                    `}
                    style={{ backgroundColor: colour.hex }}
                    aria-label={colour.name}
                  />
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onPublishClick(); }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Looks Good — Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
