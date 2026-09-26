/* =========================================================
   Wallet
   script.js
========================================================= */


/* =========================================================
   基本設定
========================================================= */

const APP_START_DATE = new Date(2026, 8, 26);
const FIRST_WEEK_END = new Date(2026, 8, 28);

const DEFAULT_MONTHLY_BUDGET = 100000;
const DEFAULT_WEEKLY_BUDGET = 25000;
const DEFAULT_PAYDAY = 25;

const EXPENSE_STORAGE_KEY = "walletExpenses";
const PLAN_STORAGE_KEY = "walletPlans";
const SETTINGS_STORAGE_KEY = "walletSettings";
const DARK_MODE_KEY = "walletDarkMode";


/* =========================================================
   カテゴリ
========================================================= */

const categories = [
  {
    id: "food",
    name: "食事",
    icon: "🍚"
  },
  {
    id: "transport",
    name: "交通",
    icon: "🚃"
  },
  {
    id: "shopping",
    name: "買い物",
    icon: "🛍️"
  },
  {
    id: "entertainment",
    name: "娯楽",
    icon: "🎮"
  },
  {
    id: "living",
    name: "生活",
    icon: "🏠"
  },
  {
    id: "subscription",
    name: "サブスク",
    icon: "📱"
  },
  {
    id: "onebank",
    name: "OneBank",
    icon: "💳"
  },
  {
    id: "other",
    name: "その他",
    icon: "💰"
  }
];


/* =========================================================
   状態
========================================================= */

let expenses = [];
let plans = [];

let settings = {
  monthlyBudget: DEFAULT_MONTHLY_BUDGET,
  weeklyBudget: DEFAULT_WEEKLY_BUDGET,
  payday: DEFAULT_PAYDAY
};

let calendarDate = new Date();

let selectedMonthForDetail = null;


/* =========================================================
   DOMContentLoaded
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  loadData();

  migrateOldExpenses();

  renderCategorySelect();

  setupEvents();

  loadSettingsToInputs();

  applyDarkMode();

  updateAll();

  const receivedFromAppleWallet = receiveAppleWalletData();

  registerServiceWorker();

  /*
   * Apple Walletからデータを受け取った直後は、
   * Daily Promptを重ねて表示しない。
   */
  if (!receivedFromAppleWallet) {
    showDailyPrompt();
  }

});


/* =========================================================
   LocalStorage
========================================================= */

function loadData() {

  try {

    const savedExpenses =
      localStorage.getItem(EXPENSE_STORAGE_KEY);

    const savedPlans =
      localStorage.getItem(PLAN_STORAGE_KEY);

    const savedSettings =
      localStorage.getItem(SETTINGS_STORAGE_KEY);


    expenses = savedExpenses
      ? JSON.parse(savedExpenses)
      : [];

    plans = savedPlans
      ? JSON.parse(savedPlans)
      : [];


    if (savedSettings) {

      const parsedSettings =
        JSON.parse(savedSettings);

      settings = {
        ...settings,
        ...parsedSettings
      };

    }

  } catch (error) {

    console.error(
      "データ読み込みエラー:",
      error
    );

    expenses = [];
    plans = [];

  }

}


function saveExpenses() {

  localStorage.setItem(
    EXPENSE_STORAGE_KEY,
    JSON.stringify(expenses)
  );

}


function savePlans() {

  localStorage.setItem(
    PLAN_STORAGE_KEY,
    JSON.stringify(plans)
  );

}


function saveSettings() {

  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );

}


/* =========================================================
   Apple Wallet受信
========================================================= */

/*
 * 想定URL
 *
 * https://example.com/?amount=1280&merchant=スターバックス
 *
 * amount:
 *   金額
 *
 * merchant:
 *   店舗名
 *
 * iPhoneショートカットからURLを開くことで
 * この関数が自動的に読み取る。
 */

function receiveAppleWalletData() {

  try {

    const params =
      new URLSearchParams(window.location.search);

    const rawAmount =
      params.get("amount");

    const merchant =
      params.get("merchant");


    if (!rawAmount && !merchant) {
      return false;
    }


    let amount = 0;


    if (rawAmount) {

      const cleanedAmount =
        String(rawAmount)
          .replace(/[¥￥,\s]/g, "")
          .replace(/円/g, "");


      amount =
        Number(cleanedAmount);

    }


    const amountInput =
      document.getElementById("amount");

    const merchantInput =
      document.getElementById("merchant");


    if (
      amountInput &&
      Number.isFinite(amount) &&
      amount > 0
    ) {

      amountInput.value =
        Math.round(amount);

    }


    if (
      merchantInput &&
      merchant
    ) {

      merchantInput.value =
        merchant;

    }


    showAppleWalletNotice(
      amount,
      merchant
    );


    /*
     * URLから受信データを消す。
     *
     * 入力欄の値は残る。
     */
    if (
      window.history &&
      window.history.replaceState
    ) {

      const cleanUrl =
        window.location.origin +
        window.location.pathname;

      window.history.replaceState(
        {},
        document.title,
        cleanUrl
      );

    }


    return true;

  } catch (error) {

    console.error(
      "Apple Wallet受信エラー:",
      error
    );

    return false;

  }

}


function showAppleWalletNotice(
  amount,
  merchant
) {

  const amountText =
    amount > 0
      ? formatYen(amount)
      : "";

  const merchantText =
    merchant || "店舗名なし";


  /*
   * 既存の通知エリアがあれば使用。
   */
  let notice =
    document.getElementById(
      "appleWalletReceiveNotice"
    );


  /*
   * なければ支出カード内に作成。
   */
  if (!notice) {

    const expenseCard =
      document.querySelector(
        ".expense-card"
      );

    if (!expenseCard) {
      return;
    }


    notice =
      document.createElement("div");

    notice.id =
      "appleWalletReceiveNotice";

    notice.className =
      "wallet-receive-note";


    expenseCard.appendChild(
      notice
    );

  }


  notice.innerHTML =
    `Apple Walletから受信しました。<br>
     ${amountText ? `金額：${escapeHtml(amountText)}<br>` : ""}
     店舗：${escapeHtml(merchantText)}<br>
     カテゴリとメモを確認して登録してください。`;


  notice.classList.add("active");

}


