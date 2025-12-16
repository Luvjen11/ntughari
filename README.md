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

## 🧠 Understanding the Problem

### Receptive Bilingualism

Many Igbo heritage speakers grow up hearing the language at home but responding in English or another dominant language. Over time, they develop strong listening comprehension but weak speaking and writing skills.

This is known as **receptive bilingualism**: they can understand conversations, songs, jokes, and instructions in Igbo, but struggle when they try to form sentences, recall words, or speak in real time.

**Common challenges:**
- Difficulty recalling words on the spot
- Unsure about tones and pronunciation
- Gaps in grammar and "connector" words
- Anxiety about making mistakes in front of family or native speakers

### Why Igbo Learners Freeze

| Reason | Explanation |
|--------|-------------|
| **Passive vs active memory** | Easier to recognize a word than pull it from memory and say it aloud. Most learners practiced listening far more than speaking. |
| **Little forced production practice** | Parents speak to learners in Igbo but don't consistently insist on Igbo responses. The brain never builds strong "output" patterns. |
| **Performance pressure and shame** | When learners try speaking, people often react with laughter or "say it again!" Even positive intentions can feel exposing and stressful. |
| **Lack of visible structure** | Learners pick up phrases as "chunks" without understanding underlying grammar. They know sentences that work, but not how to build new ones. |
| **Weak reading foundation** | Without seeing words written down, it's harder to anchor pronunciation and remember how to say things correctly. |

### The Gap in Existing Apps

Traditional language apps often don't match this reality. They focus on:
- Generic vocab lists
- Translation exercises
- Textbook dialogues

They rarely address the **emotional side of speaking** or build from the phrases and sounds the learner already knows.

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

## 🌟 Vision

To be the go-to digital "bridge" for Igbo heritage learners, helping them move from:

> *"I understand, but I can't speak…"*

to:

> *"I can express myself in Igbo, even if it's not perfect yet."*

Ntụgharị sits at the intersection of:
- 📚 Language learning
- 🌍 Cultural reconnection
- 💙 Emotional safety
- 📈 Gradual, sustainable progress

### Success Criteria

Ntụgharị will be considered successful if:
- ✅ Users report feeling less anxious about speaking Igbo
- ✅ Users can produce simple sentences in core patterns (not just repeat memorized phrases)
- ✅ Users choose to come back regularly for short practice sessions
- ✅ The app can support additional modules without major rewrites

---

## ✨ Features

### 🔤 Alphabet & Sound Map

**Overview:** Introduces the Igbo alphabet, including special characters and tonal variations. Connects visual spelling to sound production, building foundational pronunciation skills and confidence.

**User Goal:** Learn how Igbo letters look, sound, and function inside real words.

| Component | Description |
|-----------|-------------|
| **Alphabet Grid** | Interactive grid of all 36 letters |
| **Letter Detail View** | Pronunciation, tips, and example words |
| **Letter of the Day** | Featured letter rotates daily for focused practice |
| **Audio Playback** | Hear any letter or word pronounced |
| **Igbo Character Pad** | Tap special characters (ị, ọ, ụ, ṅ) for easy input |

**Data Model:**
- `letters` — character, pronunciation_tip, order_index
- `letter_examples` — igbo_word, english_translation, letter_id

---

### 📚 Vocabulary Builder

**Overview:** Provides categorized Igbo vocabulary with audio, examples, and related words. Builds the essential word bank for beginner and heritage learners.

**User Goal:** Learn high-frequency vocabulary and understand how words appear in context.

| Component | Description |
|-----------|-------------|
| **Category Grid** | Browse vocabulary by theme (Daily Life, Food, Actions, People & Family) |
| **Word Cards** | Igbo word, translation, example sentence |
| **My Words** | Save words for later review |
| **Audio Button** | Hear pronunciation instantly |
| **Cultural Notes** | Context about usage and meaning |

**Data Model:**
- `vocab_categories` — name, description, icon, order_index
- `vocabulary` — igbo_word, english_translation, example_sentence_igbo, example_sentence_english, cultural_note, category_id

---

### 🧱 Sentence Skeletons

