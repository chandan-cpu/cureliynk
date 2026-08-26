import { DisclaimerBanner } from "@/components/dashboard/disclaimer-banner";

import { renderWithProviders } from "@/test/dashboard-test-utils";

describe("DisclaimerBanner", () => {
  it("renders the disclaimer copy", async () => {
    const { getByText } = await renderWithProviders(<DisclaimerBanner />);

    expect(getByText("Important Health Disclaimer")).toBeTruthy();
  });
});