/* =========================================================
   Utility
========================================================= */

function formatYen(value) {

  const number =
    Number(value) || 0;

  return "¥" +
    Math.round(number).toLocaleString(
      "ja-JP"
    );

}


function pad(value) {

  return String(value).padStart(
    2,
    "0"
  );

}


function dateKey(date) {

  const d =
    new Date(date);

  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate())
  ].join("-");

}


function parseDateKey(key) {

  const parts =
    String(key).split("-");

  if (parts.length !== 3) {
    return null;
  }


  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

}


function startOfDay(date) {

  const d =
    new Date(date);

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;

}


function endOfDay(date) {

  const d =
    new Date(date);

  d.setHours(
    23,
    59,
    59,
    999
  );

  return d;

}


function formatDate(date) {

  const d =
    new Date(date);

  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

}


function formatFullDate(date) {

  const d =
    new Date(date);

  const weekdays = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ];

  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;

}


function cloneDate(date) {

  return new Date(
    date.getTime()
  );

}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   古いデータの移行
========================================================= */

function migrateOldExpenses() {

  let changed = false;


  expenses =
    expenses.map(expense => {

      const next =
        { ...expense };


      /*
       * 以前 account="onebank" だったデータを
       * OneBankカテゴリへ移行。
       */
      if (
        !next.category &&
        next.account === "onebank"
      ) {

        next.category =
          "onebank";

        changed = true;

      }


      if (!next.category) {

        next.category =
          "other";

        changed = true;

      }


      if (!next.date) {

        next.date =
          dateKey(new Date());

        changed = true;

      }


      if (
        typeof next.amount !== "number"
      ) {

        next.amount =
          Number(next.amount) || 0;

        changed = true;

      }


      if (
        typeof next.merchant !== "string"
      ) {

        next.merchant = "";

      }


      if (
        typeof next.memo !== "string"
      ) {

        next.memo = "";

      }


      return next;

    });


  if (changed) {
    saveExpenses();
  }

}


/* =========================================================
   Events
========================================================= */

function setupEvents() {

  /*
   * メニュー
   */
  onClick(
    "menuBtn",
    () => showScreen("menuScreen")
  );


  onClick(
    "menuBackBtn",
    () => showScreen("mainScreen")
  );


  /*
   * 設定
   */
  onClick(
    "settingsBtn",
    () => showScreen("settingsScreen")
  );


  onClick(
    "menuSettingsBtn",
    () => showScreen("settingsScreen")
  );


  onClick(
    "settingsBackBtn",
    () => showScreen("menuScreen")
  );


  onClick(
    "saveSettingsBtn",
    saveSettingsFromInputs
  );


  /*
   * 月別
   */
  onClick(
    "menuMonthlyBtn",
    () => {
      renderMonthlyList();
      showScreen("monthlyScreen");
    }
  );


  onClick(
    "monthlyBackBtn",
    () => showScreen("menuScreen")
  );


  onClick(
    "monthDetailBackBtn",
    () => showScreen("monthlyScreen")
  );


  /*
   * 履歴
   */
  onClick(
    "historyBtn",
    () => {
      renderHistory();
      showScreen("historyScreen");
    }
  );


  onClick(
    "historyBackBtn",
    () => showScreen("mainScreen")
  );


  /*
   * カテゴリ
   */
  onClick(
    "categoryMoreBtn",
    () => {
      renderCategoryList();
      showScreen("categoryScreen");
    }
  );


  onClick(
    "menuCategoryBtn",
    () => {
      renderCategoryList();
      showScreen("categoryScreen");
    }
  );


  onClick(
    "categoryBackBtn",
    () => showScreen("menuScreen")
  );


  /*
   * カレンダー
   */
  onClick(
    "menuCalendarBtn",
    () => {
      renderCalendar();
      showScreen("calendarScreen");
    }
  );


  onClick(
    "calendarBackBtn",
    () => showScreen("mainScreen")
  );


  onClick(
    "prevMonthBtn",
    () => {
      calendarDate.setMonth(
        calendarDate.getMonth() - 1
      );

      renderCalendar();
    }
  );


  onClick(
    "nextMonthBtn",
    () => {
      calendarDate.setMonth(
        calendarDate.getMonth() + 1
      );

      renderCalendar();
    }
  );


  onClick(
    "addPlanBtn",
    openPlanModal
  );


  onClick(
    "savePlanBtn",
    savePlan
  );


  onClick(
    "cancelPlanBtn",
    closePlanModal
  );


  /*
   * 支出追加
   */
  onClick(
    "addExpenseBtn",
    addExpense
  );


  /*
   * AI
   */
  onClick(
    "menuAnalysisBtn",
    () => {
      renderAnalysis();
      showScreen("analysisScreen");
    }
  );


  onClick(
    "analysisBackBtn",
    () => showScreen("menuScreen")
  );


  onClick(
    "copyAiPromptBtn",
    copyAiPrompt
  );


  /*
   * Daily Prompt
   */
  onClick(
    "promptAddBtn",
    addPromptExpense
  );


  onClick(
    "promptNoExpenseBtn",
    closeDailyPrompt
  );


  onClick(
    "promptLaterBtn",
    closeDailyPrompt
  );


  /*
   * Dark mode
   */
  onClick(
    "darkModeMenuBtn",
    toggleDarkMode
  );


  /*
   * Bottom Navigation
   */
  document
    .querySelectorAll("[data-nav]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.nav;

          if (
            target === "calendarScreen"
          ) {

            renderCalendar();

          }

          if (
            target === "menuScreen"
          ) {

            showScreen("menuScreen");

            return;

          }

          showScreen(target);

        }
      );

    });


  onClick(
    "bottomAddBtn",
    () => {

      showScreen("mainScreen");

      setTimeout(() => {

        const input =
          document.getElementById(
            "amount"
          );

        if (input) {
          input.focus();
        }

      }, 100);

    }
  );


  /*
   * 画面復帰時
   */
  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {

        loadData();

        updateAll();

      }

    }
  );

}


