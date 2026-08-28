import React, { useEffect, useRef } from 'react';
import { PickupLocationItem } from '../../types/api';
import L from 'leaflet';

interface DropShopMapProps {
  locations: PickupLocationItem[];
  selectedLocation: PickupLocationItem | null;
  onSelectLocation: (loc: PickupLocationItem) => void;
}

export const DropShopMap: React.FC<DropShopMapProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Calculate center coordinates
    const defaultLat = selectedLocation?.addressPoint?.latitude || locations[0]?.addressPoint?.latitude || 52.505581;
    const defaultLng = selectedLocation?.addressPoint?.longitude || locations[0]?.addressPoint?.longitude || -1.978301;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([defaultLat, defaultLng], 13);
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add custom styled marker for each pickup location
    locations.forEach((loc) => {
      const lat = loc.addressPoint?.latitude;
      const lng = loc.addressPoint?.longitude;
      if (!lat || !lng) return;

      const isSelected = selectedLocation?.pickupLocation.pickupLocationCode === loc.pickupLocation.pickupLocationCode;

      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${
            isSelected
              ? 'bg-sky-600 text-white scale-125 ring-4 ring-sky-300'
              : 'bg-white text-gray-800 border-2 border-gray-700 hover:scale-110'
          }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-drop-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const orgName = loc.pickupLocation.address?.organisation || loc.pickupLocation.shortName || 'Drop Shop';
      const streetName = loc.pickupLocation.address?.street || '';
      const postcode = loc.pickupLocation.address?.postcode || '';

      const popupHtml = `
        <div class="p-1 text-xs">
          <p class="font-bold text-gray-900">${orgName}</p>
          <p class="text-gray-600">${streetName}, ${postcode}</p>
          <p class="text-sky-600 font-semibold mt-1">${loc.distance.toFixed(2)} miles away</p>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectLocation(loc);
      });

      markersRef.current.push(marker);
    });

    return () => {
      // Cleanup
    };
  }, [locations, selectedLocation, onSelectLocation]);

  return (
    <div className="w-full h-72 rounded-2xl overflow-hidden border border-gray-300 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
