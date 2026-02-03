import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './components/AuthPage'
import LoginSuccess from './components/LoginSuccess';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/dashboard" element={<div className="p-8 text-2xl font-bold text-center">Welcome to Dashboard!</div>} />
      </Routes>
    </Router>
  )
}

export default App
