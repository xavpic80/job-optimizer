import Anthropic from '@anthropic-ai/sdk';
import {
  MATCH_SCORE_PROMPT,
  FIT_ASSESSMENT_PROMPT,
  MEETING_PREP_PROMPT,
  CONTACT_BACKGROUND_PROMPT,
  JOB_PARSE_PROMPT,
  CV_OPTIMIZATION_PROMPT,
  COVER_LETTER_PROMPT,
  INTERVIEW_PREP_PROMPT,
  TRANSCRIPT_ANALYSIS_PROMPT,
  EMAIL_PROMPT,
  COMMS_COACH_PROMPT,
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
  // Detect truncation before attempting JSON.parse
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Response was cut off — the output was too long. Please try again.');
  }
  return JSON.parse(stripMarkdown(response.content[0].text));
};

// Append profile assets block to content if present
const withAssets = (content, profileAssets) =>
  profileAssets
    ? `${content}\n\n---\n\nADDITIONAL PROFILE ASSETS:\n${profileAssets}`
    : content;

export const parseJobContent = (rawText) =>
  callClaude(JOB_PARSE_PROMPT, rawText.slice(0, 12000), 1500);

export const optimizeCV = (jobDescription, userCV, profileAssets = null) =>
  callClaude(
    CV_OPTIMIZATION_PROMPT,
    withAssets(
      `CV:\n\n${userCV}\n\n---\n\nJob Description:\n\n${jobDescription}`,
      profileAssets
    ),
    3000
  );

export const generateCoverLetter = (job, userCV, profileAssets = null) =>
  callClaude(
    COVER_LETTER_PROMPT,
    withAssets(
      `CV:\n\n${userCV}\n\n---\n\nJob Title: ${job.title}\nCompany: ${job.company}\n\nJob Description:\n\n${job.description}`,
      profileAssets
    ),
    2500
  );

export const generateEmail = (job, userCV, profileAssets = null) =>
  callClaude(
    EMAIL_PROMPT,
    withAssets(
      `CV:\n\n${userCV}\n\n---\n\nJob Title: ${job.title}\nCompany: ${job.company}\n\nJob Description:\n\n${job.description}`,
      profileAssets
    ),
    1500
  );

export const generateInterviewPrep = (job, userCV, profileAssets = null) =>
  callClaude(
    INTERVIEW_PREP_PROMPT,
    withAssets(
      `CV:\n\n${userCV}\n\n---\n\nJob Title: ${job.title}\nCompany: ${job.company}\n\nJob Description:\n\n${job.description}`,
      profileAssets
    ),
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

export const generateMeetingPrep = (jobDescription, userCV, contactInfo, contactResearch, communications, transcripts, profileAssets = null, aiBackground = null) =>
  callClaude(
    MEETING_PREP_PROMPT,
    withAssets(
      `CANDIDATE CV:\n${userCV || '(Not provided)'}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 4000)}\n\n---\n\nCONTACT:\n${contactInfo}\n\n---\n\nCONTACT AI BACKGROUND:\n${aiBackground || '(Not generated yet — use web research below)'}\n\n---\n\nCONTACT RESEARCH (live web snippets):\n${contactResearch || '(No data found)'}\n\n---\n\nPREVIOUS COMMUNICATIONS:\n${communications || '(None)'}\n\n---\n\nPREVIOUS TRANSCRIPTS:\n${transcripts || '(None)'}`,
      profileAssets
    ),
    2500
  );

export const assessFit = (jobDescription, userCV, companyResearch, otherOpenings, profileAssets = null) =>
  callClaude(
    FIT_ASSESSMENT_PROMPT,
    withAssets(
      `CANDIDATE CV:\n${userCV || '(No CV on file)'}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 5000)}\n\n---\n\nCOMPANY RESEARCH:\n${companyResearch || '(No data retrieved)'}\n\n---\n\nOTHER OPENINGS:\n${otherOpenings || '(No data retrieved)'}`,
      profileAssets
    ),
    4000  // raised from 2000 — rich CVs + company research easily exceeded the limit
  );

export const generateContactBackground = (contactInfo, linkedinText, webResearch) =>
  callClaude(
    CONTACT_BACKGROUND_PROMPT,
    `CONTACT DETAILS:\n${contactInfo}\n\n---\n\nLINKEDIN PROFILE TEXT:\n${linkedinText || '(Not provided)'}\n\n---\n\nWEB RESEARCH:\n${webResearch || '(No data found)'}`,
    2000
  );

export const generateCommsCoach = (jobDescription, userCV, communicationsText, transcriptsText) =>
  callClaude(
    COMMS_COACH_PROMPT,
    `JOB DESCRIPTION:\n${jobDescription?.slice(0, 3000) || '(Not provided)'}\n\n---\n\nCANDIDATE CV:\n${userCV?.slice(0, 3000) || '(Not provided)'}\n\n---\n\nCOMMUNICATIONS (chronological):\n${communicationsText || '(None logged)'}\n\n---\n\nINTERVIEW TRANSCRIPTS:\n${transcriptsText || '(None)'}`,
    3000
  );
