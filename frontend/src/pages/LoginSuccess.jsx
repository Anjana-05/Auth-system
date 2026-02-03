import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoginSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      localStorage.setItem("token", token);
      // You should probably fetch user details here or just redirect
      window.location.href = "/dashboard"; // Using window.location to strictly follow instructions or I can use navigate
      // navigate('/dashboard'); 
    } else {
        navigate('/');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Logging in...</h2>
            <div className="mt-4 animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
        </div>
    </div>
  );
};

export default LoginSuccess;
