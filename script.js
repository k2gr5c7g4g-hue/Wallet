/* =========================================================
   Wallet
   IndexedDB Version
========================================================= */


/* =========================================================
   IndexedDB
========================================================= */

const DB_NAME = "WalletDB";
const DB_VERSION = 1;

const EXPENSE_STORE = "expenses";
const PLAN_STORE = "plans";
const SETTINGS_STORE = "settings";
const META_STORE = "meta";

let dbPromise = null;


/* =========================================================
   IndexedDBを開く
========================================================= */

function openDatabase() {

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {

      const db = event.target.result;

      if (!db.objectStoreNames.contains(EXPENSE_STORE)) {
        db.createObjectStore(EXPENSE_STORE, {
          keyPath: "id"
        });
      }

      if (!db.objectStoreNames.contains(PLAN_STORE)) {
        db.createObjectStore(PLAN_STORE, {
          keyPath: "id"
        });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, {
          keyPath: "key"
        });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, {
          keyPath: "key"
        });
      }

    };

    request.onsuccess = function () {

      const db = request.result;

      db.onversionchange = function () {
        db.close();
      };

      resolve(db);

    };

    request.onerror = function () {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

  });

  return dbPromise;
}


/* =========================================================
   IndexedDB 共通処理
========================================================= */

async function idbGetAll(storeName) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const store = transaction.objectStore(storeName);

    const request = store.getAll();

    request.onsuccess = function () {
      resolve(request.result || []);
    };

    request.onerror = function () {
      reject(request.error);
    };

  });
}


async function idbGet(storeName, key) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const store = transaction.objectStore(storeName);

    const request = store.get(key);

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };

  });
}


async function idbPut(storeName, value) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(storeName);

    store.put(value);

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };

  });
}


async function idbDelete(storeName, key) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(storeName);

    store.delete(key);

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };

  });
}


async function idbClear(storeName) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(storeName);

    store.clear();

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };

  });
}


/* =========================================================
   データ
========================================================= */

let expenses = [];
let plans = [];

let settings = {
  monthlyBudget: 100000,
  weeklyBudget: 25000,
  payday: 25
};

let calendarDate = new Date();


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
   基準日
========================================================= */

const APP_START_DATE = "2026-09-26";


/* =========================================================
   IndexedDB 保存
========================================================= */

async function saveExpenses() {

  await idbClear(EXPENSE_STORE);

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      EXPENSE_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(EXPENSE_STORE);

    expenses.forEach(expense => {
      store.put(expense);
    });

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };

  });

}


async function savePlans() {

  await idbClear(PLAN_STORE);

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      PLAN_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(PLAN_STORE);

    plans.forEach(plan => {
      store.put(plan);
    });

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };

  });

}


async function saveSettings() {

  await idbPut(SETTINGS_STORE, {
    key: "settings",
    value: settings
  });

}


/* =========================================================
   データ読み込み
========================================================= */

async function loadData() {

  try {

    const [
      savedExpenses,
      savedPlans,
      savedSettings
    ] = await Promise.all([

      idbGetAll(EXPENSE_STORE),

      idbGetAll(PLAN_STORE),

      idbGet(
        SETTINGS_STORE,
        "settings"
      )

    ]);


    expenses = Array.isArray(savedExpenses)
      ? savedExpenses
      : [];


    plans = Array.isArray(savedPlans)
      ? savedPlans
      : [];


    if (
      savedSettings &&
      savedSettings.value
    ) {

      settings = {
        ...settings,
        ...savedSettings.value
      };

    }

  } catch (error) {

    console.error(
      "データ読み込みエラー:",
      error
    );

  }

}


/* =========================================================
   古いデータの補正
========================================================= */

async function migrateOldExpenses() {

  let changed = false;

  expenses = expenses.map(expense => {

    const newExpense = {
      ...expense
    };


    if (!newExpense.id) {

      newExpense.id =
        Date.now() +
        Math.random();

      changed = true;

    }


    if (!newExpense.amount) {

      newExpense.amount = 0;

      changed = true;

    }


    if (!newExpense.category) {

      newExpense.category = "other";

      changed = true;

    }


    if (
      newExpense.category === "onebank" ||
      newExpense.account === "onebank"
    ) {

      newExpense.category = "onebank";

      changed = true;

    }


    if (!newExpense.merchant) {

      newExpense.merchant = "";

      changed = true;

    }


    if (!newExpense.memo) {

      newExpense.memo = "";

      changed = true;

    }


    if (!newExpense.date) {

      newExpense.date =
        new Date().toISOString();

      changed = true;

    }


    return newExpense;

  });


  if (changed) {
    await saveExpenses();
  }

}


/* =========================================================
   共通
========================================================= */

function formatYen(amount) {

  return "¥" +
    Number(amount || 0).toLocaleString("ja-JP");

}


function parseDate(dateValue) {

  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;

}


function formatDate(dateValue) {

  const date = parseDate(dateValue);

  if (!date) {
    return "-";
  }

  return date.toLocaleDateString(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }
  );

}


function formatDateShort(dateValue) {

  const date = parseDate(dateValue);

  if (!date) {
    return "-";
  }

  return (
    (date.getMonth() + 1) +
    "/" +
    date.getDate()
  );

}


function dateKey(date) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function getCategory(categoryId) {

  return categories.find(
    category =>
      category.id === categoryId
  ) || categories[categories.length - 1];

}


function getCategoryName(categoryId) {

  const category =
    getCategory(categoryId);

  return (
    category.icon +
    " " +
    category.name
  );

}


/* =========================================================
   日付範囲
========================================================= */

function startOfDay(date) {

  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;

}


function endOfDay(date) {

  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;

}


function getMonthStart(year, month) {

  return new Date(
    year,
    month,
    1,
    0,
    0,
    0,
    0
  );

}


function getMonthEnd(year, month) {

  return new Date(
    year,
    month + 1,
    0,
    23,
    59,
    59,
    999
  );

}


function isDateInRange(
  dateValue,
  start,
  end
) {

  const date =
    parseDate(dateValue);

  if (!date) {
    return false;
  }

  return (
    date >= start &&
    date <= end
  );

}


/* =========================================================
   支出取得
========================================================= */

