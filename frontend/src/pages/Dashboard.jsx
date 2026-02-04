import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../config/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [navigate]);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setEditForm({
            username: data.username || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            name: data.name || '',
            picture: data.picture || ''
        });
        setSelectedFile(null);
      } else {
        console.error('Failed to fetch user:', response.status);
        if (response.status === 401 || response.status === 403) {
           localStorage.removeItem('token');
           navigate('/');
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // Do not redirect on network error, just stop loading
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleEditChange = (e) => {
      const { name, value } = e.target;
      setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
      if(e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      }
  };

  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('username', editForm.username);
      formData.append('email', editForm.email);
      formData.append('phoneNumber', editForm.phoneNumber);
      formData.append('name', editForm.name);
      
      // If a new file is selected, append it. 
      // Note: We are no longer sending 'picture' string (url) if it's an upload logic
      if (selectedFile) {
          formData.append('picture', selectedFile);
      }

      try {
          const response = await fetch(`${API_URL}/api/auth/update`, {
              method: 'PUT',
              headers: {
                  'Authorization': `Bearer ${token}`
                  // No Content-Type header when sending FormData; browser sets it with boundary
              },
              body: formData
          });

          const data = await response.json();
          if (response.ok) {
              setUser(data.user);
              toast.success('Profile updated successfully!');
              setIsEditing(false);
          } else {
              toast.error(data.message || 'Failed to update profile');
          }
      } catch (error) {
          console.error(error);
          toast.error('An error occurred. Please try again.');
      }
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans relative">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-white shadow-sm z-10">
        <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <svg className="h-5 w-5 rotate-[-45deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
            TravelApp
        </div>
        <button 
          onClick={handleLogout}
          className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          Logout
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
            {/* Find Trips / Welcome Section */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 relative">
                 <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                 <div className="px-6 pb-6">
                     <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-12 mb-4">
                         <div className="h-24 w-24 rounded-full bg-white p-1 shadow-lg">
                             {user.picture ? (
                                 <img 
                                    src={user.picture} 
                                    alt="Profile" 
                                    className="h-full w-full rounded-full object-cover" 
                                    onError={(e) => {
                                        console.error('Error loading image:', user.picture);
                                        // e.target.style.display = 'none'; // Option to hide
                                    }}
                                 />
                             ) : (
                                 <div className="h-full w-full rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
                                     {user.username?.charAt(0).toUpperCase()}
                                 </div>
                             )}
                         </div>
                         <div className="mt-4 sm:ml-4 sm:mb-2 flex-1 relative w-full sm:w-auto">
                             <h1 className="text-2xl font-bold text-slate-900">{getDisplayName()}</h1>
                             <p className="text-slate-500 text-sm">@{user.username}</p>
                         </div>
                         <div className="mt-4 sm:mt-0 w-full sm:w-auto flex justify-end">
                              <button 
                                 onClick={() => setIsEditing(true)}
                                 className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition font-medium text-sm flex items-center justify-center gap-2"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  Edit Profile
                              </button>
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                         <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Contact Information</p>
                             <div className="space-y-2 mt-2">
                                 <div className="flex items-center gap-2 text-sm text-slate-700">
                                     <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                     {user.email || 'No email provided'}
                                 </div>
                                 <div className="flex items-center gap-2 text-sm text-slate-700">
                                     <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                     {user.phoneNumber || 'No phone number'}
                                 </div>
                             </div>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Account Details</p>
                             <div className="space-y-2 mt-2">
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                     <span className="text-slate-400 font-medium">Member Since:</span>
                                     {new Date(user.createdAt).toLocaleDateString()}
                                 </div>
                                 <div className="flex items-center gap-2 text-sm text-slate-700">
                                     <span className="text-slate-400 font-medium">Status:</span>
                                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                     </span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
            </div>
        </div>
      </main>

      {/* Edit Modal */}
      {isEditing && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
                      <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                          <input 
                              type="text" 
                              name="name" 
                              value={editForm.name} 
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                              placeholder="Your full name"
                          />
                      </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                          <input 
                              type="text" 
                              name="username" 
                              value={editForm.username} 
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input 
                              type="email" 
                              name="email" 
                              value={editForm.email} 
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                          <input 
                              type="text" 
                              name="phoneNumber" 
                              value={editForm.phoneNumber} 
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                              placeholder="+1234567890"
                          />
                      </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
                          <input 
                              type="file" 
                              name="picture" 
                              accept="image/*"
                              onChange={handleFileChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave empty to keep current photo</p>
                      </div>

                      <div className="flex gap-3 mt-6">
                           <button 
                              type="button" 
                              onClick={() => setIsEditing(false)}
                              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                           >
                               Cancel
                           </button>
                           <button 
                              type="submit"
                              className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
                           >
                               Save Changes
                           </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
