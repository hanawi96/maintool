// Test script for silence detection endpoint

const testRoutes = async () => {
  try {
    // Test main API route
    console.log('🔍 Testing main API route...');
    const mainResponse = await fetch('http://localhost:3001/api/mp3-cutter');
    console.log('Main API Status:', mainResponse.status);
    if (mainResponse.ok) {
      const mainData = await mainResponse.json();
      console.log('Main API endpoints:', Object.keys(mainData.endpoints || {}));
    }
    
    console.log('\n');
    
    // Test silence detection route
    console.log('🔍 Testing silence detection route...');
    const response = await fetch('http://localhost:3001/api/mp3-cutter/detect-silence/test123', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        threshold: -30,
        minDuration: 0.5
      })
    });
    
    console.log('Silence Detection Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON:', data);
    } catch (e) {
      console.log('Failed to parse as JSON:', e.message);
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
};

testRoutes(); 