"use strict";

// 読了・音読時間の基準（1分あたりの文字数）
const READING_CHARACTERS_PER_MINUTE = 500;
const SPEAKING_CHARACTERS_PER_MINUTE = 300;

const SAMPLE_TEXT = `日本語ツールボックスへようこそ。

この文字数カウンターでは、文章を入力するだけで文字数や行数、段落数を確認できます。
読了時間と音読時間も自動で計算されます。

入力した内容は保存されず、外部にも送信されません。`;

const numberFormatter = new Intl.NumberFormat("ja-JP");
let scheduledUpdateId = null;

/**
 * 改行コードをLFへ統一し、環境による集計差を防ぐ。
 * Unicodeの行区切り・段落区切りも改行として扱う。
 */
function normalizeLineBreaks(text) {
  return text.replace(/\r\n?|\u2028|\u2029/g, "\n");
}

/**
 * 改行以外の空白文字を判定する。
 * 半角・全角スペース、タブ、Unicodeの代表的な空白を対象とする。
 */
function isHorizontalWhitespace(character) {
  return /[\t\f\v \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/u.test(character);
}

/** TextEncoderを使ってUTF-8バイト数を計測する。 */
function getUtf8ByteCount(text) {
  return new TextEncoder().encode(text).length;
}

/**
 * 文章を1回走査し、画面で使用する集計値をまとめて返す。
 * 文字数はUTF-16コードユニットではなくUnicodeコードポイント単位。
 */
function analyzeText(rawText) {
  const text = normalizeLineBreaks(rawText);
  let totalCharacters = 0;
  let charactersWithoutSpaces = 0;
  let charactersWithoutLineBreaks = 0;
  let charactersWithoutSpacesOrBreaks = 0;

  let lineCount = text === "" ? 0 : 1;
  let nonEmptyLineCount = 0;
  let paragraphCount = 0;
  let currentLineHasContent = false;
  let insideParagraph = false;

  const finishCurrentLine = () => {
    if (currentLineHasContent) {
      nonEmptyLineCount += 1;
      if (!insideParagraph) {
        paragraphCount += 1;
      }
      insideParagraph = true;
    } else {
      insideParagraph = false;
    }
    currentLineHasContent = false;
  };

  for (const character of text) {
    totalCharacters += 1;

    if (character === "\n") {
      charactersWithoutSpaces += 1;
      lineCount += 1;
      finishCurrentLine();
      continue;
    }

    charactersWithoutLineBreaks += 1;

    if (!isHorizontalWhitespace(character)) {
      charactersWithoutSpaces += 1;
      charactersWithoutSpacesOrBreaks += 1;
      currentLineHasContent = true;
    }
  }

  if (text !== "") {
    finishCurrentLine();
  }

  return {
    totalCharacters,
    charactersWithoutSpaces,
    charactersWithoutLineBreaks,
    charactersWithoutSpacesOrBreaks,
    lineCount,
    nonEmptyLineCount,
    paragraphCount,
    utf8ByteCount: getUtf8ByteCount(text),
  };
}

/** 文字数と毎分の速度から、切り上げた秒数を求める。 */
function calculateDurationSeconds(characterCount, charactersPerMinute) {
  if (characterCount === 0) {
    return 0;
  }
  return Math.ceil((characterCount / charactersPerMinute) * 60);
}

/** 秒数を読みやすい日本語の時間表記へ変換する。 */
function formatDuration(totalSeconds) {
  if (totalSeconds === 0) {
    return "0秒";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${numberFormatter.format(hours)}時間`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}分`);
  }
  if (seconds > 0) {
    parts.push(`${seconds}秒`);
  }

  return `約${parts.join("")}`;
}

/** 指定した出力要素へ、桁区切りした数値を安全に設定する。 */
function setNumberOutput(elementId, value) {
  const output = document.getElementById(elementId);
  if (output) {
    output.textContent = numberFormatter.format(value);
  }
}

