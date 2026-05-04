require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());
// Serve static files under the /public route so it matches the directory structure
app.use('/public', express.static(path.join(__dirname, 'public')));

// --- Gemini AI Setup ---
let chatModel = null;
let quizModel = null;

function createModel(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

function initializeChatAI(apiKey) {
  chatModel = createModel(apiKey);
}

function initializeQuizAI(apiKey) {
  quizModel = createModel(apiKey);
}

function getLocalChatFallback(message = '') {
  const text = String(message || '').toLowerCase().trim();

  if (!text) return "Please type a message so I can help you.";
  if (/\b(hi|hello|hey|hlo)\b/.test(text)) return "Hello! I am your AI Study Buddy. Ask me anything.";
  if (text.includes('president of india')) return "The President of India is Droupadi Murmu.";
  if (text.includes('prime minister of india') || text.includes('pm of india')) return "The Prime Minister of India is Narendra Modi.";
  if (text.includes('how are you')) return "I am doing great. Tell me what you want to learn today.";
  if (text.includes('capital of india')) return "The capital of India is New Delhi.";
  if (/\b(math|mathematics)\b/.test(text)) {
    return "Math is all about patterns and problem solving. Start with one topic: arithmetic, algebra, geometry, or percentages. Ask me a specific math question like 'What is a prime number?' or 'Solve 15% of 200'.";
  }
  if (/\b(science|physics|chemistry|biology)\b/.test(text)) {
    return "Science explains how the world works. You can ask me specific topics like cells, force, atoms, planets, or chemical reactions.";
  }
  if (/\b(history)\b/.test(text)) {
    return "History studies past events. Ask a specific question like 'When did World War II end?' or 'Who built the Taj Mahal?'.";
  }
  if (/\b(geography)\b/.test(text)) {
    return "Geography covers places, climate, and maps. Ask something specific like capitals, rivers, mountains, or continents.";
  }
  if (/\b(programming|coding|javascript|python|html|css)\b/.test(text)) {
    return "Programming means giving instructions to computers. Ask me coding questions and I can explain with examples.";
  }

  return "I am facing AI rate limits right now, but I am still here to help. Please ask a short, clear question and I will answer with best effort.";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function extractJsonArrayFromText(rawText = '') {
  const cleaned = String(rawText).replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const direct = safeJsonParse(cleaned);
  if (Array.isArray(direct)) return direct;

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = cleaned.slice(start, end + 1);
    const parsed = safeJsonParse(sliced);
    if (Array.isArray(parsed)) return parsed;
  }
  return null;
}

const chatKeyFromEnv = process.env.GEMINI_API_KEY_CHAT || process.env.GEMINI_API_KEY;
const quizKeyFromEnv = process.env.GEMINI_API_KEY_QUIZ || process.env.GEMINI_API_KEY;

if (chatKeyFromEnv && chatKeyFromEnv !== 'YOUR_GEMINI_API_KEY_HERE') {
  initializeChatAI(chatKeyFromEnv);
  console.log('✅ Gemini Chat AI initialized from .env');
}

if (quizKeyFromEnv && quizKeyFromEnv !== 'YOUR_GEMINI_API_KEY_HERE') {
  initializeQuizAI(quizKeyFromEnv);
  console.log('✅ Gemini Quiz AI initialized from .env');
}

// --- API: Set API Key at runtime ---
app.post('/api/set-key', (req, res) => {
  const { apiKey, target = 'chat' } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key is required' });
  try {
    if (target === 'quiz') initializeQuizAI(apiKey);
    else if (target === 'both') {
      initializeChatAI(apiKey);
      initializeQuizAI(apiKey);
    } else initializeChatAI(apiKey);
    res.json({ success: true, message: `API key configured for ${target}` });
  } catch (err) {
    res.status(500).json({ error: 'Invalid API key' });
  }
});

// --- API: Check if AI is ready ---
app.get('/api/status', (req, res) => {
  res.json({ ready: !!(chatModel || quizModel), chatReady: !!chatModel, quizReady: !!quizModel });
});

// ======================================================
// MULTILINGUAL DEMO QUESTIONS — Works without API key
// ======================================================
const DEMO_QUESTIONS = {
  English: {
    Science: [
      { id:1, question:"What is the chemical symbol for water?", options:{A:"H2O",B:"CO2",C:"NaCl",D:"O2"}, correct:"A", explanation:"Water is H2O." },
      { id:2, question:"Which planet is known as the Red Planet?", options:{A:"Venus",B:"Mars",C:"Jupiter",D:"Saturn"}, correct:"B", explanation:"Mars is red due to iron oxide." },
      { id:3, question:"What is the powerhouse of the cell?", options:{A:"Nucleus",B:"Ribosome",C:"Mitochondria",D:"Golgi"}, correct:"C", explanation:"Mitochondria produce energy." },
      { id:4, question:"What gas do plants absorb?", options:{A:"O2",B:"N2",C:"CO2",D:"H2"}, correct:"C", explanation:"Plants use CO2 for photosynthesis." },
      { id:5, question:"Hardest natural substance?", options:{A:"Gold",B:"Iron",C:"Diamond",D:"Quartz"}, correct:"C", explanation:"Diamond is the hardest." },
      { id:6, question:"Boiling point of water?", options:{A:"90°C",B:"100°C",C:"120°C",D:"80°C"}, correct:"B", explanation:"Water boils at 100°C at sea level." },
      { id:7, question:"Largest organ in human body?", options:{A:"Heart",B:"Brain",C:"Skin",D:"Liver"}, correct:"C", explanation:"Skin is the largest organ." },
      { id:8, question:"Speed of light approximately?", options:{A:"300,000 km/s",B:"150,000 km/s",C:"500,000 km/s",D:"1,000,000 km/s"}, correct:"A", explanation:"Light travels at ~300,000 km/s." },
      { id:9, question:"Which gas is most abundant in Earth's atmosphere?", options:{A:"Oxygen",B:"Carbon Dioxide",C:"Nitrogen",D:"Argon"}, correct:"C", explanation:"Nitrogen makes up ~78% of the atmosphere." },
      { id:10, question:"What is the center of an atom called?", options:{A:"Electron",B:"Proton",C:"Nucleus",D:"Neutron"}, correct:"C", explanation:"The nucleus is the central core." },
      { id:11, question:"Which planet is closest to the Sun?", options:{A:"Venus",B:"Mercury",C:"Earth",D:"Mars"}, correct:"B", explanation:"Mercury is the innermost planet." },
      { id:12, question:"What is the study of mushrooms called?", options:{A:"Biology",B:"Mycology",C:"Botany",D:"Zoology"}, correct:"B", explanation:"Mycology is the study of fungi." },
      { id:13, question:"How many bones in the adult human body?", options:{A:"206",B:"210",C:"195",D:"250"}, correct:"A", explanation:"An adult has 206 bones." },
      { id:14, question:"Which element has the symbol 'Au'?", options:{A:"Silver",B:"Gold",C:"Aluminum",D:"Copper"}, correct:"B", explanation:"Au stands for Aurum, which is Gold." },
      { id:15, question:"What is the chemical formula for table salt?", options:{A:"NaCl",B:"KCl",C:"HCl",D:"MgCl2"}, correct:"A", explanation:"Table salt is Sodium Chloride (NaCl)." },
      { id:16, question:"What part of the plant conducts photosynthesis?", options:{A:"Roots",B:"Stem",C:"Leaves",D:"Flowers"}, correct:"C", explanation:"Leaves contain chlorophyll for photosynthesis." },
      { id:17, question:"What is the nearest star to Earth?", options:{A:"Sirius",B:"Proxima Centauri",C:"The Sun",D:"Alpha Centauri"}, correct:"C", explanation:"The Sun is our closest star." },
      { id:18, question:"Which unit measures electrical resistance?", options:{A:"Volt",B:"Ampere",C:"Ohm",D:"Watt"}, correct:"C", explanation:"Ohm is the unit of resistance." },
      { id:19, question:"What is the process of liquid turning to gas?", options:{A:"Condensation",B:"Evaporation",C:"Sublimation",D:"Freezing"}, correct:"B", explanation:"Evaporation turns liquid into vapor." },
      { id:20, question:"Which blood type is the universal donor?", options:{A:"A",B:"B",C:"AB",D:"O"}, correct:"D", explanation:"O negative is the universal donor type." }
    ],
    Mathematics: [
      { id:1, question:"Value of Pi (approx)?", options:{A:"3.14",B:"2.71",C:"1.61",D:"4.20"}, correct:"A", explanation:"Pi is ~3.14." },
      { id:2, question:"15% of 200?", options:{A:"20",B:"30",C:"40",D:"15"}, correct:"B", explanation:"15% of 200 is 30." },
      { id:3, question:"Square root of 144?", options:{A:"10",B:"11",C:"12",D:"14"}, correct:"C", explanation:"12*12=144." },
      { id:4, question:"Sum of angles in triangle?", options:{A:"90°",B:"180°",C:"360°",D:"270°"}, correct:"B", explanation:"Triangle angles always sum to 180°." },
      { id:5, question:"What is 7 x 8?", options:{A:"54",B:"56",C:"62",D:"48"}, correct:"B", explanation:"7 * 8 = 56." },
      { id:6, question:"What is 12 x 12?", options:{A:"144",B:"124",C:"134",D:"154"}, correct:"A", explanation:"12 * 12 = 144." },
      { id:7, question:"What is the only even prime number?", options:{A:"2",B:"4",C:"6",D:"1"}, correct:"A", explanation:"2 is the only even prime." },
      { id:8, question:"What is 1000 divided by 25?", options:{A:"40",B:"50",C:"25",D:"30"}, correct:"A", explanation:"1000 / 25 = 40." },
      { id:9, question:"How many sides in a hexagon?", options:{A:"5",B:"6",C:"7",D:"8"}, correct:"B", explanation:"A hexagon has 6 sides." },
      { id:10, question:"What is 2 to the power of 5?", options:{A:"10",B:"32",C:"16",D:"64"}, correct:"B", explanation:"2^5 = 32." },
      { id:11, question:"A right angle is how many degrees?", options:{A:"45°",B:"90°",C:"180°",D:"360°"}, correct:"B", explanation:"A right angle is 90°." },
      { id:12, question:"What is 9 squared?", options:{A:"18",B:"81",C:"72",D:"99"}, correct:"B", explanation:"9 * 9 = 81." },
      { id:13, question:"Solve: 5 + 3 x 2", options:{A:"16",B:"11",C:"10",D:"13"}, correct:"B", explanation:"Following PEMDAS: 3*2=6, then 5+6=11." },
      { id:14, question:"How many centimeters in a meter?", options:{A:"10",B:"100",C:"1000",D:"50"}, correct:"B", explanation:"1 meter = 100 centimeters." },
      { id:15, question:"What is 0.5 as a fraction?", options:{A:"1/2",B:"1/4",C:"1/5",D:"2/5"}, correct:"A", explanation:"0.5 is half, so 1/2." },
      { id:16, question:"The perimeter of a square with side 4 is?", options:{A:"8",B:"16",C:"12",D:"20"}, correct:"B", explanation:"Perimeter = 4 * side = 16." },
      { id:17, question:"What is 10% of 500?", options:{A:"5",B:"50",C:"500",D:"25"}, correct:"B", explanation:"10% of 500 is 50." },
      { id:18, question:"A triangle with 3 equal sides is?", options:{A:"Isosceles",B:"Equilateral",C:"Scalene",D:"Right"}, correct:"B", explanation:"Equilateral triangles have equal sides." },
      { id:19, question:"What is 100 - 37?", options:{A:"63",B:"73",C:"53",D:"67"}, correct:"A", explanation:"100 - 37 = 63." },
      { id:20, question:"How many degrees in a circle?", options:{A:"180°",B:"360°",C:"90°",D:"270°"}, correct:"B", explanation:"A full circle is 360°." }
    ],
    History: [
      { id:1, question:"First US President?", options:{A:"Lincoln",B:"Washington",C:"Jefferson",D:"Adams"}, correct:"B", explanation:"George Washington was the first." },
      { id:2, question:"Who built the Taj Mahal?", options:{A:"Akbar",B:"Shah Jahan",C:"Humayun",D:"Sher Shah"}, correct:"B", explanation:"Shah Jahan built it for Mumtaz." },
      { id:3, question:"World War II ended in?", options:{A:"1945",B:"1939",C:"1918",D:"1950"}, correct:"A", explanation:"WWII ended in 1945." },
      { id:4, question:"Who discovered America?", options:{A:"Vasco da Gama",B:"Christopher Columbus",C:"James Cook",D:"Marco Polo"}, correct:"B", explanation:"Columbus reached America in 1492." },
      { id:5, question:"The Great Wall is in which country?", options:{A:"India",B:"China",C:"Japan",D:"Korea"}, correct:"B", explanation:"The Great Wall is in China." }
    ],
    Programming: [
      { id:1, question:"Which language is for web logic?", options:{A:"HTML",B:"CSS",C:"JavaScript",D:"SQL"}, correct:"C", explanation:"JavaScript adds interactivity to web." },
      { id:2, question:"What does HTML stand for?", options:{A:"HyperText Markup Language",B:"HighText Machine Lang",C:"HyperTool Multi Lang",D:"None"}, correct:"A", explanation:"HTML = HyperText Markup Language." },
      { id:3, question:"'console.log' is used in?", options:{A:"Python",B:"Java",C:"JavaScript",D:"C++"}, correct:"C", explanation:"JavaScript uses console.log for debugging." },
      { id:4, question:"Which tag is for a link?", options:{A:"<link>",B:"<a>",C:"<url>",D:"<href>"}, correct:"B", explanation:"The <a> tag creates hyperlinks." },
      { id:5, question:"CSS is used for?", options:{A:"Logic",B:"Styling",C:"Database",D:"Server"}, correct:"B", explanation:"CSS is for Cascading Style Sheets (styling)." }
    ],
    Geography: [
      { id:1, question:"Largest continent?", options:{A:"Africa",B:"Asia",C:"Europe",D:"N. America"}, correct:"B", explanation:"Asia is the largest continent." },
      { id:2, question:"Capital of France?", options:{A:"Berlin",B:"London",C:"Paris",D:"Rome"}, correct:"C", explanation:"Paris is the capital of France." },
      { id:3, question:"Longest river?", options:{A:"Amazon",B:"Nile",C:"Ganga",D:"Mississippi"}, correct:"B", explanation:"The Nile is the longest river." },
      { id:4, question:"Highest mountain?", options:{A:"K2",B:"Mount Everest",C:"Kilimanjaro",D:"Alps"}, correct:"B", explanation:"Mount Everest is the highest." },
      { id:5, question:"Largest ocean?", options:{A:"Atlantic",B:"Indian",C:"Pacific",D:"Arctic"}, correct:"C", explanation:"The Pacific is the largest ocean." }
    ],
    GK: [
      { id:1, question:"Currency of Japan?", options:{A:"Yuan",B:"Yen",C:"Won",D:"Dollar"}, correct:"B", explanation:"Japan uses the Yen." },
      { id:2, question:"Fastest land animal?", options:{A:"Lion",B:"Cheetah",C:"Eagle",D:"Horse"}, correct:"B", explanation:"The Cheetah is the fastest." },
      { id:3, question:"How many colors in a rainbow?", options:{A:"5",B:"6",C:"7",D:"8"}, correct:"C", explanation:"Rainbows have 7 colors (VIBGYOR)." }
    ],
    Sports: [
      { id:1, question:"How many players in cricket team?", options:{A:"9",B:"11",C:"12",D:"10"}, correct:"B", explanation:"Cricket teams have 11 players." },
      { id:2, question:"Olympic games held every?", options:{A:"2 years",B:"4 years",C:"5 years",D:"1 year"}, correct:"B", explanation:"Olympics happen every 4 years." },
      { id:3, question:"Who won most FIFA World Cups?", options:{A:"Germany",B:"Brazil",C:"Italy",D:"Argentina"}, correct:"B", explanation:"Brazil has won 5 times." }
    ]
  },
  Hindi: {
    Science: [
      { id:1, question:"पानी का रासायनिक सूत्र क्या है?", options:{A:"H2O",B:"CO2",C:"NaCl",D:"O2"}, correct:"A", explanation:"पानी H2O है।" },
      { id:2, question:"लाल ग्रह किसे कहते हैं?", options:{A:"शुक्र",B:"मंगल",C:"बृहस्पति",D:"शनि"}, correct:"B", explanation:"मंगल को लाल ग्रह कहा जाता है।" }
    ]
  }
};




// --- API: Generate Quiz (AI or Demo) ---
app.post('/api/generate-quiz', async (req, res) => {
  const { category, difficulty, language, numQuestions, demo } = req.body;
  const count = numQuestions || 10;
  const lang = language || 'English';

  if (demo || !quizModel) {
    const langSet = DEMO_QUESTIONS[lang] || DEMO_QUESTIONS['English'];
    const catQuestions = langSet[category] || langSet['Science'] || DEMO_QUESTIONS['English']['Science'];
    const shuffled = [...catQuestions].sort(() => Math.random() - 0.5).slice(0, count);
    shuffled.forEach((q, i) => q.id = i + 1);
    return res.json({ questions: shuffled, mode: 'demo' });
  }

  const prompt = `You are a professional quiz master. Generate exactly ${count} unique multiple-choice questions for a quiz.
CRITICAL: ALL text (question, options, explanation) MUST be in the ${lang} language.
Category: ${category || 'General Knowledge'}
Difficulty: ${difficulty || 'Medium'}
Requirements:
1. Ensure questions are diverse and not repetitive.
2. Format: JSON array of objects with keys: id, question, options (object with A, B, C, D), correct (letter), explanation.
Example: [{"id":1, "question":"...", "options":{"A":"...", "B":"...", "C":"...", "D":"..."}, "correct":"A", "explanation":"..."}]`;


  try {
    let questions = null;
    let lastResponseText = '';

    // Retry once because LLM responses may occasionally return malformed JSON.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await quizModel.generateContent(prompt);
      lastResponseText = result.response.text();
      questions = extractJsonArrayFromText(lastResponseText);
      if (Array.isArray(questions) && questions.length > 0) break;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error(`Invalid quiz JSON response: ${lastResponseText.slice(0, 200)}`);
    }

    const normalized = questions
      .filter((q) => q && q.question && q.options && q.correct)
      .map((q, i) => ({
        id: i + 1,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || 'No explanation provided.'
      }))
      .slice(0, count);

    if (!normalized.length) {
      throw new Error('No valid questions after normalization');
    }

    res.json({ questions: normalized, mode: 'ai' });
  } catch (err) {
    console.error('[Quiz Error]', {
      message: err?.message,
      status: err?.status,
      category,
      language: lang,
      count
    });
    const langSet = DEMO_QUESTIONS[lang] || DEMO_QUESTIONS['English'];
    const catQuestions = langSet[category] || langSet['Science'];
    res.json({ questions: catQuestions.slice(0, count), mode: 'fallback' });
  }
});

