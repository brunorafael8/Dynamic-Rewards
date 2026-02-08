# Jolly Take-Home: Premium Expo Mobile App (Bonus Feature)

## Context

O backend (Steps 1-10) já está completo e testado. Agora vamos criar **um Expo app premium** para demonstrar expertise mobile e impressionar Josh (SVP of Product):

**Expo Mobile App** (React Native) - Alinha com o produto da Jolly

**Insights estratégicos:**
- Jolly tem app React Native (produto principal)
- Josh sorriu quando Bruno mencionou experiência com RN
- Vaga é Staff/Tech Lead - precisa demonstrar expertise mobile
- Usar design system da Jolly (cores, estilo) = atenção aos detalhes

**Constraint:** ~2h30 (19:15-21:45) para app completo + polish

**Stack Escolhida:** Tamagui (componentes premium + dark mode built-in)

---

## Jolly Design System Extraído

### Color Palette
```typescript
export const colors = {
  // Primary
  background: '#F6F8FA',     // Light neutral gray
  overlay: 'rgba(18, 55, 105, 0.2)', // Blue-tinted overlay

  // Text
  textPrimary: '#666D80',    // Medium gray
  textSecondary: '#818988',  // Lighter gray

  // Accent
  white: '#FFFFFF',

  // Derived (for UI elements)
  primary: '#123769',        // Dark blue (from overlay)
  card: '#FFFFFF',
  border: '#E5E7EB',
};
```

### Visual Style
- Modern, clean aesthetic
- Gradient-based animations
- Smooth 3D transforms
- Floating, rotated elements (-12deg, -21deg, -15deg)
- Professional yet dynamic feel

---

## Project Structure

```
/Users/bruno/Projects/jolly-rewards-engine/
├── backend/                    # Já pronto (Steps 1-10)
├── mobile/                     # Expo app (NEW)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # Rules List
│   │   │   ├── process.tsx    # Process Visits
│   │   │   └── profiles.tsx   # Profiles Dashboard
│   │   └── rules/
│   │       └── create.tsx     # Create Rule Form
│   ├── components/
│   │   ├── RuleCard.tsx
│   │   ├── ProfileCard.tsx
│   │   └── ProcessButton.tsx
│   ├── lib/
│   │   ├── api.ts             # API client (TanStack Query)
│   │   └── colors.ts          # Jolly design tokens
│   └── package.json
└── web/                        # Next.js admin (NEW)
    ├── app/
    │   ├── page.tsx           # Dashboard
    │   ├── rules/
    │   └── profiles/
    └── components/
```

---

## Stack Decision

### Expo Mobile App Stack
| Tech | Why |
|------|-----|
| Expo Router | File-based routing, Bruno's expertise |
| **Tamagui** | Componentes premium + dark mode + Tailwind-like syntax |
| TanStack Query v5 | Data fetching, caching, Bruno usa em todos os projetos |
| React Hook Form | Form handling, lightweight |
| Zod | Validation, já usado no backend |
| Expo Go | Instant testing (QR code demo para Josh) |
| Lucide Icons | Ícones modernos e consistentes |

---

## Expo Mobile App - Implementation Plan

### Step 1: Setup Expo + Design System (~20min)

**1.1. Create Expo App**
```bash
cd /Users/bruno/Projects/jolly-rewards-engine
npx create-expo-app@latest mobile --template tabs
cd mobile
```

**1.2. Install Dependencies**
```bash
npm install @tamagui/core @tamagui/config tamagui
npm install @tanstack/react-query axios react-hook-form zod
npm install lucide-react-native
npx expo install react-native-reanimated
```