function getExpensesInRange(
  start,
  end
) {

  return expenses.filter(
    expense =>
      isDateInRange(
        expense.date,
        start,
        end
      )
  );

}


function getTotalInRange(
  start,
  end
) {

  return getExpensesInRange(
    start,
    end
  ).reduce(
    (total, expense) =>
      total +
      Number(expense.amount || 0),
    0
  );

}


/* =========================================================
   月間期間
========================================================= */

function getCurrentMonthRange() {

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    today.getMonth();


  /*
    アプリ開始月だけ
    9/26〜9/30
  */

  if (
    year === 2026 &&
    month === 8
  ) {

    return {
      start: new Date(
        2026,
        8,
        26,
        0,
        0,
        0,
        0
      ),

      end: new Date(
        2026,
        9,
        0,
        23,
        59,
        59,
        999
      )
    };

  }


  return {
    start: getMonthStart(
      year,
      month
    ),

    end: getMonthEnd(
      year,
      month
    )
  };

}


/* =========================================================
   週の取得
========================================================= */

function getMonday(date) {

  const result =
    startOfDay(date);

  const day =
    result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + diff
  );

  return result;

}


function getWeekRange(date) {

  const monday =
    getMonday(date);

  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  sunday.setHours(
    23,
    59,
    59,
    999
  );

  return {
    start: monday,
    end: sunday
  };

}


/* =========================================================
   前週繰越
========================================================= */

function getPreviousWeekBalance(
  currentWeekStart
) {

  const previousMonday =
    new Date(
      currentWeekStart
    );

  previousMonday.setDate(
    previousMonday.getDate() - 7
  );

  const previousSunday =
    new Date(
      currentWeekStart
    );

  previousSunday.setDate(
    previousSunday.getDate() - 1
  );

  previousSunday.setHours(
    23,
    59,
    59,
    999
  );


  /*
    アプリ開始日前の週は
    繰越計算対象外
  */

  const appStart =
    new Date(
      APP_START_DATE + "T00:00:00"
    );

  if (
    previousSunday < appStart
  ) {
    return 0;
  }


  const used =
    getTotalInRange(
      previousMonday,
      previousSunday
    );


  return settings.weeklyBudget - used;

}


/* =========================================================
   ヘッダー
========================================================= */

function updateHeader() {

  const element =
    document.getElementById(
      "headerDate"
    );

  if (!element) {
    return;
  }

  const today =
    new Date();

  element.textContent =
    today.toLocaleDateString(
      "ja-JP",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short"
      }
    );

}


/* =========================================================
   月間表示
========================================================= */

function updateMonthly() {

  const range =
    getCurrentMonthRange();

  const used =
    getTotalInRange(
      range.start,
      range.end
    );

  const remaining =
    settings.monthlyBudget -
    used;


  const remainingElement =
    document.getElementById(
      "monthlyRemaining"
    );

  const usedElement =
    document.getElementById(
      "monthlyUsed"
    );

  const progressElement =
    document.getElementById(
      "monthlyProgress"
    );

  const statusElement =
    document.getElementById(
      "monthlyStatus"
    );


  if (remainingElement) {

    remainingElement.textContent =
      formatYen(remaining);

  }


  if (usedElement) {

    usedElement.textContent =
      "使用額 " +
      formatYen(used);

  }


  const percentage =
    settings.monthlyBudget > 0
      ? (
        used /
        settings.monthlyBudget
      ) * 100
      : 0;


  if (progressElement) {

    progressElement.style.width =
      Math.min(
        Math.max(
          percentage,
          0
        ),
        100
      ) + "%";

  }


  if (statusElement) {

    if (remaining < 0) {

      statusElement.textContent =
        "予算を " +
        formatYen(
          Math.abs(remaining)
        ) +
        " 超えています";

    } else {

      statusElement.textContent =
        "予算の " +
        percentage.toFixed(0) +
        "% を使用";

    }

  }

}


/* =========================================================
   今日の目安
========================================================= */

function updateToday() {

  const today =
    new Date();

  const range =
    getCurrentMonthRange();

  const used =
    getTotalInRange(
      range.start,
      range.end
    );


  const endOfMonth =
    range.end;

  const todayStart =
    startOfDay(today);


  let remainingDays =
    Math.floor(
      (
        endOfMonth -
        todayStart
      ) /
      86400000
    ) + 1;


  if (remainingDays < 1) {
    remainingDays = 1;
  }


  const remaining =
    settings.monthlyBudget -
    used;


  const todayAvailable =
    remaining /
    remainingDays;


  const availableElement =
    document.getElementById(
      "todayAvailable"
    );

  const remainingDaysElement =
    document.getElementById(
      "remainingDaysText"
    );

  const paydayElement =
    document.getElementById(
      "paydayText"
    );


  if (availableElement) {

    availableElement.textContent =
      formatYen(
        Math.max(
          todayAvailable,
          0
        )
      );

  }


  if (remainingDaysElement) {

    remainingDaysElement.textContent =
      "残り" +
      remainingDays +
      "日";

  }


  if (paydayElement) {

    paydayElement.textContent =
      "給料日 " +
      (
        settings.payday || "-"
      ) +
      "日";

  }

}


/* =========================================================
   週間予算
========================================================= */

function updateWeekly() {

  const today =
    new Date();

  const range =
    getWeekRange(today);


  /*
    初週だけ9/26から
  */

  const appStart =
    new Date(
      APP_START_DATE +
      "T00:00:00"
    );


  if (
    range.start < appStart &&
    today >= appStart
  ) {

    range.start =
      appStart;

  }


  const used =
    getTotalInRange(
      range.start,
      range.end
    );


  const carry =
    getPreviousWeekBalance(
      getMonday(today)
    );


  const available =
    settings.weeklyBudget +
    carry -
    used;


  const periodElement =
    document.getElementById(
      "weeklyPeriod"
    );

  const remainingElement =
    document.getElementById(
      "weeklyRemaining"
    );

  const usedElement =
    document.getElementById(
      "weeklyUsed"
    );

  const progressElement =
    document.getElementById(
      "weeklyProgress"
    );

  const carryElement =
    document.getElementById(
      "lastWeekBalance"
    );


  if (periodElement) {

    periodElement.textContent =
      formatDateShort(
        range.start
      ) +
      "〜" +
      formatDateShort(
        range.end
      );

  }


  if (remainingElement) {

    remainingElement.textContent =
      formatYen(available);

  }


  if (usedElement) {

    usedElement.textContent =
      formatYen(used);

  }


  if (carryElement) {

    if (carry > 0) {

      carryElement.textContent =
        "+" +
        formatYen(carry);

    } else {

      carryElement.textContent =
        formatYen(carry);

    }

  }


  const totalWeeklyBudget =
    settings.weeklyBudget +
    carry;


  const percentage =
    totalWeeklyBudget > 0
      ? (
        used /
        totalWeeklyBudget
      ) * 100
      : 0;


  if (progressElement) {

    progressElement.style.width =
      Math.min(
        Math.max(
          percentage,
          0
        ),
        100
      ) + "%";

  }

}


