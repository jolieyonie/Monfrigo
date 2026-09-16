/**
 * storage.js - localStorage를 래핑하여 냉장고 식재료 인벤토리, 월 예산, 냉장고 테마를 관리하는 클래스
 */
class StorageManager {
  static STORAGE_KEY = 'fridge_inventory';
  static BUDGET_KEY = 'fridge_monthly_budget';
  static THEME_KEY = 'fridge_theme_color';
  static DEFAULT_BUDGET = 400000; // 기본 월 예산: 40만 원
  static DEFAULT_THEME = 'sky';   // 기본 테마: 하늘색

  constructor(storageKey = StorageManager.STORAGE_KEY) {
    this.storageKey = storageKey;
    this.budgetKey = StorageManager.BUDGET_KEY;
    this.themeKey = StorageManager.THEME_KEY;
  }

  /**
   * 전체 아이템 목록 조회 (유통기한/소비기한 분리 지원)
   * @returns {Array<Object>}
   */
  getItems() {
    try {
      const rawData = localStorage.getItem(this.storageKey);
      if (!rawData) {
        return [];
      }
      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) return [];

      const todayStr = new Date().toISOString().split('T')[0];
      return parsed.map((item) => {
        const status = ['UNOPENED', 'OPENED', 'COMPLETED'].includes(item.status)
          ? item.status
          : 'UNOPENED';
        
        let progress = typeof item.consumptionProgress === 'number' && !isNaN(item.consumptionProgress)
          ? item.consumptionProgress
          : (status === 'COMPLETED' ? 100 : (status === 'OPENED' ? 50 : 0));

        return {
          ...item,
          storageType: ['FREEZER', 'FRIDGE'].includes(item.storageType)
            ? item.storageType
            : item.category === '냉동'
            ? 'FREEZER'
            : 'FRIDGE',
          price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0,
          purchaseDate: item.purchaseDate || todayStr,
          expiryDate: item.expiryDate || '', // 유통기한 (판매 가능 기한)
          consumptionDate: item.consumptionDate || item.expiryDate || '', // 소비기한 (실제 섭취 권장 기한)
          portionUnit: item.portionUnit || '', // 1인분 추천 소진 단위
          consumptionProgress: Math.min(100, Math.max(0, progress)), // 소진율 (0 ~ 100%)
          status: status
        };
      });
    } catch (error) {
      console.error('[StorageManager] Error reading items from localStorage:', error);
      return [];
    }
  }

  /**
   * 아이템 목록 전체 저장
   * @param {Array<Object>} items
   * @returns {boolean} 저장 성공 여부
   */
  saveItems(items) {
    try {
      if (!Array.isArray(items)) {
        throw new Error('Items must be an array');
      }
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      return true;
    } catch (error) {
      console.error('[StorageManager] Error saving items to localStorage:', error);
      return false;
    }
  }

  /**
   * 신규 식재료 아이템 추가
   * 스키마: { id, name, category, capacity, expiryDate, consumptionDate, portionUnit, consumptionProgress, status, storageType, price, purchaseDate }
   * @param {Object} item
   * @returns {Object} 추가된 아이템 객체
   */
  addItem(item) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item object');
    }

    const currentItems = this.getItems();
    let generatedId = item.id ? String(item.id) : String(Date.now());
    if (currentItems.some((i) => String(i.id) === generatedId)) {
      generatedId = `${generatedId}_${Math.random().toString(36).slice(2, 6)}`;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const category = item.category ? String(item.category).trim() : '기타';

    const storageType = ['FREEZER', 'FRIDGE'].includes(item.storageType)
      ? item.storageType
      : category === '냉동'
      ? 'FREEZER'
      : 'FRIDGE';

    const priceNum = parseInt(item.price, 10);
    const validPrice = !isNaN(priceNum) && priceNum >= 0 ? priceNum : 0;

    const expiryDate = item.expiryDate ? String(item.expiryDate).trim() : '';
    const consumptionDate = item.consumptionDate 
      ? String(item.consumptionDate).trim() 
      : expiryDate;

    const status = ['UNOPENED', 'OPENED', 'COMPLETED'].includes(item.status)
      ? item.status
      : 'UNOPENED';

    let progress = typeof item.consumptionProgress === 'number' && !isNaN(item.consumptionProgress)
      ? item.consumptionProgress
      : (status === 'COMPLETED' ? 100 : (status === 'OPENED' ? 50 : 0));

    const newItem = {
      id: generatedId,
      name: item.name ? String(item.name).trim() : '',
      category: category,
      capacity: item.capacity ? String(item.capacity).trim() : '',
      expiryDate: expiryDate,                 // 유통기한
      consumptionDate: consumptionDate,       // 소비기한 (별도 관리)
      portionUnit: item.portionUnit ? String(item.portionUnit).trim() : '', // 1인분 권장 소진단위
      consumptionProgress: Math.min(100, Math.max(0, progress)),            // 소진률
      status: status,
      storageType: storageType,               // 'FREEZER' | 'FRIDGE'
      price: validPrice,                      // 구매 금액 (원)
      purchaseDate: item.purchaseDate ? String(item.purchaseDate).trim() : todayStr
    };

    currentItems.push(newItem);
    this.saveItems(currentItems);

    return newItem;
  }

  /**
   * 아이템 삭제
   * @param {string} id
   * @returns {boolean}
   */
  deleteItem(id) {
    const targetId = String(id);
    const currentItems = this.getItems();
    const filteredItems = currentItems.filter((item) => String(item.id) !== targetId);

    if (filteredItems.length === currentItems.length) {
      return false;
    }

    this.saveItems(filteredItems);
    return true;
  }

  /**
   * 아이템 정보 수정
   * @param {string} id
   * @param {Partial<Object>} updatedFields
   * @returns {Object|null}
   */
  updateItem(id, updatedFields) {
    const targetId = String(id);
    const currentItems = this.getItems();
    const index = currentItems.findIndex((item) => String(item.id) === targetId);

    if (index === -1) {
      return null;
    }

    const updatedItem = {
      ...currentItems[index],
      ...updatedFields,
      id: currentItems[index].id
    };

    if (updatedFields.status && !['UNOPENED', 'OPENED', 'COMPLETED'].includes(updatedFields.status)) {
      delete updatedItem.status;
    }
    if (updatedFields.storageType && !['FREEZER', 'FRIDGE'].includes(updatedFields.storageType)) {
      delete updatedItem.storageType;
    }
    if (updatedFields.price !== undefined) {
      const p = parseInt(updatedFields.price, 10);
      updatedItem.price = !isNaN(p) && p >= 0 ? p : currentItems[index].price;
    }
    if (updatedFields.consumptionProgress !== undefined) {
      const prog = parseInt(updatedFields.consumptionProgress, 10);
      updatedItem.consumptionProgress = Math.min(100, Math.max(0, isNaN(prog) ? 0 : prog));
      // 소진률 변경 시 상태도 동기화
      if (updatedItem.consumptionProgress >= 100) {
        updatedItem.status = 'COMPLETED';
      } else if (updatedItem.consumptionProgress > 0) {
        updatedItem.status = 'OPENED';
      } else {
        updatedItem.status = 'UNOPENED';
      }
    }

    currentItems[index] = updatedItem;
    this.saveItems(currentItems);
    return updatedItem;
  }

  /**
   * 아이템 소진율 증가 및 상태 갱신 (소진 버튼용)
   * @param {string} id
   * @param {number} amountPercent - 증가시킬 퍼센트 (기본 +25%)
   * @returns {Object|null}
   */
  consumeItem(id, amountPercent = 25) {
    const targetId = String(id);
    const currentItems = this.getItems();
    const item = currentItems.find((i) => String(i.id) === targetId);
    if (!item) return null;

    let newProgress = (item.consumptionProgress || 0) + amountPercent;
    if (newProgress >= 100) {
      newProgress = 100;
    }

    return this.updateItem(targetId, { consumptionProgress: newProgress });
  }

  /**
   * 아이템 소진율 초기화 (되돌리기용)
   * @param {string} id
   * @returns {Object|null}
   */
  resetConsumption(id) {
    return this.updateItem(id, { consumptionProgress: 0, status: 'UNOPENED' });
  }

  /**
   * 월 예산 조회 (원 단위)
   * @returns {number}
   */
  getMonthlyBudget() {
    try {
      const stored = localStorage.getItem(this.budgetKey);
      if (!stored) return StorageManager.DEFAULT_BUDGET;
      const parsed = parseInt(stored, 10);
      return !isNaN(parsed) && parsed >= 0 ? parsed : StorageManager.DEFAULT_BUDGET;
    } catch {
      return StorageManager.DEFAULT_BUDGET;
    }
  }

  /**
   * 월 예산 설정
   * @param {number|string} amount
   * @returns {boolean}
   */
  setMonthlyBudget(amount) {
    try {
      const val = parseInt(amount, 10);
      if (isNaN(val) || val < 0) return false;
      localStorage.setItem(this.budgetKey, String(val));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 냉장고 색상 테마 조회
   * @returns {string} 'black' | 'white' | 'sky' | 'pink' | 'yellow' | 'purple' | 'green'
   */
  getFridgeTheme() {
    try {
      return localStorage.getItem(this.themeKey) || StorageManager.DEFAULT_THEME;
    } catch {
      return StorageManager.DEFAULT_THEME;
    }
  }

  /**
   * 냉장고 색상 테마 저장
   * @param {string} themeName
   * @returns {boolean}
   */
  setFridgeTheme(themeName) {
    try {
      const validThemes = ['black', 'white', 'sky', 'pink', 'yellow', 'purple', 'green'];
      if (!validThemes.includes(themeName)) return false;
      localStorage.setItem(this.themeKey, themeName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 원격 Firestore/공유 데이터 일괄 로드 및 로컬 캐시 동기화
   * @param {Object} data { items, monthlyBudget, fridgeTheme }
   */
  loadExternalData(data = {}) {
    try {
      if (Array.isArray(data.items)) {
        this.saveItems(data.items);
      }
      if (data.monthlyBudget !== undefined) {
        this.setMonthlyBudget(data.monthlyBudget);
      }
      if (data.fridgeTheme !== undefined) {
        this.setFridgeTheme(data.fridgeTheme);
      }
      return true;
    } catch (err) {
      console.error('[StorageManager] Failed to load external data:', err);
      return false;
    }
  }
}

// 브라우저 및 CommonJS/모듈 호환 처리
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
