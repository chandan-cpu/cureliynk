const medicalKeywords = [
  "fever",
  "headache",
  "cough",
  "doctor",
  "hospital",
  "pain",
  "symptom",
  "disease",
  "medical"
];

module.exports = (message) => {

  const text = message.toLowerCase();

  return medicalKeywords.some(
    keyword => text.includes(keyword)
  );

};