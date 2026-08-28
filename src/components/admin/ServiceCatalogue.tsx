import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Check,
  Plus,
  AlertCircle,
  Clock,
  Weight,
  MapPin,
  Layers,
  Ban,
  UploadCloud,
} from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { CheckoutStore } from '../../store/checkoutStore';
import { adminHeaders } from '../../services/adminAuth';
import { getServiceCatalogue, ServiceMeta } from '../../services/serviceCatalogue';
import { ConfiguredService } from '../../types/settings';

/**
 * Browse every service the Voila account actually publishes and choose which
 * ones to sell. This replaces picking from a hardcoded list, which previously
 * contained service codes that existed nowhere upstream.
 */
export const ServiceCatalogue: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [catalogue, setCatalogue] = useState<ServiceMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const checkout = CheckoutStore.getInstance();
  const checkoutNotices = checkout.unavailableNotices;

  const [publishState, setPublishState] = useState<{
    busy: boolean;
    done: boolean;
    error: string | null;
    publishedAt: string | null;
  }>({ busy: false, done: false, error: null, publishedAt: null });

  useEffect(() => {
    fetch('/api/proxy/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b?.publishedAt && setPublishState((p) => ({ ...p, publishedAt: b.publishedAt })))
      .catch(() => {});
  }, []);

  const publish = async () => {
    setPublishState((p) => ({ ...p, busy: true, error: null, done: false }));
    try {
      const res = await fetch('/api/proxy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ settings: JSON.parse(settings.exportConfiguration()) }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPublishState((p) => ({ ...p, busy: false, error: body.error || 'Could not publish.' }));
        return;
      }
      setPublishState({ busy: false, done: true, error: null, publishedAt: body.publishedAt });
      setTimeout(() => setPublishState((p) => ({ ...p, done: false })), 3000);
    } catch (e) {
      setPublishState((p) => ({ ...p, busy: false, error: 'Could not reach the server.' }));
    }
  };

  useEffect(() => settings.subscribe(() => setTick((t) => t + 1)), [settings]);
  useEffect(() => checkout.subscribe(() => setTick((t) => t + 1)), [checkout]);

  const load = useCallback(
    async (force = false) => {
      setIsLoading(true);
      setError(null);
      const res = await getServiceCatalogue(settings.credentials, { force });
      setCatalogue(Array.from(res.catalogue.values()));
      if (res.error) setError(res.error);
      else if (res.catalogue.size === 0) setError('No services returned. Check your Voila credentials.');
      setIsLoading(false);
    },
    [settings]
  );

  useEffect(() => {
    load();
  }, [load]);

  const selectedIds = useMemo(
    () => new Set(settings.services.map((s) => s.dc_service_id)),
    [settings.services]
  );

  const couriers = useMemo(
    () => Array.from(new Set(catalogue.map((s) => s.courier))).sort(),
    [catalogue]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogue
      .filter((s) => {
        if (courierFilter !== 'all' && s.courier !== courierFilter) return false;
        if (showSelectedOnly && !selectedIds.has(s.dcServiceId)) return false;
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.dcServiceId.toLowerCase().includes(q) ||
          s.courier.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.courier.localeCompare(b.courier) || a.name.localeCompare(b.name));
  }, [catalogue, search, courierFilter, showSelectedOnly, selectedIds]);

  const toggle = (meta: ServiceMeta) => {
    if (selectedIds.has(meta.dcServiceId)) {
      settings.deleteService(meta.dcServiceId);
      return;
    }
    const service: ConfiguredService = {
      dc_service_id: meta.dcServiceId,
      courier: meta.courier,
      originalName: meta.name,
      displayName: meta.name,
      leadTime: meta.leadTime.label,
      enabled: true,
      priority: settings.services.length + 1,
      // Doorstep by default. The merchant classifies pickup-point services
      // themselves in Couriers & Services — guessing from the service name is
      // exactly the kind of assumption this codebase has suffered from.
      isDropShop: false,
      badgeText: null,
      priceOverride: null,
    };
    settings.addServices([service]);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            Service Catalogue
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Every service published by your Voila account. Tick the ones you sell — only ticked services can appear at
            checkout.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 bg-sky-50 px-3 py-2 rounded-lg border border-sky-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh from Voila</span>
        </button>
      </div>

      {/* Counters */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium">
          {catalogue.length} available
        </span>
        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium">
          {selectedIds.size} selected
        </span>
        {couriers.length > 0 && (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium">
            {couriers.length} couriers
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Merchant-only diagnostics. These belong here, not on the checkout page
          where a shopper would read them. */}
      {checkoutNotices.length > 0 && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 space-y-1">
          <p className="font-semibold">From the last checkout quote</p>
          {checkoutNotices.map((n, i) => (
            <p key={i} className="text-sky-800">
              {n}
            </p>
          ))}
        </div>
      )}

      {/* Publish to customer links */}
      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">Live on customer links</p>
            <p className="text-[11px] text-gray-500">
              {publishState.publishedAt
                ? `Last published ${new Date(publishState.publishedAt).toLocaleString('en-GB')}`
                : 'Nothing published yet — customer links are using the environment variable.'}
            </p>
          </div>
          <button
            onClick={publish}
            disabled={publishState.busy}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
          >
            {publishState.done ? <Check className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
            {publishState.busy ? 'Publishing…' : publishState.done ? 'Published' : 'Publish to customer links'}
          </button>
        </div>
        {publishState.error && <p className="text-[11px] text-rose-700">{publishState.error}</p>}
        <p className="text-[11px] text-gray-500">
          Your selections, pricing rules and wording only reach customer links when you publish. Nothing here is sent
          until you press it, and credentials are never included.
        </p>
      </div>

      {/* Display policy */}
      <label className="flex items-start gap-2.5 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer">
        <input
          type="checkbox"
          checked={settings.hideDominatedServices}
          onChange={(e) => settings.setHideDominatedServices(e.target.checked)}
          className="w-4 h-4 rounded accent-emerald-600 mt-0.5"
        />
        <span className="text-xs text-gray-700">
          <span className="font-semibold text-gray-900 block">Hide services beaten on both speed and price</span>
          When one service from a courier is at least as fast and at least as cheap as another from the same courier,
          only the better one is shown — DPD Next Day at £5.00 hides DPD 48 at £5.00. A slower service that is genuinely
          cheaper is still offered, and where the faster one is not quoted (Highlands, Northern Ireland) the slower one
          is the only option and appears.
        </span>
      </label>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or service ID…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={courierFilter}
          onChange={(e) => setCourierFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">All couriers</option>
          {couriers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowSelectedOnly((v) => !v)}
          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            showSelectedOnly
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Selected only
        </button>
      </div>

      {/* Loading */}
      {isLoading && catalogue.length === 0 && (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-xl space-y-3">
          <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-600">Loading services from Voila…</p>
        </div>
      )}

      {/* List */}
      {visible.length > 0 && (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white max-h-[560px] overflow-y-auto">
          {visible.map((meta) => {
            const isSelected = selectedIds.has(meta.dcServiceId);
            return (
              <div
                key={meta.dcServiceId}
                onClick={() => toggle(meta)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  ) : (
                    <Plus className="w-3 h-3 text-gray-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{meta.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                      {meta.dcServiceId}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      {meta.courier}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {meta.leadTime.label || 'No transit time published'}
                    </span>
                    {meta.weightMaxKg != null && (
                      <span className="flex items-center gap-1">
                        <Weight className="w-3 h-3 text-gray-400" />
                        up to {meta.weightMaxKg}kg
                      </span>
                    )}
                    {meta.supportedCountries.length > 0 && (
                      <span className="text-gray-400">{meta.supportedCountries.join(', ')}</span>
                    )}
                  </div>

                  {(meta.includePostcodes.length > 0 || meta.excludePostcodes.length > 0) && (
                    <div className="mt-1.5 space-y-0.5">
                      {meta.includePostcodes.length > 0 && (
                        <p className="text-[11px] text-emerald-700 flex items-start gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>
                            Only delivers to {meta.includePostcodes.slice(0, 6).join(', ')}
                            {meta.includePostcodes.length > 6 && ` +${meta.includePostcodes.length - 6} more`}
                          </span>
                        </p>
                      )}
                      {meta.excludePostcodes.length > 0 && (
                        <p className="text-[11px] text-amber-700 flex items-start gap-1">
                          <Ban className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>
                            Excludes {meta.excludePostcodes.slice(0, 6).join(', ')}
                            {meta.excludePostcodes.length > 6 && ` +${meta.excludePostcodes.length - 6} more`}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && visible.length === 0 && catalogue.length > 0 && (
        <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl">
          No services match those filters.
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        A ticked service still only appears at checkout if the Billing API returns a price for the customer's postcode.
        Services with postcode rules will not be quoted outside their area.
      </p>
    </div>
  );
};
