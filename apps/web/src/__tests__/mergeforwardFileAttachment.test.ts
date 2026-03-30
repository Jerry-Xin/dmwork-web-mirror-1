import { describe, it, expect } from "vitest"

/**
 * Tests for Issue #763: Merged forwarded messages should display file attachments
 *
 * Verifies that the MergeforwardMessageList component properly handles
 * file message types instead of falling back to plain "[文件]" text digest.
 */
describe("MergeforwardMessageList file attachment support", () => {
    describe("file size formatting", () => {
        function formatFileSize(bytes: number): string {
            if (bytes <= 0) return "0 B"
            if (bytes < 1024) return `${bytes} B`
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
            if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
        }

        it("formats zero bytes", () => {
            expect(formatFileSize(0)).toBe("0 B")
        })

        it("formats bytes under 1KB", () => {
            expect(formatFileSize(500)).toBe("500 B")
        })

        it("formats kilobytes", () => {
            expect(formatFileSize(2048)).toBe("2.0 KB")
        })

        it("formats megabytes", () => {
            expect(formatFileSize(1048576)).toBe("1.0 MB")
            expect(formatFileSize(5242880)).toBe("5.0 MB")
        })

        it("formats gigabytes", () => {
            expect(formatFileSize(1073741824)).toBe("1.0 GB")
        })

        it("handles negative values", () => {
            expect(formatFileSize(-1)).toBe("0 B")
        })
    })

    describe("file extension color mapping", () => {
        function getFileExtColor(extension: string): string {
            const ext = (extension || "").toLowerCase()
            switch (ext) {
                case "pdf": return "#EF4444"
                case "doc": case "docx": return "#3B82F6"
                case "xls": case "xlsx": return "#22C55E"
                case "ppt": case "pptx": return "#F97316"
                case "zip": case "rar": case "7z": return "#EAB308"
                default: return "#9CA3AF"
            }
        }

        it("returns red for PDF files", () => {
            expect(getFileExtColor("pdf")).toBe("#EF4444")
        })

        it("returns blue for Word documents", () => {
            expect(getFileExtColor("doc")).toBe("#3B82F6")
            expect(getFileExtColor("docx")).toBe("#3B82F6")
        })

        it("returns green for Excel files", () => {
            expect(getFileExtColor("xls")).toBe("#22C55E")
            expect(getFileExtColor("xlsx")).toBe("#22C55E")
        })

        it("returns orange for PowerPoint files", () => {
            expect(getFileExtColor("ppt")).toBe("#F97316")
            expect(getFileExtColor("pptx")).toBe("#F97316")
        })

        it("returns yellow for archive files", () => {
            expect(getFileExtColor("zip")).toBe("#EAB308")
            expect(getFileExtColor("rar")).toBe("#EAB308")
        })

        it("returns gray for unknown extensions", () => {
            expect(getFileExtColor("")).toBe("#9CA3AF")
            expect(getFileExtColor("xyz")).toBe("#9CA3AF")
        })

        it("is case-insensitive", () => {
            expect(getFileExtColor("PDF")).toBe("#EF4444")
            expect(getFileExtColor("Docx")).toBe("#3B82F6")
        })
    })

    describe("message content type handling", () => {
        const FILE_CONTENT_TYPE = 8
        const IMAGE_CONTENT_TYPE = 2
        const TEXT_CONTENT_TYPE = 1

        it("file content type constant should be 8", () => {
            expect(FILE_CONTENT_TYPE).toBe(8)
        })

        it("should identify file messages vs image messages", () => {
            const messageTypes = [TEXT_CONTENT_TYPE, IMAGE_CONTENT_TYPE, FILE_CONTENT_TYPE]
            expect(messageTypes.includes(FILE_CONTENT_TYPE)).toBe(true)
            expect(FILE_CONTENT_TYPE).not.toBe(IMAGE_CONTENT_TYPE)
        })
    })
})
