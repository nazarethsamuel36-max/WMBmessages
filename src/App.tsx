import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WelcomePage } from './pages/WelcomePage';
import { DockPage } from './pages/DockPage';
import { PresentationPage } from './pages/PresentationPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/dock" element={<DockPage />} />
        <Route path="/presentation" element={<PresentationPage />} />
      </Routes>
    </Router>
  );
};

export default App;
