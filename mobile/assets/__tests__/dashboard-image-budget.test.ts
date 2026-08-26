import fs from "fs";
import path from "path";

/**
 * Regression guard for the dashboard scroll-jank issue: the hero/card images
 * were originally shipped at raw camera resolution (up to 18 megapixels,
 * several MB each) while only ever displayed at a few hundred pixels wide.
 * Decoding that many pixels on mount was the main cause of the lag reported
 * when scrolling the dashboard. Keeping a byte budget here stops an
 * oversized replacement image from silently reintroducing the jank.
 */
const ASSETS_DIR = path.join(__dirname, "..");

const BUDGETS_KB: Record<string, number> = {
  "b1.jpg": 300,
  "b2.jpg": 300,
  "b3.jpg": 300,
  "babycare.jpg": 200,
  "pregenecycare.jpg": 200,
};

describe("dashboard image size budget", () => {
  for (const [file, maxKb] of Object.entries(BUDGETS_KB)) {
    it(`${file} stays under ${maxKb}KB`, () => {
      const filePath = path.join(ASSETS_DIR, file);
      const { size } = fs.statSync(filePath);

      expect(size / 1024).toBeLessThan(maxKb);
    });
  }
});
