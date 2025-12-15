# 🌉 Ntụgharị — The Bridge

> *Helping heritage Igbo learners cross from "I understand" to "I can speak"*

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Lovable Cloud](https://img.shields.io/badge/Lovable_Cloud-Enabled-FF6B6B)](https://lovable.dev/)

---

## 📖 The Story

**"Ị nụrụ, mana ị naghị ekwu."** — *You understand, but you don't speak.*

This is the reality for millions of heritage Igbo speakers worldwide. They grew up hearing Igbo at home, understanding conversations between parents and grandparents, yet when asked to respond, the words don't come. Instead, they reply in English, carrying a quiet shame about a language that feels like theirs but remains just out of reach.

**Ntụgharị** (pronounced *n-too-ga-ree*, meaning "translation" or "transformation" in Igbo) is designed specifically for these learners. It's not another language app that starts from zero. It's a bridge — meeting you where you are (understanding) and helping you cross to where you want to be (speaking).

---

## 🎯 Who Is This For?

### Ada — The Heritage Learner
- **Age**: 20–30
- **Background**: Grew up in a household where Igbo was spoken, understands most conversations
- **Challenge**: Replies in English, feels embarrassed about pronunciation, fears judgment from fluent speakers
- **Goal**: Hold simple conversations with family, reduce speaking anxiety

### Kelechi — The Motivated Beginner
- **Age**: 16–30
- **Background**: Little to no prior Igbo exposure, but culturally motivated
- **Challenge**: Needs structured progression, doesn't know where to start
- **Goal**: Learn to speak Igbo as part of cultural identity journey

---

## ✨ Features

### 🔤 Alphabet & Sounds
Master the 36 letters of the Igbo alphabet, including special characters with tonal marks (ị, ọ, ụ, ṅ).

- **Interactive letter grid** — Tap any letter to hear its pronunciation
- **Letter of the Day** — Featured letter rotates daily for focused practice
- **Example words** — Each letter comes with a word demonstrating its sound
- **Browser TTS** — Immediate audio feedback without loading delays

### 📚 Vocabulary Builder
Build your word bank across 4 essential categories: Daily Life, Food, Actions, and People & Family.

- **20 carefully selected words** — High-frequency, family/daily-life focused
- **Example sentences** — See each word used in context (Igbo + English)
- **My Words** — Save words you want to remember for later practice
- **Audio pronunciation** — Hear any word spoken aloud

### 🧱 Sentence Skeletons
Learn the structural patterns that power Igbo sentences. Instead of memorizing phrases, understand *how* sentences are built.

- **6 foundational patterns** — From simple statements to questions
- **Visual structure breakdown** — See the pattern formula clearly
- **Example sentences** — Real Igbo sentences using each pattern
- **Grammar explanations** — Understand *why* sentences work the way they do

### 🧩 Phrase-to-Pieces
Deconstruct common phrases to understand their components, then rebuild them from memory.

- **7 essential phrases** — Greetings, questions, and daily expressions
- **Word-by-word breakdown** — See the meaning of each component
- **Grammar notes** — Understand the function of each word
- **Rebuild exercise** — Drag-and-drop words to reconstruct the phrase
- **Gentle feedback** — Encouraging messages, never shame-based

---

## 🎨 Design Philosophy

### Soft Neo-Brutalism

Ntụgharị uses a **soft neo-brutalist** design language — bold and honest, yet warm and inviting. This isn't accidental. Every design choice supports our core mission of creating a **shame-free learning space**.

#### Why This Aesthetic?

| Traditional Apps | Ntụgharị |
|-----------------|----------|
| Polished, corporate feel | Confident, handcrafted feel |
| Subtle shadows, gradients | Thick borders, flat colors |
| Can feel intimidating | Feels approachable |
| "Perfect" aesthetic | "Human" aesthetic |

#### Color Psychology

- **Primary Blue `#81a2f9`** — Calm, trust, focus. Creates a serene learning environment where mistakes feel safe.
- **Accent Pink `#fab0f9`** — Warmth, encouragement, emotional softness. Adds playfulness without being childish.
- **Cream Background `#fefcf8`** — Gentle on the eyes, feels like paper, reduces screen fatigue.
- **Dark Text `#1a1a2e`** — Strong readability without harsh black.

#### Design Elements

- **Thick visible borders** — Honest structure, nothing hidden
- **Flat color blocks** — No gradients, no deception
- **Bold typography** — Space Grotesk for headings, Inter for body
- **Minimal shadows** — Brutalist shadows on interaction
- **Clear focus states** — Always know where you are

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | Type-safe, component-based UI |
| **Styling** | Tailwind CSS | Utility-first, design system ready |
| **Build** | Vite | Fast development and builds |
| **Backend** | Lovable Cloud (Supabase) | Database, auth-ready infrastructure |
| **State** | React Query | Server state management |
| **Persistence** | localStorage | Client-side data (My Words) |
| **Audio** | Web Speech API | Browser-native TTS |

### Database Schema

```
letters (36 records)
├── letter_examples (36 records)

vocab_categories (4 records)
├── vocabulary (20 records)

sentence_skeletons (6 records)

phrases (7 records)
├── phrase_parts (20 records)
```

All tables have Row-Level Security (RLS) enabled with public read access.

---

## 🗺 Future Roadmap

### Phase 2: Voice Mirror 🎙
- Record yourself speaking
- Compare your pronunciation to native speakers
- Track improvement over time

### Phase 3: User Accounts 👤
- Sync progress across devices
- Personalized learning path
- Community features

### Phase 4: Spaced Repetition 🧠
- Smart review scheduling
- Focus on words you struggle with
- Optimized retention algorithms

### Phase 5: AI Features 🤖
- Pronunciation scoring
- Personalized corrections
- Adaptive difficulty

### Phase 6: Community 🌍
- Share My Words lists
- Connect with other learners
- Native speaker mentorship

---

## 👨‍⚖️ For Hackathon Judges

### Intentional MVP Scope

This is not a "we ran out of time" MVP. Every feature included (and excluded) was a deliberate architectural decision.

#### What We Built
✅ Complete Alphabet module with all 36 Igbo letters  
✅ Vocabulary system with 4 categories and 20 words  
✅ Sentence Skeletons with 6 foundational patterns  
✅ Phrase-to-Pieces with breakdown and rebuild exercises  
✅ Full database schema designed for scale  
✅ Responsive design (mobile + desktop)  
✅ Dark mode support  
✅ Loading, empty, and error states  

#### What We Intentionally Deferred

| Feature | Why Deferred | Architecture Ready? |
|---------|--------------|---------------------|
| **Recorded audio** | Asset management complexity; browser TTS provides immediate feedback | ✅ Yes — audio URLs can be added to schema |
| **User authentication** | Not needed for core learning loop validation | ✅ Yes — Lovable Cloud has auth built-in |
| **Voice recording** | Requires additional API integration | ✅ Yes — Voice Mirror module planned |
| **Spaced repetition** | Algorithm refinement needs user data | ✅ Yes — Schema supports progress tracking |

#### Why Browser TTS?

Using the Web Speech API instead of pre-recorded audio was a strategic choice:

1. **Zero latency** — Instant playback, no loading spinners
2. **Every word** — Can pronounce any Igbo text, not just recorded phrases
3. **Reduced complexity** — No audio file management during hackathon
4. **Upgradeable** — Can swap to recorded audio without UI changes

#### Why localStorage?

Storing "My Words" in localStorage instead of requiring authentication:

1. **Zero friction** — Users can start saving words immediately
2. **Privacy first** — No account needed to learn
3. **Demonstrates persistence** — Shows we understand state management
4. **Migration ready** — Can sync to database when auth is added

### Code Quality Highlights

- **Custom hooks** — `useTTS()` and `useLocalStorage()` for reusability
- **Type safety** — Full TypeScript coverage with Supabase types
- **Component architecture** — Small, focused, reusable components
- **Error handling** — Graceful loading, empty, and error states
- **Semantic HTML** — Accessible structure throughout
- **Design system** — CSS variables + Tailwind for consistency

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ntughari

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

The project uses Lovable Cloud, which automatically provides:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

No manual configuration needed when deploying through Lovable.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Navigation.tsx   # Top navigation bar
│   ├── ModuleCard.tsx   # Home page module cards
│   └── NavLink.tsx      # Navigation link component
├── hooks/
│   ├── useTTS.ts        # Text-to-speech hook
│   └── useLocalStorage.ts # Persistent storage hook
├── pages/
│   ├── Index.tsx        # Home page
│   ├── Alphabet.tsx     # Alphabet & Sounds module
│   ├── Vocabulary.tsx   # Vocabulary Builder module
│   ├── Skeletons.tsx    # Sentence Skeletons module
│   └── Phrases.tsx      # Phrase-to-Pieces module
├── integrations/
│   └── supabase/        # Lovable Cloud client & types
└── index.css            # Design system tokens
```

---

## 🙏 Acknowledgments

- **The Igbo language community** — For keeping the language alive
- **Heritage learners everywhere** — Your journey inspired this app
- **Lovable** — For the platform that made rapid development possible

---

## 📄 License

MIT License — Feel free to learn from and build upon this project.

---

<div align="center">

**Ntụgharị** — *Because understanding is just the beginning.*

*Built with 💙 and 💗 for heritage learners*

</div>
