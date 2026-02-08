import { config } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

// Jolly colors - extracted from https://www.jolly.com/
const jollyTheme = {
  light: {
    background: '#F6F8FA',      // Light neutral gray (Jolly background)
    backgroundHover: '#EDF0F2',
    backgroundPress: '#E5E9EB',
    backgroundFocus: '#DDE2E5',
    backgroundStrong: '#FFFFFF',
    backgroundTransparent: 'rgba(246, 248, 250, 0)',
    color: '#666D80',            // Medium gray (Jolly text primary)
    colorHover: '#5A6070',
    colorPress: '#4E5460',
    colorFocus: '#818988',       // Lighter gray (Jolly text secondary)
    colorTransparent: 'rgba(102, 109, 128, 0)',
    borderColor: '#E5E7EB',
    borderColorHover: '#D4D7DB',
    borderColorPress: '#C4C7CB',
    borderColorFocus: '#B4B7BB',
    shadowColor: 'rgba(18, 55, 105, 0.1)',
    shadowColorHover: 'rgba(18, 55, 105, 0.15)',
    shadowColorPress: 'rgba(18, 55, 105, 0.2)',
    shadowColorFocus: 'rgba(18, 55, 105, 0.25)',
  },
  dark: {
    background: '#0F172A',       // Dark slate (complements Jolly blue)
    backgroundHover: '#1E293B',
    backgroundPress: '#334155',
    backgroundFocus: '#475569',
    backgroundStrong: '#1E293B',
    backgroundTransparent: 'rgba(15, 23, 42, 0)',
    color: '#E2E8F0',            // Light text
    colorHover: '#F1F5F9',
    colorPress: '#F8FAFC',
    colorFocus: '#94A3B8',       // Muted light text
    colorTransparent: 'rgba(226, 232, 240, 0)',
    borderColor: '#334155',
    borderColorHover: '#475569',
    borderColorPress: '#64748B',
    borderColorFocus: '#94A3B8',
    shadowColor: 'rgba(59, 130, 246, 0.1)',
    shadowColorHover: 'rgba(59, 130, 246, 0.15)',
    shadowColorPress: 'rgba(59, 130, 246, 0.2)',
    shadowColorFocus: 'rgba(59, 130, 246, 0.25)',
  },
}

const appConfig = createTamagui({
  ...config,
  themes: {
    light: {
      ...config.themes.light,
      ...jollyTheme.light,
      primary: '#123769',        // Dark blue (Jolly primary)
      primaryHover: '#0F2D55',
      primaryPress: '#0A1F3D',
      primaryFocus: '#1A4A89',
      secondary: '#818988',
      accent: 'rgba(18, 55, 105, 0.1)',
    },
    dark: {
      ...config.themes.dark,
      ...jollyTheme.dark,
      primary: '#3B82F6',        // Bright blue (stands out in dark)
      primaryHover: '#60A5FA',
      primaryPress: '#93C5FD',
      primaryFocus: '#2563EB',
      secondary: '#94A3B8',
      accent: 'rgba(59, 130, 246, 0.2)',
    },
  },
})

export type AppConfig = typeof appConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig
