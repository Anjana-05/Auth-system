import { useState } from 'react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validation logic
  const validate = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      // Username validation (Signup only)
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      // Confirm Password validation (Signup only)
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      try {
        const endpoint = isLogin ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/signup';
        const body = isLogin 
          ? { email: formData.email, password: formData.password }
          : { username: formData.username, email: formData.email, password: formData.password };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          alert(`${isLogin ? 'Login' : 'Signup'} successful! Welcome ${data.user.username}`);
          // Redirect or update app state here
        } else {
          setErrors(prev => ({ ...prev, apiError: data.message || 'Something went wrong' }));
          alert(data.message || 'Error occurred');
        }
      } catch (error) {
        console.error('API Error:', error);
        alert('Failed to connect to the server');
      }
    }
  };

  // Toggle between Login and Signup modes
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-gray-800">
      <div className="flex w-full max-w-5xl shadow-2xl rounded-3xl overflow-hidden bg-white">
        {/* Left Image Side */}
        <div className="hidden lg:block relative w-0 flex-1 bg-gray-900">
            <img className="absolute inset-0 h-full w-full object-cover" src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" alt="Travel destination" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>
            <div className="absolute bottom-0 left-0 p-12 text-white max-w-2xl">
                <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">Discover New Horizons</h1>
                <p className="text-lg text-gray-100 drop-shadow-md">Connect with fellow travelers, share your unique stories, and curate your next unforgettable journey around the globe.</p>
            </div>
        </div>

        {/* Right Interface Side */}
        <div className="flex w-full lg:w-1/2 flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 bg-white z-10">
          <div className="mx-auto w-full max-w-sm space-y-6">
             {/* Logo / Icon */}
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-sky-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-sky-50">
                 {/* Airplane Icon */}
                 <svg className="h-6 w-6 text-sky-600 transform rotate-[-45deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                 </svg>
              </div>
            
              <h2 className="text-center text-2xl font-extrabold tracking-tight text-gray-900">
                {isLogin ? 'Welcome Back, Traveler!' : 'Join the Adventure'}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {isLogin ? "Ready for your next trip? " : "Start your journey with us. "}
                <button
                  onClick={toggleMode}
                  className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
                  type="button"
                >
                  {isLogin ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </div>
          
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-3">
                
                {/* Username Field - Signup Only */}
                {!isLogin && (
                  <div>
                    <label htmlFor="username" className="block text-xs font-medium text-gray-700">
                      Username
                    </label>
                    <div className="mt-1">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          errors.username ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'
                        } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition duration-150 ease-in-out`}
                        placeholder="Enter your username"
                      />
                      {errors.username && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.username}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.email ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition duration-150 ease-in-out`}
                      placeholder="name@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.password ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm pr-10 transition duration-150 ease-in-out`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                         // Eye Off Icon
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        // Eye Icon
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password - Signup Only */}
                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          errors.confirmPassword ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-sky-500 focus:border-sky-500'
                        } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition duration-150 ease-in-out`}
                        placeholder="Same as above"
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-md transform transition hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLogin ? 'Sign In' : 'Begin your Journey'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => window.location.href = "http://localhost:5000/auth/google"}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.60 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
