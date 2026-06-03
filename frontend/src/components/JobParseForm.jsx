import React, { useState, useRef } from 'react';
import { Zap, AlertCircle, FileText, Upload, X as XIcon, Loader } from 'lucide-react';
import api from '../api/client.js';

export default function JobParseForm({ onJobParsed, userCV }) {
  const [input, setInput]                 = useState('');
  const [postingDate, setPostingDate]     = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [companyOverride, setCompanyOverride] = useState('');
  const [pdfPath, setPdfPath]             = useState(null);
  const [pdfName, setPdfName]             = useState('');
  const [uploadingPdf, setUploadingPdf]   = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const fileInputRef                      = useRef(null);

  const handlePdfFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please drop a PDF file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('PDF is too large (max 4 MB). Please paste the text directly instead.');
      return;
    }
    setUploadingPdf(true);
    setError('');
    try {
      const form = new FormData();
      form.append('pdf', file);
      const { text, filePath } = await api.post('/api/jobs/parse-pdf', form);
      setInput(text);
      setPdfPath(filePath);
      setPdfName(file.name);
    } catch (err) {
      setError(err.error ?? 'Failed to extract PDF text');
    } finally {
      setUploadingPdf(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handlePdfFile(file);
  };

  const clearPdf = () => {
    setPdfPath(null);
    setPdfName('');
    setInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return setError('Please enter a job URL or description');
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/api/jobs/parse', {
        input,
        userCV,
        postingDate: postingDate || null,
        titleOverride: titleOverride.trim() || null,
        companyOverride: companyOverride.trim() || null,
        pdfPath: pdfPath || null,
      });
      onJobParsed(data.job);
      setInput('');
      setPostingDate('');
      setTitleOverride('');
      setCompanyOverride('');
      setPdfPath(null);
      setPdfName('');
    } catch (err) {
      setError(err.error ?? 'Failed to parse job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job title + company row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Job Title <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={titleOverride}
            onChange={(e) => setTitleOverride(e.target.value)}
            placeholder="Auto-detected from description"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Company <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={companyOverride}
            onChange={(e) => setCompanyOverride(e.target.value)}
            placeholder="Auto-detected from description"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* PDF drop zone */}
      {!pdfName ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl px-6 py-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            dragOver
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-600 hover:border-slate-400 bg-slate-900/50'
          }`}
        >
          {uploadingPdf ? (
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-slate-400" />
          )}
          <p className="text-sm text-slate-400 text-center">
            {uploadingPdf
              ? 'Extracting text from PDF…'
              : <><span className="text-cyan-400 font-medium">Drop a job PDF</span> or click to browse</>
            }
          </p>
          <p className="text-xs text-slate-600">Max 4 MB · PDF only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handlePdfFile(e.target.files[0])}
          />
        </div>
      ) : (
        /* PDF attached indicator */
        <div className="flex items-center gap-3 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <span className="text-sm text-cyan-300 flex-1 truncate">{pdfName}</span>
          <button
            type="button"
            onClick={clearPdf}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Job URL or Description
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a job URL (Indeed, company page) or raw job description text…"
          rows={5}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          LinkedIn blocks automated scraping — paste the job description as text instead.
        </p>
      </div>

      {/* Posting date */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Posting Date <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={postingDate}
          onChange={(e) => setPostingDate(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || uploadingPdf || !input.trim()}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
      >
        <Zap className="w-5 h-5" />
        {loading ? 'Parsing...' : 'Parse & Add Job'}
      </button>
    </form>
  );
}
