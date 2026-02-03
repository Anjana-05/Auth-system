import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          localStorage.removeItem('token');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        localStorage.removeItem('token');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const getDisplayName = () => {
    if (!user) return '';
    const name = user.name || user.username || 'Traveler';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Navbar */}
      <nav className="flex justify-end p-6 z-10">
        <button 
          onClick={handleLogout}
          className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-full hover:bg-slate-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 uppercase tracking-wider"
        >
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center -mt-20 px-4">
        <div className="text-center animate-fade-in">
           <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{getDisplayName()}</span>
          </h1>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
