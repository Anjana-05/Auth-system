import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage'
import LoginSuccess from './pages/LoginSuccess';
import Dashboard from './pages/Dashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Routes>
    </Router>
  )
}

export default App
