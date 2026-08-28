import React, { useState, useEffect } from 'react';
import { SettingsStore } from '../../store/settingsStore';
import { getCourierBrands, findBrand, CourierBrand } from '../../services/courierLogos';

interface CourierLogoProps {
  courier?: string;
  /** Rendered box size in pixels. */
  size?: number;
  /** Show the courier name beside the mark. */
  showName?: boolean;
  className?: string;
}

// One shared fetch for the whole page rather than one per rendered logo.
let sharedBrands: Map<string, CourierBrand> | null = null;
const listeners = new Set<() => void>();

function useCourierBrands(): Map<string, CourierBrand> | null {
  const [, setTick] = useState(0);

  useEffect(() => {
    const notify = () => setTick((t) => t + 1);
    listeners.add(notify);

    if (!sharedBrands) {
      getCourierBrands(SettingsStore.getInstance().credentials).then((b) => {
        sharedBrands = b;
        listeners.forEach((l) => l());
      });
    }

    return () => {
      listeners.delete(notify);
    };
  }, []);

  return sharedBrands;
}

/**
 * A courier's mark, sourced from the Voila account. Falls back to a readable
 * name badge when the artwork is missing or fails to load — never a broken
 * image, and never another courier's branding.
 */
export const CourierLogo: React.FC<CourierLogoProps> = ({
  courier,
  size = 44,
  showName = false,
  className = '',
}) => {
  const brands = useCourierBrands();
  const brand = findBrand(brands, courier);
  const [failed, setFailed] = useState(false);

  const label = brand?.name || courier || 'Courier';
  const src = brand?.logo;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className="rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs"
        style={{ width: size, height: size }}
        title={label}
      >
        {src && !failed ? (
          <img
            src={src}
            alt={label}
            onError={() => setFailed(true)}
            className="max-h-full max-w-full object-contain p-1"
          />
        ) : (
          <span
            className="font-bold text-gray-600 uppercase tracking-tight leading-none text-center px-1"
            style={{ fontSize: Math.max(9, size / 4.5) }}
          >
            {label.slice(0, 4)}
          </span>
        )}
      </span>
      {showName && <span className="text-xs font-semibold text-gray-900 truncate">{label}</span>}
    </span>
  );
};
