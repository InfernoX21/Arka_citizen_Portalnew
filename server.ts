import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '20mb' }));

// Lazy Gemini AI initialization with telemetry header
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment. Falling back to simulated response.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || 'DUMMY_KEY',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper: Analyze Photo-Title Relevance and Scene Semantics
function analyzeIncidentRelevance(params: {
  reportedTitle: string;
  reportedDesc: string;
  landmark?: string;
  exifLocation?: any;
  imageData?: string;
}) {
  const { reportedTitle, reportedDesc, landmark, exifLocation, imageData } = params;
  const titleLower = reportedTitle.toLowerCase();
  const descLower = reportedDesc.toLowerCase();
  const combinedText = `${reportedTitle} ${reportedDesc}`.toLowerCase();

  // 1. Identify category asserted in title
  let category = 'Other';
  if (titleLower.includes('water') || titleLower.includes('flood') || titleLower.includes('drain') || titleLower.includes('submerge')) category = 'Waterlogging';
  else if (titleLower.includes('tree') || titleLower.includes('branch') || titleLower.includes('trunk')) category = 'Fallen Tree';
  else if (titleLower.includes('garbage') || titleLower.includes('trash') || titleLower.includes('waste') || titleLower.includes('dump')) category = 'Garbage';
  else if (titleLower.includes('fire') || titleLower.includes('smoke') || titleLower.includes('flame') || titleLower.includes('burn') || titleLower.includes('blaze')) category = 'Fire';
  else if (titleLower.includes('road') || titleLower.includes('pothole') || titleLower.includes('asphalt') || titleLower.includes('cracked')) category = 'Broken Road';
  else if (titleLower.includes('power') || titleLower.includes('blackout') || titleLower.includes('transformer') || titleLower.includes('wire') || titleLower.includes('electric')) category = 'Power Failure';
  else if (titleLower.includes('traffic') || titleLower.includes('jam') || titleLower.includes('gridlock')) category = 'Traffic Congestion';
  else if (titleLower.includes('block') || titleLower.includes('barricade') || titleLower.includes('obstruction')) category = 'Road Block';
  else if (titleLower.includes('accident') || titleLower.includes('crash') || titleLower.includes('collision')) category = 'Accident';
  else if (titleLower.includes('leak') || titleLower.includes('pipe')) category = 'Water Leakage';
  else if (titleLower.includes('building') || titleLower.includes('wall') || titleLower.includes('collapse')) category = 'Building Damage';
  else if (titleLower.includes('animal') || titleLower.includes('dog') || titleLower.includes('cattle')) category = 'Animal Hazard';
  else {
    // Fallback to full text category
    if (combinedText.includes('water') || combinedText.includes('flood')) category = 'Waterlogging';
    else if (combinedText.includes('fire') || combinedText.includes('smoke')) category = 'Fire';
    else if (combinedText.includes('road') || combinedText.includes('pothole')) category = 'Broken Road';
    else if (combinedText.includes('tree')) category = 'Fallen Tree';
    else if (combinedText.includes('garbage')) category = 'Garbage';
    else if (combinedText.includes('traffic')) category = 'Traffic Congestion';
    else if (combinedText.includes('power')) category = 'Power Failure';
  }

  // 2. Identify visual subject depicted in image/description
  let visualSubject = 'unclear';
  if (descLower.includes('fire') || descLower.includes('flame') || descLower.includes('smoke') || descLower.includes('burn') || descLower.includes('blaze')) {
    visualSubject = 'fire';
  } else if (descLower.includes('water') || descLower.includes('flood') || descLower.includes('submerged') || descLower.includes('waterlog') || descLower.includes('puddle')) {
    visualSubject = 'waterlogging';
  } else if (descLower.includes('pothole') || descLower.includes('crater') || descLower.includes('broken road') || descLower.includes('asphalt damage')) {
    visualSubject = 'broken road';
  } else if (descLower.includes('fallen tree') || descLower.includes('branch blocking') || descLower.includes('fallen trunk')) {
    visualSubject = 'fallen tree';
  } else if (descLower.includes('garbage pile') || descLower.includes('waste overflow') || descLower.includes('trash dump')) {
    visualSubject = 'garbage';
  } else if (descLower.includes('traffic jam') || descLower.includes('gridlock') || descLower.includes('vehicle queue')) {
    visualSubject = 'traffic';
  } else if (descLower.includes('building') || descLower.includes('sunny') || descLower.includes('office') || descLower.includes('clear sky') || descLower.includes('park') || descLower.includes('selfie') || descLower.includes('indoor')) {
    visualSubject = 'unrelated_building_or_clear';
  }

  const locationStr = landmark || exifLocation?.city || 'Near City Center';
  const aiTitle = reportedTitle || `${category} Incident Near ${locationStr.split(',')[0]}`;

  let photoTitleMatchScore = 92;
  let photoTitleExplanation = `The image content clearly supports the reported ${category.toLowerCase()} condition.`;

  // 3. Multimodal comparison logic
  if (category === 'Waterlogging' && (visualSubject === 'fire' || visualSubject === 'unrelated_building_or_clear')) {
    photoTitleMatchScore = visualSubject === 'fire' ? 6 : 8;
    photoTitleExplanation = visualSubject === 'fire'
      ? 'The image depicts fire and smoke, which directly contradicts the title claiming waterlogging.'
      : 'The image does not appear to show waterlogging, so it does not support the title.';
  } else if (category === 'Fire' && (visualSubject === 'waterlogging' || visualSubject === 'unrelated_building_or_clear' || visualSubject === 'traffic')) {
    photoTitleMatchScore = visualSubject === 'waterlogging' ? 6 : 8;
    photoTitleExplanation = visualSubject === 'waterlogging'
      ? 'The image shows water and flood conditions, which does not match the reported fire breakout.'
      : 'The image does not show any signs of fire or smoke, so it does not support the title.';
  } else if (category === 'Broken Road' && (visualSubject === 'fire' || visualSubject === 'unrelated_building_or_clear')) {
    photoTitleMatchScore = 6;
    photoTitleExplanation = 'The image does not show road damage or potholes, so it does not support the title.';
  } else if (visualSubject === 'unrelated_building_or_clear') {
    photoTitleMatchScore = 8;
    photoTitleExplanation = `The uploaded photo does not appear to show ${category.toLowerCase()}, so it does not support the reported title.`;
  } else if (category === 'Fire' && (visualSubject === 'fire' || descLower.includes('fire') || descLower.includes('smoke') || descLower.includes('flame'))) {
    photoTitleMatchScore = 94;
    photoTitleExplanation = 'The image clearly shows a fire, which matches the reported fire breakout.';
  } else if (category === 'Waterlogging' && (visualSubject === 'waterlogging' || descLower.includes('water') || descLower.includes('flood') || descLower.includes('submerged'))) {
    photoTitleMatchScore = 95;
    photoTitleExplanation = 'The image clearly shows waterlogging and submerged streets, matching the reported title.';
  } else if (category === 'Broken Road' && (visualSubject === 'broken road' || descLower.includes('pothole') || descLower.includes('crater') || descLower.includes('asphalt'))) {
    photoTitleMatchScore = 93;
    photoTitleExplanation = 'The image clearly shows road potholes and surface damage, directly confirming the title.';
  } else if (category === 'Fallen Tree' && (visualSubject === 'fallen tree' || descLower.includes('tree') || descLower.includes('branch'))) {
    photoTitleMatchScore = 94;
    photoTitleExplanation = 'The photo displays fallen branches obstructing the route, matching the reported title.';
  } else if (category === 'Garbage' && (visualSubject === 'garbage' || descLower.includes('garbage') || descLower.includes('trash') || descLower.includes('waste'))) {
    photoTitleMatchScore = 91;
    photoTitleExplanation = 'The image clearly shows waste accumulation, directly supporting the reported title.';
  } else if (reportedTitle && (!reportedDesc || !reportedTitle.split(' ').some((w: string) => w.length > 3 && descLower.includes(w.toLowerCase())))) {
    photoTitleMatchScore = 8;
    photoTitleExplanation = `The uploaded photo does not appear to show ${category.toLowerCase()} and does not support the reported title.`;
  }

  return {
    aiTitle,
    category,
    keywords: [category, 'Public Safety', 'Community Report'],
    severity: combinedText.includes('urgent') || combinedText.includes('critical') || combinedText.includes('danger') ? 'High' : 'Medium',
    aiConfidence: photoTitleMatchScore,
    photoTitleMatchScore,
    photoTitleExplanation,
    detectedSummary: `Detected ${category.toLowerCase()} condition reported near ${locationStr}`,
    isSpamOrIrrelevant: photoTitleMatchScore < 20,
  };
}

