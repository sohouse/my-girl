import { describe, expect, it } from "vitest";
import { getAdminShellLayoutClassNames } from "@/components/admin/admin-shell";

describe("AdminShell layout", () => {
  it("uses a top bar with left menu and right operation area", () => {
    const classes = getAdminShellLayoutClassNames();

    expect(classes.workspace).toContain("lg:grid-cols-[240px_minmax(0,1fr)]");
    expect(classes.sidebar).toContain("lg:sticky");
    expect(classes.operationArea).toContain("min-w-0");
  });
});
