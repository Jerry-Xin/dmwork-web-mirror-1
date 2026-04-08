import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import MentionList from './MentionList'

export function createMentionSuggestion(
  itemsFn: ({ query }: { query: string }) => any[],
  onActiveChange?: (active: boolean) => void,
) {
  return {
    items: itemsFn,

    render: () => {
      let component: ReactRenderer
      let popup: TippyInstance[]

      return {
        onStart: (props: any) => {
          if (!props.items?.length) return

          onActiveChange?.(true)
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: any) {
          if (!component) return

          component.updateProps(props)

          if (!props.items?.length) {
            popup?.[0]?.hide()
            return
          }

          popup?.[0]?.show()

          if (!props.clientRect) {
            return
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          })
        },

        onKeyDown(props: any) {
          if (!component) return false

          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component.ref?.onKeyDown(props)
        },

        onExit() {
          onActiveChange?.(false)
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
  }
}