/* =========================================================
   カテゴリ選択肢
========================================================= */

function renderCategorySelect() {

  const selects = [

    document.getElementById(
      "category"
    ),

    document.getElementById(
      "promptCategory"
    )

  ];


  selects.forEach(select => {

    if (!select) {
      return;
    }

    select.innerHTML = "";

    categories.forEach(category => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        category.id;

      option.textContent =
        category.icon +
        " " +
        category.name;

      select.appendChild(
        option
      );

    });

  });

}


/* =========================================================
   カテゴリ表示
========================================================= */

function updateCategoryGrid() {

  const grid =
    document.getElementById(
      "categoryGrid"
    );

  if (!grid) {
    return;
  }


  const range =
    getCurrentMonthRange();


  const used =
    getTotalInRange(
      range.start,
      range.end
    );


  grid.innerHTML = "";


  categories.forEach(category => {

    const amount =
      getExpensesInRange(
        range.start,
        range.end
      )
      .filter(
        expense =>
          expense.category ===
          category.id
      )
      .reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );


    const percentage =
      settings.monthlyBudget > 0
        ? (
          amount /
          settings.monthlyBudget
        ) * 100
        : 0;


    const card =
      document.createElement(
        "div"
      );

    card.className =
      "category-card";


    card.innerHTML = `

      <div class="category-icon">
        ${category.icon}
      </div>

      <div class="category-name">
        ${category.name}
      </div>

      <div class="category-amount">
        ${formatYen(amount)}
      </div>

      <div class="category-percent">
        ${percentage.toFixed(0)}%
      </div>

    `;


    grid.appendChild(card);

  });

}


/* =========================================================
   最近の支出
========================================================= */

function updateRecentExpenses() {

  const list =
    document.getElementById(
      "recentExpenseList"
    );

  if (!list) {
    return;
  }


  const sorted =
    [...expenses]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 5);


  list.innerHTML = "";


  if (sorted.length === 0) {

    list.innerHTML =
      `<div class="empty-state">
        まだ支出がありません。
      </div>`;

    return;

  }


  sorted.forEach(
    expense =>
      list.appendChild(
        createExpenseElement(
          expense,
          false
        )
      )
  );

}


/* =========================================================
   支出要素
========================================================= */

function createExpenseElement(
  expense,
  showDelete
) {

  const item =
    document.createElement(
      "div"
    );

  item.className =
    "expense-item";


  const merchant =
    expense.merchant ||
    "店舗未入力";


  const category =
    getCategory(
      expense.category
    );


  item.innerHTML = `

    <div class="expense-main">

      <div class="expense-title">
        ${escapeHtml(merchant)}
      </div>

      <div class="expense-meta">
        ${category.icon}
        ${category.name}
        ・
        ${formatDateShort(expense.date)}

        ${
          expense.memo
            ? " ・ " +
              escapeHtml(
                expense.memo
              )
            : ""
        }
      </div>

    </div>

    <div class="expense-right">

      <strong>
        ${formatYen(expense.amount)}
      </strong>

      ${
        showDelete
          ? `
            <button
              class="delete-expense-btn"
              data-id="${expense.id}"
            >
              削除
            </button>
          `
          : ""
      }

    </div>

  `;


  if (showDelete) {

    const button =
      item.querySelector(
        ".delete-expense-btn"
      );

    button.addEventListener(
      "click",
      async function () {

        const confirmed =
          confirm(
            "この支出を削除しますか？"
          );

        if (!confirmed) {
          return;
        }

        await deleteExpense(
          expense.id
        );

      }
    );

  }


  return item;

}


/* =========================================================
   HTMLエスケープ
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   支出追加
========================================================= */

async function addExpense() {

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


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      "金額を入力してください。"
    );

    return;

  }


  const expense = {

    id:
      Date.now() +
      Math.random(),

    amount,

    merchant:
      merchantInput.value.trim(),

    category:
      categoryInput.value ||
      "other",

    memo:
      memoInput.value.trim(),

    date:
      new Date().toISOString()

  };


  expenses.push(
    expense
  );


  await saveExpenses();


  amountInput.value = "";
  merchantInput.value = "";
  memoInput.value = "";


  updateAll();


  alert(
    "支出を登録しました。"
  );

}


/* =========================================================
   支出削除
========================================================= */

async function deleteExpense(
  id
) {

  expenses =
    expenses.filter(
      expense =>
        expense.id !== id
    );


  await idbDelete(
    EXPENSE_STORE,
    id
  );


  updateAll();
  updateHistory();
  updateMonthlyList();
  updateCalendar();

}


/* =========================================================
   履歴
========================================================= */

function updateHistory() {

  const list =
    document.getElementById(
      "expenseList"
    );

  if (!list) {
    return;
  }


  const sorted =
    [...expenses]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );


  list.innerHTML = "";


  if (sorted.length === 0) {

    list.innerHTML =
      `<div class="empty-state">
        支出履歴はありません。
      </div>`;

    return;

  }


  sorted.forEach(expense => {

    list.appendChild(
      createExpenseElement(
        expense,
        true
      )
    );

  });

}


/* =========================================================
   月別集計
========================================================= */

