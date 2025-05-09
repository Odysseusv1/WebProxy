import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import ProxyApp from './components/ProxyApp';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <ProxyApp />
      </div>
    </Router>
  );
}

export default App;