/* =========================================================
   Helper Event
========================================================= */

function onClick(id, handler) {

  const element =
    document.getElementById(id);

  if (!element) {
    return;
  }

  element.addEventListener(
    "click",
    handler
  );

}


/* =========================================================
   Screen
========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const target =
    document.getElementById(screenId);


  if (!target) {
    return;
  }


  target.classList.add(
    "active"
  );


  window.scrollTo({
    top: 0,
    behavior: "instant"
  });


  /*
   * 必要な画面を表示する際に再描画。
   */
  if (
    screenId === "mainScreen"
  ) {

    updateAll();

  }

  if (
    screenId === "monthlyScreen"
  ) {

    renderMonthlyList();

  }

  if (
    screenId === "historyScreen"
  ) {

    renderHistory();

  }

  if (
    screenId === "categoryScreen"
  ) {

    renderCategoryList();

  }

  if (
    screenId === "analysisScreen"
  ) {

    renderAnalysis();

  }

  if (
    screenId === "calendarScreen"
  ) {

    renderCalendar();

  }

}


/* =========================================================
   Category Select
========================================================= */

function renderCategorySelect() {

  const select =
    document.getElementById(
      "category"
    );

  const promptSelect =
    document.getElementById(
      "promptCategory"
    );


  const options =
    categories
      .map(category => {

        return `
          <option value="${category.id}">
            ${category.icon} ${category.name}
          </option>
        `;

      })
      .join("");


  if (select) {
    select.innerHTML =
      options;
  }


  if (promptSelect) {
    promptSelect.innerHTML =
      options;
  }

}


/* =========================================================
   支出追加
========================================================= */

function addExpense() {

  const amountInput =
    document.getElementById(
      "amount"
    );

  const merchantInput =
    document.getElementById(
      "merchant"
    );

  const categoryInput =
    document.getElementById(
      "category"
    );

  const memoInput =
    document.getElementById(
      "memo"
    );


  const amount =
    Number(
      amountInput.value
    );


  const merchant =
    merchantInput.value.trim();


  const category =
    categoryInput.value;


  const memo =
    memoInput.value.trim();


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      "金額を入力してください。"
    );

    amountInput.focus();

    return;

  }


  const expense = {

    id:
      Date.now(),

    amount:
      Math.round(amount),

    merchant:
      merchant,

    category:
      category,

    memo:
      memo,

    date:
      dateKey(new Date())

  };


  expenses.push(expense);

  saveExpenses();


  /*
   * 入力欄をリセット
   */
  amountInput.value = "";

  merchantInput.value = "";

  memoInput.value = "";


  /*
   * Apple Wallet受信通知を消す
   */
  const notice =
    document.getElementById(
      "appleWalletReceiveNotice"
    );

  if (notice) {

    notice.classList.remove(
      "active"
    );

  }


  updateAll();


  alert(
    `${formatYen(amount)}を登録しました。`
  );

}


/* =========================================================
   Daily Prompt
========================================================= */

function addPromptExpense() {

  const amountInput =
    document.getElementById(
      "promptAmount"
    );

  const merchantInput =
    document.getElementById(
      "promptMerchant"
    );

  const categoryInput =
    document.getElementById(
      "promptCategory"
    );

  const memoInput =
    document.getElementById(
      "promptMemo"
    );


  const amount =
    Number(
      amountInput.value
    );


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      "金額を入力してください。"
    );

    amountInput.focus();

    return;

  }


  const expense = {

    id:
      Date.now(),

    amount:
      Math.round(amount),

    merchant:
      merchantInput.value.trim(),

    category:
      categoryInput.value,

    memo:
      memoInput.value.trim(),

    date:
      dateKey(new Date())

  };


  expenses.push(expense);

  saveExpenses();


  amountInput.value = "";

  merchantInput.value = "";

  memoInput.value = "";


  closeDailyPrompt();

  updateAll();

}


/* =========================================================
   Monthly / Weekly
========================================================= */

function getMonthRange(date) {

  const d =
    new Date(date);

  const start =
    new Date(
      d.getFullYear(),
      d.getMonth(),
      1
    );

  const end =
    new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0
    );


  return {
    start:
      startOfDay(start),

    end:
      endOfDay(end)
  };

}


function getWeekRange(date) {

  const d =
    startOfDay(date);

  const day =
    d.getDay();


  /*
   * JavaScript:
   * 日曜=0
   * 月曜=1
   */
  const diff =
    day === 0
      ? -6
      : 1 - day;


  const start =
    new Date(d);

  start.setDate(
    start.getDate() + diff
  );


  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 6
  );


  return {
    start:
      startOfDay(start),

    end:
      endOfDay(end)
  };

}


function getFirstAppWeekRange() {

  return {
    start:
      startOfDay(
        APP_START_DATE
      ),

    end:
      endOfDay(
        new Date(2026, 8, 27)
      )
  };

}


function getExpenseDate(expense) {

  return parseDateKey(
    expense.date
  );

}


