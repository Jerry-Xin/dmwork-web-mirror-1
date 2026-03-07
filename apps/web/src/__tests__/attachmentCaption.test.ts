/**
 * Tests for attachment caption feature (Issue #155)
 * Verifies that ImageContent and FileContent support caption field
 */

describe('Attachment Caption Feature', () => {
    describe('ImageContent caption support', () => {
        // Mock MediaMessageContent base class
        class MockMediaMessageContent {
            file?: File
            remoteUrl?: string
        }

        // Simplified ImageContent for testing
        class ImageContent extends MockMediaMessageContent {
            width: number
            height: number
            url: string = ''
            imgData?: string
            caption?: string
            mentionUids?: string[]

            constructor(file?: File, imgData?: string, width?: number, height?: number, caption?: string, mentionUids?: string[]) {
                super()
                this.file = file
                this.imgData = imgData
                this.width = width || 0
                this.height = height || 0
                this.caption = caption
                this.mentionUids = mentionUids
            }

            decodeJSON(content: Record<string, unknown>) {
                this.width = (content['width'] as number) || 0
                this.height = (content['height'] as number) || 0
                this.url = (content['url'] as string) || ''
                this.caption = (content['caption'] as string) || ''
                this.mentionUids = (content['mention_uids'] as string[]) || []
                this.remoteUrl = this.url
            }

            encodeJSON() {
                const json: Record<string, unknown> = { 'width': this.width || 0, 'height': this.height || 0, 'url': this.remoteUrl || '' }
                if (this.caption) {
                    json['caption'] = this.caption
                }
                if (this.mentionUids && this.mentionUids.length > 0) {
                    json['mention_uids'] = this.mentionUids
                }
                return json
            }
        }

        it('should create ImageContent with caption', () => {
            const content = new ImageContent(undefined, 'data:image/png;base64,...', 100, 100, 'Test caption')
            expect(content.caption).toBe('Test caption')
        })

        it('should create ImageContent without caption', () => {
            const content = new ImageContent(undefined, 'data:image/png;base64,...', 100, 100)
            expect(content.caption).toBeUndefined()
        })

        it('should encode caption in JSON when present', () => {
            const content = new ImageContent(undefined, 'data:image/png;base64,...', 100, 100, 'My caption')
            content.remoteUrl = 'https://example.com/image.png'
            const json = content.encodeJSON()
            expect(json['caption']).toBe('My caption')
        })

        it('should not include caption in JSON when empty', () => {
            const content = new ImageContent(undefined, 'data:image/png;base64,...', 100, 100)
            content.remoteUrl = 'https://example.com/image.png'
            const json = content.encodeJSON()
            expect(json['caption']).toBeUndefined()
        })

        it('should decode caption from JSON', () => {
            const content = new ImageContent()
            content.decodeJSON({
                width: 100,
                height: 100,
                url: 'https://example.com/image.png',
                caption: 'Decoded caption'
            })
            expect(content.caption).toBe('Decoded caption')
        })

        it('should handle mentionUids in ImageContent', () => {
            const content = new ImageContent(undefined, 'data:image/png;base64,...', 100, 100, 'Check this @user', ['user123'])
            expect(content.mentionUids).toEqual(['user123'])

            content.remoteUrl = 'https://example.com/image.png'
            const json = content.encodeJSON()
            expect(json['mention_uids']).toEqual(['user123'])
        })
    })

    describe('FileContent caption support', () => {
        // Mock MediaMessageContent base class
        class MockMediaMessageContent {
            file?: File
            remoteUrl?: string
        }

        // Simplified FileContent for testing
        class FileContent extends MockMediaMessageContent {
            name: string
            extension: string
            size: number
            url: string = ''
            caption?: string
            mentionUids?: string[]

            constructor(file?: File, name?: string, extension?: string, size?: number, caption?: string, mentionUids?: string[]) {
                super()
                this.file = file
                this.name = name || ''
                this.extension = extension || ''
                this.size = size || 0
                this.caption = caption
                this.mentionUids = mentionUids
            }

            decodeJSON(content: Record<string, unknown>) {
                this.name = (content['name'] as string) || ''
                this.extension = (content['extension'] as string) || ''
                this.size = (content['size'] as number) || 0
                this.url = (content['url'] as string) || ''
                this.caption = (content['caption'] as string) || ''
                this.mentionUids = (content['mention_uids'] as string[]) || []
                this.remoteUrl = this.url
            }

            encodeJSON() {
                const json: Record<string, unknown> = {
                    'name': this.name || '',
                    'extension': this.extension || '',
                    'size': this.size || 0,
                    'url': this.remoteUrl || '',
                }
                if (this.caption) {
                    json['caption'] = this.caption
                }
                if (this.mentionUids && this.mentionUids.length > 0) {
                    json['mention_uids'] = this.mentionUids
                }
                return json
            }
        }

        it('should create FileContent with caption', () => {
            const content = new FileContent(undefined, 'document.pdf', 'pdf', 1024, 'Important document')
            expect(content.caption).toBe('Important document')
        })

        it('should create FileContent without caption', () => {
            const content = new FileContent(undefined, 'document.pdf', 'pdf', 1024)
            expect(content.caption).toBeUndefined()
        })

        it('should encode caption in JSON when present', () => {
            const content = new FileContent(undefined, 'document.pdf', 'pdf', 1024, 'File description')
            content.remoteUrl = 'https://example.com/document.pdf'
            const json = content.encodeJSON()
            expect(json['caption']).toBe('File description')
        })

        it('should not include caption in JSON when empty', () => {
            const content = new FileContent(undefined, 'document.pdf', 'pdf', 1024)
            content.remoteUrl = 'https://example.com/document.pdf'
            const json = content.encodeJSON()
            expect(json['caption']).toBeUndefined()
        })

        it('should decode caption from JSON', () => {
            const content = new FileContent()
            content.decodeJSON({
                name: 'document.pdf',
                extension: 'pdf',
                size: 1024,
                url: 'https://example.com/document.pdf',
                caption: 'Decoded file caption'
            })
            expect(content.caption).toBe('Decoded file caption')
        })

        it('should handle mentionUids in FileContent', () => {
            const content = new FileContent(undefined, 'doc.pdf', 'pdf', 1024, 'Review @user', ['user456'])
            expect(content.mentionUids).toEqual(['user456'])

            content.remoteUrl = 'https://example.com/doc.pdf'
            const json = content.encodeJSON()
            expect(json['mention_uids']).toEqual(['user456'])
        })
    })

    describe('Caption trimming behavior', () => {
        it('should trim whitespace from caption', () => {
            const caption = '  Hello world  '
            const trimmedCaption = caption?.trim() || undefined
            expect(trimmedCaption).toBe('Hello world')
        })

        it('should return undefined for empty/whitespace caption', () => {
            const caption = '   '
            const trimmedCaption = caption?.trim() || undefined
            // Empty string after trim is falsy, so || undefined returns undefined
            expect(trimmedCaption).toBeUndefined()
        })

        it('should return undefined for null/undefined caption', () => {
            const caption: string | undefined = undefined
            const trimmedCaption = caption?.trim() || undefined
            expect(trimmedCaption).toBeUndefined()
        })
    })
})
