import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDOJzBS4I3MySSs_CdlGlyYhccYadJuuts';

async function testAllModels() {
  console.log('Testing Gemini API with different model names...\n');
  
  const modelsToTry = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.0-pro',
    'gemini-1.0-pro-latest',
  ];
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Reply with just: OK');
      const text = result.response.text();
      console.log(`  ✅ SUCCESS! Response: ${text.trim()}\n`);
      return modelName; // Return first working model
    } catch (error: any) {
      const errMsg = error.message || String(error);
      if (errMsg.includes('API_KEY_INVALID')) {
        console.log(`  ❌ API KEY IS INVALID\n`);
        break;
      } else if (errMsg.includes('404')) {
        console.log(`  ❌ Model not found\n`);
      } else {
        console.log(`  ❌ Error: ${errMsg.substring(0, 100)}\n`);
      }
    }
  }
  
  return null;
}

testAllModels().then(workingModel => {
  if (workingModel) {
    console.log(`\n🎉 Use this in your .env: GEMINI_MODEL=${workingModel}`);
  } else {
    console.log('\n❌ No working model found. Please check your API key at https://aistudio.google.com/apikey');
  }
});