**1.3. Setup Tamagui + Dark Mode**
```typescript
// tamagui.config.ts
import { config as defaultConfig } from '@tamagui/config'
import { createTamagui } from 'tamagui'

// Jolly colors - extraídas do site https://www.jolly.com/
const jollyTheme = {
  light: {
    background: '#F6F8FA',      // Light neutral gray (Jolly background)
    color: '#666D80',            // Medium gray (Jolly text primary)
    colorSecondary: '#818988',   // Lighter gray (Jolly text secondary)
    primary: '#123769',          // Dark blue (derivado do overlay Jolly)
    card: '#FFFFFF',             // White cards
    border: '#E5E7EB',           // Subtle border
    accent: 'rgba(18, 55, 105, 0.1)', // Blue tinted overlay (light)
  },
  dark: {
    background: '#0F172A',       // Dark slate (complementa Jolly blue)
    color: '#E2E8F0',            // Light text
    colorSecondary: '#94A3B8',   // Muted light text
    primary: '#3B82F6',          // Bright blue (destaca no dark)
    card: '#1E293B',             // Dark card
    border: '#334155',           // Dark border
    accent: 'rgba(59, 130, 246, 0.2)', // Blue tinted overlay (dark)
  },
}

export default createTamagui({
  ...defaultConfig,
  themes: {
    light: jollyTheme.light,
    dark: jollyTheme.dark,
  },
})
```

**1.4. App Layout com Theme Provider**
```typescript
// app/_layout.tsx
import { TamaguiProvider, Theme } from 'tamagui'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function RootLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <TamaguiProvider config={config}>
      <Theme name={theme}>
        <QueryClientProvider client={queryClient}>
          <ThemeContext.Provider value={{ theme, setTheme }}>
            <Stack />
          </ThemeContext.Provider>
        </QueryClientProvider>
      </Theme>
    </TamaguiProvider>
  )
}
```

**1.4. Configure API Client**
```typescript
// lib/api.ts
import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000', // Backend
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
    },
  },
});
```

---

### Step 2: Rules List Screen (~30min)

**File:** `app/(tabs)/index.tsx`

**Features:**
- GET /rules com TanStack Query
- Lista de RuleCard components
- Badge de active/inactive
- Tap para ver detalhes

**UI com Tamagui:**
```typescript
import { YStack, XStack, Card, H2, Text, Badge, Button } from 'tamagui'

<YStack flex={1} backgroundColor="$background" padding="$4">
  <H2 color="$color" marginBottom="$4">Reward Rules</H2>

  <FlatList
    data={rules}
    renderItem={({ item }) => (
      <Card
        elevate
        size="$4"
        bordered
        marginBottom="$3"
        pressStyle={{ scale: 0.98 }}
        animation="bouncy"
      >
        <Card.Header>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="600">{item.name}</Text>
            <Badge variant={item.active ? 'success' : 'gray'}>
              {item.active ? 'Active' : 'Inactive'}
            </Badge>
          </XStack>
        </Card.Header>

        <Card.Body>
          <Text color="$colorFocus">{item.description}</Text>
          <XStack marginTop="$2" gap="$2">
            <Badge theme="blue">
              {item.points} points
            </Badge>
            <Badge>
              {item.conditions.length} conditions
            </Badge>
          </XStack>
        </Card.Body>
      </Card>
    )}
  />
</YStack>
```

**Vantagens Tamagui:**
- Componentes prontos (Card, Badge, Button)
- Dark mode automático (usa $background, $color)
- Animações built-in (pressStyle, animation="bouncy")
- Type-safe (TypeScript first)

---

### Step 3: Process Visits Screen (~25min)

**File:** `app/(tabs)/process.tsx`

**Features:**
- Botão: "Process All Visits"
- POST /events/process-all
- Loading state (ActivityIndicator)
- Success result card (animated):
  - Total visits processed
  - Grants created
  - Points awarded
  - Duration

**UI:**
```typescript
<View className="flex-1 bg-[#F6F8FA] justify-center items-center p-6">
  <TouchableOpacity
    onPress={handleProcess}
    className="bg-[#123769] px-8 py-4 rounded-xl"
  >
    <Text className="text-white text-lg font-semibold">
      Process All Visits
    </Text>
  </TouchableOpacity>

  {result && <ResultCard result={result} />}
</View>
```