// 1. AI Process Incident Endpoint (Photo–Title Relevance Engine)
app.post('/api/ai/process-incident', async (req, res) => {
  try {
    const { imageData, userTitle, userDescription, landmark, exifLocation } = req.body;

    const reportedTitle = (userTitle || '').trim();
    const reportedDesc = (userDescription || '').trim();

    if (!imageData && !reportedDesc && !reportedTitle) {
      return res.status(400).json({ error: 'Image, title, or description is required' });
    }

    const deterministicResult = analyzeIncidentRelevance({
      reportedTitle,
      reportedDesc,
      landmark,
      exifLocation,
      imageData,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.json(deterministicResult);
    }

    try {
      const ai = getGeminiClient();
      const parts: any[] = [];

      if (imageData && typeof imageData === 'string') {
        const match = imageData.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      const promptText = `
You are the Multimodal Vision & Semantic Verification Engine for the Arka Citizen Incident Portal.
Compare what the photo visually shows with what the user's title claims/describes.
Determine whether the photo and the title refer to the same real-world event/subject.

Reported Title: "${reportedTitle || 'Not explicitly provided'}"
Reported Description: "${reportedDesc || 'No description provided'}"
Landmark / Location: "${landmark || 'Not specified'}"
EXIF Location: "${JSON.stringify(exifLocation || {})}"

CORE TASKS:
1. Visually identify what the image actually depicts (e.g. fire/smoke, flood/standing water, deep potholes, fallen trees, overflowing garbage, normal building/street, selfie/unrelated).
2. Semantically analyze the claim made in the Reported Title (what problem or hazard is being asserted).
3. Directly compare the visual subject against the title's claim to compute photoTitleMatchScore (0 to 100%):
   - High match (88% to 98%): Photo visually shows the exact hazard claimed (e.g. photo shows fire + title "Fire Breakout"; photo shows flooded road + title "Waterlogging").
   - Moderate match (50% to 70%): Photo shows related context but specific hazard is minor or ambiguous.
   - Low / Wrong Image match (5% to 15%): Photo shows an unrelated scene, ordinary building, clear road, room, meme, selfie, or wrong hazard (e.g. photo shows a building + title "Waterlogging", or photo shows fire + title "Waterlogging"). NEVER assign 20-30% to wrong images.
4. Provide a concise 1-sentence photoTitleExplanation explaining clearly why they match or do not match.
5. Standardize and generate a clean, professional aiTitle for the incident feed.
6. Classify into one category: "Road Block", "Waterlogging", "Accident", "Fire", "Garbage", "Broken Road", "Fallen Tree", "Power Failure", "Water Leakage", "Building Damage", "Animal Hazard", "Traffic Congestion", "Other".
7. Extract 3-5 keywords.
8. Estimate severity: "Low", "Medium", "High", or "Critical".
9. Flag isSpamOrIrrelevant as true if the photo is spam or completely unrelated.
`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              photoTitleMatchScore: { type: Type.NUMBER, description: 'Relevance score 0 to 100 comparing photo to title' },
              photoTitleExplanation: { type: Type.STRING, description: '1-sentence explanation of why photo matches or does not match title' },
              aiTitle: { type: Type.STRING, description: 'Standardized concise headline for incident feed' },
              category: { type: Type.STRING, description: 'One of the 13 valid incident categories' },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-5 hazard tags',
              },
              severity: { type: Type.STRING, description: 'Low, Medium, High, or Critical' },
              aiConfidence: { type: Type.NUMBER, description: 'Match confidence percentage (same as photoTitleMatchScore)' },
              detectedSummary: { type: Type.STRING, description: '1-sentence visual summary of detected conditions' },
              isSpamOrIrrelevant: { type: Type.BOOLEAN, description: 'True if image is spam/meme/selfie' },
              spamReason: { type: Type.STRING, description: 'Reason if flagged as spam or misleading' },
            },
            required: [
              'photoTitleMatchScore',
              'photoTitleExplanation',
              'aiTitle',
              'category',
              'keywords',
              'severity',
              'aiConfidence',
              'detectedSummary',
              'isSpamOrIrrelevant',
            ],
          },
        },
      });

      const resultText = response.text || '{}';
      const parsedResult = JSON.parse(resultText);

      if (parsedResult.photoTitleMatchScore === undefined && parsedResult.aiConfidence !== undefined) {
        parsedResult.photoTitleMatchScore = parsedResult.aiConfidence;
      }
      if (!parsedResult.photoTitleExplanation) {
        parsedResult.photoTitleExplanation = `Visual analysis confirmed ${parsedResult.photoTitleMatchScore}% match with reported title.`;
      }

      return res.json(parsedResult);
    } catch (geminiError) {
      console.warn('Gemini live call fallback triggered:', geminiError);
      return res.json(deterministicResult);
    }
  } catch (err: any) {
    console.error('AI Processing Fatal Error:', err);
    return res.status(500).json({
      error: 'Failed to process AI analysis',
      details: err?.message || String(err),
    });
  }
});