function sumExpenses(
  start,
  end
) {

  const startTime =
    start.getTime();

  const endTime =
    end.getTime();


  return expenses.reduce(
    (total, expense) => {

      const date =
        getExpenseDate(expense);

      if (!date) {
        return total;
      }


      const time =
        date.getTime();


      if (
        time >= startTime &&
        time <= endTime
      ) {

        return total +
          (Number(expense.amount) || 0);

      }


      return total;

    },
    0
  );

}


/* =========================================================
   Weekly Carry
========================================================= */

function getWeekCarry(
  weekStart
) {

  const currentWeekStart =
    startOfDay(
      weekStart
    );


  /*
   * アプリ開始前は0。
   */
  if (
    currentWeekStart <
    startOfDay(APP_START_DATE)
  ) {

    return 0;

  }


  /*
   * 最初の週は繰越0。
   */
  if (
    dateKey(currentWeekStart) ===
    dateKey(APP_START_DATE)
  ) {

    return 0;

  }


  const previousWeekEnd =
    new Date(
      currentWeekStart
    );

  previousWeekEnd.setDate(
    previousWeekEnd.getDate() - 1
  );


  const previousWeekStart =
    new Date(
      currentWeekStart
    );

  previousWeekStart.setDate(
    previousWeekStart.getDate() - 7
  );


  /*
   * アプリ開始日以前を含む場合は、
   * アプリ開始日から計算。
   */
  const actualStart =
    previousWeekStart <
    startOfDay(APP_START_DATE)
      ? startOfDay(APP_START_DATE)
      : previousWeekStart;


  const used =
    sumExpenses(
      actualStart,
      endOfDay(previousWeekEnd)
    );


  const days =
    Math.round(
      (
        endOfDay(previousWeekEnd).getTime() -
        actualStart.getTime()
      ) /
      86400000
    ) + 1;


  /*
   * 通常週なら7日分。
   * 最初の部分週は実日数分を使う。
   */
  const budget =
    days >= 7
      ? settings.weeklyBudget
      : settings.weeklyBudget *
        (days / 7);


  return budget - used;

}


/* =========================================================
   Update All
========================================================= */

function updateAll() {

  renderHeaderDate();

  renderMonthlySummary();

  renderWeeklySummary();

  renderTodaySummary();

  renderCategories();

  renderRecentExpenses();

}


/* =========================================================
   Header
========================================================= */

function renderHeaderDate() {

  const element =
    document.getElementById(
      "headerDate"
    );


  if (!element) {
    return;
  }


  element.textContent =
    formatFullDate(
      new Date()
    );

}


/* =========================================================
   Monthly Summary
========================================================= */

function renderMonthlySummary() {

  const now =
    new Date();


  const range =
    getMonthRange(now);


  /*
   * アプリ開始日より前は計算しない。
   */
  const start =
    range.start <
    startOfDay(APP_START_DATE)
      ? startOfDay(APP_START_DATE)
      : range.start;


  const used =
    sumExpenses(
      start,
      range.end
    );


  const remaining =
    settings.monthlyBudget -
    used;


  const percentage =
    settings.monthlyBudget > 0
      ? (
          used /
          settings.monthlyBudget
        ) * 100
      : 0;


  setText(
    "monthlyRemaining",
    formatYen(remaining)
  );


  setText(
    "monthlyUsed",
    `使用額 ${formatYen(used)}`
  );


  setWidth(
    "monthlyProgress",
    Math.min(
      100,
      Math.max(0, percentage)
    )
  );


  let status = "";


  if (remaining < 0) {

    status =
      `予算を ${formatYen(Math.abs(remaining))} 超えています`;

  } else if (percentage >= 80) {

    status =
      "今月は少しペースを落としましょう";

  } else {

    status =
      "今のペースなら予算内です";

  }


  setText(
    "monthlyStatus",
    status
  );

}


/* =========================================================
   Weekly Summary
========================================================= */

function renderWeeklySummary() {

  const now =
    new Date();


  let range =
    getWeekRange(now);


  /*
   * アプリ開始日以前には戻さない。
   */
  if (
    range.start <
    startOfDay(APP_START_DATE)
  ) {

    range =
      getFirstAppWeekRange();

  }


  const used =
    sumExpenses(
      range.start,
      range.end
    );


  const carry =
    getWeekCarry(
      range.start
    );


  const available =
    settings.weeklyBudget +
    carry;


  const remaining =
    available -
    used;


  const percentage =
    available > 0
      ? (
          used /
          available
        ) * 100
      : 0;


  setText(
    "weeklyPeriod",
    `${formatDate(range.start)} ～ ${formatDate(range.end)}`
  );


  setText(
    "weeklyRemaining",
    formatYen(remaining)
  );


  setText(
    "weeklyUsed",
    formatYen(used)
  );


  setWidth(
    "weeklyProgress",
    Math.min(
      100,
      Math.max(0, percentage)
    )
  );


  const carryText =
    carry >= 0
      ? `+${formatYen(carry)}`
      : `-${formatYen(Math.abs(carry))}`;


  setText(
    "lastWeekBalance",
    carryText
  );

}


/* =========================================================
   Today
========================================================= */

function renderTodaySummary() {

  const now =
    new Date();


  const monthRange =
    getMonthRange(now);


  const used =
    sumExpenses(
      monthRange.start,
      monthRange.end
    );


  const remaining =
    Math.max(
      0,
      settings.monthlyBudget - used
    );


  const today =
    startOfDay(now);


  const monthEnd =
    endOfDay(
      monthRange.end
    );


  const remainingDays =
    Math.max(
      1,
      Math.floor(
        (
          monthEnd.getTime() -
          today.getTime()
        ) /
        86400000
      ) + 1
    );


  const todayAvailable =
    remaining /
    remainingDays;


  setText(
    "todayAvailable",
    formatYen(todayAvailable)
  );


  setText(
    "remainingDaysText",
    `残り${remainingDays}日`
  );


  setText(
    "paydayText",
    `給料日 ${settings.payday}日`
  );

}


