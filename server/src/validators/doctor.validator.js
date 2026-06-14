const { z } = require("zod");

exports.doctorSchema = z.object({
  department: z.string().min(2),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  limit: z.number().int().min(1).max(10).optional(),
});
