import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseJobContent } from './claude.js';

export const isUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe',
  'nav', 'header', 'footer',
  'button', 'form', 'input', 'select', 'textarea',
  '[role="navigation"]', '[role="banner"]', '[role="dialog"]', '[role="alert"]',
  '[aria-hidden="true"]',
  '[class*="cookie"]', '[id*="cookie"]',
  '[class*="banner"]', '[class*="popup"]', '[class*="modal"]',
  '[class*="breadcrumb"]', '[class*="sidebar"]',
  '[class*="related"]', '[class*="similar"]',
  '[class*="share"]', '[class*="social"]',
  '[class*="newsletter"]', '[class*="subscribe"]',
  '[class*="ad-"]', '[class*="-ad"]', '[class*="advertisement"]',
];

// Ordered list of selectors likely to contain job content
const CONTENT_SELECTORS = [
  '[class*="job-description"]', '[class*="jobDescription"]', '[class*="job_description"]',
  '[class*="posting-content"]', '[class*="job-content"]', '[class*="job-details"]',
  '[class*="jobDetails"]', '[class*="job_details"]',
  '[class*="description-content"]', '[class*="offer-description"]',
  'main', '[role="main"]', 'article',
  '[class*="content-body"]', '[class*="page-content"]',
  '#content', '.content', '#main', '.main',
];

const cleanHtml = (html) => {
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS.join(', ')).remove();

  // Try to isolate the job content area
  for (const sel of CONTENT_SELECTORS) {
    const el = $(sel).first();
    const text = el.text().replace(/\s+/g, ' ').trim();
    if (el.length && text.length > 300) {
      return text;
    }
  }

  // Fallback: full body text
  return $('body').text().replace(/\s+/g, ' ').trim();
};

export const scrapeGeneric = async (url) => {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeout: 20000,
  });

  const rawText = cleanHtml(data);
  const parsed = await parseJobContent(rawText);

  return {
    ...parsed,
    source: 'company_page',
    source_url: url,
    posted_date: new Date().toISOString(),
  };
};

export const scrapeIndeed = async (url) => {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
  });
  const rawText = cleanHtml(data);
  const parsed = await parseJobContent(rawText);
  return { ...parsed, source: 'indeed', source_url: url, posted_date: new Date().toISOString() };
};

// LinkedIn blocks simple HTTP requests — requires Puppeteer or a paid proxy.
export const scrapeLinkedIn = async (_url) => {
  throw new Error(
    'LinkedIn URL scraping requires a browser — please paste the job description as text instead.'
  );
};

// Used for raw text pasted by user — Claude extracts structure from it too
export const parseRawJobText = async (text) => {
  const parsed = await parseJobContent(text);
  return { ...parsed, source: 'manual', posted_date: new Date().toISOString() };
};

export const extractKeywords = (description) => {
  const skillList = [
    'product strategy', 'leadership', 'analytics', 'data-driven', 'cross-functional',
    'agile', 'user research', 'roadmap', 'OKR', 'KPI', 'go-to-market', 'SaaS',
    'AI', 'machine learning', 'API', 'SQL', 'marketing', 'scrum', 'B2B', 'B2C',
    'design', 'branding', 'art direction', 'creative direction', 'social media',
    'digital', 'copywriting', 'campaign', 'strategy',
  ];
  const found = skillList.filter((s) =>
    description.toLowerCase().includes(s.toLowerCase())
  );
  const yearsMatch = description.match(/(\d+)\+?\s+(?:ans|years)/i);
  if (yearsMatch) found.push(`${yearsMatch[1]}+ years experience`);
  return [...new Set(found)];
};

export const calculateMatchScore = (jobDescription, userCV) => {
  const keywords = extractKeywords(jobDescription).map((k) => k.toLowerCase());
  if (!keywords.length) return 50;
  const cvLower = userCV.toLowerCase();
  const matches = keywords.filter((k) => cvLower.includes(k)).length;
  return Math.min(100, Math.round((matches / keywords.length) * 100)) || 50;
};

export const checkDuplicate = (newJob, existingJobs) => {
  const normalize = (j) =>
    `${j.title?.toLowerCase()}|${j.company?.toLowerCase()}|${(j.location ?? '').toLowerCase()}`;
  const newNorm = normalize(newJob);
  for (const job of existingJobs) {
    if (normalize(job) === newNorm) return { isDuplicate: true, existingJobId: job.id };
  }
  return { isDuplicate: false };
};
