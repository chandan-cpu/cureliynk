
const { z } = require("zod");

exports.chatSchema = z.object({
  message: z.string().min(2),
  language: z.enum(["en", "as"]),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});