// --- API: Generate Puzzle ---
app.post('/api/generate-puzzle', async (req, res) => {
  const { category, language } = req.body;
  const lang = language || 'English';

  if (!quizModel) {
    const fallbacks = {
      English: { word: "SCIENCE", hint: "Study of the physical world" },
      Hindi: { word: "विज्ञान", hint: "भौतिक दुनिया का अध्ययन" },
      Urdu: { word: "سائنس", hint: "طبیعی دنیا کا مطالعہ" }
    };
    return res.json(fallbacks[lang] || fallbacks['English']);
  }

  const prompt = `Generate a single word for a "Word Scramble" puzzle in ${lang} language.
Category: ${category || 'General Knowledge'}
The word should be a simple term.
RESPOND ONLY with JSON: {"word": "...", "hint": "..."}`;

  try {
    const result = await quizModel.generateContent(prompt);
    const responseText = result.response.text();
    let cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const data = JSON.parse(cleaned);
    res.json(data);
  } catch (err) {
    res.json({ word: "ERROR", hint: "Something went wrong" });
  }
});

// --- API: AI Chat Assistant ---
app.post('/api/chat', async (req, res) => {
  const { message, language } = req.body;
  const lang = language || 'English';
  const userMessage = String(message || '').trim();

  if (!userMessage) {
    return res.json({ response: "Please type a message so I can help you." });
  }

  if (!chatModel) {
    return res.json({ response: "AI Assistant is currently offline. Please add your API key." });
  }

  try {
    const prompt = `You are Gemini-style helpful AI assistant.
User language preference: ${lang}.
User message: ${userMessage}
Respond naturally, clearly, and helpfully.`;
    const result = await chatModel.generateContent(prompt);
    
    let responseText = "";
    try {
      responseText = result.response.text();
    } catch (e) {
      // Handle cases where safety filters block the response text
      responseText = "I couldn't provide a response for that request. Please try rephrasing.";
    }

    if (!responseText) {
      responseText = "I couldn't generate a response. Please try again.";
    }

    res.json({ response: responseText });
  } catch (err) {
    if (err.status === 429) {
      return res.json({ response: getLocalChatFallback(userMessage) });
    }
    console.error(`[Chat Error]`, err);
    res.json({ response: getLocalChatFallback(userMessage) });
  }
});

// --- Serve frontend ---
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧠 AI Quiz Master running at http://localhost:${PORT}`);
});