/* =========================================================
   Categories
========================================================= */

function renderCategories() {

  const container =
    document.getElementById(
      "categoryGrid"
    );


  if (!container) {
    return;
  }


  const range =
    getMonthRange(
      new Date()
    );


  const monthlyUsed =
    sumExpenses(
      range.start,
      range.end
    );


  container.innerHTML =
    categories
      .map(category => {

        const amount =
          sumCategoryExpenses(
            category.id,
            range.start,
            range.end
          );


        const percent =
          settings.monthlyBudget > 0
            ? (
                amount /
                settings.monthlyBudget
              ) * 100
            : 0;


        return `
          <div class="category-item">

            <div
              class="category-circle"
              style="--percent:${Math.min(100, percent)}%"
            >

              <div class="category-circle-inner">
                ${Math.round(percent)}%
              </div>

            </div>

            <div class="category-icon">
              ${category.icon}
            </div>

            <div class="category-name">
              ${escapeHtml(category.name)}
            </div>

            <div class="category-amount">
              ${formatYen(amount)}
            </div>

          </div>
        `;

      })
      .join("");

}


function sumCategoryExpenses(
  categoryId,
  start,
  end
) {

  return expenses.reduce(
    (total, expense) => {

      if (
        expense.category !==
        categoryId
      ) {

        return total;

      }


      const date =
        getExpenseDate(expense);


      if (!date) {
        return total;
      }


      if (
        date >= start &&
        date <= end
      ) {

        return total +
          (Number(expense.amount) || 0);

      }


      return total;

    },
    0
  );

}


/* =========================================================
   Recent Expenses
========================================================= */

function renderRecentExpenses() {

  const container =
    document.getElementById(
      "recentExpenseList"
    );


  if (!container) {
    return;
  }


  const sorted =
    [...expenses]
      .sort(
        (a, b) =>
          getExpenseDate(b) -
          getExpenseDate(a)
      )
      .slice(0, 5);


  if (!sorted.length) {

    container.innerHTML =
      `<div class="empty-state">
        まだ支出がありません。
      </div>`;

    return;

  }


  container.innerHTML =
    sorted
      .map(
        expense =>
          expenseHtml(
            expense,
            false
          )
      )
      .join("");

}


/* =========================================================
   Expense HTML
========================================================= */

function expenseHtml(
  expense,
  showDelete = true
) {

  const category =
    categories.find(
      item =>
        item.id ===
        expense.category
    ) || categories[
      categories.length - 1
    ];


  const title =
    expense.merchant ||
    expense.memo ||
    category.name;


  const metaParts = [];


  metaParts.push(
    formatDate(
      getExpenseDate(expense)
    )
  );


  if (
    expense.merchant &&
    expense.memo
  ) {

    metaParts.push(
      expense.memo
    );

  } else if (
    expense.memo
  ) {

    metaParts.push(
      expense.memo
    );

  }


  const deleteButton =
    showDelete
      ? `
        <button
          class="delete-btn"
          onclick="deleteExpense(${expense.id})"
        >
          削除
        </button>
      `
      : "";


  return `
    <div class="expense-row">

      <div class="expense-icon">
        ${category.icon}
      </div>

      <div class="expense-main">

        <div class="expense-title">
          ${escapeHtml(title)}
        </div>

        <div class="expense-meta">
          ${escapeHtml(category.name)}
          ・
          ${escapeHtml(metaParts.join(" ・ "))}
        </div>

      </div>

      <div class="expense-amount">
        ${formatYen(expense.amount)}
      </div>

      ${deleteButton}

    </div>
  `;

}


/* =========================================================
   Delete Expense
========================================================= */

function deleteExpense(id) {

  const target =
    expenses.find(
      expense =>
        expense.id === id
    );


  if (!target) {
    return;
  }


  const confirmed =
    confirm(
      `${formatYen(target.amount)}の支出を削除しますか？`
    );


  if (!confirmed) {
    return;
  }


  expenses =
    expenses.filter(
      expense =>
        expense.id !== id
    );


  saveExpenses();

  updateAll();

  renderHistory();

  renderCategoryList();

}


/* =========================================================
   History
========================================================= */

function renderHistory() {

  const container =
    document.getElementById(
      "expenseList"
    );


  if (!container) {
    return;
  }


  const sorted =
    [...expenses]
      .sort(
        (a, b) =>
          getExpenseDate(b) -
          getExpenseDate(a)
      );


  if (!sorted.length) {

    container.innerHTML =
      `<div class="empty-state">
        支出履歴はありません。
      </div>`;

    return;

  }


  container.innerHTML =
    sorted
      .map(
        expense =>
          expenseHtml(
            expense,
            true
          )
      )
      .join("");

}


/* =========================================================
   Monthly List
========================================================= */