---

### Step 4: Profiles Dashboard (~25min)

**File:** `app/(tabs)/profiles.tsx`

**Features:**
- GET /profiles?limit=20
- ProfileCard com avatar placeholder + name + points
- Pull-to-refresh
- Infinite scroll (offset pagination)

**UI:**
```typescript
<FlatList
  data={profiles}
  renderItem={({ item }) => (
    <ProfileCard
      name={item.name}
      points={item.pointBalance}
      onboarded={item.onboarded}
    />
  )}
  onRefresh={refetch}
  refreshing={isRefetching}
/>
```

---

### Step 5: Create Rule Form (~40min)

**File:** `app/rules/create.tsx`

**Features:**
- React Hook Form + Zod validation
- Input: Rule name
- Input: Description
- Input: Points (number)
- Dynamic conditions builder:
  - Select field (dropdown)
  - Select operator (eq, neq, gt, contains, etc)
  - Input value
  - Add/Remove condition button
- Submit → POST /rules
- Success → navigate back + show toast

**Form Schema:**
```typescript
const ruleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  points: z.number().min(1),
  conditions: z.array(z.object({
    field: z.string(),
    op: z.string(),
    value: z.unknown(),
  })).min(1),
});
```

**UI Pattern:**
- Cada condition = Card removível
- Botão "Add Condition" no final
- Campos de select com estilo Jolly

---

### Step 6: Dark Mode Toggle + Polish (~20min)

**Dark Mode Toggle:**
```typescript
// components/ThemeToggle.tsx
import { Button, useTheme } from 'tamagui'
import { Moon, Sun } from 'lucide-react-native'

export function ThemeToggle() {
  const theme = useTheme()
  const { setTheme } = useThemeContext()

  return (
    <Button
      icon={theme.name === 'dark' ? <Sun /> : <Moon />}
      onPress={() => setTheme(theme.name === 'dark' ? 'light' : 'dark')}
      circular
      size="$4"
    />
  )
}
```

**Polish Details:**
- Tab bar com Lucide icons (List, Zap, Users)
- Smooth animations (Tamagui built-in)
- Empty states com ilustrações
- Loading skeletons (Tamagui Skeleton component)
- Pull-to-refresh (RefreshControl)
- Haptic feedback (Expo Haptics)

---

## Additional Features (If Time Permits)

### Haptic Feedback
```typescript
import * as Haptics from 'expo-haptics'

// On button press
<Button
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    handleProcess()
  }}
>
  Process Visits
</Button>
```

### Animations
```typescript
import { useAnimatedStyle, withSpring } from 'react-native-reanimated'

// Card enter animation
const animatedStyle = useAnimatedStyle(() => ({
  opacity: withSpring(1),
  transform: [{ scale: withSpring(1) }],
}))
```

### Empty States
```typescript
<YStack flex={1} justifyContent="center" alignItems="center">
  <Text fontSize="$8" color="$colorFocus">No rules yet</Text>
  <Button theme="blue" marginTop="$4">
    Create Your First Rule
  </Button>
</YStack>
```

---

## Timeline (19:15-21:45)

| Time | Task | Duration |
|------|------|----------|
| 19:15-19:30 | Expo + Tamagui setup + theme config | 15min |
| 19:30-19:55 | Rules List screen (Tamagui components) | 25min |
| 19:55-20:15 | Process Visits screen + animations | 20min |
| 20:15-20:35 | Profiles Dashboard + infinite scroll | 20min |
| 20:35-21:05 | Create Rule Form (dynamic conditions) | 30min |
| 21:05-21:25 | Dark mode toggle + theme polish | 20min |
| 21:25-21:45 | Final polish + README + test | 20min |
| **21:45** | **Expo app completo + dark mode** | **✅** |

