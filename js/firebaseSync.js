/**
 * firebaseSync.js - Firebase Firestore 기반 무로그인 초대 코드 공유 서비스 모듈
 */

const FirebaseSync = (() => {
  // 기본 데모 Firebase Config (사용자 지정 config가 없을 때 기본값으로 사용)
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDemoFridgeApiKey1234567890abcdef",
    authDomain: "fridge-share-demo.firebaseapp.com",
    projectId: "fridge-share-demo",
    storageBucket: "fridge-share-demo.appspot.com",
    messagingSenderId: "100000000000",
    appId: "1:100000000000:web:abcdef123456"
  };

  const STORAGE_SHARE_CODE_KEY = 'fridge_share_code';
  const STORAGE_CUSTOM_CONFIG_KEY = 'fridge_firebase_custom_config';

  let db = null;
  let isFirebaseReady = false;
  let activeShareCode = null;
  let unsubscribeFirestore = null;
  let broadcastChannel = null;
  let onDataReceivedCallback = null;
  let isLocalUpdating = false;

  // 동일 브라우저 내 탭 간 즉각 동기화를 위한 BroadcastChannel 초기화
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('fridge_shared_room_channel');
      broadcastChannel.onmessage = (event) => {
        const { type, shareCode, payload } = event.data || {};
        if (type === 'SYNC_DATA' && shareCode === activeShareCode && payload) {
          if (!isLocalUpdating && onDataReceivedCallback) {
            onDataReceivedCallback(payload);
          }
        }
      };
    }
  } catch (e) {
    console.warn('[FirebaseSync] BroadcastChannel not supported:', e);
  }

  /**
   * 저장된 커스텀 Firebase 설정 가져오기
   */
  const getSavedConfig = () => {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_CONFIG_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[FirebaseSync] Failed to parse custom config:', e);
    }
    return null;
  };

  /**
   * 커스텀 Firebase 설정 저장
   */
  const saveCustomConfig = (configObj) => {
    try {
      if (!configObj) {
        localStorage.removeItem(STORAGE_CUSTOM_CONFIG_KEY);
      } else {
        localStorage.setItem(STORAGE_CUSTOM_CONFIG_KEY, JSON.stringify(configObj));
      }
      return initFirebase();
    } catch (e) {
      console.error('[FirebaseSync] Failed to save custom config:', e);
      return false;
    }
  };

  /**
   * 개발자 일원화 Firebase 설정 가져오기
   */
  const getDeveloperFirebaseConfig = () => {
    if (typeof window !== 'undefined' && window.ENV_CONFIG?.FIREBASE_CONFIG) {
      return window.ENV_CONFIG.FIREBASE_CONFIG;
    }
    const custom = getSavedConfig();
    if (custom) return custom;
    return DEFAULT_FIREBASE_CONFIG;
  };

  /**
   * Firebase 인스턴스 초기화
   */
  const initFirebase = () => {
    if (typeof firebase === 'undefined') {
      console.warn('[FirebaseSync] Firebase SDK not loaded in window. Using Broadcast fallback.');
      isFirebaseReady = false;
      return false;
    }

    const config = getDeveloperFirebaseConfig();

    try {
      // 이미 초기화된 앱이 있으면 재사용하거나 기존 앱 사용
      let app;
      if (firebase.apps && firebase.apps.length > 0) {
        app = firebase.apps[0];
      } else {
        app = firebase.initializeApp(config);
      }
      db = firebase.firestore(app);
      isFirebaseReady = true;
      console.log('[FirebaseSync] Firebase Firestore successfully initialized. Project:', config.projectId);
      return true;
    } catch (err) {
      console.warn('[FirebaseSync] Firebase init notice:', err.message);
      // 이미 초기화된 경우 기존 Firestore 인스턴스 획득 시도
      try {
        db = firebase.firestore();
        isFirebaseReady = true;
        return true;
      } catch (e2) {
        isFirebaseReady = false;
        return false;
      }
    }
  };

  /**
   * 안전하고 직관적인 6자리 초대 코드 생성 (예: FRIDGE-7K9A)
   */
  const generateCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `FRIDGE-${code}`;
  };

  /**
   * 현재 활성화된 공유 코드 조회
   */
  const getActiveShareCode = () => {
    return activeShareCode || localStorage.getItem(STORAGE_SHARE_CODE_KEY) || null;
  };

  /**
   * Firestore 및 브로드캐스트를 통한 공유 냉장고 연결
   * @param {string} inviteCode - 공유 초대 코드
   * @param {Function} onUpdateCallback - 원격 데이터 변경 시 실행할 콜백 (payload) => void
   * @param {Object} initialLocalData - 방이 없을 경우 업로드할 초기 로컬 데이터 { items, monthlyBudget, fridgeTheme }
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const connect = async (inviteCode, onUpdateCallback, initialLocalData = {}) => {
    const cleanCode = (inviteCode || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: '초대 코드를 입력해 주세요.' };
    }

    // 기존 구독 해제
    disconnect();

    activeShareCode = cleanCode;
    localStorage.setItem(STORAGE_SHARE_CODE_KEY, cleanCode);
    onDataReceivedCallback = onUpdateCallback;

    // Firebase 초기화 확인
    if (!isFirebaseReady) {
      initFirebase();
    }

    // 1. Firebase Firestore 연동 시도
    if (isFirebaseReady && db) {
      try {
        const docRef = db.collection('shared_fridges').doc(cleanCode);

        // Firestore 실시간 리스너 등록
        unsubscribeFirestore = docRef.onSnapshot(
          (snapshot) => {
            if (snapshot.exists) {
              const data = snapshot.data();
              if (data && onDataReceivedCallback && !isLocalUpdating) {
                onDataReceivedCallback({
                  items: data.items || [],
                  monthlyBudget: data.monthlyBudget,
                  fridgeTheme: data.fridgeTheme,
                  updatedAt: data.updatedAt,
                  lastAction: data.lastAction
                });
              }
            } else {
              // 문서가 없으면 현재 로컬 데이터로 신규 공유 냉장고 생성
              console.log(`[FirebaseSync] Creating new shared fridge doc for code: ${cleanCode}`);
              docRef.set({
                inviteCode: cleanCode,
                items: initialLocalData.items || [],
                monthlyBudget: initialLocalData.monthlyBudget || 400000,
                fridgeTheme: initialLocalData.fridgeTheme || 'sky',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastAction: 'CREATE_ROOM'
              }).catch((e) => console.warn('[FirebaseSync] Failed to create initial doc:', e));
            }
          },
          (error) => {
            console.warn('[FirebaseSync] Firestore snapshot error (fallback to local/broadcast):', error);
          }
        );

        return { 
          success: true, 
          message: `공유 냉장고 [${cleanCode}]에 연결되었습니다. (Firestore 실시간 연동 활성화)` 
        };
      } catch (err) {
        console.warn('[FirebaseSync] Connection warning:', err);
      }
    }

    // 2. Firebase가 연결되지 않아도 동일 PC 다중 탭 및 로컬 공유 가능
    return {
      success: true, 
      message: `공유 냉장고 [${cleanCode}]에 연결되었습니다. (로컬/브로드캐스트 동기화 모드)`
    };
  };

  /**
   * 공유 냉장고 연결 해제 (개인 모드로 복귀)
   */
  const disconnect = () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    activeShareCode = null;
    localStorage.removeItem(STORAGE_SHARE_CODE_KEY);
    return true;
  };

  /**
   * 로컬 변경 사항(식재료 등록/수정/삭제/소진, 예산, 테마)을 Firestore 및 브로드캐스트로 전송
   * @param {Object} data { items, monthlyBudget, fridgeTheme, lastAction }
   */
  const pushData = async (data) => {
    if (!activeShareCode) return;

    isLocalUpdating = true;

    // 1. BroadcastChannel로 동일 기기 다른 탭에 즉시 전파
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'SYNC_DATA',
          shareCode: activeShareCode,
          payload: data
        });
      } catch (e) {
        console.warn('[FirebaseSync] Broadcast error:', e);
      }
    }

    // 2. Firestore 문서 갱신
    if (isFirebaseReady && db) {
      try {
        const docRef = db.collection('shared_fridges').doc(activeShareCode);
        const updatePayload = {
          items: data.items || [],
          monthlyBudget: data.monthlyBudget !== undefined ? data.monthlyBudget : 400000,
          fridgeTheme: data.fridgeTheme || 'sky',
          lastAction: data.lastAction || 'UPDATE',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await docRef.set(updatePayload, { merge: true });
      } catch (err) {
        console.warn('[FirebaseSync] Failed to push to Firestore:', err);
      }
    }

    // 짧은 지연 후 로컬 업데이트 플래그 해제 (자신의 업데이트 이벤트로 인한 중복 렌더링 방지)
    setTimeout(() => {
      isLocalUpdating = false;
    }, 100);
  };

  /**
   * 현재 공유 연결 상태 확인
   */
  const isConnected = () => {
    return Boolean(activeShareCode);
  };

  /**
   * Firebase 초기화 상태 확인
   */
  const isReady = () => {
    return isFirebaseReady;
  };

  // 모듈 로드 시 자동 초기화 시도
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('DOMContentLoaded', () => {
      initFirebase();
    });
  }

  return {
    init: initFirebase,
    getSavedConfig,
    saveCustomConfig,
    generateCode,
    getActiveShareCode,
    connect,
    disconnect,
    pushData,
    isConnected,
    isReady,
    DEFAULT_FIREBASE_CONFIG
  };
})();

// 글로벌 등록
if (typeof window !== 'undefined') {
  window.FirebaseSync = FirebaseSync;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseSync;
}