/** 集計結果をすべて画面へ反映する。 */
function renderAnalysis(analysis) {
  setNumberOutput("total-characters", analysis.totalCharacters);
  setNumberOutput("characters-without-spaces", analysis.charactersWithoutSpaces);
  setNumberOutput("characters-without-line-breaks", analysis.charactersWithoutLineBreaks);
  setNumberOutput("characters-without-spaces-or-breaks", analysis.charactersWithoutSpacesOrBreaks);
  setNumberOutput("line-count", analysis.lineCount);
  setNumberOutput("non-empty-line-count", analysis.nonEmptyLineCount);
  setNumberOutput("paragraph-count", analysis.paragraphCount);
  setNumberOutput("utf8-byte-count", analysis.utf8ByteCount);

  const readingTime = document.getElementById("reading-time");
  const speakingTime = document.getElementById("speaking-time");
  const timeBaseCharacters = analysis.charactersWithoutSpacesOrBreaks;

  if (readingTime) {
    readingTime.textContent = formatDuration(
      calculateDurationSeconds(timeBaseCharacters, READING_CHARACTERS_PER_MINUTE),
    );
  }
  if (speakingTime) {
    speakingTime.textContent = formatDuration(
      calculateDurationSeconds(timeBaseCharacters, SPEAKING_CHARACTERS_PER_MINUTE),
    );
  }
}

/** 入力内容を集計する。例外時も他のボタン操作を妨げない。 */
function updateStatistics() {
  const textInput = document.getElementById("text-input");
  if (!textInput) {
    return;
  }

  try {
    renderAnalysis(analyzeText(textInput.value));
  } catch (error) {
    console.error("文字数の集計中にエラーが発生しました。", error);
    notifyUser("集計中にエラーが発生しました。ページを再読み込みしてください。", "error");
  }
}

/** 長文入力時の負荷を抑えつつ、次の描画タイミングで集計する。 */
function scheduleStatisticsUpdate() {
  if (scheduledUpdateId !== null) {
    cancelAnimationFrame(scheduledUpdateId);
  }

  scheduledUpdateId = requestAnimationFrame(() => {
    scheduledUpdateId = null;
    updateStatistics();
  });
}

/** ボタン操作の結果をaria-live領域へ通知する。 */
function notifyUser(message, type = "info") {
  const status = document.getElementById("action-status");
  if (!status) {
    return;
  }

  status.className = `action-status is-${type}`;
  status.textContent = message;
}

/** 入力例を設定して集計結果を更新する。 */
function setSampleText() {
  const textInput = document.getElementById("text-input");
  if (!textInput) {
    notifyUser("入力欄が見つからないため、入力例を設定できませんでした。", "error");
    return;
  }

  textInput.value = SAMPLE_TEXT;
  updateStatistics();
  textInput.focus();
  notifyUser("入力例をセットしました。", "success");
}

/** Clipboard APIが使えない環境向けのコピー処理。 */
function copyWithSelection(textInput) {
  const selectionStart = textInput.selectionStart;
  const selectionEnd = textInput.selectionEnd;
  textInput.select();
  const copied = document.execCommand("copy");
  textInput.setSelectionRange(selectionStart, selectionEnd);
  return copied;
}

/** 入力内容をクリップボードへコピーする。 */
async function copyText() {
  const textInput = document.getElementById("text-input");
  if (!textInput || textInput.value === "") {
    notifyUser("コピーする文章がありません。", "error");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textInput.value);
    } else if (!copyWithSelection(textInput)) {
      throw new Error("コピー操作がブラウザに許可されませんでした。");
    }
    notifyUser("全文をクリップボードにコピーしました。", "success");
  } catch (error) {
    console.error("コピー中にエラーが発生しました。", error);
    notifyUser("コピーできませんでした。文章を選択して手動でコピーしてください。", "error");
  }
}

/** 入力内容を消去し、結果を初期値へ戻す。 */
function clearText() {
  const textInput = document.getElementById("text-input");
  if (!textInput) {
    notifyUser("入力欄が見つからないため、消去できませんでした。", "error");
    return;
  }

  if (textInput.value === "") {
    textInput.focus();
    notifyUser("入力欄はすでに空です。", "info");
    return;
  }

  textInput.value = "";
  updateStatistics();
  textInput.focus();
  notifyUser("入力内容を消去しました。", "success");
}

