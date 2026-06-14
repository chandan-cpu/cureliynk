const grokService = require("./grok.service");

exports.chat = async (payload) => {

  const { message, language, location } = payload;

  const response = await grokService.askGrok(
    message,
    language,
    location
  );

  return response;
};