import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, setupRecaptcha, signInWithPhoneNumber, signInWithPopup, googleProvider } from '../firebase';
import API_URL from '../config/api';

console.log("Current API_URL:", API_URL); // DEBUG: Check where requests are going

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [isPhoneLogin, setIsPhoneLogin] = useState(false); // New State for Phone Mode
  const [isForgotPassword, setIsForgotPassword] = useState(false); // New State for Forgot Password
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Timer Countdown Effect
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Cleanup Recaptcha when switching modes or unmounting
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignore error if widget not rendered
        }
        window.recaptchaVerifier = null;
      }
    };
  }, [isPhoneLogin]);

  const resetPhoneAuth = () => {
      if (window.recaptchaVerifier) {
          try {
              window.recaptchaVerifier.clear();
          } catch(e) { console.error(e); }
          window.recaptchaVerifier = null;
      }
      setConfirmationResult(null);
      setOtp('');
      setTimer(0);
      setErrors({});
  };

  // Handle Phone Auth
  const handleSendOtp = async () => {
    try {
        if(!phoneNumber || phoneNumber.length < 10) {
            setErrors({ phone: 'Please enter a valid phone number with country code (e.g., +12223334444)'});
            return;
        }

        // Basic E.164 check (must include +)
        if (!phoneNumber.startsWith('+')) {
           setErrors({ phone: 'Phone number must start with + and country code (e.g., +1...)'});
           return;
        }
        
        const verifier = setupRecaptcha('recaptcha-container');
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        setConfirmationResult(confirmation);
        setTimer(60); // Start 60s timer
        setErrors({});
        toast.success('OTP Sent!');
    } catch (err) {
        console.error("Phone Auth Error", err);
        setErrors({ phone: err.message || 'Something went wrong. Please try again later.' });
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }
    }
  };

  const handleVerifyOtp = async () => {
      try {
          const result = await confirmationResult.confirm(otp);
          const user = result.user;
          
          // Send to Backend to create/get MongoDB User
          const response = await fetch(`${API_URL}/api/auth/phone-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  phoneNumber: user.phoneNumber, 
                  uid: user.uid 
              })
          });
          
          const data = await response.json();
          if (response.ok) {
              localStorage.setItem('token', data.token);
              toast.success('Login successful!');
              navigate('/dashboard');
          } else {
              toast.error('Login failed. Please try again later.');
              setErrors({ otp: 'Login failed. Please try again later.' });
          }

      } catch (err) {
          console.error('OTP Verification Error');
          setErrors({ otp: 'Invalid OTP or network error. Please try again.' });
      }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address' });
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Password reset link sent to your email.');
        setIsForgotPassword(false);
        setIsLogin(true);
      } else {
        const msg = data.message || 'Something went wrong. Please try again.';
        toast.error(msg);
        setErrors({ email: msg });
      }
    } catch (error) {
      console.error('Forgot Password Error', error);
      setErrors({ email: 'Failed to send request. Please check your network or try again later.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const response = await fetch(`${API_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          username: user.displayName, 
          uid: user.uid,
          picture: user.photoURL
        })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        const msg = data.message || 'Something went wrong. Please try again later.';
        toast.error(msg);
        setErrors({ apiError: msg });
      }
    } catch (error) {
      console.error("Google Login Error");
      setErrors({ apiError: 'Something went wrong. Please try again later.' });
    }
  };

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
        const endpoint = isLogin ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/signup`;
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

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
            const text = await response.text();
            console.error("Non-JSON response:", text);
            throw new Error("Server returned non-JSON response. Check console for details.");
        }

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          toast.success(`${isLogin ? 'Login' : 'Signup'} successful! Welcome ${data.user.username}`);
          setTimeout(() => {
             navigate('/dashboard');
          }, 100);
        } else {
          const msg = data.message || 'Something went wrong. Please try again later.';
          toast.error(msg);
          setErrors(prev => ({ ...prev, apiError: msg }));
        }
      } catch (error) {
        console.error('API Error');
        toast.error('Something went wrong. Please try again later.');
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
          
            <form className="mt-6 space-y-4" onSubmit={isPhoneLogin ? (e)=>{e.preventDefault()} : handleSubmit}>
              
              {isForgotPassword ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                    <p className="text-sm text-gray-600 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
                  </div>
                  <div>
                    <label htmlFor="fp-email" className="block text-xs font-medium text-gray-700">Email Address</label>
                    <div className="mt-1">
                      <input
                        id="fp-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        placeholder="name@example.com"
                      />
                    </div>
                     {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>
                  <button
                     type="button"
                     onClick={handleForgotPassword}
                     disabled={isLoading}
                     className={`w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white shadow-md ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500'}`}
                  >
                     {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                   <button
                     type="button"
                     onClick={() => { setIsForgotPassword(false); setErrors({}); }}
                     className="w-full text-center text-xs text-sky-600 hover:underline mt-2"
                  >
                     Back to Login
                  </button>
                </div>
              ) : isPhoneLogin ? (
                  // PHONE LOGIN FORM
                <div className="space-y-4">
                  {!confirmationResult ? (
                    <>
                       <div>
                        <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-700">
                          Phone Number (with +CountryCode)
                        </label>
                        <div className="mt-1">
                          <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            placeholder="+1 555 555 5555"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                          />
                        </div>
                        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                      </div>
                      <div id="recaptcha-container"></div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md"
                      >
                        Send Verification Code
                      </button>
                    </>
                  ) : (
                    <>
                       <div>
                        <label htmlFor="otp" className="block text-xs font-medium text-gray-700">
                          Enter Verification Code
                        </label>
                        <div className="mt-1">
                          <input
                            id="otp"
                            name="otp"
                            type="text"
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                          />
                        </div>
                        {errors.otp && <p className="mt-1 text-xs text-red-600">{errors.otp}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-md"
                      >
                        Verify & Login
                      </button>
                      
                      {timer > 0 ? (
                        <p className="text-center text-xs text-gray-500 mt-2">
                          Resend code in <span className="font-bold">{timer}s</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                             // Go back to phone input screen to re-initialize recaptcha properly
                             resetPhoneAuth();
                          }}
                          className="w-full text-center text-xs text-green-600 hover:text-green-700 hover:underline mt-2 font-medium"
                        >
                          Resend Verification Code
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={resetPhoneAuth}
                        className="w-full text-center text-xs text-sky-600 hover:underline mt-1"
                      >
                         Change Phone Number
                      </button>
                    </>
                  )}
                 </div>
              ) : (
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

                {isLogin && (
                   <div className="flex justify-end -mt-2 mb-2">
                      <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-sky-600 hover:text-sky-500 hover:underline">
                        Forgot Password?
                      </button>
                   </div>
                )}

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
            )}
              
             {errors.apiError && (
               <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                 <div className="flex">
                   <div className="ml-3">
                     <p className="text-sm text-red-700">
                       {errors.apiError}
                     </p>
                   </div>
                 </div>
               </div>
             )}

             {!isPhoneLogin && (
              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-md transform transition hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLogin ? 'Sign In' : 'Begin your Journey'}
                </button>
              </div>
             )}

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
                  onClick={handleGoogleLogin}
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

              {/* Phone Login Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsPhoneLogin(!isPhoneLogin)}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                  {isPhoneLogin ? (
                    // Email Icon
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-gray-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  ) : (
                    // Phone Icon
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 text-gray-700">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  )}
                  {isPhoneLogin ? "Use Email instead" : "Continue with Phone Number"}
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