/** 必要な要素ごとにイベントを登録し、一部欠落時も初期化を継続する。 */
function initializeCounter() {
  const textInput = document.getElementById("text-input");
  const sampleButton = document.getElementById("sample-button");
  const copyButton = document.getElementById("copy-button");
  const clearButton = document.getElementById("clear-button");
  const currentYear = document.getElementById("current-year");

  textInput?.addEventListener("input", scheduleStatisticsUpdate);
  sampleButton?.addEventListener("click", setSampleText);
  copyButton?.addEventListener("click", copyText);
  clearButton?.addEventListener("click", clearText);

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  updateStatistics();
}

/**
 * Node.jsから `node app.js --self-test` で実行する簡易テスト。
 * ブラウザでの通常利用時には実行されない。
 */
function runSelfTests() {
  const metricKeys = [
    "totalCharacters",
    "charactersWithoutSpaces",
    "charactersWithoutLineBreaks",
    "charactersWithoutSpacesOrBreaks",
    "lineCount",
    "nonEmptyLineCount",
    "paragraphCount",
    "utf8ByteCount",
  ];
  const testCases = [
    ["空文字", "", [0, 0, 0, 0, 0, 0, 0, 0]],
    ["日本語のみ", "日本語の文章", [6, 6, 6, 6, 1, 1, 1, 18]],
    ["英数字のみ", "Hello123", [8, 8, 8, 8, 1, 1, 1, 8]],
    ["半角スペース", "日本 語", [4, 3, 4, 3, 1, 1, 1, 10]],
    ["全角スペース", "日本　語", [4, 3, 4, 3, 1, 1, 1, 12]],
    ["複数の改行", "一行目\n二行目\n三行目", [11, 11, 9, 9, 3, 3, 1, 29]],
    ["空行", "一行目\n\n三行目", [8, 8, 6, 6, 3, 2, 2, 20]],
    ["絵文字", "こんにちは😊", [6, 6, 6, 6, 1, 1, 1, 19]],
    ["記号", "「日本語！」", [6, 6, 6, 6, 1, 1, 1, 18]],
    ["非常に長い文章", "あ".repeat(100000), [100000, 100000, 100000, 100000, 1, 1, 1, 300000]],
  ];

  const assertEqual = (actual, expected, label) => {
    if (actual !== expected) {
      throw new Error(`${label}: 期待値 ${expected}、実際の値 ${actual}`);
    }
  };

  for (const [testName, input, expectedValues] of testCases) {
    const analysis = analyzeText(input);
    metricKeys.forEach((key, index) => {
      assertEqual(analysis[key], expectedValues[index], `${testName} / ${key}`);
    });
    console.log(`PASS: ${testName}`);
  }

  const crlfAnalysis = analyzeText("一行目\r\n\r\n三行目");
  const lfAnalysis = analyzeText("一行目\n\n三行目");
  metricKeys.forEach((key) => {
    assertEqual(crlfAnalysis[key], lfAnalysis[key], `改行コードの正規化 / ${key}`);
  });
  console.log("PASS: 改行コードの正規化");

  assertEqual(calculateDurationSeconds(500, 500), 60, "読了時間");
  assertEqual(calculateDurationSeconds(300, 300), 60, "音読時間");
  assertEqual(formatDuration(0), "0秒", "0秒の表示");
  assertEqual(formatDuration(61), "約1分1秒", "分・秒の表示");
  console.log("PASS: 読了・音読時間の計算");
  console.log(`ALL PASS: ${testCases.length + 2} tests`);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initializeCounter);
}

// 外部パッケージなしのNode.jsテストから純粋な集計関数を利用できるようにする。
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    analyzeText,
    calculateDurationSeconds,
    formatDuration,
    normalizeLineBreaks,
    runSelfTests,
  };
}

if (typeof process !== "undefined" && process.argv.includes("--self-test")) {
  runSelfTests();
}