function updateMonthlyList() {

  const container =
    document.getElementById(
      "monthlyList"
    );

  if (!container) {
    return;
  }


  const grouped = {};


  expenses.forEach(expense => {

    const date =
      parseDate(
        expense.date
      );

    if (!date) {
      return;
    }


    const key =
      date.getFullYear() +
      "-" +
      String(
        date.getMonth() + 1
      ).padStart(2, "0");


    if (!grouped[key]) {

      grouped[key] = {
        year:
          date.getFullYear(),

        month:
          date.getMonth(),

        amount: 0,

        count: 0
      };

    }


    grouped[key].amount +=
      Number(
        expense.amount || 0
      );

    grouped[key].count++;

  });


  const months =
    Object.values(grouped)
      .sort(
        (a, b) => {

          if (a.year !== b.year) {
            return b.year - a.year;
          }

          return b.month - a.month;

        }
      );


  container.innerHTML = "";


  if (months.length === 0) {

    container.innerHTML =
      `<div class="empty-state">
        月別データはありません。
      </div>`;

    return;

  }


  months.forEach(month => {

    const card =
      document.createElement(
        "button"
      );

    card.className =
      "section-card";


    card.innerHTML = `

      <div class="section-title">
        ${month.year}年
        ${month.month + 1}月
      </div>

      <div class="section-subtitle">
        ${month.count}件
      </div>

      <div class="big-number">
        ${formatYen(month.amount)}
      </div>

    `;


    card.addEventListener(
      "click",
      function () {

        showMonthDetail(
          month.year,
          month.month
        );

      }
    );


    container.appendChild(
      card
    );

  });

}


/* =========================================================
   月詳細
========================================================= */

function showMonthDetail(
  year,
  month
) {

  const screen =
    document.getElementById(
      "monthDetailScreen"
    );

  const title =
    document.getElementById(
      "monthDetailTitle"
    );

  const content =
    document.getElementById(
      "monthDetailContent"
    );


  if (!screen || !title || !content) {
    return;
  }


  const start =
    getMonthStart(
      year,
      month
    );

  const end =
    getMonthEnd(
      year,
      month
    );


  const monthExpenses =
    getExpensesInRange(
      start,
      end
    )
    .sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


  const total =
    monthExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );


  title.textContent =
    `${year}年${month + 1}月`;


  content.innerHTML = `

    <div class="section-card">

      <div class="small-label">
        合計支出
      </div>

      <div class="big-number">
        ${formatYen(total)}
      </div>

      <div class="section-subtitle">
        ${monthExpenses.length}件
      </div>

    </div>

  `;


  const list =
    document.createElement(
      "div"
    );

  list.className =
    "expense-list";


  monthExpenses.forEach(expense => {

    list.appendChild(
      createExpenseElement(
        expense,
        false
      )
    );

  });


  content.appendChild(
    list
  );


  showScreen(
    "monthDetailScreen"
  );

}


/* =========================================================
   カテゴリ画面
========================================================= */

function updateCategoryList() {

  const container =
    document.getElementById(
      "categoryList"
    );

  if (!container) {
    return;
  }


  const range =
    getCurrentMonthRange();


  const monthExpenses =
    getExpensesInRange(
      range.start,
      range.end
    );


  container.innerHTML = "";


  categories.forEach(category => {

    const amount =
      monthExpenses
        .filter(
          expense =>
            expense.category ===
            category.id
        )
        .reduce(
          (total, expense) =>
            total +
            Number(
              expense.amount || 0
            ),
          0
        );


    const count =
      monthExpenses
        .filter(
          expense =>
            expense.category ===
            category.id
        ).length;


    const percentage =
      settings.monthlyBudget > 0
        ? (
          amount /
          settings.monthlyBudget
        ) * 100
        : 0;


    const card =
      document.createElement(
        "div"
      );

    card.className =
      "section-card";


    card.innerHTML = `

      <div class="section-title">
        ${category.icon}
        ${category.name}
      </div>

      <div class="big-number">
        ${formatYen(amount)}
      </div>

      <div class="section-subtitle">
        ${count}件 ・ 月間予算の
        ${percentage.toFixed(1)}%
      </div>

      <div class="progress-track">

        <div
          class="progress-bar"
          style="width:${Math.min(
            percentage,
            100
          )}%"
        ></div>

      </div>

    `;


    container.appendChild(
      card
    );

  });

}


/* =========================================================
   カレンダー
========================================================= */

function updateCalendar() {

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


  grid.innerHTML = "";


  const firstDay =
    new Date(
      year,
      month,
      1
    );


  /*
    月曜始まり
    JavaScriptの日曜=0を
    月曜=0に変換
  */

  const firstDayIndex =
    (
      firstDay.getDay() +
      6
    ) % 7;


  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  for (
    let i = 0;
    i < firstDayIndex;
    i++
  ) {

    const blank =
      document.createElement(
        "div"
      );

    blank.className =
      "calendar-day empty";

    grid.appendChild(
      blank
    );

  }


  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const cell =
      document.createElement(
        "button"
      );

    cell.className =
      "calendar-day";


    const date =
      new Date(
        year,
        month,
        day
      );


    const key =
      dateKey(date);


    const dayExpenses =
      expenses.filter(
        expense => {

          const expenseDate =
            parseDate(
              expense.date
            );

          return (
            expenseDate &&
            dateKey(
              expenseDate
            ) === key
          );

        }
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
          Number(
            expense.amount || 0
          ),
        0
      );


    const todayKey =
      dateKey(
        new Date()
      );


    if (key === todayKey) {

      cell.classList.add(
        "today"
      );

    }


    cell.innerHTML = `

      <div class="calendar-date">
        ${day}
      </div>

      ${
        total > 0
          ? `
            <div class="calendar-expense">
              ${formatYen(total)}
            </div>
          `
          : ""
      }

      ${
        dayPlans.length > 0
          ? `
            <div class="calendar-plan">
              📌 ${dayPlans.length}
            </div>
          `
          : ""
      }

    `;


    cell.addEventListener(
      "click",
      function () {

        showCalendarDayDetail(
          date
        );

      }
    );


    grid.appendChild(
      cell
    );

  }

}


/* =========================================================
   カレンダーの日詳細
========================================================= */

