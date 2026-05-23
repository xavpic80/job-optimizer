import Anthropic from '@anthropic-ai/sdk';
import {
  CV_OPTIMIZATION_PROMPT,
  COVER_LETTER_PROMPT,
  INTERVIEW_PREP_PROMPT,
  TRANSCRIPT_ANALYSIS_PROMPT,
  EMAIL_PROMPT,
} from '../lib/prompts.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

const callClaude = async (systemPrompt, userContent, maxTokens = 2000) => {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });
  return JSON.parse(response.content[0].text);
};

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
