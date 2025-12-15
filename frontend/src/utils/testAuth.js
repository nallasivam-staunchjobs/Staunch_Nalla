// Test authentication setup
import { apiRequest } from '../api/apiConfig';
import { API_URL } from '../api/config';

// Test basic connectivity to Django backend
export const testConnectivity = async () => {
  console.log('🌐 Testing backend connectivity...');
  console.log('🎯 Backend URL:', API_URL);
  
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/admin/`, {
      method: 'GET',
      mode: 'no-cors' // Just test if server responds
    });
    console.log('✅ Backend is responding');
    return true;
  } catch (error) {
    console.log('❌ Backend connectivity failed:', error.message);
    console.log('💡 Make sure Django server is running on http://localhost:8000');
    return false;
  }
};

export const testAuthentication = async () => {
  console.log('🔍 Testing Authentication Setup...');
  
  // First test connectivity
  const isConnected = await testConnectivity();
  if (!isConnected) {
    console.log('⚠️ Skipping authentication test due to connectivity issues');
    return false;
  }
  
  // Check what tokens are stored
  const accessToken = localStorage.getItem('access_token');
  const regularToken = localStorage.getItem('token');
  
  console.log('📦 Stored Tokens:');
  console.log('  access_token:', accessToken ? '✅ Found' : '❌ Not found');
  console.log('  token:', regularToken ? '✅ Found' : '❌ Not found');
  
  if (!accessToken && !regularToken) {
    console.log('⚠️ No authentication tokens found. Please log in first.');
    return false;
  }
  
  try {
    console.log('🚀 Testing API call to /candidates/my-candidates-dtr/...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000);
    });
    
    const apiPromise = apiRequest('/candidates/my-candidates-dtr/');
    
    console.log('⏳ Waiting for response...');
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log('✅ API call successful!');
    console.log('📊 Response data:', response);
    console.log('📊 Response type:', typeof response);
    console.log('📊 Is array:', Array.isArray(response));
    console.log('📊 Response length:', response?.length);
    
    return true;
  } catch (error) {
    console.log('❌ API call failed:', error.message);
    console.log('🔍 Full error:', error);
    
    if (error.message.includes('401')) {
      console.log('🔐 Authentication failed - token might be invalid or expired');
    } else if (error.message.includes('500')) {
      console.log('🐛 Server error - check backend logs');
    } else if (error.message.includes('timeout')) {
      console.log('⏰ Request timed out - backend might be slow or not responding');
    } else if (error.message.includes('fetch')) {
      console.log('🌐 Network error - check if backend is running on http://localhost:8000');
    }
    
    return false;
  }
};

// Test simple auth endpoint
export const testSimpleAuth = async () => {
  console.log('🧪 Testing Simple Auth Endpoint...');
  
  try {
    const response = await apiRequest('/candidates/test-auth/');
    console.log('✅ Simple auth test successful!');
    console.log('📊 Response:', response);
    return true;
  } catch (error) {
    console.log('❌ Simple auth test failed:', error.message);
    return false;
  }
};

// Quick test with small page size
export const testQuickFetch = async () => {
  console.log('⚡ Quick test with small page size...');
  
  try {
    const response = await apiRequest('/candidates/my-candidates-dtr/?page=1&page_size=10');
    console.log('✅ Quick fetch successful!');
    console.log('📊 Response:', response);
    return true;
  } catch (error) {
    console.log('❌ Quick fetch failed:', error.message);
    return false;
  }
};

// Test functions you can call from browser console
window.testAuth = testAuthentication;
window.testConnectivity = testConnectivity;
window.testSimpleAuth = testSimpleAuth;
window.testQuickFetch = testQuickFetch;