function renderMonthlyList() {

  const container =
    document.getElementById(
      "monthlyList"
    );


  if (!container) {
    return;
  }


  const months = [];


  let current =
    new Date(
      APP_START_DATE.getFullYear(),
      APP_START_DATE.getMonth(),
      1
    );


  const today =
    new Date();


  while (
    current <=
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  ) {

    months.push(
      new Date(current)
    );

    current.setMonth(
      current.getMonth() + 1
    );

  }


  container.innerHTML =
    months
      .reverse()
      .map(month => {

        const range =
          getMonthRange(
            month
          );


        const actualStart =
          range.start <
          startOfDay(APP_START_DATE)
            ? startOfDay(APP_START_DATE)
            : range.start;


        const used =
          sumExpenses(
            actualStart,
            range.end
          );


        const percent =
          settings.monthlyBudget > 0
            ? (
                used /
                settings.monthlyBudget
              ) * 100
            : 0;


        const monthName =
          `${month.getFullYear()}年${month.getMonth() + 1}月`;


        return `
          <button
            class="month-card"
            style="
              width:100%;
              text-align:left;
              color:inherit;
              border:0;
            "
            onclick="openMonthDetail(
              ${month.getFullYear()},
              ${month.getMonth()}
            )"
          >

            <div class="month-card-header">

              <strong>
                ${monthName}
              </strong>

              <span class="month-total">
                ${formatYen(used)}
              </span>

            </div>

            <small>
              予算 ${formatYen(settings.monthlyBudget)}
            </small>

            <div class="month-bar">
              <div
                style="
                  width:${Math.min(100, percent)}%;
                "
              ></div>
            </div>

          </button>
        `;

      })
      .join("");

}


/* =========================================================
   Month Detail
========================================================= */

function openMonthDetail(
  year,
  month
) {

  selectedMonthForDetail = {
    year,
    month
  };


  renderMonthDetail();

  showScreen(
    "monthDetailScreen"
  );

}


function renderMonthDetail() {

  if (
    !selectedMonthForDetail
  ) {
    return;
  }


  const {
    year,
    month
  } =
    selectedMonthForDetail;


  const date =
    new Date(
      year,
      month,
      1
    );


  const range =
    getMonthRange(date);


  const actualStart =
    range.start <
    startOfDay(APP_START_DATE)
      ? startOfDay(APP_START_DATE)
      : range.start;


  const monthExpenses =
    expenses
      .filter(expense => {

        const d =
          getExpenseDate(
            expense
          );

        return (
          d &&
          d >= actualStart &&
          d <= range.end
        );

      })
      .sort(
        (a, b) =>
          getExpenseDate(b) -
          getExpenseDate(a)
      );


  const used =
    monthExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );


  setText(
    "monthDetailTitle",
    `${year}年${month + 1}月`
  );


  const container =
    document.getElementById(
      "monthDetailContent"
    );


  if (!container) {
    return;
  }


  const summary = `
    <div class="section-card">

      <div class="small-label">
        月間支出
      </div>

      <div class="big-number">
        ${formatYen(used)}
      </div>

      <div class="small-label">
        予算 ${formatYen(settings.monthlyBudget)}
      </div>

    </div>
  `;


  const list =
    monthExpenses.length
      ? `
        <div class="expense-list">
          ${monthExpenses
            .map(
              expense =>
                expenseHtml(
                  expense,
                  true
                )
            )
            .join("")}
        </div>
      `
      : `
        <div class="empty-state">
          この月の支出はありません。
        </div>
      `;


  container.innerHTML =
    summary + list;

}


/* =========================================================
   Category List
========================================================= */

function renderCategoryList() {

  const container =
    document.getElementById(
      "categoryList"
    );


  if (!container) {
    return;
  }


  const range =
    getMonthRange(
      new Date()
    );


  container.innerHTML =
    categories
      .map(category => {

        const amount =
          sumCategoryExpenses(
            category.id,
            range.start,
            range.end
          );


        const percent =
          settings.monthlyBudget > 0
            ? (
                amount /
                settings.monthlyBudget
              ) * 100
            : 0;


        return `
          <div class="section-card">

            <div class="month-card-header">

              <div>

                <strong>
                  ${category.icon}
                  ${escapeHtml(category.name)}
                </strong>

                <div class="small-label">
                  月間予算に対する割合
                </div>

              </div>

              <strong>
                ${formatYen(amount)}
              </strong>

            </div>

            <div class="month-bar">
              <div
                style="
                  width:${Math.min(100, percent)}%;
                "
              ></div>
            </div>

            <div
              class="small-label"
              style="margin-top:7px;"
            >
              ${Math.round(percent)}%
            </div>

          </div>
        `;

      })
      .join("");

}


/* =========================================================
   Analysis
========================================================= */

function renderAnalysis() {

  const container =
    document.getElementById(
      "analysisContent"
    );


  if (!container) {
    return;
  }


  const range =
    getMonthRange(
      new Date()
    );


  const used =
    sumExpenses(
      range.start,
      range.end
    );


  const remaining =
    settings.monthlyBudget -
    used;


  const categoryStats =
    categories
      .map(category => {

        return {
          ...category,

          amount:
            sumCategoryExpenses(
              category.id,
              range.start,
              range.end
            )

        };

      })
      .sort(
        (a, b) =>
          b.amount -
          a.amount
      );


  const max =
    Math.max(
      ...categoryStats.map(
        item => item.amount
      ),
      1
    );


  const categoryGraph =
    categoryStats
      .map(item => {

        return `
          <div class="graph-row">

            <span>
              ${item.icon}
              ${escapeHtml(item.name)}
            </span>

            <div class="graph-track">
              <div
                class="graph-fill"
                style="
                  width:${
                    (item.amount / max) * 100
                  }%;
                "
              ></div>
            </div>

            <span>
              ${formatYen(item.amount)}
            </span>

          </div>
        `;

      })
      .join("");


  container.innerHTML = `

    <div class="analysis-section">

      <div class="analysis-title">
        今月の状況
      </div>

      <div class="analysis-stat">
        <span>予算</span>
        <strong>
          ${formatYen(settings.monthlyBudget)}
        </strong>
      </div>

      <div class="analysis-stat">
        <span>使用額</span>
        <strong>
          ${formatYen(used)}
        </strong>
      </div>

      <div class="analysis-stat">
        <span>残り</span>
        <strong>
          ${formatYen(remaining)}
        </strong>
      </div>

    </div>


    <div class="analysis-section">

      <div class="analysis-title">
        カテゴリ別
      </div>

      ${categoryGraph}

    </div>

  `;

}


