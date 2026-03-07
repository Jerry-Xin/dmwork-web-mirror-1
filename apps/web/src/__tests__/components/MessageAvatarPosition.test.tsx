import fs from "fs";
import path from "path";

describe("MessageBase Avatar Position", () => {
    const cssPath = path.resolve(
        __dirname,
        "../../../../../packages/dmworkbase/src/Messages/Base/index.css"
    );

    let cssContent: string;

    beforeAll(() => {
        cssContent = fs.readFileSync(cssPath, "utf-8");
    });

    it("senderAvatar should be positioned at top instead of bottom", () => {
        // Extract the .senderAvatar rule
        const senderAvatarMatch = cssContent.match(
            /\.senderAvatar\s*\{[^}]+\}/
        );
        expect(senderAvatarMatch).not.toBeNull();

        const senderAvatarRule = senderAvatarMatch![0];

        // Should have top: 0
        expect(senderAvatarRule).toMatch(/top:\s*0/);

        // Should NOT have bottom positioning
        expect(senderAvatarRule).not.toMatch(/bottom:\s*\d+px/);
    });

    it("senderAvatar should use absolute positioning", () => {
        const senderAvatarMatch = cssContent.match(
            /\.senderAvatar\s*\{[^}]+\}/
        );
        expect(senderAvatarMatch).not.toBeNull();

        const senderAvatarRule = senderAvatarMatch![0];

        // Should have position: absolute and left: 0
        expect(senderAvatarRule).toMatch(/position:\s*absolute/);
        expect(senderAvatarRule).toMatch(/left:\s*0/);
    });

    it("senderAvatar should have correct dimensions", () => {
        const senderAvatarMatch = cssContent.match(
            /\.senderAvatar\s*\{[^}]+\}/
        );
        expect(senderAvatarMatch).not.toBeNull();

        const senderAvatarRule = senderAvatarMatch![0];

        // Should have 34px width and height
        expect(senderAvatarRule).toMatch(/width:\s*34px/);
        expect(senderAvatarRule).toMatch(/height:\s*34px/);
    });
});