function showCalendarDayDetail(
  date
) {

  const container =
    document.getElementById(
      "calendarDayDetail"
    );

  if (!container) {
    return;
  }


  const key =
    dateKey(date);


  const dayExpenses =
    expenses.filter(
      expense => {

        const expenseDate =
          parseDate(
            expense.date
          );

        return (
          expenseDate &&
          dateKey(
            expenseDate
          ) === key
        );

      }
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
        Number(
          expense.amount || 0
        ),
      0
    );


  container.innerHTML = `

    <div class="section-card">

      <div class="section-title">
        ${formatDate(key)}
      </div>

      <div class="section-subtitle">
        支出
      </div>

      <div class="big-number">
        ${formatYen(total)}
      </div>

    </div>

  `;


  if (dayExpenses.length > 0) {

    dayExpenses.forEach(
      expense => {

        container.appendChild(
          createExpenseElement(
            expense,
            true
          )
        );

      }
    );

  } else {

    const noExpense =
      document.createElement(
        "div"
      );

    noExpense.className =
      "empty-state";

    noExpense.textContent =
      "この日の支出はありません。";

    container.appendChild(
      noExpense
    );

  }


  const planTitle =
    document.createElement(
      "h3"
    );

  planTitle.textContent =
    "予定";


  container.appendChild(
    planTitle
  );


  if (dayPlans.length === 0) {

    const noPlan =
      document.createElement(
        "div"
      );

    noPlan.className =
      "empty-state";

    noPlan.textContent =
      "予定はありません。";

    container.appendChild(
      noPlan
    );

  } else {

    dayPlans.forEach(
      plan => {

        const planElement =
          document.createElement(
            "div"
          );

        planElement.className =
          "section-card";


        planElement.innerHTML = `

          <div class="section-title">
            📌
            ${escapeHtml(
              plan.title
            )}
          </div>

          ${
            plan.time
              ? `
                <div class="section-subtitle">
                  ${escapeHtml(
                    plan.time
                  )}
                </div>
              `
              : ""
          }

          <button
            class="secondary-btn delete-plan-btn"
          >
            予定を削除
          </button>

        `;


        const deleteButton =
          planElement.querySelector(
            ".delete-plan-btn"
          );


        deleteButton.addEventListener(
          "click",
          async function () {

            const confirmed =
              confirm(
                "この予定を削除しますか？"
              );

            if (!confirmed) {
              return;
            }


            await deletePlan(
              plan.id
            );


            showCalendarDayDetail(
              date
            );

          }
        );


        container.appendChild(
          planElement
        );

      }
    );

  }

}


/* =========================================================
   前月・次月
========================================================= */

function moveCalendarMonth(
  offset
) {

  calendarDate.setMonth(
    calendarDate.getMonth() +
    offset
  );

  updateCalendar();

}


/* =========================================================
   予定モーダル
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


  if (!modal) {
    return;
  }


  if (
    dateInput &&
    !dateInput.value
  ) {

    dateInput.value =
      dateKey(
        new Date()
      );

  }


  modal.classList.remove(
    "hidden"
  );

}


function closePlanModal() {

  const modal =
    document.getElementById(
      "planModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.add(
    "hidden"
  );

}


async function savePlan() {

  const dateInput =
    document.getElementById(
      "planDate"
    );

  const titleInput =
    document.getElementById(
      "planTitle"
    );

  const timeInput =
    document.getElementById(
      "planTime"
    );


  const date =
    dateInput.value;

  const title =
    titleInput.value.trim();

  const time =
    timeInput.value;


  if (!date) {

    alert(
      "日付を入力してください。"
    );

    return;

  }


  if (!title) {

    alert(
      "予定を入力してください。"
    );

    return;

  }


  const plan = {

    id:
      Date.now() +
      Math.random(),

    date,

    title,

    time

  };


  plans.push(
    plan
  );


  await savePlans();


  titleInput.value = "";
  timeInput.value = "";


  closePlanModal();


  updateCalendar();


  alert(
    "予定を保存しました。"
  );

}


/* =========================================================
   予定削除
========================================================= */

async function deletePlan(
  id
) {

  plans =
    plans.filter(
      plan =>
        plan.id !== id
    );


  await idbDelete(
    PLAN_STORE,
    id
  );


  updateCalendar();

}


/* =========================================================
   設定
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


async function saveSettingsFromInputs() {

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


  const monthlyBudget =
    Number(
      monthly.value
    );


  const weeklyBudget =
    Number(
      weekly.value
    );


  const paydayValue =
    Number(
      payday.value
    );


  if (
    !Number.isFinite(
      monthlyBudget
    ) ||
    monthlyBudget < 0
  ) {

    alert(
      "月間予算を正しく入力してください。"
    );

    return;

  }


  if (
    !Number.isFinite(
      weeklyBudget
    ) ||
    weeklyBudget < 0
  ) {

    alert(
      "週間予算を正しく入力してください。"
    );

    return;

  }


  if (
    !Number.isFinite(
      paydayValue
    ) ||
    paydayValue < 1 ||
    paydayValue > 31
  ) {

    alert(
      "給料日を1〜31で入力してください。"
    );

    return;

  }


  settings = {

    monthlyBudget,

    weeklyBudget,

    payday:
      paydayValue

  };


  await saveSettings();


  updateAll();


  alert(
    "設定を保存しました。"
  );

}


/* =========================================================
   Apple Wallet受信
========================================================= */

function receiveAppleWalletData() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const amountParam =
    params.get(
      "amount"
    );


  const merchantParam =
    params.get(
      "merchant"
    );


  if (
    !amountParam &&
    !merchantParam
  ) {

    return false;

  }


  const amountInput =
    document.getElementById(
      "amount"
    );

  const merchantInput =
    document.getElementById(
      "merchant"
    );


  if (amountParam) {

    const cleanAmount =
      amountParam
        .replace(
          /[¥￥,\s円]/g,
          ""
        );


    const amount =
      Number(
        cleanAmount
      );


    if (
      Number.isFinite(amount)
    ) {

      amountInput.value =
        amount;

    }

  }


  if (merchantParam) {

    merchantInput.value =
      merchantParam;

  }


  const notice =
    document.createElement(
      "div"
    );

  notice.className =
    "wallet-received-notice";


  notice.textContent =
    "Apple Walletから取引情報を受信しました。";


  const expenseCard =
    document.querySelector(
      ".expense-card"
    );


  if (expenseCard) {

    expenseCard.prepend(
      notice
    );

  }


  /*
    URLからパラメータを消す
  */

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );


  return true;

}


