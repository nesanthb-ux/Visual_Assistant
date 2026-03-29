import { useState } from 'react';
import { AssistantInterface } from './components/AssistantInterface';
import { HomePage } from './components/HomePage';
import { TranslatorInterface } from './components/TranslatorInterface';

export type ViewState = 'home' | 'buddy' | 'translator';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');

  return (
    <>
      {currentView === 'home' && <HomePage onSelect={setCurrentView} />}
      {currentView === 'buddy' && <AssistantInterface onBack={() => setCurrentView('home')} />}
      {currentView === 'translator' && <TranslatorInterface onBack={() => setCurrentView('home')} />}
    </>
  );
}

export default App;
