import { MessageContent } from "wukongimjssdk"
import React from "react"
import { BeatLoader } from "react-spinners"
import { MessageContentTypeConst } from "../../Service/Const"
import { MessageCell } from "../MessageCell"
import MessageRow from "../../ui/message/MessageRow"
import { getMessageRow } from "../../bridge/message/useMessageRow"

export class TypingContent extends MessageContent {
    fromUID: string
    fromName: string

    constructor(fromUID: string, fromName: string) {
        super()
        this.fromUID = fromUID
        this.fromName = fromName
    }

    public get contentType() {
        return MessageContentTypeConst.typing
    }

}


export class TypingCell extends MessageCell {

    render() {
        const { message } = this.props
        const rowProps = getMessageRow(message)

        return (
            <MessageRow
                {...rowProps}
                isContinue={false}
                isSelected={false}
                showCheckbox={false}
                timestamp=""
            >
                <div style={{ height: '18px' }}>
                    <BeatLoader size={8} margin={4} color="var(--wk-color-theme)" />
                </div>
            </MessageRow>
        )
    }
}