import { describe, it, expect, vi } from "vitest";

// Mock Supabase before importing email module
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

import { escapeHtml } from "@/lib/email";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('a "quoted" value')).toBe("a &quot;quoted&quot; value");
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });

  it("handles multiple special characters", () => {
    expect(escapeHtml('<a href="test">a & b</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;a &amp; b&lt;/a&gt;'
    );
  });
});
