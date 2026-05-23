import axios from 'axios';
import * as cheerio from 'cheerio';

export const isUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export const parseRawJobText = (text) => {
  const titleMatch = text.match(/(?:Title|Position|Job Title)[:\s]+([^\n]+)/i);
  const companyMatch = text.match(/(?:Company|Organization)[:\s]+([^\n]+)/i);
  const locationMatch = text.match(/(?:Location|Based in|Position in)[:\s]+([^\n]+)/i);
  const salaryMatch = text.match(/\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?/);
  const isRemote = /\bremote\b|\bwork\s+from\s+home\b/i.test(text);

  return {
    title: titleMatch?.[1]?.trim() ?? 'Untitled Position',
    company: companyMatch?.[1]?.trim() ?? 'Unknown Company',
    location: locationMatch?.[1]?.trim() ?? null,
    salary: salaryMatch?.[0] ?? null,
    description: text,
    remote_type: isRemote ? 'remote' : 'onsite',
    source: 'manual',
    posted_date: new Date().toISOString(),
  };
};

export const scrapeIndeed = async (url) => {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
  });
  const $ = cheerio.load(data);
  return {
    title: $('h1[class*="jobsearch"]').text().trim() || $('h1').first().text().trim(),
    company: $('[data-company-name]').text().trim(),
    location: $('[data-location]').text().trim(),
    description: $('#jobDescriptionText').text().trim(),
    remote_type: data.toLowerCase().includes('remote') ? 'remote' : 'onsite',
    source: 'indeed',
    source_url: url,
    posted_date: new Date().toISOString(),
  };
};

// LinkedIn blocks simple HTTP requests — requires Puppeteer or a paid proxy.
// TODO: integrate @sparticuz/chromium for Vercel-compatible headless scraping.
export const scrapeLinkedIn = async (url) => {
  throw new Error(
    'LinkedIn URL scraping requires a browser — please paste the job description as text instead.'
  );
};

export const scrapeGeneric = async (url) => {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
  });
  const $ = cheerio.load(data);
  $('script, style, nav, footer, header').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return parseRawJobText(text);
};

export const extractKeywords = (description) => {
  const skillList = [
    'product strategy', 'leadership', 'analytics', 'data-driven', 'cross-functional',
    'agile', 'user research', 'roadmap', 'OKR', 'KPI', 'go-to-market', 'SaaS',
    'AI', 'machine learning', 'API', 'SQL', 'marketing', 'scrum', 'B2B', 'B2C',
  ];
  const found = skillList.filter((s) =>
    description.toLowerCase().includes(s.toLowerCase())
  );
  const yearsMatch = description.match(/(\d+)\+?\s+years/i);
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
    if (normalize(job) === newNorm) {
      return { isDuplicate: true, existingJobId: job.id };
    }
  }
  return { isDuplicate: false };
};
