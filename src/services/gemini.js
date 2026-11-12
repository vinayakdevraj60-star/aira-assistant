const { GoogleGenAI } = require('@google/genai');
const storage = require('./storage');
const cricketService = require('./cricketService');

class GeminiService {
  constructor() {
    this.conversationHistory = [];
    this.initHistoryFromStorage();
  }

  initHistoryFromStorage() {
    try {
      const saved = storage.getHistory();
      if (Array.isArray(saved) && saved.length > 0) {
        // saved is stored in reverse chronological order (newest first)
        const chronological = [...saved].reverse().slice(-40);
        this.conversationHistory = [];
        for (const item of chronological) {
          if (item.prompt) {
            this.conversationHistory.push({
              role: 'user',
              text: item.prompt,
              timestamp: item.timestamp
            });
          }
          if (item.response) {
            this.conversationHistory.push({
              role: 'model',
              text: item.response,
              timestamp: item.timestamp
            });
          }
        }
        console.log(`[Gemini] Restored persistent conversation memory with ${this.conversationHistory.length} turns from previous sessions.`);
      }
    } catch (e) {
      console.warn('[Gemini] Error loading history into memory:', e);
    }
  }

  getApiKey() {
    const config = storage.getConfig();
    return (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  }

  async testConnection(apiKey) {
    if (!apiKey) {
      return { success: false, error: 'API key is required' };
    }
    const testModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError = null;

    for (const model of testModels) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: 'Hello, reply with "AIRA_CONNECTED_OK"'
        });
        const text = response.text || '';
        return { success: true, message: `Connected to Gemini (${model})!`, preview: text.trim() };
      } catch (e) {
        lastError = e;
      }
    }

    return {
      success: false,
      error: lastError ? (lastError.message || 'Failed to authenticate with Gemini API') : 'Unknown error'
    };
  }

  /**
   * Process a multimodal query with optional screen capture and multiple images
   * @param {Object} params
   * @param {string} params.prompt - User voice or text question
   * @param {string} [params.screenCapture] - Base64 DataURL of screen capture
   * @param {Array<string>} [params.images] - Array of Base64 DataURLs of uploaded images
   */
  async askAira({ prompt, screenCapture = null, images = [] }) {
    const config = storage.getConfig();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return {
        success: false,
        text: "I am ready to assist you! Please open my Admin Console by pressing Ctrl+Shift+A or clicking the settings icon to configure your Google Gemini API key.",
        error: "API key missing"
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts = [];

    // 1. Add Screen Capture if provided
    if (screenCapture && screenCapture.length > 50) {
      const base64Data = screenCapture.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
      parts.push({
        text: "[Context: Current laptop screen snapshot attached above. You are observing the user's active laptop screen. Focus on the actual application windows, code, articles, websites, or documents visible on their desktop, rather than your own floating assistant widget.]"
      });
    } else {
      parts.push({
        text: "[Context: Note: No screen snapshot was attached with this question. If the user asks what is on their screen, politely clarify that you cannot see their screen snapshot at this moment and ask them to enable Live Screen Vision.]"
      });
    }

    // 2. Add Multiple Uploaded Documents & Images (Images, PDFs, Logs)
    if (images && images.length > 0) {
      images.forEach((item, idx) => {
        // Support both direct dataUrl strings and { dataUrl, name, type } objects
        const dataUrl = typeof item === 'string' ? item : item.dataUrl;
        const itemName = typeof item === 'object' && item.name ? item.name : `Attachment #${idx + 1}`;
        if (!dataUrl) return;

        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mime = match[1];
          const rawBase64 = match[2];
          parts.push({
            inlineData: {
              mimeType: mime,
              data: rawBase64
            }
          });
          if (mime === 'application/pdf') {
            parts.push({
              text: `[Attached PDF Document: "${itemName}". Carefully parse all pages, text, and extract all table structures, columns, and data accurately.]`
            });
          } else {
            parts.push({
              text: `[Attached Visual Context: "${itemName}". Analyze text, UI elements, errors, or diagrams shown.]`
            });
          }
        }
      });
    }

    // 3. Live real-time cricket scores and sports context
    if (cricketService.isCricketQuery(prompt)) {
      try {
        const liveCricketData = await cricketService.getLiveCricketContext(prompt);
        if (liveCricketData) {
          parts.push({ text: liveCricketData });
        }
      } catch (e) {
        console.warn('[Gemini] Cricket context fetch error:', e.message);
      }
    }

    // 4. User's query text
    parts.push({
      text: prompt || "What can you see in this screen/document?"
    });

    const userModel = config.modelName || 'gemini-3.6-flash';
    // High-performance candidate models with automatic failover if Google servers experience high demand (503)
    const candidateModels = Array.from(new Set([
      userModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite'
    ]));

    let lastError = null;
    let response = null;
    let successfulModel = null;
    let usedSearch = config.enableSearch !== false;

    for (const model of candidateModels) {
      try {
        const memorySummary = storage.getMemorySummary(15);
        let sysInstruction = config.systemPrompt || "You are Aira, a smart, perceptive 3D AI assistant on the user's laptop. Keep spoken answers direct, natural, conversational, and helpful.";
        
        // Emotion recognition & tone adaptability
        sysInstruction += `\n\n[Emotion Recognition & Multimodal Perception]:
- Detect and adapt to the user's tone and emotions (e.g. frustrated, curious, joyful, stressed). Respond with empathy, reassuring encouragement, or enthusiasm matching their emotional state.
- Language Support: You speak and understand Kannada, Hindi, and English seamlessly. If the user asks in Kannada or Hindi, reply naturally in that language using authentic native phrasing.`;

        // Custom Vision, App Parsing, Error Logs & PDF Table extraction instructions
        sysInstruction += `\n\n[Advanced Desktop Vision, Error Logs & PDF/Table Extraction]:
- Specific App Parsing: When an application snapshot or desktop window is attached (VS Code, Chrome, Terminal, etc.), focus directly on the active content inside that app.
- Live Error Log Diagnosis: When analyzing logs, console dumps, or terminal stack traces, identify the root cause line, explain what triggered the exception, and provide the exact fix code.
- PDF Table & Document Extraction: When PDFs, tabular images, or documents are attached, extract columns and rows cleanly into formatted Markdown tables with appropriate headers.`;

        // Multi-Question List & Study Revision Mode
        sysInstruction += `\n\n[Multi-Question Vision & Study Mode]:
- When the user shows a list or sheet of questions (on screen, photo, or document), or asks to answer questions on screen:
  1. Carefully find and read EVERY SINGLE question visible.
  2. Answer ALL of them in sequential order (Q1, Q2, Q3...).
  3. Format each question and answer clearly with bold headers, e.g.:
     ### Question 1: [Exact Question Text]
     **Answer:** [Clear, complete, accurate answer]
  4. Ensure each answer is self-contained, accurate, and easy to review later.
- Study & Revision Mode: You remember all questions and answers previously extracted or studied. When the user asks to "revise", "quiz me", "review my questions", or asks about any previously shown question, you recite and explain them without needing the user to resend or reshow the original screen or image!`;

        // Continuous Real-Time MCQ Auto-Solver
        sysInstruction += `\n\n[Continuous Real-Time MCQ Auto-Solver]:
- When solving Multiple Choice Questions (MCQs) from screen captures:
  1. Carefully read the question, code snippets, equations, or diagrams visible on the user's active window or desktop.
  2. Evaluate all answer choices (A, B, C, D / 1, 2, 3, 4).
  3. If the question appears lengthy, cut off at the bottom, or if options are not yet visible, state:
     "Question is lengthy or cut off. Please scroll down so I can capture the options and complete question."
  4. Format your response cleanly:
     **Answer:** Option [Letter/Number]: [Exact option text]
     **Reason:** [1-2 concise sentences explaining why this answer is correct].
  5. Keep the output punchy, accurate, and direct so it can be spoken in under 5 seconds.
  6. If no multiple-choice question is visible on the screen, reply with: "No MCQ question detected on screen."`;

        // Lengthy Scrolled Question & Multi-Screen Note-Taking Mode
        sysInstruction += `\n\n[Lengthy Scrolled Question & Multi-Screen Note-Taking Mode]:
- When a question or code block is too lengthy to fit on a single screen and requires scrolling down:
  1. Multiple sequential screen snapshots from top to bottom are attached (e.g. Part 1 Top, Part 2 Middle, Part 3 Bottom).
  2. Treat ALL attached screenshots as a single continuous document, question, or codebase.
  3. Keep working memory of every scroll image in the sequence to ensure complete context retention.
  4. Carefully transcribe and note down the entire problem statement, including code snippets, equations, diagrams, and all answer options (A, B, C, D / 1, 2, 3, 4).
  5. Synthesize the complete context across the top, middle, and scrolled-down bottom parts.
  6. Provide the accurate answer and rationale based on the full combined question context.
  7. In standard MCQ mode output:
     **Question Summary:** [1-sentence summary of the complete question]
     **Answer:** Option [Letter/Number]: [Exact option text]
     **Reason:** [1-2 concise sentences explaining why this answer is correct based on the full question context].
  8. Comprehensive Line-by-Line Code Explanation:
     - When the user asks to "explain each line in the code from the scroll images" (or asks for a line-by-line explanation of scrolled code):
       * Reconstruct the unified, complete code from top to bottom across all scroll images without duplicated lines at image seams.
       * Present the unified code in a fenced markdown code block with line numbers.
       * Provide a thorough line-by-line (or logical block-by-block) breakdown explaining what each line does, variable transformations, algorithmic logic, and purpose.
       * Provide an overview of the algorithm along with Time Complexity and Space Complexity.
       * For spoken output, summarize the code flow cleanly without reciting raw syntax tokens.`;

        // PowerPoint Presentations & Executive Reports (PDF & Word) Mode
        sysInstruction += `\n\n[PowerPoint Presentations & Executive Reports (PDF & Word) Generation]:
- You are equipped with direct file-creation capabilities for PowerPoint (.pptx), Word Documents (.docx), and PDF Reports (.pdf).
- When the user asks to "make a ppt", "create presentation", "make report in pdf", "make report in word", or "make report in both pdf and word":
  1. Confirm that you can directly generate and export these files to their Downloads folder.
  2. Synthesize structured, executive-grade information with clear takeaways, data tables, and architectures.`;

        // Inject latest study pack context if available
        const latestPack = storage.getLatestStudyPack();
        if (latestPack && Array.isArray(latestPack.items) && latestPack.items.length > 0) {
          const packSummary = latestPack.items.map((it, idx) => `[Item ${idx + 1}] Q: "${it.question}" | A: "${it.answer}"`).join('\n');
          sysInstruction += `\n\n[Active Study & Revision Pack ("${latestPack.title}")]:\nYou have the following questions and answers stored in your memory from previous study sessions. Help the user revise them anytime they ask:\n${packSummary}`;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

        sysInstruction += `\n\n[Current Real-World Date & Real-Time Accuracy]:
- Today's exact date is: ${dateStr}, ${timeStr} (IST).
- The current year is ${now.getFullYear()}.
- When answering queries about "today", "yesterday", "current", or live events (especially sports like India vs New Zealand cricket), ALWAYS rely on the current date (${dateStr}) and any attached [LIVE VERIFIED REAL-TIME DATA]. NEVER invent or confuse today's match with matches from past years (2023, 2024, etc.).`;
        const reqConfig = {
          systemInstruction: sysInstruction,
        };

        if (usedSearch) {
          reqConfig.tools = [{ googleSearch: {} }];
        }

        const callWithTimeout = (promise, ms = 25000) => {
          let timer;
          return Promise.race([
            promise,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
            })
          ]).finally(() => clearTimeout(timer));
        };

        try {
          response = await callWithTimeout(ai.models.generateContent({
            model: model,
            contents: [
              ...this.formatRecentHistory(),
              {
                role: 'user',
                parts: parts
              }
            ],
            config: reqConfig
          }), 25000);
          successfulModel = model;
          break; // Succeeded!
        } catch (searchOrQuotaErr) {
          // If Google Search Grounding failed (e.g. 429 quota or tool unavailable), retry immediately without search tool
          if (usedSearch) {
            console.warn(`[Gemini] Search grounding error on ${model}, retrying without search tool...`);
            reqConfig.tools = undefined;
            response = await callWithTimeout(ai.models.generateContent({
              model: model,
              contents: [
                ...this.formatRecentHistory(),
                {
                  role: 'user',
                  parts: parts
                }
              ],
              config: reqConfig
            }), 25000);
            successfulModel = model;
            usedSearch = false;
            break; // Succeeded without search!
          } else {
            throw searchOrQuotaErr;
          }
        }
      } catch (err) {
        console.warn(`[Gemini] Error with model ${model}:`, err.message || err);
        lastError = err;
        // Proceed to next candidate model
      }
    }

    if (!response) {
      return {
        success: false,
        text: `Error from Gemini: ${lastError?.message || 'High demand or quota limit'}. Please try again in a moment.`,
        error: lastError?.message
      };
    }

    const responseText = response.text || "I'm sorry, I couldn't generate a response. Please try again.";

    // Extract search grounding sources if available
    let sources = [];
    try {
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (metadata && metadata.groundingChunks) {
        sources = metadata.groundingChunks
          .filter(chunk => chunk.web)
          .map(chunk => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));
      }
    } catch (err) {}

    // Update conversation history
    this.conversationHistory.push({
      role: 'user',
      text: prompt,
      hasScreen: !!screenCapture,
      imagesCount: images.length,
      timestamp: new Date().toISOString()
    });
    this.conversationHistory.push({
      role: 'model',
      text: responseText,
      sources: sources,
      model: successfulModel,
      timestamp: new Date().toISOString()
    });

    // Log in storage
    storage.addHistoryEntry({
      prompt,
      response: responseText,
      hasScreen: !!screenCapture,
      imagesCount: images.length,
      sources,
      model: successfulModel
    });

    // Auto-detect and store Question & Answer pairs if multiple questions were answered
    const extractedPairs = this.extractQAPairs(responseText);
    let savedPack = null;
    if (extractedPairs.length >= 2) {
      savedPack = storage.saveStudyPack({
        title: prompt && prompt.length < 50 ? prompt : `Questions from ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        items: extractedPairs
      });
    }

    return {
      success: true,
      text: responseText,
      sources: sources,
      model: successfulModel,
      studyPack: savedPack
    };
  }

  /**
   * Automatically parses structured Question & Answer pairs from generated text
   */
  extractQAPairs(text) {
    if (!text || typeof text !== 'string') return [];
    const pairs = [];
    const lines = text.split('\n');
    let currentQ = null;
    let currentA = [];
    let qCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for Question start: "### Question 1: ...", "Question 1:", "1. What is...", "**Q1:** ..."
      const qMatch = line.match(/^(?:###|\*\*|#+)?\s*(?:Question|Q\.?)\s*(\d+)[:.]?\s*(.*?)(?:\*\*|$)/i) ||
                     line.match(/^(\d+)[\.\)]\s+(.*)/);

      if (qMatch) {
        // Save previous Q&A if complete
        if (currentQ && currentA.length > 0) {
          pairs.push({
            number: currentQ.number || ++qCounter,
            question: currentQ.text,
            answer: currentA.join(' ').trim()
          });
          currentA = [];
        }
        const num = parseInt(qMatch[1], 10);
        let qText = (qMatch[2] || '').replace(/[*_#]+/g, '').trim();
        // If line is just "Question 1:", lookahead to next line for the question text
        if (!qText && i + 1 < lines.length && !lines[i + 1].toLowerCase().includes('answer:')) {
          i++;
          qText = lines[i].replace(/[*_#]+/g, '').trim();
        }
        currentQ = { number: isNaN(num) ? ++qCounter : num, text: qText };
        continue;
      }

      // Check for Answer start: "**Answer:** ...", "Answer: ...", "Ans: ..."
      const aMatch = line.match(/^(?:###|\*\*|#+)?\s*(?:Answer|Ans)[:.]?\*?\*?\s*(.*)/i);
      if (aMatch && currentQ) {
        const aFirst = (aMatch[1] || '').replace(/[*_#]+/g, '').trim();
        if (aFirst) currentA.push(aFirst);
        continue;
      }

      // Append continuation lines to current answer if we are inside a Q&A block
      if (currentQ && currentA.length > 0) {
        currentA.push(line.replace(/[*_#]+/g, '').trim());
      }
    }

    // Push the final item
    if (currentQ && currentA.length > 0) {
      pairs.push({
        number: currentQ.number || ++qCounter,
        question: currentQ.text,
        answer: currentA.join(' ').trim()
      });
    }

    return pairs;
  }

  formatRecentHistory() {
    // Provide up to 20 recent messages (10 complete multi-turn Q&A exchanges) for deep conversational context
    const recent = this.conversationHistory.slice(-20);
    return recent.map(item => ({
      role: item.role,
      parts: [{ text: item.text }]
    }));
  }

  clearHistory() {
    this.conversationHistory = [];
    storage.clearHistory();
  }
}

module.exports = new GeminiService();
