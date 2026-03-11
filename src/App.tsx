import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Alphabet from "./pages/Alphabet";
import Vocabulary from "./pages/Vocabulary";
import Skeletons from "./pages/Skeletons";
import Phrases from "./pages/Phrases";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLetters from "./pages/admin/AdminLetters";
import AdminVocabulary from "./pages/admin/AdminVocabulary";
import AdminSkeletons from "./pages/admin/AdminSkeletons";
import AdminPhrases from "./pages/admin/AdminPhrases";
import AdminStories from "./pages/admin/AdminStories";
import AdminStoryScenes from "./pages/admin/AdminStoryScenes";
import AdminCategories from "./pages/admin/AdminCategories";
import PracticeHub from "./pages/practice/PracticeHub";
import TranslationPractice from "./pages/practice/TranslationPractice";
import FillGapPractice from "./pages/practice/FillGapPractice";
import PhraseRebuildPractice from "./pages/practice/PhraseRebuildPractice";
import Progress from "./pages/Progress";
import Stories from "./pages/Stories";
import StoryPlayer from "./pages/StoryPlayer";
import MyWords from "./pages/MyWords";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/alphabet" element={<Alphabet />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/my-words" element={<MyWords />} />
            <Route path="/help" element={<Help />} />
            <Route path="/skeletons" element={<Skeletons />} />
            <Route path="/phrases" element={<Phrases />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/practice" element={<PracticeHub />} />
            <Route path="/practice/translation" element={<TranslationPractice />} />
            <Route path="/practice/fill-gap" element={<FillGapPractice />} />
            <Route path="/practice/phrase-rebuild" element={<PhraseRebuildPractice />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/story/:storyId" element={<StoryPlayer />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/letters" element={<AdminRoute><AdminLetters /></AdminRoute>} />
            <Route path="/admin/vocabulary" element={<AdminRoute><AdminVocabulary /></AdminRoute>} />
            <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
            <Route path="/admin/skeletons" element={<AdminRoute><AdminSkeletons /></AdminRoute>} />
            <Route path="/admin/phrases" element={<AdminRoute><AdminPhrases /></AdminRoute>} />
            <Route path="/admin/stories" element={<AdminRoute><AdminStories /></AdminRoute>} />
            <Route path="/admin/stories/:storyId/scenes" element={<AdminRoute><AdminStoryScenes /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