function createAiPrompt() {

  const range =
    getMonthRange(
      new Date()
    );


  const used =
    sumExpenses(
      range.start,
      range.end
    );


  const remaining =
    settings.monthlyBudget -
    used;


  const categoryData =
    categories
      .map(category => {

        const amount =
          sumCategoryExpenses(
            category.id,
            range.start,
            range.end
          );


        return `${category.name}: ${amount}円`;

      })
      .join("\n");


  const recent =
    [...expenses]
      .sort(
        (a, b) =>
          getExpenseDate(b) -
          getExpenseDate(a)
      )
      .slice(0, 20)
      .map(expense => {

        const category =
          categories.find(
            c =>
              c.id ===
              expense.category
          );


        return [
          formatDate(
            getExpenseDate(expense)
          ),

          category
            ? category.name
            : "その他",

          expense.merchant || "",

          expense.memo || "",

          `${expense.amount}円`

        ].join(" / ");

      })
      .join("\n");


  return `
あなたは家計管理アシスタントです。

以下の家計データを分析してください。

【月間予算】
${settings.monthlyBudget}円

【今月の使用額】
${used}円

【今月残り】
${remaining}円

【カテゴリ別】
${categoryData}

【最近の支出】
${recent || "なし"}

以下を日本語で整理してください。

1. 今月の支出状況
2. 支出が多いカテゴリ
3. 特に大きな支出
4. 予算に対して今のペースがどうか
5. 来月以降に見直せそうなポイント
6. 無理のない節約方法

事実と推測を分けて説明してください。
`;

}


async function copyAiPrompt() {

  const prompt =
    createAiPrompt();


  try {

    await navigator.clipboard.writeText(
      prompt
    );


    alert(
      "AI分析用プロンプトをコピーしました。"
    );

  } catch (error) {

    console.error(
      "コピーエラー:",
      error
    );


    alert(
      "コピーできませんでした。"
    );

  }

}


/* =========================================================
   Calendar
========================================================= */

function renderCalendar() {

  const title =
    document.getElementById(
      "calendarMonthTitle"
    );


  const grid =
    document.getElementById(
      "calendarGrid"
    );


  if (!title || !grid) {
    return;
  }


  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();


  title.textContent =
    `${year}年${month + 1}月`;


  const firstDay =
    new Date(
      year,
      month,
      1
    );


  const lastDay =
    new Date(
      year,
      month + 1,
      0
    );


  /*
   * 月曜始まりに変換
   */
  const firstWeekday =
    firstDay.getDay() === 0
      ? 6
      : firstDay.getDay() - 1;


  const daysInMonth =
    lastDay.getDate();


  const cells = [];


  /*
   * 前月空白
   */
  for (
    let i = 0;
    i < firstWeekday;
    i++
  ) {

    cells.push(
      `<div class="calendar-day disabled"></div>`
    );

  }


  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const current =
      new Date(
        year,
        month,
        day
      );


    const key =
      dateKey(current);


    const dayExpenses =
      expenses.filter(
        expense =>
          expense.date === key
      );


    const spending =
      dayExpenses.reduce(
        (sum, expense) =>
          sum +
          Number(expense.amount || 0),
        0
      );


    const dayPlans =
      plans.filter(
        plan =>
          plan.date === key
      );


    const isToday =
      key ===
      dateKey(new Date());


    const spendingHtml =
      spending > 0
        ? `
          <div class="calendar-spending">
            ${formatYen(spending)}
          </div>
        `
        : "";


    const planHtml =
      dayPlans.length
        ? `
          <div class="calendar-plan">
            📌 ${escapeHtml(dayPlans[0].title)}
          </div>
        `
        : "";


    cells.push(`
      <button
        class="calendar-day ${isToday ? "today" : ""}"
        onclick="selectCalendarDay('${key}')"
      >

        <div class="calendar-date">
          ${day}
        </div>

        ${spendingHtml}

        ${planHtml}

      </button>
    `);

  }


  grid.innerHTML =
    cells.join("");


  /*
   * 初期表示
   */
  if (
    !document.querySelector(
      "#calendarDayDetail .day-detail-card"
    )
  ) {

    selectCalendarDay(
      dateKey(new Date())
    );

  }

}


function selectCalendarDay(
  key
) {

  const container =
    document.getElementById(
      "calendarDayDetail"
    );


  if (!container) {
    return;
  }


  const date =
    parseDateKey(key);


  if (!date) {
    return;
  }


  const dayExpenses =
    expenses.filter(
      expense =>
        expense.date === key
    );


  const dayPlans =
    plans.filter(
      plan =>
        plan.date === key
    );


  const total =
    dayExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );


  const expenseHtmlText =
    dayExpenses.length
      ? `
        <div class="expense-list">
          ${dayExpenses
            .map(
              expense =>
                expenseHtml(
                  expense,
                  true
                )
            )
            .join("")}
        </div>
      `
      : `
        <div class="empty-state">
          支出なし
        </div>
      `;


  const plansHtml =
    dayPlans.length
      ? dayPlans
          .map(
            plan => `
              <div
                style="
                  padding:10px 0;
                  border-bottom:1px solid var(--border);
                "
              >

                📌
                ${escapeHtml(plan.title)}

                ${
                  plan.time
                    ? `・${escapeHtml(plan.time)}`
                    : ""
                }

                <button
                  class="delete-btn"
                  onclick="deletePlan(${plan.id})"
                >
                  削除
                </button>

              </div>
            `
          )
          .join("")
      : `
          <div class="empty-state">
            予定なし
          </div>
        `;


  container.innerHTML = `

    <div class="day-detail-card">

      <h3>
        ${formatFullDate(date)}
      </h3>

      <div class="small-label">
        支出合計
      </div>

      <div class="big-number">
        ${formatYen(total)}
      </div>


      <div class="section-heading">
        <h2>
          支出
        </h2>
      </div>

      ${expenseHtmlText}


      <div class="section-heading">
        <h2>
          予定
        </h2>
      </div>

      ${plansHtml}

    </div>

  `;

}


