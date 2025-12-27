import React, { useMemo, useState } from 'react';
import type { PinnedAsset } from '../../types';

type AssetDraft = Omit<PinnedAsset, 'id'>;

interface AddAssetModalProps {
  onClose: () => void;
  onPin: (asset: AssetDraft) => Promise<void> | void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ onClose, onPin }) => {
  const [tab, setTab] = useState<'link' | 'code' | 'file'>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => {
    if (title.trim().length < 2) return false;
    if (tab === 'link') return /^https?:\/\//i.test(url.trim());
    if (tab === 'code') return content.trim().length > 0;
    if (tab === 'file') return content.trim().length > 0;
    return false;
  }, [tab, title, url, content]);

  const handlePin = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setErr(null);
    try {
      const asset: AssetDraft = {
        type: tab,
        title: title.trim(),
        ...(tab === 'link' ? { url: url.trim() } : {}),
        ...(tab !== 'link' ? { content } : {}),
        ...(tab === 'code' && language.trim() ? { language: language.trim() } : {})
      };
      await onPin(asset);
    } catch (e: any) {
      setErr(e.message || 'Unable to pin asset.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Pinned Context</p>
            <h3 className="text-lg font-semibold text-slate-900 mt-1">Attach & Pin</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
            {([
              { k: 'link', label: 'Link', icon: 'fa-link' },
              { k: 'code', label: 'Code', icon: 'fa-code' },
              { k: 'file', label: 'File', icon: 'fa-file-lines' }
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => {
                  setTab(t.k);
                  setErr(null);
                }}
                className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  tab === t.k ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className={`fas ${t.icon} mr-2`}></i>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
              {err}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tab === 'link' ? 'e.g. Spec, Notion doc, Dashboard…' : tab === 'code' ? 'e.g. SQL snippet, Parser patch…' : 'e.g. Notes, Checklist…'}
              className="mt-2 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-300"
            />
          </div>

          {tab === 'link' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-300"
              />
              <p className="text-[11px] text-slate-400 mt-2">Tip: Anything pinned here is visible at the top of the workstream.</p>
            </div>
          )}

          {tab === 'code' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Language (optional)</label>
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="ts, sql, bash…"
                    className="mt-2 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-300"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={() => {
                      setTitle((t) => t || 'Code Snippet');
                      setLanguage((l) => l || 'ts');
                    }}
                    className="w-full py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-black uppercase tracking-widest hover:bg-white"
                    type="button"
                  >
                    Autofill
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Code</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Paste code…"
                  className="mt-2 w-full font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl px-4 py-3 text-[12px] outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-400 resize-none"
                />
              </div>
            </>
          )}

          {tab === 'file' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Paste text… (meeting notes, requirements, checklists)"
                className="mt-2 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-8 focus:ring-blue-500/10 focus:border-blue-300 resize-none"
              />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={handlePin}
            disabled={!canSave || isSaving}
            className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              !canSave || isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/10'
            }`}
          >
            {isSaving ? 'Pinning…' : 'Pin Context'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAssetModal;
