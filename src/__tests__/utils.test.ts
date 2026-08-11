import { describe, it, expect } from "vitest";
import { getWeekStart, formatUSD, timeAgo, cn } from "@/lib/utils";

describe("getWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    // 2024-01-03 is a Wednesday
    const result = getWeekStart(new Date("2024-01-03T12:00:00Z"));
    expect(result).toBe("2024-01-01");
  });

  it("returns same day for a Monday", () => {
    const result = getWeekStart(new Date("2024-01-01T12:00:00Z"));
    expect(result).toBe("2024-01-01");
  });

  it("returns previous Monday for a Sunday", () => {
    // 2024-01-07 is a Sunday
    const result = getWeekStart(new Date("2024-01-07T12:00:00Z"));
    expect(result).toBe("2024-01-01");
  });

  it("returns a date string in YYYY-MM-DD format", () => {
    const result = getWeekStart(new Date("2024-06-15T00:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatUSD", () => {
  it("formats whole numbers with two decimals", () => {
    expect(formatUSD(10)).toBe("$10.00");
  });

  it("formats fractional amounts", () => {
    expect(formatUSD(1.5)).toBe("$1.50");
  });

  it("formats zero", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });

  it("formats large numbers with comma separators", () => {
    expect(formatUSD(1000)).toBe("$1,000.00");
  });
});

describe("timeAgo", () => {
  it('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });
});

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string for no truthy values", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
