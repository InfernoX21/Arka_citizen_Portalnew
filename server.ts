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
// NOTE: Without Gemini vision, this function CANNOT see the image.
// It can only cross-reference title vs description text.
// Scores are intentionally conservative (low/uncertain) without vision verification.
function analyzeIncidentRelevance(params: {
  reportedTitle: string;
  reportedDesc: string;
  landmark?: string;
  exifLocation?: any;
  imageData?: string;
}) {
  const { reportedTitle, reportedDesc, landmark, exifLocation } = params;
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

  // 2. Map incident categories to related keywords for cross-checking
  const categoryKeywordMap: Record<string, string[]> = {
    'Waterlogging': ['water', 'flood', 'submerge', 'waterlog', 'puddle', 'drain', 'rain', 'inundat'],
    'Fire': ['fire', 'flame', 'smoke', 'burn', 'blaze', 'inferno', 'charred'],
    'Broken Road': ['pothole', 'crater', 'broken road', 'asphalt', 'cracked', 'damaged road', 'road damage'],
    'Fallen Tree': ['fallen tree', 'tree', 'branch', 'trunk', 'uprooted'],
    'Garbage': ['garbage', 'trash', 'waste', 'dump', 'litter', 'overflow', 'rubbish'],
    'Traffic Congestion': ['traffic', 'jam', 'gridlock', 'congestion', 'vehicle queue', 'stuck'],
    'Power Failure': ['power', 'blackout', 'electricity', 'transformer', 'wire', 'outage'],
    'Accident': ['accident', 'crash', 'collision', 'wreck', 'hit'],
    'Road Block': ['block', 'barricade', 'obstruction', 'closed', 'barrier'],
    'Water Leakage': ['leak', 'pipe', 'burst', 'seepage'],
    'Building Damage': ['building', 'wall', 'collapse', 'crack', 'structural'],
    'Animal Hazard': ['animal', 'dog', 'cattle', 'snake', 'stray'],
  };

  // 3. Check if description keywords match what the title category claims
  const categoryKeywords = categoryKeywordMap[category] || [];
  const descriptionMatchesTitle = categoryKeywords.some(kw => descLower.includes(kw));

  // 4. Check for explicit cross-category contradictions
  // (e.g. title says "waterlogging" but description mentions "fire")
  let hasContradiction = false;
  let contradictionDetail = '';
  for (const [otherCat, otherKeywords] of Object.entries(categoryKeywordMap)) {
    if (otherCat !== category) {
      const contradictingKeyword = otherKeywords.find(kw => descLower.includes(kw));
      if (contradictingKeyword && !descriptionMatchesTitle) {
        hasContradiction = true;
        contradictionDetail = `Description mentions "${contradictingKeyword}" which relates to ${otherCat}, contradicting the title's claim of ${category}.`;
        break;
      }
    }
  }

  const locationStr = landmark || exifLocation?.city || 'Near City Center';
  const aiTitle = reportedTitle || `${category} Incident Near ${locationStr.split(',')[0]}`;

  // 5. Compute score — without AI vision, we CANNOT verify the image matches
  // Scores are intentionally conservative:
  //   - If description strongly aligns with title keywords: moderate score (55-65%)
  //   - If description contradicts title: very low score (5-10%)
  //   - If no clear signal either way: low/uncertain score (12-18%)
  let photoTitleMatchScore: number;
  let photoTitleExplanation: string;

  if (hasContradiction) {
    photoTitleMatchScore = 8;
    photoTitleExplanation = `⚠️ Mismatch detected: ${contradictionDetail} Image could not be verified without AI vision.`;
  } else if (descriptionMatchesTitle) {
    // Description text aligns with title, but we still can't verify the IMAGE
    photoTitleMatchScore = 55;
    photoTitleExplanation = `The description text aligns with the reported ${category.toLowerCase()} title, but the uploaded image has not been verified by AI vision. Visual confirmation is pending.`;
  } else if (!reportedDesc.trim()) {
    // No description at all — no way to verify
    photoTitleMatchScore = 12;
    photoTitleExplanation = `No description provided and image could not be analyzed without AI vision. Photo-title relevance is unverified.`;
  } else {
    // Description exists but doesn't contain category-relevant keywords
    photoTitleMatchScore = 15;
    photoTitleExplanation = `The description does not clearly reference ${category.toLowerCase()} conditions. The uploaded image could not be verified by AI vision, so photo-title relevance remains uncertain.`;
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
    isSpamOrIrrelevant: photoTitleMatchScore < 20 && hasContradiction,
    imageVerifiedByAI: false, // No Gemini vision was used
    visualSubjectDetected: 'unknown', // Cannot determine without vision
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
You are a strict Image-vs-Title Verification Engine for the Arka Citizen Incident Portal.
Your PRIMARY job: determine if the UPLOADED PHOTO visually matches what the user's TITLE claims.

═══════════════════════════════════════════
STEP 1: DESCRIBE WHAT THE IMAGE SHOWS
═══════════════════════════════════════════
Look at the image carefully. Describe the PRIMARY visual subject:
- What objects, scenes, or conditions are visible?
- Is there any hazard, damage, or emergency visible?
- Or is it a normal/mundane scene (building, street, room, person, food, animal, meme)?

═══════════════════════════════════════════
STEP 2: COMPARE IMAGE vs TITLE
═══════════════════════════════════════════
Reported Title: "${reportedTitle || 'Not explicitly provided'}"
Reported Description: "${reportedDesc || 'No description provided'}"
Location: "${landmark || 'Not specified'}"

Now compare what you SEE in the image with what the TITLE CLAIMS.

═══════════════════════════════════════════
SCORING RULES (STRICT — follow exactly)
═══════════════════════════════════════════

photoTitleMatchScore must reflect VISUAL EVIDENCE ONLY:

■ 85-98%: Image CLEARLY shows the exact hazard the title claims.
  Example: Title "Fire Breakout" + Image shows visible flames/smoke = 90-95%
  Example: Title "Waterlogging" + Image shows flooded/submerged road = 90-95%
  Example: Title "Pothole on Main Road" + Image shows a large pothole = 88-92%

■ 50-70%: Image shows RELATED but AMBIGUOUS context.
  Example: Title "Waterlogging" + Image shows wet road but no standing water = 55-65%
  Example: Title "Fire" + Image shows smoke in distance but no flames = 50-60%

■ 5-15%: Image shows something COMPLETELY DIFFERENT from the title.
  Example: Title "Waterlogging" + Image shows a sunny building = 5-10%
  Example: Title "Fire Breakout" + Image shows a normal street = 5-8%
  Example: Title "Garbage Overflow" + Image shows a selfie = 3-5%
  Example: Title "Road Damage" + Image shows food/animal/random object = 5-10%
  Example: Title "Waterlogging" + Image shows fire = 3-5% (OPPOSITE hazard!)

■ FORBIDDEN RANGE 20-45%: NEVER use this range. Either the image shows the hazard (≥50%) or it clearly doesn't (≤15%). There is no middle ground.

■ If the image is clearly a meme, selfie, screenshot, food photo, or completely unrelated to any civic incident, score ≤ 5% and set isSpamOrIrrelevant = true.

═══════════════════════════════════════════
CATEGORY CLASSIFICATION
═══════════════════════════════════════════
Classify based on what the IMAGE actually shows (not just the title):
"Road Block", "Waterlogging", "Accident", "Fire", "Garbage", "Broken Road", "Fallen Tree", "Power Failure", "Water Leakage", "Building Damage", "Animal Hazard", "Traffic Congestion", "Other"

If the image doesn't match the title's category, classify based on what the IMAGE shows. If the image shows no incident at all, use "Other".

═══════════════════════════════════════════
OUTPUT FIELDS
═══════════════════════════════════════════
- visualDescription: 1-sentence factual description of what the image shows (be specific)
- photoTitleMatchScore: 0-100 following the strict scoring rules above
- photoTitleExplanation: 1-sentence explaining WHY the score is what it is, referencing both the image content and the title
- aiTitle: Clean professional headline for the incident feed
- category: Based on the IMAGE content, not the title
- keywords: 3-5 relevant tags
- severity: "Low", "Medium", "High", or "Critical" (based on visible damage severity)
- aiConfidence: Same as photoTitleMatchScore
- detectedSummary: 1-sentence summary of detected conditions
- isSpamOrIrrelevant: true if image is spam/selfie/meme/food/completely unrelated
- spamReason: Explain why if flagged as spam
`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualDescription: { type: Type.STRING, description: 'Factual 1-sentence description of what the image actually shows' },
              photoTitleMatchScore: { type: Type.NUMBER, description: 'Relevance score 0 to 100 comparing photo to title (strict rules: 85-98 match, 50-70 ambiguous, 5-15 mismatch, NEVER 20-45)' },
              photoTitleExplanation: { type: Type.STRING, description: '1-sentence explanation referencing both image content and title' },
              aiTitle: { type: Type.STRING, description: 'Standardized concise headline for incident feed' },
              category: { type: Type.STRING, description: 'Category based on IMAGE content, one of 13 valid categories' },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-5 hazard tags',
              },
              severity: { type: Type.STRING, description: 'Low, Medium, High, or Critical' },
              aiConfidence: { type: Type.NUMBER, description: 'Same as photoTitleMatchScore' },
              detectedSummary: { type: Type.STRING, description: '1-sentence visual summary of detected conditions' },
              isSpamOrIrrelevant: { type: Type.BOOLEAN, description: 'True if image is spam/meme/selfie/food/completely unrelated' },
              spamReason: { type: Type.STRING, description: 'Reason if flagged as spam or misleading' },
            },
            required: [
              'visualDescription',
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

      // Sanity check: if score is in the forbidden 20-45 range, snap it to the nearest valid range
      if (parsedResult.photoTitleMatchScore > 15 && parsedResult.photoTitleMatchScore < 50) {
        // Check if visual description contradicts the title category
        const visualDesc = (parsedResult.visualDescription || '').toLowerCase();
        const titleCategory = reportedTitle.toLowerCase();
        const hasVisualMatch = visualDesc.includes('fire') && titleCategory.includes('fire')
          || visualDesc.includes('water') && (titleCategory.includes('water') || titleCategory.includes('flood'))
          || visualDesc.includes('pothole') && titleCategory.includes('road')
          || visualDesc.includes('garbage') && (titleCategory.includes('garbage') || titleCategory.includes('trash'))
          || visualDesc.includes('tree') && titleCategory.includes('tree');

        if (!hasVisualMatch) {
          parsedResult.photoTitleMatchScore = 12;
          parsedResult.aiConfidence = 12;
        } else {
          parsedResult.photoTitleMatchScore = 55;
          parsedResult.aiConfidence = 55;
        }
      }

      // Log the AI result for debugging
      console.log(`[AI Result] Title: "${reportedTitle}" | Score: ${parsedResult.photoTitleMatchScore}% | Visual: "${parsedResult.visualDescription}" | Category: ${parsedResult.category}`);

      // Mark as AI-vision verified
      parsedResult.imageVerifiedByAI = true;
      parsedResult.visualSubjectDetected = parsedResult.visualDescription || parsedResult.detectedSummary || 'analyzed';

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
      // Enhanced keyword + location matching fallback
      const candCat = candidateReport.category;
      const candLocation = (candidateReport.locationName || '').toLowerCase();
      const candTitleWords = (candidateReport.aiTitle || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

      const match = existingIncidents.find((i) => {
        if (i.status !== 'Active') return false;
        if (i.category !== candCat) return false;
        // Check for location overlap (shared words)
        const existingLocation = (i.locationName || '').toLowerCase();
        const locationOverlap = candLocation && existingLocation &&
          candLocation.split(/\s+/).some((w: string) => w.length > 3 && existingLocation.includes(w));
        // Check for title keyword overlap
        const existingTitle = (i.aiTitle || '').toLowerCase();
        const titleOverlap = candTitleWords.some((w: string) => existingTitle.includes(w));
        return locationOverlap || titleOverlap;
      });

      if (match) {
        return res.json({
          hasDuplicate: true,
          duplicateIncidentId: match.id,
          matchedTitle: match.aiTitle,
          matchConfidence: 75,
          reason: `A similar active ${candCat} incident is already reported at ${match.locationName}. Category and location/title keywords overlap.`,
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
      model: 'gemini-3.6-flash',
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
      model: 'gemini-3.6-flash',
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
