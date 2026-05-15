import { describe, expect, it } from "vitest";
import { getPresetCharacterAdminLayoutClassNames } from "@/components/admin/preset-character-admin";
import { getUserAdminLayoutClassNames } from "@/components/admin/user-admin";

describe("admin management modal layout", () => {
  it("keeps user list and user detail out of the same two-column page", () => {
    const classes = getUserAdminLayoutClassNames();

    expect(classes.root).not.toContain("lg:grid-cols");
    expect(classes.modal).toContain("fixed inset-0");
    expect(classes.dialog).toContain("max-h-[90vh]");
  });

  it("keeps character list and character detail out of the same two-column page", () => {
    const classes = getPresetCharacterAdminLayoutClassNames();

    expect(classes.root).not.toContain("lg:grid-cols");
    expect(classes.modal).toContain("fixed inset-0");
    expect(classes.dialog).toContain("max-h-[90vh]");
  });
});
