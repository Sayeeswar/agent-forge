import { useState, useMemo } from 'react';
import { useAppState } from './state/useAppState.js';
import { useLearnerProfile } from './state/useLearnerProfile.js';
import { Sidebar } from './components/Sidebar.jsx';
import { ChatWindow } from './components/ChatWindow.jsx';
import { EmptyState } from './components/EmptyState.jsx';
import { NewSessionWizard } from './components/NewSessionWizard.jsx';
import { SessionsGrid } from './components/SessionsGrid.jsx';
import { PlaceholderPanel } from './components/PlaceholderPanel.jsx';
import { fetchChatReply, fetchQuiz } from './api.js';
import { DEFAULT_MODEL } from './models.js';
import styles from './App.module.css';

const PANEL_TITLES = {
  techniqueBank: 'Technique Bank',
  skills: 'Skills',
  settings: 'Settings',
};

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function App() {
  const [state, dispatch] = useAppState();
  const [profile, saveProfile] = useLearnerProfile();
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [activeQuizByTopic, setActiveQuizByTopic] = useState({});
  const [chatError, setChatError] = useState(null);
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL);
  const [showWizard, setShowWizard] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  const sortedTopics = useMemo(
    () =>
      [...state.topics].sort(
        (a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)
      ),
    [state.topics]
  );

  const selectedTopic = state.topics.find((t) => t.id === selectedTopicId) || null;
  const activeModel = selectedTopic ? selectedTopic.model || DEFAULT_MODEL : defaultModel;

  function handleOpenWizard() {
    setShowWizard(true);
  }

  function handleCancelWizard() {
    setShowWizard(false);
  }

  function handleCompleteWizard({ profile: newProfile, topic, subtopic, material }) {
    saveProfile(newProfile);
    const id = makeId();
    dispatch({ type: 'ADD_TOPIC', id, name: topic, subtopic, material, model: defaultModel });
    setSelectedTopicId(id);
    setActivePanel(null);
    setShowWizard(false);
  }

  function handleSelectTopic(id) {
    setSelectedTopicId(id);
    setActivePanel(null);
  }

  function handleNavigate(panel) {
    setActivePanel(panel);
  }

  function handleChangeActiveModel(model) {
    if (selectedTopic) {
      dispatch({ type: 'SET_TOPIC_MODEL', id: selectedTopic.id, model });
    } else {
      setDefaultModel(model);
    }
  }

  async function handleSendMessage(text) {
    if (!selectedTopic) return;
    setChatError(null);
    const topicId = selectedTopic.id;
    dispatch({ type: 'ADD_MESSAGE', topicId, message: { role: 'user', content: text } });
    try {
      const reply = await fetchChatReply({
        topic: selectedTopic.name,
        history: selectedTopic.messages,
        message: text,
        model: selectedTopic.model,
        profile,
        subtopic: selectedTopic.subtopic,
        material: selectedTopic.material,
      });
      dispatch({ type: 'ADD_MESSAGE', topicId, message: { role: 'assistant', content: reply } });
    } catch (err) {
      setChatError({ topicId, text });
    }
  }

  function handleRetry() {
    if (!chatError) return;
    const { text } = chatError;
    setChatError(null);
    handleSendMessage(text);
  }

  async function handleStartQuiz() {
    if (!selectedTopic) return;
    const topicId = selectedTopic.id;
    try {
      const quiz = await fetchQuiz({
        topic: selectedTopic.name,
        model: selectedTopic.model,
        profile,
        subtopic: selectedTopic.subtopic,
        material: selectedTopic.material,
      });
      setActiveQuizByTopic((prev) => ({ ...prev, [topicId]: quiz }));
    } catch (err) {
      setActiveQuizByTopic((prev) => ({ ...prev, [topicId]: { error: true } }));
    }
  }

  function handleQuizAnswer(isCorrect, quiz) {
    const topicId = selectedTopic.id;
    setTimeout(() => {
      dispatch({
        type: 'ADD_MESSAGE',
        topicId,
        message: {
          role: 'assistant',
          content: isCorrect
            ? 'Correct! 🎉'
            : `Not quite — the answer was "${quiz.options[quiz.correctIndex]}".`,
        },
      });
      dispatch({
        type: 'ADD_QUIZ_RESULT',
        topicId,
        result: { date: new Date().toISOString(), score: isCorrect ? 1 : 0 },
      });
      setActiveQuizByTopic((prev) => ({ ...prev, [topicId]: null }));
    }, 700);
  }

  function renderMain() {
    if (activePanel === 'sessions') {
      return <SessionsGrid topics={sortedTopics} onSelectTopic={handleSelectTopic} />;
    }
    if (activePanel === 'techniqueBank' || activePanel === 'skills' || activePanel === 'settings') {
      return <PlaceholderPanel title={PANEL_TITLES[activePanel]} />;
    }
    if (selectedTopic) {
      return (
        <ChatWindow
          topic={selectedTopic}
          onSendMessage={handleSendMessage}
          chatError={chatError && chatError.topicId === selectedTopic.id ? chatError : null}
          onRetry={handleRetry}
          onStartQuiz={handleStartQuiz}
          activeQuiz={activeQuizByTopic[selectedTopic.id] || null}
          onQuizAnswer={handleQuizAnswer}
        />
      );
    }
    return <EmptyState onOpenWizard={handleOpenWizard} />;
  }

  return (
    <div className={styles.app}>
      <Sidebar
        topics={sortedTopics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={handleSelectTopic}
        onOpenWizard={handleOpenWizard}
        activeModel={activeModel}
        onChangeActiveModel={handleChangeActiveModel}
        activePanel={activePanel}
        onNavigate={handleNavigate}
      />
      {renderMain()}
      {showWizard && (
        <NewSessionWizard
          savedProfile={profile}
          onComplete={handleCompleteWizard}
          onCancel={handleCancelWizard}
        />
      )}
    </div>
  );
}