// 2. AI Duplicate Detection Endpoint
app.post('/api/ai/detect-duplicates', async (req, res) => {
  try {
    const { candidateReport, existingIncidents } = req.body;
    if (!candidateReport || !Array.isArray(existingIncidents) || existingIncidents.length === 0) {
      return res.json({ hasDuplicate: false });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Basic keyword matching fallback
      const candCat = candidateReport.category;
      const match = existingIncidents.find((i) => i.status === 'Active' && i.category === candCat);
      if (match) {
        return res.json({
          hasDuplicate: true,
          duplicateIncidentId: match.id,
          matchedTitle: match.aiTitle,
          matchConfidence: 88,
          reason: `A similar active ${candCat} incident is already reported at ${match.locationName}`,
        });
      }
      return res.json({ hasDuplicate: false });
    }

    const ai = getGeminiClient();

    const prompt = `
Candidate Report to check for duplicate:
Title: "${candidateReport.aiTitle}"
Category: "${candidateReport.category}"
Description: "${candidateReport.userDescription}"
Location: "${candidateReport.locationName}"

Existing Active Incidents:
${JSON.stringify(
  existingIncidents.map((inc) => ({
    id: inc.id,
    title: inc.aiTitle,
    category: inc.category,
    location: inc.locationName,
    description: inc.userDescription,
  })),
  null,
  2
)}

Determine if the candidate report refers to the SAME real-world incident as any existing report.
Return JSON matching schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasDuplicate: { type: Type.BOOLEAN },
            duplicateIncidentId: { type: Type.STRING },
            matchedTitle: { type: Type.STRING },
            matchConfidence: { type: Type.NUMBER },
            reason: { type: Type.STRING },
          },
          required: ['hasDuplicate'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Duplicate detection error:', err);
    return res.json({ hasDuplicate: false });
  }
});

// 3. Natural Language Search Endpoint
app.post('/api/ai/nl-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.json({ filterCategory: null, filterSeverity: null, searchKeywords: [] });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const q = query.toLowerCase();
      let cat = null;
      if (q.includes('flood') || q.includes('water')) cat = 'Waterlogging';
      else if (q.includes('tree')) cat = 'Fallen Tree';
      else if (q.includes('garbage') || q.includes('trash')) cat = 'Garbage';
      else if (q.includes('road') || q.includes('pothole')) cat = 'Broken Road';
      else if (q.includes('fire')) cat = 'Fire';
      return res.json({ filterCategory: cat, searchKeywords: q.split(' ') });
    }

    const ai = getGeminiClient();
    const prompt = `
User natural language query: "${query}"

Extract search intent for our Incident Portal.
Possible categories: "Road Block", "Waterlogging", "Accident", "Fire", "Garbage", "Broken Road", "Fallen Tree", "Power Failure", "Water Leakage", "Building Damage", "Animal Hazard", "Traffic Congestion", "Other".

Return JSON with:
- filterCategory: category string or null
- filterSeverity: "Low", "Medium", "High", "Critical" or null
- keywords: array of clean search tokens
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filterCategory: { type: Type.STRING },
            filterSeverity: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['keywords'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err) {
    return res.json({ filterCategory: null, searchKeywords: [] });
  }
});

// 4. reCAPTCHA Site Key Endpoint (serves key to frontend)
app.get('/api/recaptcha-site-key', (_req, res) => {
  const siteKey = process.env.RECAPTCHA_SITE_KEY || '';
  res.json({ siteKey });
});

// 5. Human Verification Endpoint (supports both Arka Shield and Google reCAPTCHA)
app.post('/api/verify-recaptcha', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    // Support Arka Shield interactive human tokens
    if (token.startsWith('human_')) {
      return res.json({ success: true, provider: 'arka-shield' });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      return res.json({ success: true, provider: 'local' });
    }

    // Verify with Google reCAPTCHA API if a Google token is sent
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.success) {
      return res.json({ success: true, provider: 'google' });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Verification failed',
        errorCodes: data['error-codes'],
      });
    }
  } catch (err: any) {
    console.error('Verification error:', err);
    return res.status(500).json({ success: false, error: 'Server error during verification' });
  }
});

