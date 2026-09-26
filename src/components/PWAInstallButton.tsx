import React, { useState } from 'react';
import { Download, Smartphone, Laptop, CheckCircle, X, Share2, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return (
      <div 
        id="pwa-installed-badge"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200"
        title="App is installed on your device"
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">Installed App</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-button"
        onClick={handleInstallClick}
        className={`flex items-center gap-2 rounded-lg font-medium transition shadow-sm ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white'
            : 'px-3.5 py-2 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-amber-500/20'
        }`}
        title="Install Varma & Varma App on your device for offline and fast access"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>

      {showModal && (
        <div 
          id="pwa-install-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div 
            id="pwa-install-modal-content"
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Install Varma &amp; Varma App</h3>
                  <p className="text-xs text-slate-500">Quick access from Desktop or Mobile Home Screen</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-slate-600">
              {isInstallable && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="font-semibold text-amber-900 text-xs mb-2">Direct Browser Install Available:</p>
                  <button
                    onClick={async () => {
                      await install();
                      setShowModal(false);
                    }}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    Trigger Chrome/Browser Install Prompt
                  </button>
                </div>
              )}

              {isIOS ? (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Apple iPhone / iPad (Safari) Instructions:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
                    <li>Tap the <strong className="text-slate-900"><Share2 className="w-3.5 h-3.5 inline text-blue-600 mr-1" />Share</strong> icon at the bottom of Safari toolbar.</li>
                    <li>Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong>.</li>
                    <li>Tap <strong className="text-slate-900">Add</strong> in the top-right corner.</li>
                  </ol>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Laptop className="w-4 h-4 text-slate-700" />
                      <span>Desktop (Chrome/Edge)</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Look for the <strong className="text-slate-800">Install icon</strong> in the right side of the address bar (URL bar), or click ⋮ Menu &gt; Install App.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span>Android (Chrome)</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed">
                      Tap the <strong className="text-slate-800">three dots (⋮)</strong> menu in the upper-right corner and select <strong className="text-slate-800">Add to Home screen</strong> or <strong className="text-slate-800">Install app</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-2.5 bg-blue-50/70 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>Installing as a PWA grants instant launch from taskbar/home screen, full screen space, and fast cached loading.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