**Overview:** Teaches patterns instead of memorized phrases. Users learn to swap subjects, verbs, and objects to understand structure.

**User Goal:** Gain confidence in constructing sentences from basic building blocks.

| Component | Description |
|-----------|-------------|
| **Pattern List** | Browse structural patterns |
| **Pattern Detail** | Formula explanation + live examples |
| **Structure Breakdown** | Visual slot-based representation |
| **Cultural Notes** | When and how patterns are used |

**Data Model:**
- `sentence_skeletons` — name, structure, example_igbo, example_english, explanation, cultural_note, order_index

---

### 🧩 Phrase-to-Pieces

**Overview:** Breaks down familiar Igbo phrases into components and teaches structure. Helps heritage learners understand the meaning behind phrases they grew up hearing.

**User Goal:** Understand how familiar phrases work internally and rebuild them confidently.

| Component | Description |
|-----------|-------------|
| **Phrase Selection** | Browse common phrases |
| **Word-by-Word Breakdown** | See meaning of each component |
| **Grammar Notes** | Understand function of each word |
| **Rebuild Exercise** | Drag-and-drop reconstruction |
| **Gentle Feedback** | Encouraging, never shame-based |

**Data Model:**
- `phrases` — igbo_phrase, english_translation, cultural_note, order_index
- `phrase_parts` — igbo_word, english_meaning, grammar_note, order_index, phrase_id

---

### 🎯 Active Recall Trainer

**Overview:** A drill-based trainer that forces production instead of recognition. Users translate, fill gaps, and rebuild phrases.

**User Goal:** Strengthen ability to produce Igbo, not just understand it.

| Practice Type | Description |
|---------------|-------------|
| **Translation** | English → Igbo sentence translation |
| **Fill the Gap** | Complete sentences with missing words |
| **Phrase Rebuild** | Reorder shuffled tokens into correct phrase |

**Features:**
- 5 questions per session
- Calm, non-judgmental feedback ("It's okay to be wrong")
- Progress tracking per user
- No timers, streaks, or leaderboards (intentionally)

**Data Model:**
- `practice_sessions` — user_id, practice_type, items_practiced (JSONB), score, total_questions, created_at

---

### 📖 Story Layer

**Overview:** Reflective narration experience that serves as an emotional and cultural anchor. Not a game, not a traditional lesson — a bridge between understanding and speaking.

**User Goal:** Connect emotionally with the learning journey and understand why language matters.

| Component | Description |
|-----------|-------------|
| **Story Hub** | Browse available story arcs |
| **Scene Player** | Audio narration with text toggle |
| **Words You Met** | Vocabulary cards from each scene |
| **Micro-Practice** | Optional single question after scenes |
| **Progress Tracking** | Scene-by-scene completion |

**Current Stories:**
1. **Finding Your Voice** — Intro story explaining why Ntụgharị exists (5 scenes)
2. **Speaking Is a Skill** — Teaches verbs, sentence structures, asking/responding (5 scenes)

**Data Model:**
- `stories` — title, description, order_index, is_published, language_code
- `story_scenes` — title, narration_text, cultural_note, order_index, is_active, story_id
- `story_scene_vocab` — scene_id, vocab_id, order_index

---

### 👤 User Authentication

**Overview:** Lightweight authentication enabling progress tracking and personalization.

**Features:**
- Email login/signup
- Automatic role assignment (user/admin)
- Progress synced across sessions
- My Words persisted to database

**Data Model:**
- `user_roles` — user_id, role (admin/user)
- `user_progress` — user_id, module, last_accessed
- `user_saved_words` — user_id, word_id

---

### 📊 Progress Dashboard

**Overview:** Visual overview of learning progress and practice history.

**Features:**
- Overall score and percentage
- Sessions completed count
- Statistics by practice type
- Recent session history

---

### ⚙️ Admin Dashboard

**Overview:** Full content management system for administrators.

**Capabilities:**
- CRUD operations for all content types
- Category management with reordering
- Story and scene management
- Vocabulary linking to scenes
- Role-based access control

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
| **Backend** | Lovable Cloud (Supabase) | Database, auth, edge functions |
| **State** | React Query | Server state management |
| **Audio** | Web Speech API | Browser-native TTS |

