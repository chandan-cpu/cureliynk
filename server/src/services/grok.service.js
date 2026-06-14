const axios = require("axios");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.askGrok = async (
  userMessage,
  language,
  location
) => {

  const locationContext = location
    ? `User current location: latitude ${location.lat}, longitude ${location.lng}.`
    : "User location not provided.";

  const systemPrompt = `
You are a Healthcare Assistant.

Rules:

1. Answer ONLY healthcare questions.
2. Never answer programming questions.
3. Never answer sports questions.
4. Never answer politics questions.
5. Never answer movies questions.
6. Never prescribe medicine.
7. Recommend medical department.
8. If user location is available, use it to tailor advice.

Response JSON:

{
  "possibleCondition":"",
  "recommendedDepartment":"",
  "urgencyLevel":"",
  "message":""
}
`;

  let response;
  const url = `${process.env.GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`;
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
            temperature: 0.2
          }
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
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

  if (typeof outputText === "string") {
    return JSON.parse(outputText);
  }

  return outputText;
};