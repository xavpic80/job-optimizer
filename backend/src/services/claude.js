import Anthropic from '@anthropic-ai/sdk';
import {
  MATCH_SCORE_PROMPT,
  FIT_ASSESSMENT_PROMPT,
  JOB_PARSE_PROMPT,
  CV_OPTIMIZATION_PROMPT,
  COVER_LETTER_PROMPT,
  INTERVIEW_PREP_PROMPT,
  TRANSCRIPT_ANALYSIS_PROMPT,
  EMAIL_PROMPT,
} from '../lib/prompts.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

const stripMarkdown = (text) =>
  text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

const callClaude = async (systemPrompt, userContent, maxTokens = 2000) => {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });
  return JSON.parse(stripMarkdown(response.content[0].text));
};

export const parseJobContent = (rawText) =>
  callClaude(JOB_PARSE_PROMPT, rawText.slice(0, 12000), 1500);

export const optimizeCV = (jobDescription, userCV) =>
  callClaude(
    CV_OPTIMIZATION_PROMPT,
    `CV:\n\n${userCV}\n\n---\n\nJob Description:\n\n${jobDescription}`
  );

export const generateCoverLetter = (job, userCV) =>
  callClaude(
    COVER_LETTER_PROMPT,
    `CV:\n\n${userCV}\n\n---\n\nJob Title: ${job.title}\nCompany: ${job.company}\n\nJob Description:\n\n${job.description}`
  );

export const generateEmail = (job, userCV) =>
  callClaude(
    EMAIL_PROMPT,
    `CV:\n\n${userCV}\n\n---\n\nJob Title: ${job.title}\nCompany: ${job.company}\n\nJob Description:\n\n${job.description}`
  );

export const generateInterviewPrep = (job, userCV) =>
  callClaude(
    INTERVIEW_PREP_PROMPT,
    `CV:\n\n${userCV}\n\n---\n\nJob Title: ${job.title}\nCompany: ${job.company}\n\nJob Description:\n\n${job.description}`,
    3000
  );

export const analyzeTranscript = (transcriptText, jobDescription) =>
  callClaude(
    TRANSCRIPT_ANALYSIS_PROMPT,
    `Interview Transcript:\n\n${transcriptText}\n\n---\n\nTarget Job:\n\n${jobDescription}`,
    3000
  );

export const scoreMatch = (jobDescription, userCV) =>
  callClaude(
    MATCH_SCORE_PROMPT,
    `CV:\n\n${userCV.slice(0, 4000)}\n\n---\n\nJob Description:\n\n${jobDescription.slice(0, 4000)}`,
    500
  );

export const assessFit = (jobDescription, userCV, companyResearch, otherOpenings) =>
  callClaude(
    FIT_ASSESSMENT_PROMPT,
    `CANDIDATE CV:\n${userCV || '(No CV on file)'}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 5000)}\n\n---\n\nCOMPANY RESEARCH:\n${companyResearch || '(No data retrieved)'}\n\n---\n\nOTHER OPENINGS:\n${otherOpenings || '(No data retrieved)'}`,
    2000
  );
