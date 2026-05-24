import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Save, ArrowLeft, CheckCircle, Upload, X, Loader, FileEdit,
  Plus, Trash2, Award, Briefcase, Star, StickyNote,
} from 'lucide-react';
import api from '../api/client.js';

const ASSET_TYPES = [
  { value: 'portfolio', label: 'Portfolio', icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { value: 'certification', label: 'Certification', icon: Award, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  { value: 'recommendation', label: 'Recommendation', icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { value: 'note', label: 'Note', icon: StickyNote, color: 'text-slate-400', bg: 'bg-slate-700/40 border-slate-600' },
  { value: 'other', label: 'Other', icon: FileText, color: 'text-slate-400', bg: 'bg-slate-700/40 border-slate-600' },
];

function assetType(type) {
  return ASSET_TYPES.find((t) => t.value === type) ?? ASSET_TYPES[ASSET_TYPES.length - 1];
}

export default function CVPage() {
  // ── CV state ──────────────────────────────────────────────────────────────
  const [cvText, setCvText] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [localPdfUrl, setLocalPdfUrl] = useState(null);
  const [pendingPdfPath, setPendingPdfPath] = useState(null);
  const [showTextEdit, setShowTextEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [pdfStatus, setPdfStatus] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Assets state ──────────────────────────────────────────────────────────
  const [assets, setAssets] = useState([]);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetMode, setAssetMode] = useState('text'); // 'text' | 'pdf'
  const [assetForm, setAssetForm] = useState({ name: '', assetType: 'portfolio', text: '' });
  const [assetPdfStatus, setAssetPdfStatus] = useState(null);
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetError, setAssetError] = useState('');
  const assetFileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/cv/current').catch(() => null),
      api.get('/api/assets').catch(() => []),
    ]).then(([cv, assetList]) => {
      setCvText(cv?.cv_text ?? '');
      setPdfUrl(cv?.pdf_url ?? null);
      setAssets(assetList ?? []);
    }).finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    return () => { if (localPdfUrl) URL.revokeObjectURL(localPdfUrl); };
  }, [localPdfUrl]);

  // ── CV upload ─────────────────────────────────────────────────────────────
  const handlePDF = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    setPdfStatus('parsing');
    setError('');
    if (localPdfUrl) URL.revokeObjectURL(localPdfUrl);
    setLocalPdfUrl(URL.createObjectURL(file));
    setPdfUrl(null);

    const form = new FormData();
    form.append('pdf', file);
    try {
      const data = await api.post('/api/cv/parse-pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCvText(data.text);
      setPendingPdfPath(data.pdfPath ?? null);
      setPdfStatus('done');
      setTimeout(() => setPdfStatus(null), 2000);
    } catch (err) {
      setError(err.error ?? 'Failed to parse PDF');
      setPdfStatus(null);
    }
  };

  const handleFileInput = (e) => handlePDF(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handlePDF(e.dataTransfer.files?.[0]);
  };

  const handleSave = async () => {
    if (!cvText.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/api/cv', { cvText, pdfPath: pendingPdfPath ?? undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.error ?? 'Failed to save CV');
    } finally {
      setSaving(false);
    }
  };

  // ── Asset upload (PDF) ────────────────────────────────────────────────────
  const handleAssetPdf = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setAssetError('Please select a PDF file');
      return;
    }
    if (!assetForm.name.trim()) {
      setAssetError('Please enter a name first');
      return;
    }
    setAssetPdfStatus('parsing');
    setAssetError('');
    const form = new FormData();
    form.append('pdf', file);
    form.append('name', assetForm.name);
    form.append('assetType', assetForm.assetType);
    try {
      // Do NOT set Content-Type manually — axios must generate the multipart boundary
      const { asset } = await api.post('/api/assets/upload', form);
      setAssets((prev) => [asset, ...prev]);
      setAssetForm({ name: '', assetType: 'portfolio', text: '' });
      setShowAssetForm(false);
      setAssetPdfStatus('done');
      setTimeout(() => setAssetPdfStatus(null), 2000);
    } catch (err) {
      setAssetError(err.error ?? 'Failed to upload');
      setAssetPdfStatus(null);
    }
  };

  // ── Asset save (text) ─────────────────────────────────────────────────────
  const saveAsset = async (e) => {
    e.preventDefault();
    if (!assetForm.name.trim() || !assetForm.text.trim()) {
      setAssetError('Name and content are required');
      return;
    }
    setSavingAsset(true);
    setAssetError('');
    try {
      const { asset } = await api.post('/api/assets', {
        name: assetForm.name,
        assetType: assetForm.assetType,
        text: assetForm.text,
      });
      setAssets((prev) => [asset, ...prev]);
      setAssetForm({ name: '', assetType: 'portfolio', text: '' });
      setShowAssetForm(false);
    } catch (err) {
      setAssetError(err.error ?? 'Failed to save');
    } finally {
      setSavingAsset(false);
    }
  };

  const deleteAsset = async (assetId) => {
    try {
      await api.delete(`/api/assets/${assetId}`);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch {}
  };

  const displayPdfUrl = localPdfUrl ?? pdfUrl;
  const hasPdf = !!displayPdfUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      {/* ── CV Section ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-7 h-7 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">My CV</h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Upload your CV as a PDF. Text is extracted automatically for AI features.
      </p>

      {error && (
        <div className="flex items-center justify-between mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PDF Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-4 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        {pdfStatus === 'parsing' ? (
          <div className="flex items-center justify-center gap-2 text-cyan-400">
            <Loader className="w-5 h-5 animate-spin" />
            <p className="text-sm font-medium">Uploading and extracting text…</p>
          </div>
        ) : pdfStatus === 'done' ? (
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">PDF ready — save to keep it</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className="w-5 h-5 text-slate-400" />
            <p className="text-sm text-slate-300">
              {hasPdf ? 'Drop a new PDF to replace' : 'Drop your CV PDF here or click to browse'}
            </p>
          </div>
        )}
      </div>

      {/* PDF Viewer or Text Editor */}
      {fetching ? (
        <div className="h-[680px] bg-slate-900 rounded-xl animate-pulse" />
      ) : hasPdf ? (
        <div className="space-y-2">
          <iframe
            src={displayPdfUrl}
            className="w-full rounded-xl border border-slate-700"
            style={{ height: '680px' }}
            title="CV Preview"
          />
          <button
            onClick={() => setShowTextEdit((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <FileEdit className="w-3.5 h-3.5" />
            {showTextEdit ? 'Hide extracted text' : 'View / edit extracted text'}
          </button>
          {showTextEdit && (
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm font-mono focus:outline-none focus:border-cyan-500 resize-none"
            />
          )}
        </div>
      ) : (
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Or paste your CV text directly here…"
          className="w-full h-80 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm font-mono focus:outline-none focus:border-cyan-500 resize-none"
        />
      )}

      <div className="flex items-center justify-between mt-4 mb-12">
        <p className="text-xs text-slate-500">
          {cvText.trim() ? `${cvText.trim().split(/\s+/).length} words extracted` : 'No CV yet'}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || !cvText.trim()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save CV'}
        </button>
      </div>

      {/* ── Profile Assets Section ───────────────────────────────────────────── */}
      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-white">Profile Assets</h2>
            <p className="text-slate-400 text-sm mt-1">
              Additional documents — portfolio, certifications, recommendations — automatically included in all AI outputs.
            </p>
          </div>
          {!showAssetForm && (
            <button
              onClick={() => setShowAssetForm(true)}
              className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex-shrink-0 ml-4"
            >
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
        </div>

        {/* Add Asset Form */}
        {showAssetForm && (
          <div className="mt-4 p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            {/* Mode tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setAssetMode('text')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  assetMode === 'text' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setAssetMode('pdf')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  assetMode === 'pdf' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload PDF
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Asset Name *</label>
                <input
                  value={assetForm.name}
                  onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. AWS Certificate, Portfolio 2024"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <select
                  value={assetForm.assetType}
                  onChange={(e) => setAssetForm((f) => ({ ...f, assetType: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dismiss button always visible */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowAssetForm(false); setAssetError(''); setAssetPdfStatus(null); }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assetMode === 'text' ? (
              <form onSubmit={saveAsset} className="-mt-1">
                <label className="text-xs text-slate-400 mb-1 block">Content *</label>
                <textarea
                  value={assetForm.text}
                  onChange={(e) => setAssetForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="Paste the document content here…"
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
                {assetError && <p className="text-sm text-red-400 mt-2">{assetError}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="submit"
                    disabled={savingAsset}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                  >
                    {savingAsset ? 'Saving…' : 'Save Asset'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="-mt-1">
                {/* Hidden file input */}
                <input
                  ref={assetFileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleAssetPdf(e.target.files[0]); }}
                />
                {/* Single clickable drop zone */}
                <button
                  type="button"
                  onClick={() => assetFileRef.current?.click()}
                  disabled={!!assetPdfStatus}
                  className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assetPdfStatus === 'parsing' ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">Extracting text from PDF…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-medium">Click to select a PDF</span>
                      <span className="text-xs text-slate-500">Text extracted automatically for AI use</span>
                    </>
                  )}
                </button>
                {assetError && <p className="text-sm text-red-400 mt-2">{assetError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Asset list */}
        <div className="mt-4 space-y-2">
          {assets.length === 0 && !showAssetForm && (
            <p className="text-sm text-slate-500 text-center py-6">
              No profile assets yet. Add certifications, portfolio pieces, or recommendations
              to give AI more context about your candidacy.
            </p>
          )}
          {assets.map((asset) => {
            const { icon: Icon, color, bg } = assetType(asset.asset_type);
            return (
              <div
                key={asset.id}
                className="flex items-start gap-3 p-4 bg-slate-900 border border-slate-700 rounded-xl"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{asset.name}</p>
                    <span className={`text-xs capitalize ${color}`}>{asset.asset_type}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {asset.extracted_text.slice(0, 150)}{asset.extracted_text.length > 150 ? '…' : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteAsset(asset.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
