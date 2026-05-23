import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Save, ArrowLeft, CheckCircle, Upload, X, Loader, FileEdit } from 'lucide-react';
import api from '../api/client.js';

export default function CVPage() {
  const [cvText, setCvText] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);       // saved PDF (signed URL from backend)
  const [localPdfUrl, setLocalPdfUrl] = useState(null); // just-uploaded PDF (blob URL)
  const [pendingPdfPath, setPendingPdfPath] = useState(null); // storage path to send with save
  const [showTextEdit, setShowTextEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [pdfStatus, setPdfStatus] = useState(null); // null | 'parsing' | 'done'
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/api/cv/current')
      .then((data) => {
        setCvText(data.cv_text ?? '');
        setPdfUrl(data.pdf_url ?? null);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  // Clean up blob URL when component unmounts or a new one is set
  useEffect(() => {
    return () => { if (localPdfUrl) URL.revokeObjectURL(localPdfUrl); };
  }, [localPdfUrl]);

  const handlePDF = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    setPdfStatus('parsing');
    setError('');
    // Show PDF immediately via blob URL
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

  const displayPdfUrl = localPdfUrl ?? pdfUrl;
  const hasPdf = !!displayPdfUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-7 h-7 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">My CV</h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Upload your CV as a PDF. The text is extracted automatically for AI features.
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

      <div className="flex items-center justify-between mt-4">
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
    </div>
  );
}
