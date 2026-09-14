const axios = require("axios");
const { getSystemPrompt } = require("../config/systemPrompt");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.askGrok = async (
  userMessage,
  language,
  location
) => {

  const locationContext = location
    ? `User current location: latitude ${location.lat}, longitude ${location.lng}.`
    : "User location not provided.";

  // config/systemPrompt.js — the emergency protocol (chest pain, stroke signs,
  // self-harm -> call 108 immediately), the never-diagnose/never-dose rules and
  // the Assam-endemic disease context all live there, and none of it was in the
  // eight-line prompt this used to send. It also carries the Assamese
  // instruction, which is why `language` reaches this far.
  const basePrompt = getSystemPrompt(language);

  // That prompt asks for a markdown answer; this route's callers parse a fixed
  // JSON object. Stated last, and reinforced by `responseMimeType` below, so it
  // is the format instruction the model acts on.
  const outputContract = `
# OUTPUT FORMAT (overrides the Response Format section above)

Reply with a single JSON object and nothing else — no markdown, no code fence:

{
  "possibleCondition": "",
  "recommendedDepartment": "",
  "urgencyLevel": "routine | soon | urgent | emergency",
  "message": ""
}

Put the full patient-facing answer in "message", written in the user's selected
language and following every rule above — including the emergency wording
verbatim when the emergency protocol applies, with "urgencyLevel" set to
"emergency" in that case.`;

  const systemPrompt = `${basePrompt}
${outputContract}`;

  let response;

  // The key travels in a header, not `?key=`. A querystring is echoed into
  // access logs, proxy logs and axios's own error messages, so the old form
  // leaked the key anywhere a request was recorded or an error was printed.
  const url = process.env.GEMINI_URL;
  const maxRetries = 3;
  let attempt = 0;
  let backoffMs = 1000;

  while (attempt < maxRetries) {
    try {
      response = await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n${locationContext}\nUser: ${userMessage}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            // Without this the model wraps its JSON in a ```json fence often
            // enough that the JSON.parse below used to throw on a perfectly
            // good answer.
            responseMimeType: "application/json"
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
          },
          // A connection that hangs rather than failing would otherwise hold
          // this request — and the Express handler behind it — open forever.
          timeout: 30000
        }
      );
      break;
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      console.error(
        "Gemini API error",
        status,
        typeof data === "string" ? data : JSON.stringify(data)
      );

      if (status === 503 || `${error.message}`.includes("503")) {
        attempt += 1;
        if (attempt >= maxRetries) {
          throw new Error(
            "Max retries reached. Gemini API is currently unavailable."
          );
        }
        await delay(backoffMs);
        backoffMs *= 2;
        continue;
      }

      throw error;
    }
  }

  const outputText =
    response.data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof outputText !== "string") {
    throw new Error("Gemini returned no text content.");
  }

  // `responseMimeType` makes a bare JSON object the norm, but a fence still
  // slips through occasionally and an unguarded parse turns that into a 500.
  const cleaned = outputText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // The answer is still useful even when the envelope is malformed — hand
    // back the text in the field the client renders rather than failing.
    console.error("Gemini returned unparseable JSON:", cleaned.slice(0, 200));

    return {
      possibleCondition: "",
      recommendedDepartment: "General Medicine",
      urgencyLevel: "routine",
      message: cleaned
    };
  }
};