/* =========================================================
   Plans
========================================================= */

function openPlanModal() {

  const modal =
    document.getElementById(
      "planModal"
    );


  const dateInput =
    document.getElementById(
      "planDate"
    );


  if (dateInput) {

    dateInput.value =
      dateKey(calendarDate);

  }


  if (modal) {

    modal.classList.remove(
      "hidden"
    );

  }

}


function closePlanModal() {

  const modal =
    document.getElementById(
      "planModal"
    );


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

}


function savePlan() {

  const date =
    document.getElementById(
      "planDate"
    ).value;


  const title =
    document.getElementById(
      "planTitle"
    ).value.trim();


  const time =
    document.getElementById(
      "planTime"
    ).value;


  if (!date || !title) {

    alert(
      "日付と予定を入力してください。"
    );

    return;

  }


  plans.push({

    id:
      Date.now(),

    date:
      date,

    title:
      title,

    time:
      time

  });


  savePlans();


  document.getElementById(
    "planTitle"
  ).value = "";


  document.getElementById(
    "planTime"
  ).value = "";


  closePlanModal();

  renderCalendar();

  selectCalendarDay(date);

}


function deletePlan(id) {

  plans =
    plans.filter(
      plan =>
        plan.id !== id
    );


  savePlans();

  renderCalendar();

}


/* =========================================================
   Settings
========================================================= */

function loadSettingsToInputs() {

  const monthly =
    document.getElementById(
      "monthlyBudgetInput"
    );


  const weekly =
    document.getElementById(
      "weeklyBudgetInput"
    );


  const payday =
    document.getElementById(
      "paydayInput"
    );


  if (monthly) {

    monthly.value =
      settings.monthlyBudget;

  }


  if (weekly) {

    weekly.value =
      settings.weeklyBudget;

  }


  if (payday) {

    payday.value =
      settings.payday;

  }

}


function saveSettingsFromInputs() {

  const monthly =
    Number(
      document.getElementById(
        "monthlyBudgetInput"
      ).value
    );


  const weekly =
    Number(
      document.getElementById(
        "weeklyBudgetInput"
      ).value
    );


  const payday =
    Number(
      document.getElementById(
        "paydayInput"
      ).value
    );


  if (
    !Number.isFinite(monthly) ||
    monthly < 0
  ) {

    alert(
      "月間予算を正しく入力してください。"
    );

    return;

  }


  if (
    !Number.isFinite(weekly) ||
    weekly < 0
  ) {

    alert(
      "週間予算を正しく入力してください。"
    );

    return;

  }


  if (
    !Number.isInteger(payday) ||
    payday < 1 ||
    payday > 31
  ) {

    alert(
      "給料日は1～31で入力してください。"
    );

    return;

  }


  settings = {

    monthlyBudget:
      Math.round(monthly),

    weeklyBudget:
      Math.round(weekly),

    payday:
      payday

  };


  saveSettings();

  updateAll();

  alert(
    "設定を保存しました。"
  );

}


/* =========================================================
   Daily Prompt
========================================================= */

function showDailyPrompt() {

  const today =
    dateKey(
      new Date()
    );


  /*
   * 今日すでに支出がある場合は表示しない。
   */
  const hasTodayExpense =
    expenses.some(
      expense =>
        expense.date === today
    );


  if (hasTodayExpense) {
    return;
  }


  /*
   * 一度閉じた日のPromptは、
   * その日の間は再表示しない。
   */
  const skippedKey =
    `walletPromptSkipped_${today}`;


  if (
    localStorage.getItem(
      skippedKey
    ) === "1"
  ) {

    return;

  }


  const modal =
    document.getElementById(
      "dailyPromptModal"
    );


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "hidden"
  );

}


function closeDailyPrompt() {

  const modal =
    document.getElementById(
      "dailyPromptModal"
    );


  const today =
    dateKey(
      new Date()
    );


  localStorage.setItem(
    `walletPromptSkipped_${today}`,
    "1"
  );


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   Dark Mode
========================================================= */

function applyDarkMode() {

  const enabled =
    localStorage.getItem(
      DARK_MODE_KEY
    ) === "1";


  document.body.classList.toggle(
    "dark",
    enabled
  );


  updateDarkModeText(
    enabled
  );

}


function toggleDarkMode() {

  const enabled =
    !document.body.classList.contains(
      "dark"
    );


  document.body.classList.toggle(
    "dark",
    enabled
  );


  localStorage.setItem(
    DARK_MODE_KEY,
    enabled ? "1" : "0"
  );


  updateDarkModeText(
    enabled
  );

}


function updateDarkModeText(
  enabled
) {

  const element =
    document.getElementById(
      "darkModeStatus"
    );


  if (!element) {
    return;
  }


  element.textContent =
    enabled
      ? "ON"
      : "OFF";

}


/* =========================================================
   DOM Helpers
========================================================= */

function setText(
  id,
  text
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      text;

  }

}


function setWidth(
  id,
  percent
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.style.width =
      `${percent}%`;

  }

}


/* =========================================================
   Service Worker
========================================================= */

function registerServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {

    return;

  }


  /*
   * service-worker.js が存在する環境のみ登録。
   */
  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "service-worker.js"
        )
        .then(
          registration => {

            console.log(
              "Service Worker registered:",
              registration.scope
            );

          }
        )
        .catch(
          error => {

            console.log(
              "Service Worker registration skipped:",
              error
            );

          }
        );

    }
  );

}