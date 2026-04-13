import type { Meta, StoryObj } from '@storybook/react-vite'
import UngroupedSection from './index'

const meta: Meta<typeof UngroupedSection> = {
  title: 'GroupCategory/UngroupedSection',
  component: UngroupedSection,
}
export default meta

export const Default: StoryObj<typeof UngroupedSection> = {
  name: '见 GroupCategory.stories.tsx',
}