/* =========================================================
   Daily Prompt
========================================================= */

async function getMeta(
  key
) {

  return await idbGet(
    META_STORE,
    key
  );

}


async function setMeta(
  key,
  value
) {

  await idbPut(
    META_STORE,
    {
      key,
      value
    }
  );

}


async function showDailyPrompt() {

  const todayKey =
    dateKey(
      new Date()
    );


  const metaKey =
    "promptSkipped_" +
    todayKey;


  const skipped =
    await getMeta(
      metaKey
    );


  if (
    skipped &&
    skipped.value
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


async function closeDailyPrompt(
  markSkipped = false
) {

  const modal =
    document.getElementById(
      "dailyPromptModal"
    );


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }


  if (markSkipped) {

    const todayKey =
      dateKey(
        new Date()
      );


    await setMeta(
      "promptSkipped_" +
      todayKey,
      true
    );

  }

}


async function addPromptExpense() {

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

    return;

  }


  const expense = {

    id:
      Date.now() +
      Math.random(),

    amount,

    merchant:
      merchantInput.value.trim(),

    category:
      categoryInput.value ||
      "other",

    memo:
      memoInput.value.trim(),

    date:
      new Date().toISOString()

  };


  expenses.push(
    expense
  );


  await saveExpenses();


  amountInput.value = "";
  merchantInput.value = "";
  memoInput.value = "";


  await closeDailyPrompt(
    true
  );


  updateAll();

}


/* =========================================================
   ダークモード
========================================================= */

async function applyDarkMode() {

  const meta =
    await getMeta(
      "darkMode"
    );


  const enabled =
    Boolean(
      meta &&
      meta.value
    );


  document.body.classList.toggle(
    "dark-mode",
    enabled
  );


  const status =
    document.getElementById(
      "darkModeStatus"
    );


  if (status) {

    status.textContent =
      enabled
        ? "ON"
        : "OFF";

  }

}


async function toggleDarkMode() {

  const meta =
    await getMeta(
      "darkMode"
    );


  const current =
    Boolean(
      meta &&
      meta.value
    );


  const next =
    !current;


  await setMeta(
    "darkMode",
    next
  );


  await applyDarkMode();

}


/* =========================================================
   AI分析
========================================================= */

function generateAiAnalysis() {

  const container =
    document.getElementById(
      "analysisContent"
    );

  if (!container) {
    return;
  }


  const range =
    getCurrentMonthRange();


  const monthExpenses =
    getExpensesInRange(
      range.start,
      range.end
    );


  const total =
    monthExpenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );


  const categoryTotals = {};


  categories.forEach(
    category => {

      categoryTotals[
        category.id
      ] = 0;

    }
  );


  monthExpenses.forEach(
    expense => {

      if (
        categoryTotals[
          expense.category
        ] === undefined
      ) {

        categoryTotals[
          expense.category
        ] = 0;

      }


      categoryTotals[
        expense.category
      ] += Number(
        expense.amount || 0
      );

    }
  );


  const sortedCategories =
    categories
      .map(category => ({
        ...category,

        amount:
          categoryTotals[
            category.id
          ] || 0
      }))
      .sort(
        (a, b) =>
          b.amount -
          a.amount
      );


  const topCategories =
    sortedCategories
      .filter(
        category =>
          category.amount > 0
      )
      .slice(0, 5);


  container.innerHTML = `

    <div class="section-card">

      <div class="section-title">
        今月の支出
      </div>

      <div class="big-number">
        ${formatYen(total)}
      </div>

      <div class="section-subtitle">
        月間予算
        ${formatYen(
          settings.monthlyBudget
        )}
      </div>

    </div>


    <div class="section-card">

      <div class="section-title">
        カテゴリ別
      </div>

      ${
        topCategories.length > 0

          ? topCategories.map(
              category => `

                <div class="carry-row">

                  <span>
                    ${category.icon}
                    ${category.name}
                  </span>

                  <strong>
                    ${formatYen(
                      category.amount
                    )}
                  </strong>

                </div>

              `
            ).join("")

          : `
            <div class="empty-state">
              まだ支出がありません。
            </div>
          `
      }

    </div>


    <div class="info-card">

      AI分析では、現在の支出データを
      ChatGPTなどに渡して分析できます。

      <br><br>

      「AI分析用プロンプトをコピー」
      を押して、コピーした内容を
      AIへ貼り付けてください。

    </div>

  `;

}


/* =========================================================
   AIプロンプト
========================================================= */

function generateAiPrompt() {

  const range =
    getCurrentMonthRange();


  const monthExpenses =
    getExpensesInRange(
      range.start,
      range.end
    )
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );


  const categoryTotals = {};


  categories.forEach(
    category => {

      categoryTotals[
        category.id
      ] = 0;

    }
  );


  monthExpenses.forEach(
    expense => {

      if (
        categoryTotals[
          expense.category
        ] === undefined
      ) {

        categoryTotals[
          expense.category
        ] = 0;

      }


      categoryTotals[
        expense.category
      ] += Number(
        expense.amount || 0
      );

    }
  );


  const expenseText =
    monthExpenses.length > 0

      ? monthExpenses
          .map(
            expense => {

              const category =
                getCategory(
                  expense.category
                );


              return [
                formatDate(
                  expense.date
                ),

                expense.merchant ||
                "店舗未入力",

                category.name,

                formatYen(
                  expense.amount
                ),

                expense.memo ||
                ""
              ].join(" / ");

            }
          )
          .join("\n")

      : "支出なし";


  const categoryText =
    categories
      .map(
        category => {

          return (
            category.name +
            ": " +
            formatYen(
              categoryTotals[
                category.id
              ] || 0
            )
          );

        }
      )
      .join("\n");


  return `あなたは家計管理アシスタントです。

以下の支出データを分析してください。

【月間予算】
${formatYen(
  settings.monthlyBudget
)}

【今月の支出】
${formatYen(
  monthExpenses.reduce(
    (sum, expense) =>
      sum +
      Number(
        expense.amount || 0
      ),
    0
  )
)}

【カテゴリ別支出】
${categoryText}

【支出明細】
${expenseText}

以下の内容を日本語で分析してください。

1. 今月の支出状況
2. 支出が多いカテゴリ
3. 特に金額が大きい支出
4. 改善できそうなポイント
5. 今後の予算管理について
6. 来月に向けた具体的なアドバイス

ただし、支出データから分からないことは推測せず、
「分からない」と明記してください。`;

}


