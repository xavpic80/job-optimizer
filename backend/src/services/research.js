import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

const searchDDG = async (query, maxResults = 5) => {
  try {
    const { data } = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const results = [];
    $('.result').each((_, el) => {
      if (results.length >= maxResults) return false;
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title && snippet) results.push(`${title}: ${snippet}`);
    });
    return results;
  } catch {
    return [];
  }
};

export const researchCompany = async (companyName) => {
  const [news, jobs] = await Promise.allSettled([
    searchDDG(`"${companyName}" news 2025`, 5),
    searchDDG(`"${companyName}" jobs careers hiring open positions`, 5),
  ]);
  return {
    news: news.status === 'fulfilled' ? news.value : [],
    openings: jobs.status === 'fulfilled' ? jobs.value : [],
  };
};