### Database Schema

```
stories
├── story_scenes
│   └── story_scene_vocab → vocabulary

letters
├── letter_examples

vocab_categories
├── vocabulary
│   └── user_saved_words

sentence_skeletons

phrases
├── phrase_parts

practice_sessions

user_roles
user_progress
```

All tables have Row-Level Security (RLS) enabled with appropriate policies.

---

## 🗺 Future Roadmap

### Phase 1: Voice Mirror 🎙
- Record yourself speaking
- Compare pronunciation to native speakers
- Waveform visualization
- Track improvement over time

### Phase 2: Spaced Repetition 🧠
- Smart review scheduling
- Focus on words you struggle with
- Optimized retention algorithms

### Phase 3: AI Features 🤖
- Pronunciation scoring
- Personalized corrections
- Adaptive difficulty
- AI-generated practice prompts

### Phase 4: Reflection & Emotional Mode 💭
- Daily reflection prompts
- Text/voice journaling
- Mood tracking
- Processing learning emotions

### Phase 5: Community 🌍
- Share My Words lists
- Connect with other learners
- Native speaker mentorship
- Anonymous community reflections

### Phase 6: Multi-Language Support 🌐
- Yoruba, Hausa, and other underrepresented languages
- Language-agnostic architecture already in place (`language_code` fields)

---

## 👨‍⚖️ For Hackathon Judges

### What We Built

✅ Complete Alphabet module with all 36 Igbo letters  
✅ Vocabulary system with 4 categories and cultural notes  
✅ Sentence Skeletons with structural patterns  
✅ Phrase-to-Pieces with breakdown and rebuild exercises  
✅ Active Recall Trainer with 3 practice types  
✅ Story Layer with 2 complete story arcs (10 scenes)  
✅ User authentication with role-based access  
✅ Progress tracking dashboard  
✅ Full admin dashboard for content management  
✅ Igbo character input pad for accessibility  
✅ Responsive design (mobile + desktop)  
✅ Dark mode support  

### Intentional Deferrals

| Feature | Why Deferred | Architecture Ready? |
|---------|--------------|---------------------|
| **Recorded audio** | Browser TTS provides immediate feedback | ✅ Yes |
| **Voice recording** | Requires additional API integration | ✅ Yes |
| **Spaced repetition** | Algorithm refinement needs user data | ✅ Yes |
| **AI scoring** | Requires external AI service integration | ✅ Yes |

### Code Quality Highlights

- **Custom hooks** — `useTTS()`, `useAuth()`, `useSavedWords()`, `usePracticeSession()`
- **Type safety** — Full TypeScript coverage with Supabase types
- **Component architecture** — Small, focused, reusable components
- **Error handling** — Graceful loading, empty, and error states
- **Security** — RLS policies on all tables, role-based admin access
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
│   ├── ui/                    # shadcn/ui components
│   ├── practice/              # Active Recall components
│   ├── story/                 # Story Layer components
│   ├── Navigation.tsx         # Top navigation
│   ├── ModuleCard.tsx         # Home page cards
│   └── CultureNote.tsx        # Cultural context display
├── hooks/
│   ├── useAuth.tsx            # Authentication state
│   ├── useTTS.ts              # Text-to-speech
│   ├── useSavedWords.ts       # My Words functionality
│   └── usePracticeSession.ts  # Practice tracking
├── pages/
│   ├── Index.tsx              # Home page
│   ├── Alphabet.tsx           # Alphabet module
│   ├── Vocabulary.tsx         # Vocabulary module
│   ├── Skeletons.tsx          # Sentence Skeletons
│   ├── Phrases.tsx            # Phrase-to-Pieces
│   ├── Stories.tsx            # Story hub
│   ├── StoryPlayer.tsx        # Story playback
│   ├── Progress.tsx           # Progress dashboard
│   ├── practice/              # Practice modes
│   └── admin/                 # Admin dashboard
├── integrations/
│   └── supabase/              # Lovable Cloud client & types
└── index.css                  # Design system tokens
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