async function copyAiPrompt() {

  const prompt =
    generateAiPrompt();


  try {

    await navigator.clipboard.writeText(
      prompt
    );


    alert(
      "AI分析用プロンプトをコピーしました。"
    );

  } catch (error) {

    /*
      clipboard APIが使えない場合
    */

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      prompt;

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    document.execCommand(
      "copy"
    );

    textarea.remove();


    alert(
      "AI分析用プロンプトをコピーしました。"
    );

  }

}


/* =========================================================
   画面切り替え
========================================================= */

function showScreen(
  screenId
) {

  const screens =
    document.querySelectorAll(
      ".screen"
    );


  screens.forEach(screen => {

    screen.classList.remove(
      "active"
    );

  });


  const target =
    document.getElementById(
      screenId
    );


  if (target) {

    target.classList.add(
      "active"
    );

  }


  /*
    画面ごとの更新
  */

  if (
    screenId ===
    "historyScreen"
  ) {

    updateHistory();

  }


  if (
    screenId ===
    "monthlyScreen"
  ) {

    updateMonthlyList();

  }


  if (
    screenId ===
    "categoryScreen"
  ) {

    updateCategoryList();

  }


  if (
    screenId ===
    "calendarScreen"
  ) {

    updateCalendar();

  }


  if (
    screenId ===
    "analysisScreen"
  ) {

    generateAiAnalysis();

  }

}


/* =========================================================
   イベント設定
========================================================= */

function setupEvents() {

  /* -------------------------
     メニュー
  ------------------------- */

  const menuBtn =
    document.getElementById(
      "menuBtn"
    );

  if (menuBtn) {

    menuBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "menuScreen"
        );

      }
    );

  }


  const menuBackBtn =
    document.getElementById(
      "menuBackBtn"
    );

  if (menuBackBtn) {

    menuBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "mainScreen"
        );

      }
    );

  }


  /* -------------------------
     設定
  ------------------------- */

  const settingsBtn =
    document.getElementById(
      "settingsBtn"
    );

  if (settingsBtn) {

    settingsBtn.addEventListener(
      "click",
      () => {

        loadSettingsToInputs();

        showScreen(
          "settingsScreen"
        );

      }
    );

  }


  const menuSettingsBtn =
    document.getElementById(
      "menuSettingsBtn"
    );

  if (menuSettingsBtn) {

    menuSettingsBtn.addEventListener(
      "click",
      () => {

        loadSettingsToInputs();

        showScreen(
          "settingsScreen"
        );

      }
    );

  }


  const settingsBackBtn =
    document.getElementById(
      "settingsBackBtn"
    );

  if (settingsBackBtn) {

    settingsBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "menuScreen"
        );

      }
    );

  }


  const saveSettingsBtn =
    document.getElementById(
      "saveSettingsBtn"
    );

  if (saveSettingsBtn) {

    saveSettingsBtn.addEventListener(
      "click",
      saveSettingsFromInputs
    );

  }


  /* -------------------------
     支出追加
  ------------------------- */

  const addExpenseBtn =
    document.getElementById(
      "addExpenseBtn"
    );

  if (addExpenseBtn) {

    addExpenseBtn.addEventListener(
      "click",
      addExpense
    );

  }


  /* -------------------------
     履歴
  ------------------------- */

  const historyBtn =
    document.getElementById(
      "historyBtn"
    );

  if (historyBtn) {

    historyBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "historyScreen"
        );

      }
    );

  }


  const historyBackBtn =
    document.getElementById(
      "historyBackBtn"
    );

  if (historyBackBtn) {

    historyBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "mainScreen"
        );

      }
    );

  }


  /* -------------------------
     月別
  ------------------------- */

  const menuMonthlyBtn =
    document.getElementById(
      "menuMonthlyBtn"
    );

  if (menuMonthlyBtn) {

    menuMonthlyBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "monthlyScreen"
        );

      }
    );

  }


  const monthlyBackBtn =
    document.getElementById(
      "monthlyBackBtn"
    );

  if (monthlyBackBtn) {

    monthlyBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "menuScreen"
        );

      }
    );

  }


  const monthDetailBackBtn =
    document.getElementById(
      "monthDetailBackBtn"
    );

  if (monthDetailBackBtn) {

    monthDetailBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "monthlyScreen"
        );

      }
    );

  }


  /* -------------------------
     カテゴリ
  ------------------------- */

  const categoryMoreBtn =
    document.getElementById(
      "categoryMoreBtn"
    );

  if (categoryMoreBtn) {

    categoryMoreBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "categoryScreen"
        );

      }
    );

  }


  const menuCategoryBtn =
    document.getElementById(
      "menuCategoryBtn"
    );

  if (menuCategoryBtn) {

    menuCategoryBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "categoryScreen"
        );

      }
    );

  }


  const categoryBackBtn =
    document.getElementById(
      "categoryBackBtn"
    );

  if (categoryBackBtn) {

    categoryBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "mainScreen"
        );

      }
    );

  }


  /* -------------------------
     カレンダー
  ------------------------- */

  const menuCalendarBtn =
    document.getElementById(
      "menuCalendarBtn"
    );

  if (menuCalendarBtn) {

    menuCalendarBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "calendarScreen"
        );

      }
    );

  }


  const calendarBackBtn =
    document.getElementById(
      "calendarBackBtn"
    );

  if (calendarBackBtn) {

    calendarBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "mainScreen"
        );

      }
    );

  }


  const prevMonthBtn =
    document.getElementById(
      "prevMonthBtn"
    );

  if (prevMonthBtn) {

    prevMonthBtn.addEventListener(
      "click",
      () => {

        moveCalendarMonth(
          -1
        );

      }
    );

  }


  const nextMonthBtn =
    document.getElementById(
      "nextMonthBtn"
    );

  if (nextMonthBtn) {

    nextMonthBtn.addEventListener(
      "click",
      () => {

        moveCalendarMonth(
          1
        );

      }
    );

  }


  const addPlanBtn =
    document.getElementById(
      "addPlanBtn"
    );

  if (addPlanBtn) {

    addPlanBtn.addEventListener(
      "click",
      openPlanModal
    );

  }


  const savePlanBtn =
    document.getElementById(
      "savePlanBtn"
    );

  if (savePlanBtn) {

    savePlanBtn.addEventListener(
      "click",
      savePlan
    );

  }


  const cancelPlanBtn =
    document.getElementById(
      "cancelPlanBtn"
    );

  if (cancelPlanBtn) {

    cancelPlanBtn.addEventListener(
      "click",
      closePlanModal
    );

  }


  /* -------------------------
     AI
  ------------------------- */

  const menuAnalysisBtn =
    document.getElementById(
      "menuAnalysisBtn"
    );

  if (menuAnalysisBtn) {

    menuAnalysisBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "analysisScreen"
        );

      }
    );

  }


  const analysisBackBtn =
    document.getElementById(
      "analysisBackBtn"
    );

  if (analysisBackBtn) {

    analysisBackBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "menuScreen"
        );

      }
    );

  }


  const copyAiPromptBtn =
    document.getElementById(
      "copyAiPromptBtn"
    );

  if (copyAiPromptBtn) {

    copyAiPromptBtn.addEventListener(
      "click",
      copyAiPrompt
    );

  }


  /* -------------------------
     ダークモード
  ------------------------- */

  const darkModeMenuBtn =
    document.getElementById(
      "darkModeMenuBtn"
    );

  if (darkModeMenuBtn) {

    darkModeMenuBtn.addEventListener(
      "click",
      toggleDarkMode
    );

  }


  /* -------------------------
     Daily Prompt
  ------------------------- */

  const promptAddBtn =
    document.getElementById(
      "promptAddBtn"
    );

  if (promptAddBtn) {

    promptAddBtn.addEventListener(
      "click",
      addPromptExpense
    );

  }


  const promptNoExpenseBtn =
    document.getElementById(
      "promptNoExpenseBtn"
    );

  if (promptNoExpenseBtn) {

    promptNoExpenseBtn.addEventListener(
      "click",
      () =>
        closeDailyPrompt(true)
    );

  }


  const promptLaterBtn =
    document.getElementById(
      "promptLaterBtn"
    );

  if (promptLaterBtn) {

    promptLaterBtn.addEventListener(
      "click",
      () =>
        closeDailyPrompt(false)
    );

  }


  /* -------------------------
     Bottom Navigation
  ------------------------- */

  const navButtons =
    document.querySelectorAll(
      "[data-nav]"
    );


  navButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const target =
          button.dataset.nav;

        showScreen(
          target
        );

      }
    );

  });


  const bottomAddBtn =
    document.getElementById(
      "bottomAddBtn"
    );

  if (bottomAddBtn) {

    bottomAddBtn.addEventListener(
      "click",
      () => {

        showScreen(
          "mainScreen"
        );


        const amountInput =
          document.getElementById(
            "amount"
          );


        if (amountInput) {

          setTimeout(
            () => {

              amountInput.focus();

            },
            100
          );

        }

      }
    );

  }

}


