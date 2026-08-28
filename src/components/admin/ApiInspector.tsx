import React, { useState } from 'react';
import { Terminal, Copy, Check, Trash2, ArrowUpRight, ArrowDownLeft, Clock, ShieldCheck, Filter } from 'lucide-react';
import { SettingsStore } from '../../store/settingsStore';
import { ApiLogEntry } from '../../types/settings';

export const ApiInspector: React.FC = () => {
  const settings = SettingsStore.getInstance();
  const [, setTick] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ApiLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  React.useEffect(() => {
    return settings.subscribe(() => {
      setTick((t) => t + 1);
      if (!selectedLog && settings.logs.length > 0) {
        setSelectedLog(settings.logs[0]);
      }
    });
  }, [settings, selectedLog]);

  const logs = settings.logs;

  const handleCopyJson = (data: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCurlCommand = (log: ApiLogEntry) => {
    let cmd = `curl -X ${log.method} '${log.endpoint}'`;
    if (log.headers) {
      Object.entries(log.headers).forEach(([k, v]) => {
        cmd += ` \\\n  -H '${k}: ${v}'`;
      });
    }
    if (log.requestBody) {
      cmd += ` \\\n  -d '${JSON.stringify(log.requestBody)}'`;
    }
    return cmd;
  };

  const currentLog = selectedLog || logs[0] || null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-600" />
            Live API Traffic Inspector & Debugger
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time feed of outgoing headers, request payloads, and courier responses
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => settings.clearLogs()}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Feed</span>
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 space-y-2">
          <Terminal className="w-8 h-8 mx-auto text-gray-400" />
          <p className="font-semibold text-gray-700">No API calls captured yet</p>
          <p>Interact with the Checkout page or click "Test API Connection" above to capture live requests.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Left Column: Logs List */}
          <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {logs.map((log) => {
              const isSelected = currentLog?.id === log.id;
              const isBilling = log.endpoint.includes('billingapi') || log.endpoint.includes('quote');

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/60 shadow-xs ring-1 ring-sky-500/30'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.method === 'POST' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {log.method}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.source === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.source.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {log.durationMs}ms
                      </span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>

                  <p className="font-mono text-gray-800 truncate text-[11px]">
                    {log.endpoint}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 pt-1 border-t border-gray-100">
                    <span className="font-medium text-gray-700">
                      {isBilling ? 'BillingAPI / get-quote' : log.endpoint.includes('presets') ? 'Voila / Presets' : 'Voila / Locations'}
                    </span>
                    <span className={`font-bold ${log.success ? 'text-emerald-600' : log.responseStatus === 405 ? 'text-amber-600' : 'text-rose-600'}`}>
                      HTTP {log.responseStatus || (log.success ? 200 : 500)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Log Details Viewer */}
          <div className="lg:col-span-7 bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono max-h-[500px] overflow-y-auto space-y-4">
            {currentLog && (
              <>
                {/* Header info */}
                <div className="flex items-start justify-between pb-3 border-b border-gray-800">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-bold">
                        {currentLog.method}
                      </span>
                      <span className="text-gray-300 font-semibold">{currentLog.endpoint}</span>
                    </div>
                    <p className="text-gray-400 text-[11px]">
                      Status:{' '}
                      <span
                        className={`font-bold ${
                          currentLog.success
                            ? 'text-emerald-400'
                            : currentLog.responseStatus === 405
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        HTTP {currentLog.responseStatus || (currentLog.success ? 200 : 500)}{' '}
                        {currentLog.responseStatus === 200 || currentLog.success
                          ? '• 200 OK'
                          : currentLog.responseStatus === 405
                          ? '• 405 Method Not Allowed (Endpoint requires POST)'
                          : currentLog.responseStatus === 401
                          ? '• 401 Unauthorized (Auth Header Required)'
                          : '• Error'}
                      </span>{' '}
                      • Latency: <span className="text-amber-400">{currentLog.durationMs}ms</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getCurlCommand(currentLog));
                        setCopiedId('curl');
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sky-300 hover:text-white transition-all flex items-center gap-1 text-[11px]"
                      title="Copy request as curl command"
                    >
                      {copiedId === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'curl' ? 'cURL Copied!' : 'Copy cURL'}</span>
                    </button>

                    <button
                      onClick={() => handleCopyJson(currentLog, 'all')}
                      className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all flex items-center gap-1 text-[11px]"
                    >
                      {copiedId === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'all' ? 'Copied' : 'JSON'}</span>
                    </button>
                  </div>
                </div>

                {/* Headers Sent */}
                <div className="space-y-1">
                  <p className="text-gray-400 text-[11px] uppercase tracking-wider font-bold">Request Headers</p>
                  <pre className="bg-gray-950 p-3 rounded-lg text-sky-300 overflow-x-auto text-[11px]">
                    {JSON.stringify(currentLog.headers, null, 2)}
                  </pre>
                </div>

                {/* Request Body (if any) */}
                {currentLog.requestBody && (
                  <div className="space-y-1">
                    <p className="text-gray-400 text-[11px] uppercase tracking-wider font-bold">Request Payload</p>
                    <pre className="bg-gray-950 p-3 rounded-lg text-emerald-300 overflow-x-auto text-[11px] max-h-48">
                      {JSON.stringify(currentLog.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Response Body */}
                <div className="space-y-1">
                  <p className="text-gray-400 text-[11px] uppercase tracking-wider font-bold">Response Body</p>
                  <pre className="bg-gray-950 p-3 rounded-lg text-amber-200 overflow-x-auto text-[11px] max-h-64">
                    {JSON.stringify(currentLog.responseBody, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
