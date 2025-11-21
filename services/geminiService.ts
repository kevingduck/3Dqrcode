import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the client (API key must be in process.env.API_KEY)
let ai: GoogleGenerativeAI | null = null;

try {
  // Safe check for API Key availability
  // We check typeof process to avoid ReferenceError in browsers that don't shim it
  let key: string | undefined;
  
  if (typeof process !== 'undefined' && process.env) {
    key = process.env.API_KEY;
  }
  
  if (key) {
    ai = new GoogleGenerativeAI(key);
  }
} catch (e) {
  console.warn("Gemini AI initialization skipped:", e);
}

export const generateSmartLabel = async (content: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key not found or AI client not initialized.");
    return "Setup Key";
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a helper for a 3D printing app.
      The user is creating a QR code for the following content: "${content}".
      Generate a very short, punchy, printable label (max 12 characters) that describes this content.
      Examples: "Guest WiFi", "Scan Me", "My Portfolio", "Menu", "Pay Here".
      Return ONLY the text label, no quotes or markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text?.trim().slice(0, 15) || "Scan Me";
  } catch (error) {
    console.error("Error generating label:", error);
    return "Error";
  }
};