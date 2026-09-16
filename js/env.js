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

// key.env 비동기 동적 갱신 시도 (로컬 웹서버 구동 시 key.env 파일 수정 실시간 반영)
(function initKeyEnvSync() {
  if (typeof fetch !== 'function') return;
  try {
    if (window.location && window.location.protocol !== 'file:') {
      fetch('key.env')
        .then(res => res.ok ? res.text() : '')
        .then(text => {
          if (!text) return;
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            let key = trimmed;
            if (trimmed.includes('=')) {
              const parts = trimmed.split('=');
              if (parts[0].trim() === 'OPENAI_API_KEY') {
                key = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
              }
            }
            if (key.startsWith('sk-') || key.startsWith('AIza')) {
              window.ENV_CONFIG.OPENAI_API_KEY = key;
              break;
            }
          }
        })
        .catch(() => {});
    }
  } catch (_) {}
})();
