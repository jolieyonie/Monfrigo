/**
 * app.js - '우리 집 냉장고' 메인 애플리케이션 제어 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 인스턴스 및 상태
  const storage = new StorageManager();
  let activeCompartment = 'ALL'; // 'ALL' | 'FREEZER' | 'FRIDGE'
  let currentListSort = 'CATEGORY'; // 'CATEGORY' | 'EXPIRY' | 'PURCHASE'

  // 2. DOM 요소 참조
  const fridgeApplianceContainer = document.getElementById('fridge-appliance');
  const financialSection = document.getElementById('financial-section');
  const dashboardContainer = document.getElementById('dashboard');
  const inventoryListContainer = document.getElementById('inventory-list');
  const listCompartmentTitle = document.getElementById('list-compartment-title');
  const listHeaderIcon = document.getElementById('list-header-icon');
  const listFilterBar = document.getElementById('list-filter-bar');

  const ingredientForm = document.getElementById('ingredient-form');
  const inputName = document.getElementById('input-name');
  const inputCategory = document.getElementById('input-category');
  const inputCapacity = document.getElementById('input-capacity');
  const inputPrice = document.getElementById('input-price');
  const inputExpiry = document.getElementById('input-expiry');
  const inputConsumption = document.getElementById('input-consumption');
  const inputPurchaseDate = document.getElementById('input-purchase-date');
  const aiCategoryBadge = document.getElementById('ai-category-badge');

  // 소비기한 추천 툴팁 DOM 요소
  const tooltipTrigger = document.getElementById('btn-consumption-tooltip-trigger');
  const tooltipPopup = document.getElementById('consumption-tooltip-popup');
  const tooltipSummaryTag = document.getElementById('tooltip-summary-tag');
  const tooltipFoodName = document.getElementById('tooltip-food-name');
  const tooltipDaysBadge = document.getElementById('tooltip-days-badge');
  const tooltipReasonText = document.getElementById('tooltip-reason-text');
  const tooltipGuidanceText = document.getElementById('tooltip-guidance-text');
  const btnApplyRecommendedDate = document.getElementById('btn-apply-recommended-date');

  // 보관칸 라디오 및 라벨
  const labelFreezer = document.getElementById('label-storage-freezer');
  const labelFridge = document.getElementById('label-storage-fridge');

  // AI 관련 DOM 요소
  const aiSettingsDetails = document.getElementById('ai-settings');
  const inputApiKey = document.getElementById('input-api-key');
  const btnSaveKey = document.getElementById('btn-save-key');
  const apiKeyStatusBadge = document.getElementById('api-key-status-badge');
  const imageUploadInput = document.getElementById('image-upload');
  const aiFeedbackBanner = document.getElementById('ai-feedback-banner');
  const aiLoadingOverlay = document.getElementById('ai-loading-overlay');
  const spinnerTitle = document.getElementById('spinner-title');
  const spinnerSubtitle = document.getElementById('spinner-subtitle');

  // 가족 공유 냉장고 (Firestore & 초대 코드) DOM 요소
  const familyShareCard = document.getElementById('family-share-card');
  const shareStatusBadge = document.getElementById('share-status-badge');
  const inputInviteCode = document.getElementById('input-invite-code');
  const btnFamilyShare = document.getElementById('btn-family-share');
  const btnGenerateCode = document.getElementById('btn-generate-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnDisconnectShare = document.getElementById('btn-disconnect-share');
  const shareActiveBanner = document.getElementById('share-active-banner');
  const displayConnectedCode = document.getElementById('display-connected-code');
  const firebaseStatusIndicator = document.getElementById('firebase-status-indicator');
  const inputFirebaseConfig = document.getElementById('input-firebase-config');
  const btnSaveFirebaseConfig = document.getElementById('btn-save-firebase-config');
  const btnResetFirebaseConfig = document.getElementById('btn-reset-firebase-config');

  // 레시피 모달
  const btnRecipeModalTrigger = document.getElementById('btn-recipe-modal-trigger');
  const recipeModalContainer = document.getElementById('recipe-modal-container');

  // '외식할까요?' 모달 DOM 요소
  const btnDiningOutTrigger = document.getElementById('btn-dining-out-trigger');
  const diningModalContainer = document.getElementById('dining-modal-container');
  const btnCloseDiningModal = document.getElementById('btn-close-dining-modal');
  const diningStatusCard = document.getElementById('dining-status-card');
  const diningAskForm = document.getElementById('dining-ask-form');
  const inputCravingFood = document.getElementById('input-craving-food');
  const diningVerdictContainer = document.getElementById('dining-verdict-container');

  // 접이식 아코디언 DOM 요소
  const btnToggleList = document.getElementById('btn-toggle-list');
  const listCollapsibleBody = document.getElementById('list-collapsible-body');
  const listToggleLabel = document.getElementById('list-toggle-label');
  const btnToggleDashboard = document.getElementById('btn-toggle-dashboard');
  const dashboardCollapsibleBody = document.getElementById('dashboard-collapsible-body');
  const dashboardToggleLabel = document.getElementById('dashboard-toggle-label');

  // 식재료 등록 모달 DOM 요소
  const ingredientModalContainer = document.getElementById('ingredient-modal-container');
  const btnCloseIngredientModal = document.getElementById('btn-close-ingredient-modal');
  const btnOpenRegisterModal = document.getElementById('btn-open-register-modal');
  const modalTitleText = document.getElementById('modal-title-text');
  const modalTitleIcon = document.getElementById('modal-title-icon');

  /**
   * 식재료 목록 아코디언 토글
   */
  const toggleListCollapsible = (forceOpen = null) => {
    if (!listCollapsibleBody || !btnToggleList) return;
    const isCurrentlyCollapsed = listCollapsibleBody.classList.contains('collapsed');
    const shouldOpen = forceOpen !== null ? forceOpen : isCurrentlyCollapsed;

    if (shouldOpen) {
      listCollapsibleBody.classList.remove('collapsed');
      btnToggleList.setAttribute('aria-expanded', 'true');
      if (listToggleLabel) listToggleLabel.textContent = '접기';
    } else {
      listCollapsibleBody.classList.add('collapsed');
      btnToggleList.setAttribute('aria-expanded', 'false');
      if (listToggleLabel) listToggleLabel.textContent = '펼치기';
    }
  };

  /**
   * 소진율 현황 아코디언 토글
   */
  const toggleDashboardCollapsible = (forceOpen = null) => {
    if (!dashboardCollapsibleBody || !btnToggleDashboard) return;
    const isCurrentlyCollapsed = dashboardCollapsibleBody.classList.contains('collapsed');
    const shouldOpen = forceOpen !== null ? forceOpen : isCurrentlyCollapsed;

    if (shouldOpen) {
      dashboardCollapsibleBody.classList.remove('collapsed');
      btnToggleDashboard.setAttribute('aria-expanded', 'true');
      if (dashboardToggleLabel) dashboardToggleLabel.textContent = '접기';
    } else {
      dashboardCollapsibleBody.classList.add('collapsed');
      btnToggleDashboard.setAttribute('aria-expanded', 'false');
      if (dashboardToggleLabel) dashboardToggleLabel.textContent = '펼치기';
    }
  };

  /**
   * 식재료 등록 모달 열기 (냉장고/냉동고 클릭 시 연동)
   * @param {'FREEZER'|'FRIDGE'} targetStorage
   */
  const openIngredientModal = (targetStorage = 'FRIDGE') => {
    if (!ingredientModalContainer) return;

    // 보관 위치 동기화
    setFormStorageType(targetStorage);

    // 모달 타이틀 업데이트
    if (modalTitleText) {
      modalTitleText.textContent = targetStorage === 'FREEZER' 
        ? '냉동고 식재료 등록' 
        : '냉장실 식재료 등록';
    }
    if (modalTitleIcon) {
      modalTitleIcon.textContent = targetStorage === 'FREEZER' ? '❄️' : '🥬';
    }

    // 모달 표시
    ingredientModalContainer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // 구매일 기본값 설정 (오늘 날짜)
    if (inputPurchaseDate && !inputPurchaseDate.value) {
      inputPurchaseDate.value = new Date().toISOString().split('T')[0];
    }

    // 자동 추천 소비기한 동기화 및 제약조건 적용
    autoRecommendExpiryDate(false);
    syncDateConstraints();

    // 물품명 인풋 포커스
    setTimeout(() => {
      inputName?.focus();
    }, 100);
  };

  /**
   * 식재료 등록 모달 닫기
   */
  const closeIngredientModal = () => {
    if (!ingredientModalContainer) return;
    ingredientModalContainer.classList.add('hidden');
    document.body.style.overflow = '';
    aiFeedbackBanner?.classList.add('hidden');
  };

  /**
   * 전체 화면(2도어 냉장고, 예산 바, 소진율 대시보드, 식재료 리스트) 일괄 업데이트
   */
  const updateView = () => {
    const items = storage.getItems();
    const monthlyBudget = storage.getMonthlyBudget();
    const fridgeTheme = storage.getFridgeTheme();

    // 1. 2도어 냉장고 그래픽 렌더링 (7대 색상 테마 지원)
    UIManager.renderFridgeGraphic(fridgeApplianceContainer, items, activeCompartment, fridgeTheme);

    // 2. 1줄 월 예산 바 및 연/월/일 지출 통계 렌더링
    UIManager.renderBudgetAndExpenses(financialSection, items, monthlyBudget);

    // 3. 식재료 소진율 대시보드 렌더링
    UIManager.renderDashboard(dashboardContainer, items);

    // 4. 목록 타이틀 및 식재료 리스트 렌더링 (단일 이모지 적용 & 정렬 필터 연동)
    if (listHeaderIcon) {
      listHeaderIcon.textContent = activeCompartment === 'FREEZER'
        ? '❄️'
        : activeCompartment === 'FRIDGE'
        ? '🥬'
        : '🏠';
    }
    if (listCompartmentTitle) {
      listCompartmentTitle.textContent = activeCompartment === 'FREEZER'
        ? '냉동고 식재료 목록'
        : activeCompartment === 'FRIDGE'
        ? '냉장실 식재료 목록'
        : '전체 보관 식재료 목록';
    }

    // 정렬/보기 필터 버튼 활성화 상태 동기화
    const filterBtns = document.querySelectorAll('.list-filter-btn');
    filterBtns.forEach(btn => {
      if (btn.dataset.filter === currentListSort) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    UIManager.renderList(inventoryListContainer, items, activeCompartment, currentListSort);

    // 외식 모달이 열려 있는 경우 소진율 상태 카드 동기화
    if (diningModalContainer && !diningModalContainer.classList.contains('hidden')) {
      renderDiningStatusCard();
    }
  };

  /**
   * 현재 선택된 보관 위치(FREEZER / FRIDGE) 가져오기
   */
  const getSelectedStorageType = () => {
    const checkedRadio = ingredientForm.querySelector('input[name="storageType"]:checked');
    return checkedRadio ? checkedRadio.value : 'FRIDGE';
  };

  /**
   * 보관 위치 선택기 UI 동기화
   */
  const setFormStorageType = (type) => {
    const targetType = type === 'FREEZER' ? 'FREEZER' : 'FRIDGE';
    const radio = ingredientForm.querySelector(`input[name="storageType"][value="${targetType}"]`);
    if (radio) radio.checked = true;

    if (targetType === 'FREEZER') {
      labelFreezer.classList.add('active-storage');
      labelFridge.classList.remove('active-storage');
    } else {
      labelFridge.classList.add('active-storage');
      labelFreezer.classList.remove('active-storage');
    }

    // 모달 타이틀 동기화 (냉동고 / 냉장실)
    if (modalTitleText) {
      modalTitleText.textContent = targetType === 'FREEZER' 
        ? '냉동고 식재료 등록' 
        : '냉장실 식재료 등록';
    }
    if (modalTitleIcon) {
      modalTitleIcon.textContent = targetType === 'FREEZER' ? '❄️' : '🥬';
    }

    // 보관위치 변경 시 유통기한 추천 다시 계산
    autoRecommendExpiryDate();
  };

  /**
   * YYYY-MM-DD 날짜 문자열에 일수를 더한 새 YYYY-MM-DD 문자열 반환 (로컬 타임존 기준 안전 계산)
   */
  const addDaysToDateStr = (dateStr, days) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map((n) => parseInt(n, 10));
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return '';
    }
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + Number(days));
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  /**
   * 식재료의 유통기한 경과 후 추가 권장 소비일수(일) 산출
   */
  const getExtraConsumptionDays = (name, category, storageType) => {
    if (typeof window.ExpiryHelper !== 'undefined' && ExpiryHelper.getRecommendation) {
      const rec = ExpiryHelper.getRecommendation(name, category, storageType);
      const extra = (rec.consumptionDays || 0) - (rec.expiryDays || 0);
      return Math.max(0, extra);
    }
    return 7;
  };

  /**
   * 구매일 ≤ 유통기한 ≤ 소비기한 HTML5 min/max 속성 동기화
   */
  const syncDateConstraints = () => {
    const purchaseVal = inputPurchaseDate?.value || '';
    const expiryVal = inputExpiry?.value || '';

    // 1. 유통기한 min = 구매일 (유통기한은 구매일 이후)
    if (inputExpiry) {
      if (purchaseVal) {
        inputExpiry.min = purchaseVal;
      } else {
        inputExpiry.removeAttribute('min');
      }
    }

    // 2. 구매일 max = 유통기한 (구매일은 유통기한 이전)
    if (inputPurchaseDate) {
      if (expiryVal) {
        inputPurchaseDate.max = expiryVal;
      } else {
        inputPurchaseDate.removeAttribute('max');
      }
    }

    // 3. 소비기한 min = 유통기한 (소비기한은 유통기한 이후, 유통기한 없으면 구매일)
    if (inputConsumption) {
      if (expiryVal) {
        inputConsumption.min = expiryVal;
      } else if (purchaseVal) {
        inputConsumption.min = purchaseVal;
      } else {
        inputConsumption.removeAttribute('min');
      }
    }
  };

  /**
   * 식재료 유통기한 및 소비기한 자동 추천 및 툴팁/인풋 세팅
   */
  const autoRecommendExpiryDate = (forceOverwrite = false) => {
    const name = inputName.value.trim();
    const category = inputCategory.value;
    const storageType = getSelectedStorageType();

    const rec = ExpiryHelper.getRecommendation(name, category, storageType);
    const extraDays = getExtraConsumptionDays(name, category, storageType);

    // 기준일: 구매일이 있으면 구매일, 없으면 오늘 날짜
    const baseDate = (inputPurchaseDate && inputPurchaseDate.value)
      ? inputPurchaseDate.value
      : new Date().toISOString().split('T')[0];

    const recommendedExpiry = addDaysToDateStr(baseDate, rec.expiryDays);
    const recommendedConsumption = addDaysToDateStr(recommendedExpiry, extraDays);

    // 툴팁 텍스트 갱신 (유통기한 후 추가 권장 소비일수 및 소비기한 일자 노출)
    if (tooltipSummaryTag) {
      tooltipSummaryTag.textContent = `추천: +${extraDays}일`;
    }
    if (tooltipFoodName) {
      tooltipFoodName.textContent = `💡 ${name ? name : '소비기한 추천'}`;
    }
    if (tooltipDaysBadge) {
      tooltipDaysBadge.textContent = `+${extraDays}일 (${recommendedConsumption})`;
    }
    if (tooltipReasonText) {
      tooltipReasonText.textContent = rec.reason;
    }
    if (tooltipGuidanceText) {
      tooltipGuidanceText.textContent = rec.guidance;
    }

    // 인풋이 비어있거나 강제 갱신 요청 시 자동 추천일 세팅
    if (!inputExpiry.value || forceOverwrite) {
      inputExpiry.value = recommendedExpiry;
    }
    if (!inputConsumption.value || forceOverwrite) {
      inputConsumption.value = addDaysToDateStr(inputExpiry.value || recommendedExpiry, extraDays);
    }

    syncDateConstraints();
  };

  /**
   * 소비기한 툴팁 토글 및 추천일 적용 버튼 이벤트 리스너
   */
  if (tooltipTrigger && tooltipPopup) {
    tooltipTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExpanded = tooltipPopup.classList.toggle('show');
      tooltipTrigger.setAttribute('aria-expanded', String(isExpanded));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tooltip-trigger-wrapper')) {
        tooltipPopup.classList.remove('show');
        tooltipTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (btnApplyRecommendedDate) {
    btnApplyRecommendedDate.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const name = inputName.value.trim();
      const category = inputCategory.value;
      const storageType = getSelectedStorageType();
      const rec = ExpiryHelper.getRecommendation(name, category, storageType);
      const extraDays = getExtraConsumptionDays(name, category, storageType);

      if (inputExpiry.value) {
        inputConsumption.value = addDaysToDateStr(inputExpiry.value, extraDays);
      } else {
        const baseDate = (inputPurchaseDate && inputPurchaseDate.value)
          ? inputPurchaseDate.value
          : new Date().toISOString().split('T')[0];
        inputExpiry.value = addDaysToDateStr(baseDate, rec.expiryDays);
        inputConsumption.value = addDaysToDateStr(inputExpiry.value, extraDays);
      }

      syncDateConstraints();
      tooltipPopup?.classList.remove('show');
      tooltipTrigger?.setAttribute('aria-expanded', 'false');
      highlightFields([inputConsumption]);
    });
  }

  /**
   * 유통기한 변경 시 이벤트 핸들러:
   * 1) 구매일 ≤ 유통기한 검증
   * 2) 유통기한을 설정하면 소비기한이 자동으로 권장기한(유통기한 + 권장 잔여일수)으로 변경됨
   * 3) 소비기한 인풋 시각적 강조 및 제약 동기화
   */
  const handleExpiryChange = () => {
    const expiryVal = inputExpiry.value;
    if (!expiryVal) return;

    // 1. 구매일과 비교 검증 (구매일 <= 유통기한)
    if (inputPurchaseDate && inputPurchaseDate.value && expiryVal < inputPurchaseDate.value) {
      alert(`유통기한은 구매일(${inputPurchaseDate.value})보다 이전일 수 없습니다.\n날짜 순서를 확인해 주세요: 구매일 ≤ 유통기한 ≤ 소비기한`);
      inputExpiry.value = inputPurchaseDate.value;
    }

    const name = inputName.value.trim();
    const category = inputCategory.value;
    const storageType = getSelectedStorageType();
    const extraDays = getExtraConsumptionDays(name, category, storageType);

    // 2. 유통기한 기준으로 소비기한 자동 권장일 계산
    const newConsumption = addDaysToDateStr(inputExpiry.value, extraDays);
    inputConsumption.value = newConsumption;

    // 툴팁 갱신
    if (tooltipSummaryTag) {
      tooltipSummaryTag.textContent = `추천: +${extraDays}일`;
    }
    if (tooltipDaysBadge) {
      tooltipDaysBadge.textContent = `+${extraDays}일 (${newConsumption})`;
    }

    syncDateConstraints();
    highlightFields([inputConsumption]);
  };

  /**
   * 소비기한 수동 변경 시 이벤트 핸들러:
   * 소비자의 자율적 수정을 전적으로 허용하되, 유통기한보다 앞서는 역전 현상 방지
   */
  const handleConsumptionChange = () => {
    const consumptionVal = inputConsumption.value;
    if (!consumptionVal) return;

    // 유통기한과 비교 검증 (유통기한 <= 소비기한)
    if (inputExpiry.value && consumptionVal < inputExpiry.value) {
      alert(`소비기한은 유통기한(${inputExpiry.value})보다 이전일 수 없습니다.\n날짜 순서를 확인해 주세요: 구매일 ≤ 유통기한 ≤ 소비기한`);
      inputConsumption.value = inputExpiry.value;
    }
  };

  /**
   * 구매일 변경 시 이벤트 핸들러:
   * 1) 구매일 ≤ 유통기한 검증
   * 2) 날짜 제약 min/max 갱신
   */
  const handlePurchaseDateChange = () => {
    const purchaseVal = inputPurchaseDate.value;
    if (!purchaseVal) return;

    if (inputExpiry.value && purchaseVal > inputExpiry.value) {
      alert(`구매일은 유통기한(${inputExpiry.value})보다 이후일 수 없습니다.\n날짜 순서를 확인해 주세요: 구매일 ≤ 유통기한 ≤ 소비기한`);
      inputPurchaseDate.value = inputExpiry.value;
    }

    syncDateConstraints();
  };

  /**
   * 물품명 입력 시 AI 스마트 카테고리 자동 분류 및 소진 기한 추천
   */
  const handleNameInput = () => {
    const name = inputName.value.trim();
    if (name && typeof window.ExpiryHelper !== 'undefined' && ExpiryHelper.classifyCategory) {
      const result = ExpiryHelper.classifyCategory(name);
      if (result.isAiClassified) {
        inputCategory.value = result.category;
        if (result.storageType === 'FREEZER') {
          setFormStorageType('FREEZER');
        }
        if (aiCategoryBadge) {
          aiCategoryBadge.textContent = `✨ AI 자동: ${result.category}`;
          aiCategoryBadge.classList.remove('hidden');
        }
      } else {
        if (aiCategoryBadge) aiCategoryBadge.classList.add('hidden');
      }
    } else {
      if (aiCategoryBadge) aiCategoryBadge.classList.add('hidden');
    }

    autoRecommendExpiryDate(false);
  };

  inputName.addEventListener('input', handleNameInput);
  inputCategory.addEventListener('change', () => autoRecommendExpiryDate(true));
  inputExpiry.addEventListener('change', handleExpiryChange);
  inputConsumption.addEventListener('change', handleConsumptionChange);
  if (inputPurchaseDate) {
    inputPurchaseDate.addEventListener('change', handlePurchaseDateChange);
  }

  // 보관칸 라디오 버튼 변경 이벤트
  ingredientForm.querySelectorAll('input[name="storageType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      setFormStorageType(radio.value);
    });
  });

  /**
   * 2도어 냉장고 클릭 & 탭 & 색상 테마 인터랙션 (이벤트 위임)
   */
  fridgeApplianceContainer.addEventListener('click', (event) => {
    // 1. 우측 상단 🎨 테마 팔레트 이모지 버튼 클릭 시 팝오버 토글
    const paletteTrigger = event.target.closest('#btn-palette-trigger');
    if (paletteTrigger) {
      event.stopPropagation();
      const menu = document.getElementById('theme-palette-menu');
      if (menu) {
        const isExpanded = menu.classList.toggle('show');
        paletteTrigger.setAttribute('aria-expanded', String(isExpanded));
      }
      return;
    }

    // 2. 냉장고 테마 색상 칩 클릭 시 (검은색, 하얀색, 하늘색, 분홍색, 노란색, 보라색, 초록색)
    const themeChip = event.target.closest('.theme-chip');
    if (themeChip && themeChip.dataset.theme) {
      storage.setFridgeTheme(themeChip.dataset.theme);
      syncToSharedFirestore('냉장고 테마 변경: ' + themeChip.dataset.theme);
      updateView();
      return;
    }

    // 3. 냉장고 도어 클릭 시 -> 해당 보관칸 식재료 등록 모달 팝업 호출!
    const door = event.target.closest('.fridge-door');
    if (door && door.dataset.targetCompartment) {
      activeCompartment = door.dataset.targetCompartment;
      setFormStorageType(activeCompartment);
      updateView();
      openIngredientModal(activeCompartment);
      return;
    }

    // 4. 보관 칸 필터 탭 클릭 시
    const tabBtn = event.target.closest('.compartment-tab-btn');
    if (tabBtn && tabBtn.dataset.compartment) {
      activeCompartment = tabBtn.dataset.compartment;
      if (activeCompartment === 'FREEZER' || activeCompartment === 'FRIDGE') {
        setFormStorageType(activeCompartment);
      }
      updateView();
    }
  });

  // 외부 클릭 시 테마 팔레트 팝오버 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-palette-dropdown')) {
      const menu = document.getElementById('theme-palette-menu');
      if (menu) menu.classList.remove('show');
    }
  });

  /**
   * 월 예산 수정 버튼 핸들러 (이벤트 위임)
   */
  financialSection.addEventListener('click', (event) => {
    if (event.target.closest('#btn-edit-budget')) {
      const current = storage.getMonthlyBudget();
      const inputVal = prompt('새로운 월 식비 예산을 입력해 주세요 (원 단위):', current);
      if (inputVal !== null) {
        const parsed = parseInt(inputVal.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) {
          storage.setMonthlyBudget(parsed);
          syncToSharedFirestore('월 예산 변경');
          updateView();
        } else {
          alert('올바른 예산 금액을 입력해 주세요.');
        }
      }
    }
  });

  /**
   * AI 레시피 추천 모달 열기
   */
  btnRecipeModalTrigger.addEventListener('click', async () => {
    const items = storage.getItems();
    const activeItems = items.filter(i => i.status !== 'COMPLETED');

    if (activeItems.length === 0) {
      alert('냉장고에 식재료가 없습니다.\n먼저 식재료를 등록하시면 남은 재료로 만들 수 있는 맛있는 요리를 추천해 드립니다!');
      return;
    }

    // 스피너 표시
    spinnerTitle.textContent = '👨‍🍳 AI가 냉장고 재료로 레시피를 구상하고 있습니다...';
    spinnerSubtitle.textContent = `보관 중인 ${activeItems.length}개 재료를 최적 조합 중`;
    aiLoadingOverlay.classList.remove('hidden');

    try {
      const recipes = await LLMService.getRecipeRecommendations(items);
      UIManager.renderRecipeModal(recipeModalContainer, recipes);
    } catch (err) {
      console.error(err);
      alert('레시피 추천 중 문제가 발생했습니다: ' + err.message);
    } finally {
      aiLoadingOverlay.classList.add('hidden');
    }
  });

  /**
   * 레시피 모달 닫기 이벤트
   */
  recipeModalContainer.addEventListener('click', (event) => {
    if (event.target.closest('#btn-close-recipe') || event.target.id === 'recipe-modal-backdrop') {
      recipeModalContainer.classList.add('hidden');
    }
  });

  /**
   * ==========================================================================
   * '외식할까요?' 모달 & 냉장고 소진율 기반 판정 로직
   * ==========================================================================
   */
  /**
   * 전체 식재료의 평균 소진율(0~100%) 계산
   */
  const getOverallConsumptionRate = () => {
    const items = storage.getItems();
    const totalCount = items.length;
    if (totalCount === 0) return 0;

    let totalProgressSum = 0;
    items.forEach((item) => {
      const prog = typeof item.consumptionProgress === 'number' && !isNaN(item.consumptionProgress)
        ? item.consumptionProgress
        : (item.status === 'COMPLETED' ? 100 : (item.status === 'OPENED' ? 50 : 0));
      totalProgressSum += prog;
    });
    return Math.round(totalProgressSum / totalCount);
  };

  /**
   * '외식할까요?' 모달 내 냉장고 소진율 상태 카드 렌더링
   */
  const renderDiningStatusCard = () => {
    if (!diningStatusCard) return;
    const items = storage.getItems();
    const totalCount = items.length;
    const completedCount = items.filter(i => i.status === 'COMPLETED').length;
    const rate = getOverallConsumptionRate();

    let tierBadgeHtml = '';
    if (rate <= 30) {
      tierBadgeHtml = '<span class="dining-tier-badge badge-danger">🛑 외식 통제 구역 (0%~30%)</span>';
    } else if (rate <= 60) {
      tierBadgeHtml = '<span class="dining-tier-badge badge-warning">⚖️ 일탈 고민 구역 (31%~60%)</span>';
    } else {
      tierBadgeHtml = '<span class="dining-tier-badge badge-success">🎊 외식 프리패스 (61% 이상)</span>';
    }

    diningStatusCard.innerHTML = `
      <div class="dining-status-header">
        <span class="dining-status-label">현재 냉장고 평균 소진율</span>
        <span class="dining-status-rate">${rate}%</span>
      </div>
      <div class="progress-track progress-bar-thick" role="progressbar" aria-valuenow="${rate}">
        <div class="progress-fill progress-fill-overall" style="width: ${rate}%;"></div>
      </div>
      <div class="dining-status-sub">
        <span>총 ${totalCount}개 품목 (${completedCount}개 소진 완료)</span>
        ${tierBadgeHtml}
      </div>
    `;
  };

  /**
   * '외식할까요?' 모달 열기
   */
  const openDiningModal = () => {
    if (!diningModalContainer) return;
    renderDiningStatusCard();
    if (inputCravingFood) inputCravingFood.value = '';
    if (diningVerdictContainer) {
      diningVerdictContainer.innerHTML = '';
      diningVerdictContainer.classList.add('hidden');
    }
    diningModalContainer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      inputCravingFood?.focus();
    }, 100);
  };

  /**
   * '외식할까요?' 모달 닫기
   */
  const closeDiningModal = () => {
    if (!diningModalContainer) return;
    diningModalContainer.classList.add('hidden');
    document.body.style.overflow = '';
  };

  /**
   * 음식명의 건강/배달 특성 분류
   * @param {string} foodName
   * @returns {'UNHEALTHY_DELIVERY' | 'HEALTHY_FOOD' | 'NEUTRAL'}
   */
  const classifyFoodHealthiness = (foodName) => {
    if (!foodName || typeof foodName !== 'string') return 'NEUTRAL';
    const clean = foodName.toLowerCase().replace(/\s+/g, '');

    // 1. 건강에 좋지 않은 배달/패스트푸드/기름진 야식 키워드
    const unhealthyKeywords = [
      '치킨', '통닭', '닭강정', '피자', '햄버거', '버거', '감자튀김', '감튀',
      '떡볶이', '라볶이', '순대', '튀김', '김말이', '핫도그', '도넛', '도너츠',
      '짜장', '자장', '짬뽕', '탕수육', '깐풍기', '유린기', '군만두',
      '마라탕', '마라샹궈', '마라', '곱창', '대창', '막창', '닭발', '불닭',
      '라면', '컵라면', '부대찌개', '스팸', '소시지', '소세지', '인스턴트',
      '야식', '배달', '돈까스', '돈가스', '엽떡', '신전', '치즈볼'
    ];

    // 2. 건강식에 가까운 키워드 (채소, 샐러드, 신선 해산물, 웰빙 한식)
    const healthyKeywords = [
      '샐러드', '포케', '웜볼', '그릭요거트', '요거트', '과일',
      '샤브샤브', '월남쌈', '쌈밥', '비빔밥', '곤드레', '보리밥', '청국장',
      '순두부', '두부', '콩국수', '콩나물', '죽', '전복죽', '삼계탕', '백숙',
      '설렁탕', '곰탕', '도가니탕', '갈비탕', '수육', '보쌈',
      '초밥', '스시', '회', '사시미', '생선구이', '고등어', '삼치', '연어',
      '샌드위치', '서브웨이', '닭가슴살', '채소', '야채'
    ];

    for (const kw of unhealthyKeywords) {
      if (clean.includes(kw)) return 'UNHEALTHY_DELIVERY';
    }

    for (const kw of healthyKeywords) {
      if (clean.includes(kw)) return 'HEALTHY_FOOD';
    }

    return 'NEUTRAL';
  };

  /**
   * 먹고 싶은 음식 질문 제출 핸들러 (소진율 3단계 판정)
   */
  if (diningAskForm) {
    diningAskForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const food = inputCravingFood ? inputCravingFood.value.trim() : '';
      if (!food) {
        alert('먹고 싶은 음식을 입력해 주세요!');
        inputCravingFood?.focus();
        return;
      }

      const rate = getOverallConsumptionRate();
      const safeFood = food.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      let verdictHtml = '';
      if (rate <= 30) {
        // [규칙 1] 소진율 0%~30% : 절대 안된다. 냉장고에 식재료가 가득이다. 정신차리라는 투의 대답 (아주 단호하게)
        verdictHtml = `
          <div class="verdict-box verdict-tier-danger">
            <div class="verdict-header-row">
              <span class="dining-tier-badge badge-danger">🛑 절대 외식 불가!</span>
              <span class="verdict-food-chip">먹고 싶은 것: ${safeFood}</span>
            </div>
            <div class="verdict-headline">
              절대 안 됩니다! 지금 냉장고에 식재료가 가득 쌓여 있습니다! 정신 차리세요!! 🙅‍♂️
            </div>
            <div class="verdict-description">
              현재 냉장고 소진율은 겨우 <strong>${rate}%</strong>입니다.<br>
              냉장고 안에 유통기한이 지나가는 식재료들이 울고 있어요! 
              <strong>'${safeFood}'</strong>(은)는 냉장고를 깨끗이 비운 뒤에 드셔도 결코 늦지 않습니다.<br>
              지금 당장 냉장고 문 열고 집밥부터 만들어 드세요! ⚡
            </div>
            <div class="verdict-tip-box">
              💡 정신 바짝 차리시고 지금 냉장고 재료로 만들 수 있는 집밥 레시피를 확인해 보세요!
            </div>
            <div class="verdict-actions-row">
              <button type="button" class="btn-verdict-action btn-verdict-recipe" id="btn-verdict-to-recipe">
                🍳 냉장고 재료로 레시피 보기
              </button>
              <button type="button" class="btn-verdict-action btn-verdict-retry" id="btn-verdict-retry">
                🔄 다른 음식 물어보기
              </button>
            </div>
          </div>
        `;
      } else if (rate <= 60) {
        // [규칙 2] 소진율 31%~60% : 집밥을 권장하나, 눈 앞에 진짜 아른거린다면 먹을 수 있다는 뉘앙스로 대답.
        // 단 음식 종류가 건강에 좋지 않은 배달음식인 경우 부정적으로 대답하고, 건강식에 가까운 경우 권장하는 어투로 대답!
        const foodHealth = classifyFoodHealthiness(food);

        if (foodHealth === 'UNHEALTHY_DELIVERY') {
          // [2-A] 건강에 좋지 않은 배달음식: 부정적으로 대답
          verdictHtml = `
            <div class="verdict-box verdict-tier-danger">
              <div class="verdict-header-row">
                <span class="dining-tier-badge badge-danger">🛑 배달음식 경고! (건강 주의)</span>
                <span class="verdict-food-chip">먹고 싶은 것: ${safeFood}</span>
              </div>
              <div class="verdict-headline">
                아무리 아른거려도 기름진 배달음식은 참으세요! 🙅‍♂️
              </div>
              <div class="verdict-description">
                현재 냉장고 소진율은 <strong>${rate}%</strong>로 아직 비워내야 할 냉장고 식재료가 꽤 남아있습니다.<br>
                게다가 <strong>'${safeFood}'</strong>(은)는 건강에도 부담스럽고 기름진 배달음식이라 몸에도, 지갑에도 전혀 좋지 않아요!<br>
                눈앞에 진짜 아른거리더라도 이번만큼은 꾹 참으시고, 냉장고 속 신선한 재료로 건강한 집밥을 만들어 드세요! 🥦🍳
              </div>
              <div class="verdict-tip-box">
                💡 자극적인 배달음식 대신, 냉장고 속 재료로 깔끔하고 건강한 집밥 레시피를 찾아보세요!
              </div>
              <div class="verdict-actions-row">
                <button type="button" class="btn-verdict-action btn-verdict-recipe" id="btn-verdict-to-recipe">
                  🍳 건강한 집밥 레시피 보기
                </button>
                <button type="button" class="btn-verdict-action btn-verdict-retry" id="btn-verdict-retry">
                  🔄 다른 음식 물어보기
                </button>
              </div>
            </div>
          `;
        } else if (foodHealth === 'HEALTHY_FOOD') {
          // [2-B] 건강식에 가까운 경우: 권장하는 어투로 대답
          verdictHtml = `
            <div class="verdict-box verdict-tier-success">
              <div class="verdict-header-row">
                <span class="dining-tier-badge badge-success">🥗 웰빙 건강식 강력 권장!</span>
                <span class="verdict-food-chip">먹고 싶은 것: ${safeFood}</span>
              </div>
              <div class="verdict-headline">
                몸에 좋은 건강식이라면 찬성! 기분 좋게 영양 보충하고 오세요! 🌿
              </div>
              <div class="verdict-description">
                현재 소진율은 <strong>${rate}%</strong>로 원칙상 집밥을 권장하는 시기이지만...<br>
                선택하신 <strong>'${safeFood}'</strong>(은)는 영양이 풍부하고 몸에 이로운 웰빙 건강식 메뉴네요!<br>
                눈앞에 아른아른거릴 정도라면 몸에서 신선한 영양소를 원하고 있다는 뜻입니다. 
                오늘 하루만큼은 마음 편히 건강하게 드시고 오세요! 충전된 활력으로 내일부터 다시 냉장고 파먹기를 이어가면 됩니다! ✨🥗
              </div>
              <div class="verdict-tip-box">
                ✨ 신선하고 균형 잡힌 건강식 외식은 몸과 마음에 활력을 줍니다. 맛있게 드시고 오세요!
              </div>
              <div class="verdict-actions-row">
                <button type="button" class="btn-verdict-action btn-verdict-dismiss" id="btn-verdict-enjoy">
                  🍽️ 건강하게 먹으러 가기!
                </button>
                <button type="button" class="btn-verdict-action btn-verdict-recipe" id="btn-verdict-to-recipe">
                  🍳 집밥 레시피도 둘러보기
                </button>
                <button type="button" class="btn-verdict-action btn-verdict-retry" id="btn-verdict-retry">
                  🔄 다른 음식 물어보기
                </button>
              </div>
            </div>
          `;
        } else {
          // [2-C] 일반 음식: 집밥 권장하나 진짜 눈앞에 아른거리면 일탈 허용
          verdictHtml = `
            <div class="verdict-box verdict-tier-warning">
              <div class="verdict-header-row">
                <span class="dining-tier-badge badge-warning">⚖️ 조건부 일탈 허용</span>
                <span class="verdict-food-chip">먹고 싶은 것: ${safeFood}</span>
              </div>
              <div class="verdict-headline">
                집밥을 권장하지만... 정말 눈앞에 아른아른거린다면 오늘 하루 일탈하세요! 🤫
              </div>
              <div class="verdict-description">
                현재 냉장고 소진율은 <strong>${rate}%</strong>로 절반 정도 비워가는 중입니다.<br>
                원칙적으로는 알뜰한 집밥을 적극 권장하지만, 지금 <strong>'${safeFood}'</strong>(이)가 머릿속에서 아른아른 떠나지 않아 일이 손에 안 잡힌다면... 오늘 딱 하루만큼은 행복하게 일탈하셔도 좋습니다!<br>
                대신 내일부터는 남은 냉장고 식재료 소진에 전념하기로 약속해요! 😉
              </div>
              <div class="verdict-tip-box">
                💡 마음이 살짝 흔들린다면 집밥 레시피를 먼저 한 번 둘러보는 것도 좋은 선택입니다!
              </div>
              <div class="verdict-actions-row">
                <button type="button" class="btn-verdict-action btn-verdict-recipe" id="btn-verdict-to-recipe">
                  🍳 집밥 레시피 먼저 보기
                </button>
                <button type="button" class="btn-verdict-action btn-verdict-dismiss" id="btn-verdict-enjoy">
                  🍽️ 오늘만 먹으러 가기!
                </button>
                <button type="button" class="btn-verdict-action btn-verdict-retry" id="btn-verdict-retry">
                  🔄 다른 음식 물어보기
                </button>
              </div>
            </div>
          `;
        }
      } else {
        // [규칙 3] 소진율 61% 이상 : 먹고 싶은 거 다 먹으라고 대답.
        verdictHtml = `
          <div class="verdict-box verdict-tier-success">
            <div class="verdict-header-row">
              <span class="dining-tier-badge badge-success">🎉 외식 프리패스 승인!</span>
              <span class="verdict-food-chip">먹고 싶은 것: ${safeFood}</span>
            </div>
            <div class="verdict-headline">
              먹고 싶은 거 다 먹으세요!! 오늘 저녁은 무조건 외식입니다!! 🥳
            </div>
            <div class="verdict-description">
              현재 냉장고 소진율이 무려 <strong>${rate}%</strong>! 성실하게 냉장고를 비워낸 당신, 아주 훌륭합니다! 👏<br>
              냉장고가 넉넉하게 비워졌으니 어떤 죄책감도 가질 필요 없습니다.<br>
              오늘만큼은 <strong>'${safeFood}'</strong>(은)는 물론이고 먹고 싶은 거 마음껏 즐기고 행복한 시간 보내세요! 🚀🍗🍕
            </div>
            <div class="verdict-tip-box">
              ✨ 열심히 냉장고를 파먹은 당신을 위한 달콤한 보상 데이입니다!
            </div>
            <div class="verdict-actions-row">
              <button type="button" class="btn-verdict-action btn-verdict-dismiss" id="btn-verdict-enjoy">
                🎉 신나게 먹으러 가기!
              </button>
              <button type="button" class="btn-verdict-action btn-verdict-retry" id="btn-verdict-retry">
                🔄 다른 음식 물어보기
              </button>
            </div>
          </div>
        `;
      }

      diningVerdictContainer.innerHTML = verdictHtml;
      diningVerdictContainer.classList.remove('hidden');

      // 판정 카드 내 액션 버튼 이벤트 리스너
      const btnToRecipe = diningVerdictContainer.querySelector('#btn-verdict-to-recipe');
      if (btnToRecipe) {
        btnToRecipe.addEventListener('click', () => {
          closeDiningModal();
          btnRecipeModalTrigger?.click();
        });
      }

      const btnEnjoy = diningVerdictContainer.querySelector('#btn-verdict-enjoy');
      if (btnEnjoy) {
        btnEnjoy.addEventListener('click', () => {
          closeDiningModal();
        });
      }

      const btnRetry = diningVerdictContainer.querySelector('#btn-verdict-retry');
      if (btnRetry) {
        btnRetry.addEventListener('click', () => {
          if (inputCravingFood) {
            inputCravingFood.value = '';
            inputCravingFood.focus();
          }
          diningVerdictContainer.innerHTML = '';
          diningVerdictContainer.classList.add('hidden');
        });
      }
    });
  }

  // 외식 모달 열기 및 닫기 이벤트 리스너 등록
  btnDiningOutTrigger?.addEventListener('click', openDiningModal);
  btnCloseDiningModal?.addEventListener('click', closeDiningModal);
  diningModalContainer?.addEventListener('click', (event) => {
    if (event.target === diningModalContainer) {
      closeDiningModal();
    }
  });

  /**
   * 공유 모드인 경우 변경 사항을 원격 Firestore/브로드캐스트에 전송
   */
  function syncToSharedFirestore(lastAction = 'UPDATE') {
    if (typeof window.FirebaseSync !== 'undefined' && FirebaseSync.isConnected()) {
      const items = storage.getItems();
      const monthlyBudget = storage.getMonthlyBudget();
      const fridgeTheme = storage.getFridgeTheme();
      FirebaseSync.pushData({
        items,
        monthlyBudget,
        fridgeTheme,
        lastAction
      });
    }
  }

  /**
   * 원격 Firestore/공유 데이터 변경 수신 핸들러
   */
  function handleRemoteDataUpdate(remoteData) {
    if (!remoteData) return;
    storage.loadExternalData(remoteData);
    updateView();
  }

  /**
   * 가족 공유 냉장고 UI 상태 갱신
   */
  function updateShareUI() {
    const isSharing = typeof window.FirebaseSync !== 'undefined' && FirebaseSync.isConnected();
    const code = isSharing ? FirebaseSync.getActiveShareCode() : '';

    if (shareStatusBadge) {
      if (isSharing) {
        shareStatusBadge.textContent = `공유 중 (${code})`;
        shareStatusBadge.className = 'badge-status-share is-connected';
      } else {
        shareStatusBadge.textContent = '개인 모드';
        shareStatusBadge.className = 'badge-status-share not-connected';
      }
    }

    if (shareActiveBanner) {
      if (isSharing) {
        shareActiveBanner.classList.remove('hidden');
        if (displayConnectedCode) displayConnectedCode.textContent = code;
      } else {
        shareActiveBanner.classList.add('hidden');
      }
    }

    if (btnCopyCode) {
      btnCopyCode.classList.toggle('hidden', !isSharing);
    }
    if (btnDisconnectShare) {
      btnDisconnectShare.classList.toggle('hidden', !isSharing);
    }
    if (familyShareCard) {
      familyShareCard.classList.toggle('active-sharing', isSharing);
    }

    if (firebaseStatusIndicator && typeof window.FirebaseSync !== 'undefined') {
      if (FirebaseSync.getSavedConfig()) {
        firebaseStatusIndicator.textContent = '커스텀 프로젝트';
        firebaseStatusIndicator.style.backgroundColor = '#dbeafe';
        firebaseStatusIndicator.style.color = '#1e40af';
      } else {
        firebaseStatusIndicator.textContent = '기본 연동';
        firebaseStatusIndicator.style.backgroundColor = '#f1f5f9';
        firebaseStatusIndicator.style.color = '#475569';
      }
    }
  }

  /**
   * "가족과 함께 보기" 클릭 시 초대 코드 연결 핸들러
   */
  async function handleConnectShare() {
    const code = inputInviteCode?.value.trim().toUpperCase();
    if (!code) {
      alert('초대 코드를 입력하거나 [🎲 새 공유 코드 발급] 버튼을 눌러주세요.');
      inputInviteCode?.focus();
      return;
    }

    const currentLocalData = {
      items: storage.getItems(),
      monthlyBudget: storage.getMonthlyBudget(),
      fridgeTheme: storage.getFridgeTheme()
    };

    if (btnFamilyShare) {
      btnFamilyShare.disabled = true;
      btnFamilyShare.innerHTML = '<span>연결 중...</span>';
    }

    try {
      const result = await FirebaseSync.connect(code, handleRemoteDataUpdate, currentLocalData);
      updateShareUI();
      updateView();
      if (result.success) {
        alert(`🎉 가족 공유 냉장고 [${code}]에 성공적으로 연결되었습니다!\n이제 가족의 다른 기기에서도 이 코드를 입력하면 동일한 냉장고를 함께 사용할 수 있습니다.`);
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
      alert('연결 중 오류가 발생했습니다: ' + err.message);
    } finally {
      if (btnFamilyShare) {
        btnFamilyShare.disabled = false;
        btnFamilyShare.innerHTML = '<span>가족과 함께 보기</span>';
      }
    }
  }

  /**
   * 초기 공유 방 복원
   */
  function initShareRoom() {
    if (typeof window.FirebaseSync === 'undefined') return;

    const savedCode = FirebaseSync.getActiveShareCode();
    if (savedCode) {
      if (inputInviteCode) inputInviteCode.value = savedCode;
      FirebaseSync.connect(savedCode, handleRemoteDataUpdate, {
        items: storage.getItems(),
        monthlyBudget: storage.getMonthlyBudget(),
        fridgeTheme: storage.getFridgeTheme()
      }).then(() => {
        updateShareUI();
      });
    } else {
      updateShareUI();
    }

    const savedFbConfig = FirebaseSync.getSavedConfig();
    if (savedFbConfig && inputFirebaseConfig) {
      inputFirebaseConfig.value = JSON.stringify(savedFbConfig, null, 2);
    }
  }

  // 가족 공유 이벤트 리스너 등록
  btnFamilyShare?.addEventListener('click', handleConnectShare);
  inputInviteCode?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConnectShare();
    }
  });

  btnGenerateCode?.addEventListener('click', () => {
    if (typeof window.FirebaseSync !== 'undefined') {
      const newCode = FirebaseSync.generateCode();
      if (inputInviteCode) {
        inputInviteCode.value = newCode;
        inputInviteCode.focus();
      }
    }
  });

  btnCopyCode?.addEventListener('click', async () => {
    if (typeof window.FirebaseSync === 'undefined') return;
    const code = FirebaseSync.getActiveShareCode();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      alert(`초대 코드 [${code}]가 클립보드에 복사되었습니다.\n가족에게 카카오톡이나 메시지로 전달해 주세요!`);
    } catch (err) {
      prompt('아래 초대 코드를 복사하세요:', code);
    }
  });

  btnDisconnectShare?.addEventListener('click', () => {
    if (confirm('가족 공유 냉장고 연결을 해제하고 개인 모드로 돌아가시겠습니까?')) {
      if (typeof window.FirebaseSync !== 'undefined') {
        FirebaseSync.disconnect();
      }
      if (inputInviteCode) inputInviteCode.value = '';
      updateShareUI();
      alert('개인 냉장고 모드로 복귀되었습니다.');
    }
  });

  btnSaveFirebaseConfig?.addEventListener('click', () => {
    if (!inputFirebaseConfig) return;
    const raw = inputFirebaseConfig.value.trim();
    if (!raw) {
      alert('Firebase Config JSON 문자열을 입력해 주세요.');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      FirebaseSync.saveCustomConfig(parsed);
      updateShareUI();
      alert('Firebase 커스텀 설정이 저장되었습니다!');
      if (FirebaseSync.isConnected()) {
        handleConnectShare();
      }
    } catch (e) {
      alert('올바른 JSON 형식이 아닙니다:\n' + e.message);
    }
  });

  btnResetFirebaseConfig?.addEventListener('click', () => {
    if (confirm('커스텀 Firebase 설정을 초기화하시겠습니까?')) {
      if (typeof window.FirebaseSync !== 'undefined') {
        FirebaseSync.saveCustomConfig(null);
      }
      if (inputFirebaseConfig) inputFirebaseConfig.value = '';
      updateShareUI();
      alert('기본 데모 설정으로 초기화되었습니다.');
    }
  });

  /**
   * API Key UI 동기화 (key.env 기본 OpenAI 키 우선 반영)
   */
  const syncApiKeyUI = () => {
    const hasDefaultKey = Boolean(typeof window !== 'undefined' && window.ENV_CONFIG?.OPENAI_API_KEY);
    const savedKey = LLMService.getApiKey();

    if (savedKey) {
      if (hasDefaultKey && savedKey === window.ENV_CONFIG.OPENAI_API_KEY) {
        inputApiKey.value = savedKey.substring(0, 8) + '••••••••••••' + savedKey.slice(-4);
        apiKeyStatusBadge.textContent = '🟢 OpenAI 기본 연동';
        apiKeyStatusBadge.className = 'badge-status-key is-set';
      } else {
        inputApiKey.value = savedKey;
        apiKeyStatusBadge.textContent = '설정됨';
        apiKeyStatusBadge.className = 'badge-status-key is-set';
      }
    } else {
      inputApiKey.value = '';
      apiKeyStatusBadge.textContent = '미등록';
      apiKeyStatusBadge.className = 'badge-status-key not-set';
    }
  };

  btnSaveKey.addEventListener('click', () => {
    const key = inputApiKey.value.trim();
    if (!key) {
      if (confirm('입력된 키가 없습니다. 저장된 API Key를 삭제하시겠습니까?')) {
        LLMService.saveApiKey('');
        syncApiKeyUI();
        alert('API Key가 제거되었습니다.');
      }
      return;
    }
    LLMService.saveApiKey(key);
    syncApiKeyUI();
    alert('API Key가 브라우저에 안전하게 저장되었습니다.');
  });

  /**
   * 필드 하이라이트 애니메이션
   */
  function highlightFields(fields) {
    fields.forEach((field) => {
      if (!field) return;
      field.classList.remove('field-highlight');
      void field.offsetWidth;
      field.classList.add('field-highlight');
    });
  }

  /**
   * AI 영수증/사진 자동 채우기
   */
  imageUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiKey = LLMService.getApiKey();
    if (!apiKey) {
      alert('LLM API Key가 설정되지 않았습니다.\n상단의 [⚙️ LLM Vision 설정]을 열어 API Key를 입력 후 저장해 주세요.');
      if (aiSettingsDetails) aiSettingsDetails.open = true;
      inputApiKey?.focus();
      imageUploadInput.value = '';
      return;
    }

    spinnerTitle.textContent = apiKey.startsWith('sk-')
      ? '🤖 OpenAI Vision(gpt-4o-mini)이 식재료를 정밀 분석하고 있습니다...'
      : '🤖 Gemini Vision AI가 식재료를 정밀 분석하고 있습니다...';
    spinnerSubtitle.textContent = '물품명, 카테고리, 용량, 유통기한 자동 추출 중';
    aiLoadingOverlay.classList.remove('hidden');
    aiFeedbackBanner.classList.add('hidden');

    try {
      const data = await LLMService.analyzeImage(file, apiKey);

      if (data.name) inputName.value = data.name;
      if (data.category) inputCategory.value = data.category;
      if (data.capacity) inputCapacity.value = data.capacity;
      if (data.price !== undefined && data.price > 0) inputPrice.value = data.price;

      if (data.storageType) {
        setFormStorageType(data.storageType);
      }

      if (data.purchaseDate && inputPurchaseDate) {
        inputPurchaseDate.value = data.purchaseDate;
      }

      if (data.expiryDate) {
        inputExpiry.value = data.expiryDate;
      }
      if (data.consumptionDate) {
        inputConsumption.value = data.consumptionDate;
      }

      // 기한이 없거나 일부만 있는 경우 자동 추천 엔진으로 보완 및 툴팁 갱신
      autoRecommendExpiryDate(false);

      highlightFields([inputName, inputCategory, inputCapacity, inputPrice, inputPurchaseDate, inputExpiry, inputConsumption]);
      aiFeedbackBanner.classList.remove('hidden');
      inputName.focus();
    } catch (err) {
      console.error(err);
      alert('이미지 분석 중 오류가 발생했습니다: ' + err.message);
    } finally {
      aiLoadingOverlay.classList.add('hidden');
      imageUploadInput.value = '';
    }
  });

  /**
   * 식재료 등록 폼 제출 핸들러
   */
  ingredientForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(ingredientForm);
    const name = formData.get('name')?.toString().trim();

    if (!name) {
      alert('물품명을 입력해 주세요.');
      inputName?.focus();
      return;
    }

    const priceVal = parseInt(inputPrice.value, 10);
    const validPrice = !isNaN(priceVal) && priceVal >= 0 ? priceVal : 0;
    const storageType = getSelectedStorageType();
    const category = formData.get('category')?.toString() || '기타';

    const todayStr = new Date().toISOString().split('T')[0];
    const portionUnit = typeof window.ExpiryHelper !== 'undefined' && ExpiryHelper.getRecommendedServingUnit
      ? ExpiryHelper.getRecommendedServingUnit(name, category)
      : '1회분 (적당량)';

    const purchaseDateVal = formData.get('purchaseDate')?.toString() || todayStr;
    const expiryDateVal = formData.get('expiryDate')?.toString() || '';
    const consumptionDateVal = formData.get('consumptionDate')?.toString() || '';

    // 날짜 순서 및 관계 검증: 구매일 ≤ 유통기한 ≤ 소비기한
    if (purchaseDateVal && expiryDateVal && purchaseDateVal > expiryDateVal) {
      alert(`유통기한은 구매일보다 이전일 수 없습니다.\n(구매일: ${purchaseDateVal}, 유통기한: ${expiryDateVal})\n날짜 순서를 확인해 주세요: 구매일 ≤ 유통기한 ≤ 소비기한`);
      inputExpiry?.focus();
      return;
    }

    if (expiryDateVal && consumptionDateVal && expiryDateVal > consumptionDateVal) {
      alert(`소비기한은 유통기한보다 이전일 수 없습니다.\n(유통기한: ${expiryDateVal}, 소비기한: ${consumptionDateVal})\n날짜 순서를 확인해 주세요: 구매일 ≤ 유통기한 ≤ 소비기한`);
      inputConsumption?.focus();
      return;
    }

    if (purchaseDateVal && consumptionDateVal && purchaseDateVal > consumptionDateVal) {
      alert(`소비기한은 구매일보다 이전일 수 없습니다.\n(구매일: ${purchaseDateVal}, 소비기한: ${consumptionDateVal})\n날짜 순서를 확인해 주세요: 구매일 ≤ 유통기한 ≤ 소비기한`);
      inputConsumption?.focus();
      return;
    }

    const initialStatus = 'UNOPENED';
    const initialProgress = 0;

    const newItem = {
      name,
      category: category,
      capacity: formData.get('capacity')?.toString().trim() || '',
      price: validPrice,
      storageType: storageType,
      expiryDate: expiryDateVal,
      consumptionDate: consumptionDateVal,
      portionUnit: portionUnit,
      consumptionProgress: initialProgress,
      status: initialStatus,
      purchaseDate: purchaseDateVal
    };

    // 저장소에 추가
    storage.addItem(newItem);
    syncToSharedFirestore('식재료 등록: ' + newItem.name);

    // 폼 초기화 및 기본값 복원
    ingredientForm.reset();
    inputPrice.value = '';
    inputExpiry.value = '';
    inputConsumption.value = '';
    if (inputPurchaseDate) inputPurchaseDate.value = todayStr;
    if (aiCategoryBadge) aiCategoryBadge.classList.add('hidden');
    setFormStorageType(activeCompartment === 'FREEZER' ? 'FREEZER' : 'FRIDGE');
    autoRecommendExpiryDate(true);
    syncDateConstraints();

    aiFeedbackBanner.classList.add('hidden');

    // 등록 성공 시 모달 닫기
    closeIngredientModal();

    // 사용자가 방금 등록한 식재료를 즉시 확인할 수 있도록 식재료 목록 펼침
    toggleListCollapsible(true);

    // 화면 갱신
    updateView();
  });

  /**
   * 상태(Status) 변경 이벤트 핸들러 (이벤트 위임)
   */
  inventoryListContainer.addEventListener('change', (event) => {
    const statusSelect = event.target.closest('.status-select');
    if (!statusSelect) return;

    const itemId = statusSelect.dataset.id;
    const newStatus = statusSelect.value;

    if (itemId && newStatus) {
      const newProgress = newStatus === 'COMPLETED' ? 100 : (newStatus === 'OPENED' ? 50 : 0);
      storage.updateItem(itemId, { status: newStatus, consumptionProgress: newProgress });
      syncToSharedFirestore('식재료 상태 변경');
      updateView();
    }
  });

  /**
   * 식재료 소진 버튼 및 삭제 버튼 이벤트 (이벤트 위임)
   */
  inventoryListContainer.addEventListener('click', (event) => {
    // 1. 1회분 소진 버튼 (+25% 또는 단계별 소진)
    const consumeStepBtn = event.target.closest('.btn-consume-step');
    if (consumeStepBtn && consumeStepBtn.dataset.id) {
      const amount = parseInt(consumeStepBtn.dataset.amount, 10) || 25;
      storage.consumeItem(consumeStepBtn.dataset.id, amount);
      syncToSharedFirestore('식재료 소진');
      updateView();
      return;
    }

    // 2. 전량 소진 완료 버튼 (100% 완료)
    const consumeAllBtn = event.target.closest('.btn-consume-all');
    if (consumeAllBtn && consumeAllBtn.dataset.id) {
      storage.consumeItem(consumeAllBtn.dataset.id, 100);
      syncToSharedFirestore('식재료 전량 소진');
      updateView();
      return;
    }

    // 3. 소진 복원/취소 버튼 (0% 미개봉으로 리셋)
    const consumeResetBtn = event.target.closest('.btn-consume-reset');
    if (consumeResetBtn && consumeResetBtn.dataset.id) {
      storage.resetConsumption(consumeResetBtn.dataset.id);
      syncToSharedFirestore('식재료 소진율 초기화');
      updateView();
      return;
    }

    // 4. 식재료 삭제 버튼
    const deleteBtn = event.target.closest('.btn-delete');
    if (deleteBtn && deleteBtn.dataset.id) {
      const itemId = deleteBtn.dataset.id;
      if (confirm('삭제하시겠습니까?')) {
        storage.deleteItem(itemId);
        syncToSharedFirestore('식재료 삭제');
        updateView();
      }
      return;
    }
  });

  // --------------------------------------------------------------------------
  // 아코디언 및 식재료 등록 모달 인터랙션 이벤트 리스너 등록
  // --------------------------------------------------------------------------

  // 1. 보관 식재료 목록 아코디언 펼치기/접기 버튼
  btnToggleList?.addEventListener('click', () => {
    toggleListCollapsible();
  });

  // 1-1. 식재료 목록 정렬 및 보기 필터 탭 (카테고리별 / 소비기한순 / 구매일순)
  listFilterBar?.addEventListener('click', (event) => {
    const filterBtn = event.target.closest('.list-filter-btn');
    if (filterBtn && filterBtn.dataset.filter) {
      currentListSort = filterBtn.dataset.filter;
      updateView();
    }
  });

  // 2. 식재료 소진율 현황 아코디언 펼치기/접기 버튼
  btnToggleDashboard?.addEventListener('click', () => {
    toggleDashboardCollapsible();
  });

  // 3. 순서 상의 '식재료 등록하기' 퀵 버튼 클릭 시 모달 열기
  btnOpenRegisterModal?.addEventListener('click', () => {
    openIngredientModal(activeCompartment === 'FREEZER' ? 'FREEZER' : 'FRIDGE');
  });

  // 4. 식재료 등록 모달 닫기 버튼
  btnCloseIngredientModal?.addEventListener('click', () => {
    closeIngredientModal();
  });

  // 5. 모달 바깥 배경 클릭 시 닫기
  ingredientModalContainer?.addEventListener('click', (event) => {
    if (event.target === ingredientModalContainer) {
      closeIngredientModal();
    }
  });

  // 6. ESC 키 입력 시 열려있는 모달 닫기
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (ingredientModalContainer && !ingredientModalContainer.classList.contains('hidden')) {
        closeIngredientModal();
      }
      if (recipeModalContainer && !recipeModalContainer.classList.contains('hidden')) {
        recipeModalContainer.classList.add('hidden');
      }
    }
  });

  // 초기 실행
  syncApiKeyUI();
  initShareRoom();
  autoRecommendExpiryDate(true);
  updateView();
});
