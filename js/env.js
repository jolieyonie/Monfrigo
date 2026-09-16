/**
 * env.js - 로컬 및 개발자 환경 설정 (key.env 연동)
 * 사용자에게 별도의 입력 없이 기본으로 OpenAI API 키 및 개발자 일원화 Firebase 설정을 제공합니다.
 */
window.ENV_CONFIG = {
  OPENAI_API_KEY: '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',

  // 개발자(나)의 일원화된 Firebase Firestore DB 설정
  // 모든 사용자가 이 DB의 shared_fridges 컬렉션에 초대 코드로 자동 연결됩니다.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDemoFridgeApiKey1234567890abcdef",
    authDomain: "fridge-share-demo.firebaseapp.com",
    projectId: "fridge-share-demo",
    storageBucket: "fridge-share-demo.appspot.com",
    messagingSenderId: "100000000000",
    appId: "1:100000000000:web:abcdef123456"
  }
};