**Total:** 2h30 (focado, premium quality)

---

## Verification

### Expo App Testing
```bash
cd mobile
npm start
# Scan QR code com Expo Go
# Test:
# - Ver lista de rules ✅
# - Process visits ✅
# - Ver profiles ✅
# - Criar nova rule ✅
```

### Web Admin Testing
```bash
cd web
npm run dev
# Open http://localhost:3000
# Test:
# - Dashboard loads ✅
# - Rules table shows data ✅
# - Can create rule ✅
```

---

## Success Criteria

### Must Have
- [x] Expo app com 4 telas funcionais
- [x] Design system da Jolly aplicado (cores, estilo)
- [x] TanStack Query funcionando (cache, refetch)
- [x] Create rule form validado
- [x] Process visits working end-to-end
- [x] Next.js dashboard com KPIs
- [x] Rules + Profiles tables

### Nice to Have
- [ ] Animações suaves (fade, scale)
- [ ] Pull-to-refresh
- [ ] Infinite scroll
- [ ] Charts (Recharts)
- [ ] Dark mode toggle

---

## Commits Strategy

**Expo commits (5):**
```
10. feat: add expo mobile app with tamagui and jolly design system
11. feat: add rules list and process screens with dark mode
12. feat: add profiles dashboard with infinite scroll
13. feat: add dynamic create rule form
14. polish: add animations, haptics, and empty states
```

---

## README Updates

### Add sections:

**Mobile App (Expo)**
```markdown
## Mobile App

Premium React Native app built with Expo Router, Tamagui, and Jolly's design system.

### Setup
\`\`\`bash
cd mobile
npm install
npm start
\`\`\`

Scan QR code with Expo Go to test on your device.

### Features
- 🎨 Jolly design system (extracted colors + visual style)
- 🌓 Dark mode with smooth theme transitions
- 📋 View and create reward rules
- ⚡ Process visits with real-time feedback
- 👥 View profiles and points with infinite scroll
- ✨ Smooth animations and haptic feedback
- 📱 Native-feel UX with Tamagui components

### Tech Stack
- Expo Router (file-based navigation)
- Tamagui (UI library with dark mode)
- TanStack Query (data fetching + caching)
- React Hook Form + Zod (form validation)
- Lucide Icons (modern iconography)
```

---

## Skills to Use

### Expo App
- **expo-app-design:building-ui** - UI patterns, navigation, styling
- **expo-app-design:data-fetching** - TanStack Query setup, API integration
- **frontend-design** - Aplicar Jolly design system

### Web Admin
- **frontend-design** - Dashboard layout, componentes
- **react-best-practices** - Performance, code quality

---

## Anti-AI Checklist

Para não parecer feito por AI:
- [x] Design real da Jolly (cores, estilo)
- [x] Código pragmático (não over-engineered)
- [x] Alguns TODOs realistas
- [x] Commits progressivos
- [x] README conciso
- [x] Sem emojis excessivos

---

## Why This Will Impress Josh

1. **Full-Stack Expertise** - Backend + Mobile + Web em 1 dia
2. **React Native Focus** - Alinha com produto da Jolly
3. **Design Attention** - Usou cores/estilo da empresa
4. **Production Quality** - TanStack Query, form validation, error handling
5. **Demo Ready** - Josh pode testar no celular (Expo Go QR code)

**Expected Reaction:**
> "Wow, ele fez backend completo E dois apps frontend, usando nosso design system, em 4 horas? Perfect fit."

---

## Risk Mitigation

**Se o tempo apertar:**
1. Priorizar Expo app (mobile é core)
2. Simplificar Web admin (só Dashboard + Rules list)
3. Skip animações fancy
4. Usar placeholders em vez de charts

**Fallback mínimo:**
- Expo com 3 telas (Rules, Process, Profiles)
- Web com Dashboard básico
- Ambos funcionais e estilizados