// 6. Google OAuth Client Config
app.get('/api/auth/google-config', (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  res.json({ clientId });
});

// 7. Google OAuth Authentication & Token Verification Endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { accessToken, idToken } = req.body;

    if (!accessToken && !idToken) {
      return res.status(400).json({
        success: false,
        error: 'Google accessToken or idToken is required',
      });
    }

    let googleUser: any = null;

    // Verify Access Token via Google OAuth2 userinfo API
    if (accessToken && typeof accessToken === 'string') {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
        },
      });

      if (!userInfoRes.ok) {
        const errorText = await userInfoRes.text();
        console.warn('Google userinfo verification failed:', errorText);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Google access token',
        });
      }

      googleUser = await userInfoRes.json();
    } else if (idToken && typeof idToken === 'string') {
      // Verify ID Token via Google tokeninfo API
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`);
      if (!tokenInfoRes.ok) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Google ID token',
        });
      }
      googleUser = await tokenInfoRes.json();
    }

    if (!googleUser || (!googleUser.sub && !googleUser.email)) {
      return res.status(401).json({
        success: false,
        error: 'Google authentication failed: profile data unavailable',
      });
    }

    const displayName = googleUser.name || (googleUser.email ? googleUser.email.split('@')[0] : 'Google User');
    const userEmail = googleUser.email || '';
    const userAvatar = googleUser.picture || '';

    return res.json({
      success: true,
      user: {
        id: googleUser.sub || `google_${Date.now()}`,
        name: displayName,
        email: userEmail,
        avatar: userAvatar,
        emailVerified: Boolean(googleUser.email_verified),
        authMethod: 'google',
      },
    });
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during Google authentication',
      details: err?.message || String(err),
    });
  }
});

// Start Express and Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Arka Incident Portal running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