/* =========================================================
   Service Worker
========================================================= */

function registerServiceWorker() {

  if (
    "serviceWorker" in
    navigator
  ) {

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

          console.error(
            "Service Worker registration failed:",
            error
          );

        }
      );

  }

}


/* =========================================================
   全体更新
========================================================= */

function updateAll() {

  updateHeader();

  updateMonthly();

  updateToday();

  updateWeekly();

  updateCategoryGrid();

  updateRecentExpenses();

}


/* =========================================================
   DBから再読み込み
========================================================= */

async function refreshFromDatabase() {

  await loadData();

  updateAll();

  const currentScreen =
    document.querySelector(
      ".screen.active"
    );


  if (
    currentScreen &&
    currentScreen.id ===
      "historyScreen"
  ) {

    updateHistory();

  }


  if (
    currentScreen &&
    currentScreen.id ===
      "monthlyScreen"
  ) {

    updateMonthlyList();

  }


  if (
    currentScreen &&
    currentScreen.id ===
      "categoryScreen"
  ) {

    updateCategoryList();

  }


  if (
    currentScreen &&
    currentScreen.id ===
      "calendarScreen"
  ) {

    updateCalendar();

  }


  if (
    currentScreen &&
    currentScreen.id ===
      "analysisScreen"
  ) {

    generateAiAnalysis();

  }

}


/* =========================================================
   初期化
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    try {

      /*
        IndexedDBを初期化
      */

      await openDatabase();


      /*
        データ読み込み
      */

      await loadData();


      /*
        既存データ補正
      */

      await migrateOldExpenses();


      /*
        UI初期化
      */

      renderCategorySelect();

      setupEvents();

      loadSettingsToInputs();

      await applyDarkMode();

      updateAll();

      updateCalendar();


      /*
        Apple Wallet受信
      */

      const receivedFromAppleWallet =
        receiveAppleWalletData();


      /*
        Service Worker
      */

      registerServiceWorker();


      /*
        Apple Walletから
        受信していない場合のみ
        Daily Promptを表示
      */

      if (
        !receivedFromAppleWallet
      ) {

        await showDailyPrompt();

      }


      console.log(
        "Wallet IndexedDB version initialized."
      );


    } catch (error) {

      console.error(
        "Wallet initialization error:",
        error
      );


      alert(
        "Walletのデータベース初期化中にエラーが発生しました。"
      );

    }

  }
);


/* =========================================================
   ページ復帰時
========================================================= */

document.addEventListener(
  "visibilitychange",
  function () {

    if (
      document.visibilityState ===
      "visible"
    ) {

      refreshFromDatabase()
        .catch(
          error =>
            console.error(
              "DB refresh error:",
              error
            )
        );

    }

  }
);