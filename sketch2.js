
"use strict";

/* =========================================
   資訊漣漪 Information Ripple
   六階段數位公民互動遊戲
========================================= */

const app = document.getElementById("app");

/* ===== 音效 ===== */

const audio = {
  enabled: false,
  click: new Audio("./click1.mp3"),
  ring: new Audio("./phonering.mp3"),
  message: new Audio("./message.mp3"),
  lastMessage: 0
};

audio.click.volume = .45;
audio.ring.volume = .65;
audio.message.volume = .55;
audio.ring.loop = true;

function playSound(type) {
  if (!audio.enabled || !audio[type]) return;

  if (type === "message") {
    if (Date.now() - audio.lastMessage < 350) return;
    audio.lastMessage = Date.now();
  }

  const sound = audio[type];

  try {
    if (type !== "ring") {
      sound.pause();
      sound.currentTime = 0;
    }
    sound.play().catch(() => {});
  } catch (error) {
    console.warn("音效無法播放：", type, error);
  }
}

function stopRing() {
  audio.ring.pause();
  audio.ring.currentTime = 0;
}

function startRing() {
  if (state.stage === 4 &&
      state.callStatus === "ringing") {
    playSound("ring");
  }
}

/* ===== 角色語音系統 ===== */

const speechSystem = {
  enabled: true,
  voices: [],
  speaking: false,
  currentRole: ""
};

function loadSpeechVoices() {
  if (!("speechSynthesis" in window)) return;
  speechSystem.voices = speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {
  loadSpeechVoices();
  speechSynthesis.addEventListener(
    "voiceschanged",
    loadSpeechVoices
  );
}

function chooseChineseVoice(role) {
  const voices = speechSystem.voices.filter(v =>
    v.lang.toLowerCase().startsWith("zh")
  );

  if (!voices.length) return null;

  const taiwan = voices.filter(v =>
    /zh[-_]tw/i.test(v.lang)
  );

  const candidates = taiwan.length ? taiwan : voices;

  if (role === "scammer") {
    const male = candidates.find(v =>
      /male|yunxi|yunjian|yunyang|hanhan/i.test(v.name)
    );
    if (male) return male;
  }

  if (role === "player") {
    const youthful = candidates.find(v =>
      /female|hsiao|xiaoxiao|xiaoyi/i.test(v.name)
    );
    if (youthful) return youthful;
  }

  return candidates[0];
}

function stopCharacterSpeech() {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  speechSystem.speaking = false;
  speechSystem.currentRole = "";
}

function speakCharacter(text, role = "narrator") {
  if (!speechSystem.enabled) return;
  if (!("speechSynthesis" in window)) return;

  stopCharacterSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-TW";
  utterance.volume = 1;
  utterance.voice = chooseChineseVoice(role);

  if (role === "scammer") {
    utterance.pitch = .72;
    utterance.rate = .88;
  } else if (role === "player") {
    utterance.pitch = 1.35;
    utterance.rate = 1.08;
  } else {
    utterance.pitch = 1;
    utterance.rate = .95;
  }

  utterance.onstart = () => {
    speechSystem.speaking = true;
    speechSystem.currentRole = role;
    updateVoiceIndicator();
  };

  utterance.onend = () => {
    speechSystem.speaking = false;
    updateVoiceIndicator();
  };

  utterance.onerror = () => {
    speechSystem.speaking = false;
    updateVoiceIndicator();
  };

  speechSynthesis.speak(utterance);
}

function updateVoiceIndicator() {
  const indicator = document.getElementById("voiceIndicator");
  if (!indicator) return;

  indicator.textContent = speechSystem.speaking
    ? "正在播放角色語音……"
    : "語音待命";
}

function speakCallNode() {
  if (state.callStatus !== "active") return;

  const node = callDialogue[state.callNode];
  if (!node) return;

  const role = node.speaker === "陌生來電者"
    ? "scammer"
    : "narrator";

  speakCharacter(node.text, role);
}

/* ===== 遊戲階段 ===== */

const stages = [
  {
    type: "article",
    title: "校園停課傳聞",
    topic: "資訊來源與查證",
    sender: "班級群組・小宇",
    post: "緊急！聽說明天全校停課！大家快轉傳！",
    story: "班級群組突然傳出停課消息，但你沒有看到學校正式公告。",
    evidenceTitle: "校園停課消息查證",
    evidence: "目前沒有正式停課公告。重大停課消息應以學校及主管機關最新公告為準。",
    options: [
      "立即轉傳給所有朋友",
      "查詢學校與主管機關公告",
      "先不轉傳，提醒朋友查證"
    ],
    results: [
      "消息迅速傳開，部分同學誤以為明天不用上課。",
      "你查詢可靠來源，沒有讓錯誤消息繼續擴散。",
      "你阻止未確認消息的轉傳，也提醒朋友查證。"
    ],
    impact: [[-14,-12],[16,12],[11,10]],
    lesson: "多人轉傳不代表消息正確，重大資訊應查證原始來源。"
  },
  {
    type: "article",
    title: "AI 影像迷局",
    topic: "深偽影像與來源驗證",
    sender: "熱門影片分享",
    post: "某位知名人物竟然說出這些話！快看這段影片！",
    story: "你收到一段看起來非常真實的影片，發布者卻沒有附上完整來源。",
    evidenceTitle: "AI 影片來源比對",
    evidence: "流傳影片與原始訪談內容存在差異。畫面、聲音與字幕都可能經過修改或合成。",
    options: [
      "影片很逼真，直接相信",
      "尋找原始影片與可信報導",
      "暫時不分享，等待確認"
    ],
    results: [
      "你忽略影片可能經過剪輯或合成的風險。",
      "你發現流傳影片與原始內容存在差異。",
      "你沒有擴散尚未確認的影片。"
    ],
    impact: [[-14,-10],[17,12],[10,9]],
    lesson: "影像逼真不等於內容真實，應查證原始來源與完整脈絡。"
  },
  {
    type: "article",
    title: "購物網站陷阱",
    topic: "廣告、誇大宣稱與數位安全",
    sender: "超值 GO 購物站",
    post: "神奇記憶貼片！原價 NT$999，今天只要 NT$399！",
    story: "你進入陌生購物網站，網站不斷跳出促銷訊息和假安全警告。",
    evidenceTitle: "神奇記憶貼片查證報告",
    evidence: "網站沒有提供可靠研究證據支持提升記憶力的宣稱。促銷倒數、星級評價與使用者留言不能取代科學證據。",
    options: [
      "相信商品宣稱，準備購買",
      "查證商品宣稱與研究資料",
      "停止與可疑網站互動"
    ],
    results: [
      "你受到優惠和廣告影響，忽略商品缺乏可靠證據。",
      "你發現商品宣稱缺乏可靠研究支持。",
      "你停止與可疑網站互動，避免進一步風險。"
    ],
    impact: [[-15,-10],[16,11],[12,11]],
    lesson: "不明網站的病毒警告可能只是恐嚇式廣告，不要點擊未知修復按鈕。"
  },
  {
    type: "chat",
    title: "群組裡的真相",
    topic: "從眾效應與誇大宣傳",
    story: "你被加入陌生群組，成員正在推薦一瓶 NT$350 的神奇福水。",
    lesson: "大量推薦和個人經驗不能取代可靠證據。"
  },
  {
    type: "call",
    title: "客服來電危機",
    topic: "冒充客服與驗證碼詐騙",
    story: "陌生號碼打來，自稱客服中心，說你的帳號出現異常交易。",
    lesson: "不要向陌生來電者提供簡訊驗證碼，應自行透過官方管道確認。"
  },
  {
    type: "chat",
    title: "熟悉的陌生人",
    topic: "帳號冒用與身分查證",
    story: "好友阿哲突然向你借 NT$2,000，卻表示現在不方便接電話。",
    lesson: "熟悉的帳號也可能遭到冒用，涉及金錢時應另行確認身分。"
  }
];

/* ===== 第四階段：群組裡的真相 ===== */

const groupDialogue = {
  start: {
    messages: [
      ["系統","你已被加入「福氣分享交流會（128）」"],
      ["管理員","歡迎新朋友！今天有特別的分享。"],
      ["幸福小美","最近大家都在討論神奇福水。"],
      ["阿志","我也看到好多人推薦！"]
    ],
    prompt: "你剛加入陌生群組，會怎麼做？",
    choices: [
      ["先觀察群組在討論什麼","observe"],
      ["詢問這個群組的用途","askGroup"],
      ["直接退出陌生群組","leave"]
    ]
  },
  askGroup: {
    messages: [
      ["你","請問這是什麼群組？"],
      ["管理員","這裡是分享生活經驗與好物的交流群組。"],
      ["幸福小美","大家人都很好，放心啦！"]
    ],
    prompt: "群組成員表現得很友善。",
    choices: [
      ["先看看他們分享什麼","observe"],
      ["詢問是否有可靠資訊來源","askEvidence"],
      ["仍然不放心，退出群組","leave"]
    ]
  },
  observe: {
    messages: [
      ["管理員","今天推薦神奇福水，一瓶只要 NT$350！"],
      ["幸福小美","我上次買了兩瓶，最近覺得特別順利。"],
      ["阿志","真的假的？我也想買！"],
      ["管理員","目前已有很多會員訂購。"]
    ],
    prompt: "群組中出現大量正面推薦。",
    choices: [
      ["詢問商品是否有研究證據","askEvidence"],
      ["這麼多人推薦，應該值得相信","socialProof"],
      ["先了解商品宣稱的內容","product"]
    ]
  },
  product: {
    messages: [
      ["管理員","這款福水據說能帶來好運與正能量。"],
      ["管理員","我們還有很多會員的使用心得。"],
      ["幸福小美","我真的覺得很有效！"]
    ],
    prompt: "你會如何評估這些宣稱？",
    choices: [
      ["個人感受不代表商品有特殊功效","askEvidence"],
      ["詢問是否有客觀的驗證方式","askEvidence"],
      ["相信群組成員的親身經驗","socialProof"]
    ]
  },
  socialProof: {
    messages: [
      ["你","這麼多人推薦，應該不錯吧？"],
      ["管理員","沒錯！我們已經有很多成功案例。"],
      ["阿志","我剛剛也下單了！"],
      ["管理員","你要不要一起加入？"]
    ],
    prompt: "你感受到其他成員的影響。",
    choices: [
      ["再問一次有沒有可靠證據","askEvidence"],
      ["先看看商品資訊","product"],
      ["跟著大家購買","purchase"]
    ]
  },
  askEvidence: {
    messages: [
      ["你","有沒有可以驗證效果的研究或資料？"],
      ["管理員","我們有這麼多人的親身經驗。"],
      ["幸福小美","難道大家的感受都不算數嗎？"],
      ["阿志","不要這麼認真啦！"]
    ],
    prompt: "對方沒有提供可驗證的證據。",
    choices: [
      ["繼續要求具體資料","challenge"],
      ["先自行查證相關宣稱","independent"],
      ["怕被排擠，決定不再質疑","pressure"]
    ]
  },
  challenge: {
    messages: [
      ["你","我只是想知道有沒有可靠的證據。"],
      ["管理員","你是不是不相信我們？"],
      ["管理員","這個群組是分享正能量的地方。"],
      ["幸福小美","大家都很支持，只有你一直問。"]
    ],
    prompt: "群組開始對你的質疑施加壓力。",
    choices: [
      ["堅持證據比人數重要","independent"],
      ["不再爭論，離開群組","leave"],
      ["為了融入群組，選擇相信","pressure"]
    ]
  },
  pressure: {
    messages: [
      ["管理員","今天的優惠只剩最後幾分鐘！"],
      ["阿志","大家都買了，你還在猶豫什麼？"],
      ["管理員","再不決定就沒有這個價格了。"]
    ],
    prompt: "你同時受到時間與群體壓力。",
    choices: [
      ["先查證，不受倒數影響","independent"],
      ["停止討論並退出","leave"],
      ["擔心錯過優惠，直接購買","purchase"]
    ]
  },
  independent: {
    messages: [
      ["系統","你查閱了商品宣稱與公開查證資料。"],
      ["查證資訊","目前沒有可靠證據支持其特殊功效。"],
      ["查證資訊","群組推薦和個人經驗不足以證明商品有效。"]
    ],
    prompt: "查證結果與群組宣傳不同。",
    choices: [
      ["提醒群組成員不要輕信宣傳","warn"],
      ["停止互動並退出群組","verifiedLeave"],
      ["雖然缺乏證據，仍決定購買","purchase"]
    ]
  },
  warn: {
    messages: [
      ["你","這些宣稱缺乏可靠證據，建議大家先查證。"],
      ["幸福小美","原來還需要確認來源。"],
      ["阿志","那我先不要急著買好了。"],
      ["管理員","請不要影響其他人的購買決定。"]
    ],
    prompt: "你已提醒其他人注意資訊來源。",
    choices: [
      ["保留判斷，結束這段對話","safe"],
      ["退出陌生群組","safe"],
      ["繼續相信管理員的促銷","purchase"]
    ]
  },
  purchase: {
    messages: [
      ["你","好吧，我決定相信這個商品。"],
      ["旁白","大量推薦、限時優惠與群體壓力影響了你的判斷。"]
    ],
    ending: "risky"
  },
  verifiedLeave: {
    messages: [
      ["系統","你完成查證後退出群組。"],
      ["旁白","你沒有因為其他人的推薦而忽略證據。"]
    ],
    ending: "safe"
  },
  leave: {
    messages: [
      ["系統","你已退出陌生群組。"],
      ["旁白","面對陌生群組，選擇不參與也是一種保護。"]
    ],
    ending: "leave"
  },
  safe: {
    messages: [
      ["旁白","你根據查證結果做出判斷。"],
      ["旁白","你沒有讓群體壓力取代證據。"]
    ],
    ending: "safe"
  }
};

/* ===== 第六階段：熟悉的陌生人 ===== */

const friendDialogue = {
  start: {
    messages: [
      ["阿哲","欸，你現在有空嗎？"],
      ["阿哲","我有件事想拜託你。"],
      ["阿哲","可以先幫我一個忙嗎？"]
    ],
    prompt: "好友阿哲突然傳訊息給你。",
    choices: [
      ["怎麼了？","request"],
      ["有什麼事情？","request"],
      ["你今天怎麼突然找我？","smallTalk"]
    ]
  },
  smallTalk: {
    messages: [
      ["阿哲","就突然遇到一點事情。"],
      ["阿哲","想說你應該可以幫忙。"]
    ],
    prompt: "對方似乎有些著急。",
    choices: [
      ["你先說發生什麼事","request"],
      ["你可以直接打電話給我","callAttempt"],
      ["我先確認一下是不是你本人","verify"]
    ]
  },
  request: {
    messages: [
      ["阿哲","我現在需要先借 2,000 元。"],
      ["阿哲","晚一點就會還你。"],
      ["阿哲","真的有點急。"]
    ],
    prompt: "朋友突然提出借錢要求。",
    choices: [
      ["你為什麼突然需要借錢？","reason"],
      ["我們先通電話確認一下","callAttempt"],
      ["既然是朋友，我應該相信","trust"]
    ]
  },
  reason: {
    messages: [
      ["阿哲","我臨時遇到一點狀況。"],
      ["阿哲","現在不方便講太多。"],
      ["阿哲","你可以先幫我嗎？"]
    ],
    prompt: "對方沒有清楚說明原因。",
    choices: [
      ["你先打電話給我","callAttempt"],
      ["我想確認你的身分","verify"],
      ["不問了，直接相信","trust"]
    ]
  },
  callAttempt: {
    messages: [
      ["你","我打電話給你確認一下。"],
      ["阿哲","不要打電話！"],
      ["阿哲","我手機快沒電了。"],
      ["阿哲","而且現在真的不方便接。"]
    ],
    prompt: "對方拒絕透過電話確認。",
    choices: [
      ["改用其他可信方式聯絡阿哲","verify"],
      ["詢問共同朋友","mutualFriend"],
      ["他可能真的不方便，先相信","trust"]
    ]
  },
  trust: {
    messages: [
      ["你","好吧，畢竟我們是朋友。"],
      ["阿哲","太好了！真的謝謝你。"],
      ["阿哲","那你可以快一點嗎？"]
    ],
    prompt: "對方開始催促你做決定。",
    choices: [
      ["等等，我還是想先確認身分","verify"],
      ["詢問共同朋友","mutualFriend"],
      ["不查證，直接答應借款","risky"]
    ]
  },
  verify: {
    messages: [
      ["系統","你改用先前保存的可信聯絡方式聯繫阿哲。"],
      ["真正的阿哲","蛤？我沒有跟你借錢啊！"],
      ["真正的阿哲","我剛剛發現自己的帳號好像被盜用了。"]
    ],
    prompt: "你發現有人正在冒用阿哲的帳號。",
    choices: [
      ["提醒阿哲立即保護帳號","protectAccount"],
      ["通知共同朋友注意","warnFriends"],
      ["停止與可疑帳號互動","safe"]
    ]
  },
  mutualFriend: {
    messages: [
      ["你","我先問一下我們共同認識的朋友。"],
      ["小宇","阿哲剛剛也傳訊息跟我借錢！"],
      ["小宇","我覺得很奇怪。"]
    ],
    prompt: "共同朋友也收到類似訊息。",
    choices: [
      ["直接聯絡真正的阿哲","verify"],
      ["提醒其他人不要急著相信","warnFriends"],
      ["可能只是巧合，還是借錢","risky"]
    ]
  },
  protectAccount: {
    messages: [
      ["你","你的帳號可能被冒用了，趕快檢查安全設定。"],
      ["真正的阿哲","好，我會立即處理。"],
      ["真正的阿哲","還好你有先確認！"]
    ],
    prompt: "阿哲已知道帳號可能遭到冒用。",
    choices: [
      ["提醒他檢查登入紀錄與密碼","safe"],
      ["提醒他通知其他朋友","safe"],
      ["結束與可疑帳號的互動","safe"]
    ]
  },
  warnFriends: {
    messages: [
      ["你","大家注意！阿哲的帳號可能遭到冒用。"],
      ["小宇","謝謝提醒，我差點就相信了。"],
      ["真正的阿哲","我已經開始處理帳號安全問題。"]
    ],
    prompt: "你成功提醒其他人注意。",
    choices: [
      ["停止與可疑帳號互動","safe"],
      ["保留必要資訊以便通報","safe"],
      ["提醒大家使用其他方式確認身分","safe"]
    ]
  },
  risky: {
    messages: [
      ["系統","你在沒有確認身分的情況下答應了借款。"],
      ["旁白","事後你發現，真正的阿哲根本沒有提出借錢要求。"],
      ["旁白","熟悉的帳號也可能遭到冒用。"]
    ],
    ending: "risky"
  },
  safe: {
    messages: [
      ["旁白","你透過其他可信管道確認了身分。"],
      ["旁白","你沒有讓朋友關係與急迫感取代查證。"],
      ["系統","第六階段挑戰完成！"]
    ],
    ending: "safe"
  }
};

/* ===== 第五階段：客服來電危機 ===== */

const callDialogue = {
  intro: {
    speaker: "陌生來電者",
    text: "你好，這裡是購物平台客服中心。我們發現你的帳號有一筆異常交易，請問是你本人操作的嗎？",
    choices: [
      ["不是，我沒有購買東西","notMe"],
      ["請問你是哪個單位？","identity"],
      ["我要先自行查證","verify"]
    ]
  },
  notMe: {
    speaker: "陌生來電者",
    text: "那可能有人正在使用你的帳號。我們需要立即確認，否則可能造成損失。",
    choices: [
      ["你怎麼知道我的帳號有問題？","identity"],
      ["可以提供案件資料嗎？","caseNumber"],
      ["我先到官方網站確認","verify"]
    ]
  },
  identity: {
    speaker: "陌生來電者",
    text: "我是平台安全部門的客服人員，這通電話是為了保護你的帳號。",
    choices: [
      ["請提供可查證的案件編號","caseNumber"],
      ["我不確定你的身分","doubt"],
      ["那我需要怎麼做？","instructions"]
    ]
  },
  caseNumber: {
    speaker: "陌生來電者",
    text: "你的案件編號是 CS-2026-XXXX。我們已經建立緊急處理紀錄。",
    choices: [
      ["有編號也不代表身分是真的","doubt"],
      ["我要自行向官方客服確認","verify"],
      ["既然有案件編號，我就配合","instructions"]
    ]
  },
  doubt: {
    speaker: "陌生來電者",
    text: "如果你不相信我們，帳號可能會在短時間內被限制。現在處理才來得及。",
    choices: [
      ["為什麼不能讓我自行查證？","pressure"],
      ["我會透過官方網站處理","verify"],
      ["聽起來很嚴重，我先配合","instructions"]
    ]
  },
  instructions: {
    speaker: "陌生來電者",
    text: "我們需要進行帳號安全驗證，請先確認你現在能收到簡訊。",
    choices: [
      ["為什麼需要簡訊？","smsReason"],
      ["我不會提供驗證資料","safe"],
      ["好，我可以收到簡訊","smsRequest"]
    ]
  },
  smsReason: {
    speaker: "陌生來電者",
    text: "這是安全流程的一部分。如果不完成驗證，我們就無法協助你。",
    choices: [
      ["這個要求很可疑","pressure"],
      ["我會自行聯絡官方","verify"],
      ["那就繼續處理吧","smsRequest"]
    ]
  },
  smsRequest: {
    speaker: "陌生來電者",
    text: "請告訴我簡訊中的六位數驗證碼，我們才能完成安全驗證。",
    choices: [
      ["驗證碼不能提供給陌生人","safe"],
      ["我先掛斷並自行查證","verify"],
      ["我差點相信，但決定停止","warning"]
    ]
  },
  pressure: {
    speaker: "陌生來電者",
    text: "請不要浪費時間！如果你現在不配合，之後發生問題就無法處理了。",
    choices: [
      ["你一直催促，我決定掛斷","safe"],
      ["我要自行確認官方客服","verify"],
      ["好，我先聽你的要求","smsRequest"]
    ]
  },
  verify: {
    speaker: "旁白",
    text: "你決定不依賴陌生來電者提供的資訊，而是自行尋找官方客服管道。",
    choices: [
      ["透過官方 App 查詢交易紀錄","officialApp"],
      ["自行開啟官方網站確認","officialWebsite"],
      ["重新相信剛剛的來電者","instructions"]
    ]
  },
  officialApp: {
    speaker: "系統",
    text: "模擬官方 App 顯示：目前沒有對方所稱的異常交易通知。",
    choices: [
      ["再透過官方客服確認","officialSupport"],
      ["拒絕提供任何驗證碼","safe"],
      ["回頭相信陌生來電者","instructions"]
    ]
  },
  officialWebsite: {
    speaker: "系統",
    text: "你自行輸入官方網站網址，找到客服資訊與帳號安全說明。",
    choices: [
      ["使用官方客服管道確認","officialSupport"],
      ["先停止與陌生來電者互動","safe"],
      ["回頭相信陌生來電者","instructions"]
    ]
  },
  officialSupport: {
    speaker: "模擬官方客服",
    text: "經查詢，沒有剛才來電者所稱的案件。官方客服不會要求你口頭提供簡訊驗證碼。",
    choices: [
      ["確認是可疑來電，結束互動","verifiedSafe"],
      ["記下可疑來電資訊以便通報","verifiedSafe"],
      ["提醒家人朋友注意","verifiedSafe"]
    ]
  },
  verifiedSafe: {
    speaker: "旁白",
    text: "你透過自行找到的官方管道完成查證，沒有提供驗證碼。",
    ending: "safe"
  },
  safe: {
    speaker: "旁白",
    text: "你拒絕提供驗證資料，避免了進一步風險。",
    ending: "safe"
  },
  warning: {
    speaker: "旁白",
    text: "雖然你一開始有些猶豫，但最後仍及時修正判斷。",
    ending: "warning"
  }
};

/* ===== 遊戲狀態 ===== */

let state;
let phone;
let shopTimer = null;
let swipeStart = null;

const BANNER_DURATION = 4000;
let bannerTimer = null;
let bannerHideTimer = null;
let activeBanner = null;
let bannerQueue = [];
let bannerSerial = 0;

const stage = () => stages[state.stage];
const clamp = n => Math.max(0, Math.min(100, n));

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function btn(label, action, style = "") {
  return `
    <button class="btn ${style}"
      data-action="${action}">
      ${label}
    </button>`;
}

/* ===== 通知 ===== */

function notificationIcon(type) {
  if (type === "chat") return "💬";
  if (type === "mail") return "✉️";
  if (type === "facts") return "🔎";
  return "🔔";
}

function bannerHTML() {
  if (!activeBanner) return "";

  const n = activeBanner;

  return `
    <div class="live-notification"
      data-notification="${escapeHTML(n.id)}">
      <div class="live-notification-icon">
        ${notificationIcon(n.type)}
      </div>
      <div class="live-notification-content">
        <div class="live-notification-title">
          ${escapeHTML(n.title)}
        </div>
        <div class="live-notification-body">
          ${escapeHTML(n.body)}
        </div>
      </div>
      <div class="live-notification-time">現在</div>
    </div>`;
}

function clearNotificationBanners() {
  clearTimeout(bannerTimer);
  clearTimeout(bannerHideTimer);
  activeBanner = null;
  bannerQueue = [];
}

function updateBannerDOM() {
  const screen = document.querySelector(".phone .screen");
  if (!screen) return;

  screen.querySelector(".live-notification")?.remove();

  if (activeBanner) {
    screen.insertAdjacentHTML("beforeend", bannerHTML());
  }
}

function showNextBanner() {
  if (activeBanner || bannerQueue.length === 0) return;

  activeBanner = bannerQueue.shift();
  updateBannerDOM();

  bannerTimer = setTimeout(
    hideNotificationBanner,
    BANNER_DURATION
  );
}

function showNotificationBanner(notification) {
  bannerQueue.push(notification);
  showNextBanner();
}

function hideNotificationBanner() {
  if (!activeBanner) return;

  clearTimeout(bannerTimer);

  const banner = document.querySelector(".live-notification");
  if (banner) banner.classList.add("hide");

  bannerHideTimer = setTimeout(() => {
    activeBanner = null;
    updateBannerDOM();
    showNextBanner();
  }, 400);
}

function dismissActiveBanner() {
  clearTimeout(bannerTimer);
  clearTimeout(bannerHideTimer);
  activeBanner = null;
  updateBannerDOM();
  showNextBanner();
}

function notify(type, title, body, which = state.stage) {
  const notification = {
    id: `notification-${++bannerSerial}`,
    type,
    title,
    body,
    stage: which,
    read: false
  };

  phone.notifications.unshift(notification);
  playSound("message");
  showNotificationBanner(notification);
}

function addMessage(sender, text) {
  phone.messages.unshift({ sender, text });
  playSound("message");
}

/* ===== 遊戲初始化 ===== */

function resetGame() {
  clearTimeout(shopTimer);
  clearNotificationBanners();
  stopRing();
  stopCharacterSpeech();

  state = {
    scene: "home",
    stage: 0,
    judgment: 50,
    trust: 50,
    checks: 0,
    checkedCurrent: false,
    selected: 0,
    infoAnswer: -1,
    history: [],

    chatNode: "start",
    chatMessages: [],
    chatDone: false,
    chatVerified: false,

    callNode: "intro",
    callStatus: "ringing",
    callHistory: [],
    callDone: false,
    callVerified: false,

    shopAds: [],
    shopId: 0,
    shopClosed: 0,
    shopPhase: "normal",
    shopStart: 0,
    shopOutcome: null,

    simulatedWarning: false,
    securityReviewed: false,

    learnerName: "",
    certStyle: "certificate"
  };

  phone = {
    open: window.innerWidth > 850,
    app: "home",
    shade: false,
    notifications: [],
    messages: [],
    articleStage: null,
    readStages: new Set()
  };
}

function navigate(scene) {
  state.scene = scene;
  render();
  window.scrollTo(0, 0);
}

function prepareStage() {
  const s = stage();

  phone.shade = false;
  phone.articleStage = null;

  if (state.stage === 1) {
    const previous = state.history.find(h => h.stage === 1);

    if (previous) {
      const message = previous.risky
        ? "你昨天說停課，結果學校說正常上課耶！"
        : "還好你提醒大家查證，不然我們差點相信了！";

      addMessage("小宇", message);
      notify("chat", "小宇", message);
    }
  }

  if (state.stage === 3) {
    const previous = state.history.find(h => h.stage === 3);

    if (previous) {
      notify(
        "chat",
        "朋友的提醒",
        previous.risky
          ? "你之前是不是點過奇怪的購物廣告？要小心喔！"
          : "你之前有先查證商品資訊，這樣比較安心。"
      );
    }
  }

  if (s.type === "article") {
    phone.app = "home";

    if (state.stage === 0) {
      notify("chat", "班級群組・小宇", s.post);
      addMessage("班級群組", s.post);
    } else if (state.stage === 1) {
      notify("chat", "熱門影片分享", s.post);
      addMessage("熱門影片分享", s.post);
    } else {
      notify("mail", "限時購物優惠", s.post);
    }
  }

  if (s.type === "chat") {
    state.chatNode = "start";
    state.chatMessages = [];
    state.chatDone = false;
    state.chatVerified = false;
    phone.app = "chat";

    enterChat("start");
  }

  if (s.type === "call") {
    state.callNode = "intro";
    state.callStatus = "ringing";
    state.callHistory = [];
    state.callDone = false;
    state.callVerified = false;
    phone.app = "home";

    startRing();
  }
}

/* ===== 基本版面 ===== */

function stats() {
  return `
    <div class="stats">
      <div class="stat">
        <small>判斷力</small>
        <strong>${state.judgment}</strong>
      </div>
      <div class="stat">
        <small>社群信任</small>
        <strong>${state.trust}</strong>
      </div>
      <div class="stat">
        <small>查證紀錄</small>
        <strong>${state.checks}</strong>
      </div>
    </div>`;
}

function layout(content) {
  app.innerHTML = `
    <div class="layout">
      <div>
        <div class="eyebrow">
          INFORMATION RIPPLE　階段 ${state.stage + 1}/6
        </div>
        <div class="progress">
          <div style="width:${(state.stage + 1) / 6 * 100}%"></div>
        </div>
        <section class="card">${content}</section>
        ${stats()}
      </div>
      ${renderPhone()}
    </div>

    <button class="phone-launcher"
      data-action="${phone.open ? "closePhone" : "openPhone"}">
      ${phone.open ? "收合手機 ✕" : "📱 開啟手機"}
    </button>`;
}

function appHead(title) {
  return `
    <div class="apphead">
      <button class="mini" data-action="app-home">
        ‹ 返回
      </button>
      <strong>${title}</strong>
    </div>`;
}

/* ===== 模擬手機 App ===== */

function phoneDesktop() {
  return `
    <div class="desktop">
      <div class="desktop-time">09:41</div>
      <div class="desktop-date">
        資訊漣漪・模擬手機
      </div>

      ${state.simulatedWarning && !state.securityReviewed ? `
        <div class="notice" style="font-size:12px">
          ⚠️ 模擬安全通知
          <p>可前往事實查證資訊網了解。</p>
        </div>` : ""}

      <div class="apps">
        <button class="appicon" data-action="app-browser">
          <span>🌐</span>瀏覽器
        </button>

        <button class="appicon" data-action="app-mail">
          <span>✉</span>信箱
        </button>

        <button class="appicon" data-action="app-facts">
          <span>✓</span>事實查證
        </button>

        <button class="appicon" data-action="app-chat">
          <span>💬</span>聊聊
        </button>
      </div>

      <div class="desktop-tip">
        點擊頂部狀態列查看通知
      </div>
    </div>`;
}

function browserApp() {
  return `
    <div class="page">
      ${appHead("🌐 瀏覽器")}
      <div class="item">🔒 模擬瀏覽器首頁</div>
      <h3>最近瀏覽</h3>

      ${state.stage >= 2 ? `
        <button class="item"
          data-action="openShopFromPhone">
          🛒 神奇記憶貼片購物網站
        </button>` : ""}

      ${phone.notifications
        .filter(n => n.type === "facts")
        .map(n => `
          <button class="item" data-article="${n.stage}">
            <small>查證文章</small>
            ${escapeHTML(n.title)}
          </button>
        `).join("")}

      <div class="item">
        網站顯示安全警告，
        不代表裝置真的感染病毒。
      </div>
    </div>`;
}

function mailApp() {
  const mails = phone.notifications.filter(n => n.type === "mail");

  return `
    <div class="page">
      ${appHead("✉ 信箱")}
      <h3>收件匣</h3>

      ${mails.map(n => `
        <button class="item"
          data-notification="${escapeHTML(n.id)}">
          <small>${n.read ? "已讀" : "● 未讀"}</small>
          <strong>${escapeHTML(n.title)}</strong>
          <div>${escapeHTML(n.body)}</div>
        </button>
      `).join("") || "<p>目前沒有郵件。</p>"}
    </div>`;
}

function factsApp() {
  return `
    <div class="page">
      ${appHead("✓ 事實查證資訊網")}
      <h3>資訊查證中心</h3>

      <p>
        確認原始來源、比較不同證據，
        不因大量流傳就直接相信。
      </p>

      ${state.simulatedWarning ? `
        <div class="item">
          <strong>⚠️ 模擬安全事件說明</strong>
          <p>
            網頁中的病毒警告可能只是恐嚇式廣告。
            不要點擊不明修復按鈕，
            也不要下載未知程式。
          </p>

          ${state.securityReviewed
            ? "✓ 已閱讀安全說明"
            : btn("完成安全說明", "reviewSecurity", "good")}
        </div>` : ""}

      <h3>查證文章</h3>

      ${phone.notifications
        .filter(n => n.type === "facts")
        .map(n => `
          <button class="item"
            data-notification="${escapeHTML(n.id)}">
            <small>階段 ${n.stage + 1}</small>
            ${escapeHTML(n.title)}
          </button>
        `).join("") || "<p>目前沒有新文章。</p>"}
    </div>`;
}

function chatApp() {
  if (stage().type === "chat" &&
      state.scene === "chat") {
    return `
      <div class="page">
        ${appHead("💬 聊聊")}

        <div class="chathead">
          <div class="avatar">
            ${state.stage === 3 ? "👥" : "👤"}
          </div>
          <strong>
            ${state.stage === 3
              ? "福氣分享交流會（128）"
              : "好友・阿哲"}
          </strong>
        </div>

        <div class="bubbles">
          ${state.chatMessages.map(m => `
            <div class="bubble ${m[0] === "你" ? "mine" : ""}">
              <small>${escapeHTML(m[0])}</small>
              <p>${escapeHTML(m[1])}</p>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  return `
    <div class="page">
      ${appHead("💬 聊聊")}
      <h3>聊天室</h3>

      ${phone.messages.map(m => `
        <div class="item">
          <small>${escapeHTML(m.sender)}</small>
          ${escapeHTML(m.text)}
        </div>
      `).join("") || "<p>目前沒有訊息。</p>"}
    </div>`;
}

function articleApp() {
  const index = phone.articleStage;

  if (index === null || !stages[index]?.evidenceTitle) {
    return factsApp();
  }

  const s = stages[index];

  return `
    <div class="page">
      ${appHead("查證文章")}

      <div class="article">
        <small>模擬查證資料・階段 ${index + 1}</small>
        <h3>${s.evidenceTitle}</h3>
        <p>${s.evidence}</p>

        ${phone.readStages.has(index)
          ? "✓ 已完成閱讀"
          : index === state.stage
            ? btn(
                "完成閱讀並記錄查證",
                "finishEvidence",
                "good"
              )
            : "歷史文章"}
      </div>
    </div>`;
}

/* ===== 電話畫面 ===== */

function callPhone() {
  const ringing = state.callStatus === "ringing";
  const active = state.callStatus === "active";

  return `
    <div class="call ${ringing ? "ringing" : ""}">
      <div class="call-avatar">👤</div>
      <div class="call-name">客服中心（未驗證）</div>
      <div class="call-number">
        +886 9XX-XXX-XXX
      </div>

      <div class="call-status">
        ${ringing
          ? "來電中……"
          : active
            ? "通話中"
            : "通話已結束"}
      </div>

      <div class="call-actions">
        ${ringing ? `
          <button class="call-btn reject"
            data-action="rejectCall"
            aria-label="拒接電話">✕</button>

          <button class="call-btn accept"
            data-action="acceptCall"
            aria-label="接聽電話">☎</button>
        ` : active ? `
          <button class="call-btn reject"
            data-action="hangupCall"
            aria-label="掛斷電話">✕</button>
        ` : ""}
      </div>

      ${active ? `
        <div class="voice-indicator">
          <div class="voice-waves">
            <span></span><span></span>
            <span></span><span></span><span></span>
          </div>
          <div id="voiceIndicator">
            語音待命
          </div>
        </div>
      ` : ""}
    </div>`;
}

/* ===== 通知中心 ===== */

function shadeHTML() {
  return `
    <div class="shade ${phone.shade ? "open" : ""}">
      <div class="shade-handle"></div>

      <div style="display:flex;justify-content:space-between">
        <strong>通知中心</strong>
        <button class="mini" data-action="closeShade">
          完成
        </button>
      </div>

      <div class="tiles">
        <div class="tile">📶 Wi-Fi 已連線</div>
        <div class="tile">🔔 通知已開啟</div>
      </div>

      ${phone.notifications.map(n => `
        <button class="notification"
          data-notification="${escapeHTML(n.id)}">
          <small>
            ${n.read ? "已讀" : "● 新通知"}・
            ${n.type === "chat" ? "聊聊"
              : n.type === "mail" ? "信箱"
              : n.type === "facts" ? "事實查證"
              : "系統"}
          </small>

          <strong>${escapeHTML(n.title)}</strong>
          <p>${escapeHTML(n.body)}</p>
        </button>
      `).join("") || "<p>目前沒有通知。</p>"}

      ${btn("清除已讀通知", "clearRead")}
    </div>`;
}

function renderPhone() {
  const content =
    stage().type === "call" &&
    ["call","callOutcome"].includes(state.scene)
      ? callPhone()
      : ({
          home: phoneDesktop,
          browser: browserApp,
          mail: mailApp,
          facts: factsApp,
          chat: chatApp,
          article: articleApp
        }[phone.app] || phoneDesktop)();

  return `
    <div class="phone-backdrop ${phone.open ? "open" : ""}"
      data-action="closePhone"></div>

    <aside class="phone-col ${phone.open ? "open" : ""}">
      ${btn("← 收合手機", "closePhone")}

      <div class="phone">
        <div class="statusbar" id="swipeArea"
          data-action="toggleShade">
          <span>09:41</span>
          <span class="notch"></span>
          <span>●● Wi-Fi ▰</span>
        </div>

        <div class="screen">
          ${content}
          ${shadeHTML()}
          ${bannerHTML()}
        </div>

        <div class="homebar">
          <button data-action="app-home"
            aria-label="返回手機桌面"></button>
        </div>
      </div>
    </aside>`;
}

/* ===== 查證 ===== */

function requestEvidence() {
  notify(
    "facts",
    stage().evidenceTitle,
    "新的查證資料已送達，點擊通知即可查看。"
  );

  phone.open = true;
  render();
}

function openNotification(id) {
  const n = phone.notifications.find(x => x.id === id);
  if (!n) return;

  n.read = true;
  phone.shade = false;
  phone.open = true;

  if (n.type === "facts") {
    phone.articleStage = n.stage;
    phone.app = "article";
  } else {
    phone.app =
      n.type === "chat" ? "chat" :
      n.type === "mail" ? "mail" :
      n.type === "system" ? "facts" :
      "home";
  }

  render();
}

function finishEvidence() {
  const index = phone.articleStage;

  if (index !== state.stage ||
      phone.readStages.has(index)) return;

  phone.readStages.add(index);
  state.checkedCurrent = true;
  state.checks++;
  state.judgment = clamp(state.judgment + 4);

  phone.app = "facts";
  render();
}

function reviewSecurity() {
  if (!state.simulatedWarning ||
      state.securityReviewed) return;

  state.securityReviewed = true;
  state.checks++;
  state.judgment = clamp(state.judgment + 5);

  notify(
    "system",
    "安全說明完成",
    "你已了解如何辨識可疑安全警告。"
  );

  render();
}

/* ===== 首頁 ===== */

function renderHome() {
  app.innerHTML = `
    <div class="intro">
      <section class="card">
        <div class="eyebrow">
          SIX-STAGE DIGITAL CITIZEN CHALLENGE
        </div>

        <h1>資訊漣漪</h1>
        <h2>你的一次分享，改變了什麼？</h2>

        <p>
          在六個接近真實生活的數位情境中，
          操作手機、閱讀訊息、查證資訊，
          並觀察每次決定造成的影響。
        </p>

        <div class="notice">
          本遊戲所有網站、人物、來電與病毒警告
          均為模擬情境。
        </div>

        ${btn("開始六階段挑戰 ▶", "start", "primary")}
      </section>
    </div>`;
}

/* ===== 第一至三階段 ===== */

function renderStory() {
  const s = stage();

  layout(`
    <div class="eyebrow">${s.topic}</div>
    <h2>${s.title}</h2>

    <div class="post">
      <small>${s.sender}</small>
      <p>${s.post}</p>
    </div>

    <p>${s.story}</p>

    <div class="notice">
      📱 你可以先查看手機通知與其他 App。
    </div>

    ${btn(
      state.stage === 2
        ? "進入購物網站 →"
        : "開始判斷 →",
      state.stage === 2
        ? "startShop"
        : "decision",
      "primary"
    )}
  `);
}

function renderDecision() {
  const s = stage();

  layout(`
    <div class="eyebrow">現在輪到你做決定</div>
    <h2>${s.title}</h2>

    <div class="post">
      <small>${s.sender}</small>
      <p>${s.post}</p>
    </div>

    ${state.checkedCurrent
      ? '<div class="notice">✓ 已完成查證</div>'
      : btn("🔎 尋找查證資料", "requestEvidence")}

    <div class="actions">
      ${s.options.map((x,i) =>
        btn(`${"ABC"[i]}　${x}`, `choose-${i}`)
      ).join("")}
    </div>
  `);
}

function choose(i) {
  const s = stage();

  state.selected = i;
  state.judgment = clamp(
    state.judgment + s.impact[i][0]
  );
  state.trust = clamp(
    state.trust + s.impact[i][1]
  );

  state.history.push({
    stage: state.stage + 1,
    title: s.title,
    choice: s.options[i],
    checked: state.checkedCurrent,
    risky: i === 0
  });

  navigate("outcome");
}

function renderOutcome() {
  const s = stage();

  layout(`
    <div class="eyebrow">你的選擇產生了影響</div>
    <h2>故事接下來……</h2>

    <div class="post">
      <p>${s.results[state.selected]}</p>
    </div>

    <div class="notice">${s.lesson}</div>

    <p>
      你做出的選擇，可能會在後續階段
      產生新的訊息回饋。
    </p>

    ${btn("進入下一階段 →", "next", "primary")}
  `);
}

/* ===== 第三階段：購物廣告 ===== */

const SHOP_SAFE_LIMIT = 12;
const SHOP_CHAOS_LIMIT = 40;

const adTemplates = [
  {
    type: "visual",
    title: "🧠 記憶力提升神器",
    text: "每天貼一片，學習效率大提升？",
    emoji: "🧠",
    tag: "今日特價 6 折"
  },
  {
    type: "flash",
    title: "🔥 限時超級優惠",
    text: "再不購買就錯過優惠！",
    emoji: "🎁",
    tag: "立即搶購"
  },
  {
    type: "floating",
    title: "🎉 恭喜獲得獎勵",
    text: "你獲得了一份神祕禮物！",
    emoji: "🎊",
    tag: "點擊領取"
  },
  {
    type: "countdown",
    title: "⏰ 最後購買機會",
    text: "優惠即將結束！",
    emoji: "⏳",
    tag: "00:00:15"
  },
  {
    type: "security",
    title: "⚠️ 裝置安全警告",
    text: "偵測到可疑程式！請立即修復！",
    emoji: "🛡️",
    tag: "立即修復"
  },
  {
    type: "visual",
    title: "📦 熱銷商品推薦",
    text: "超過 10,000 人都在討論？",
    emoji: "📦",
    tag: "熱銷排行"
  },
  {
    type: "flash",
    title: "💰 今日限定折扣",
    text: "只有現在才有這個價格！",
    emoji: "💸",
    tag: "限時優惠"
  },
  {
    type: "security",
    title: "🚨 系統風險提示",
    text: "請勿離開此頁面，立即執行掃描！",
    emoji: "🚨",
    tag: "開始掃描"
  }
];

function addAd() {
  const template = adTemplates[
    Math.floor(Math.random() * adTemplates.length)
  ];

  state.shopAds.push({
    ...template,
    id: ++state.shopId,
    x: Math.random() * 52,
    y: Math.random() * 69
  });
}

function startShop() {
  clearTimeout(shopTimer);

  state.shopAds = [];
  state.shopId = 0;
  state.shopClosed = 0;
  state.shopPhase = "normal";
  state.shopStart = 0;
  state.shopOutcome = null;

  addAd();
  addAd();

  navigate("shop");
}

function closeAd(id) {
  if (state.shopPhase !== "normal") return;

  const index = state.shopAds.findIndex(
    ad => ad.id === id
  );

  if (index === -1) return;

  state.shopAds.splice(index, 1);
  state.shopClosed++;

  if (state.shopClosed >= SHOP_SAFE_LIMIT) {
    triggerSafeTransition();
    return;
  }

  addAd();

  if (state.shopClosed % 3 === 0) addAd();

  if (state.shopAds.length > 8) {
    state.shopAds.shift();
  }

  render();
}

function triggerSafeTransition() {
  if (state.shopPhase !== "normal") return;

  clearTimeout(shopTimer);

  state.shopOutcome = "safe";
  state.shopPhase = "transition";
  state.judgment = clamp(state.judgment + 8);
  state.trust = clamp(state.trust + 5);

  notify(
    "system",
    "謹慎操作紀錄",
    "你沒有點擊可疑廣告，成功避免誤觸。"
  );

  render();

  shopTimer = setTimeout(() => {
    if (state.scene === "shop") {
      navigate("question");
    }
  }, 4300);
}

function triggerChaos() {
  if (state.shopPhase !== "normal") return;

  clearTimeout(shopTimer);

  state.shopOutcome = "chaos";
  state.shopPhase = "chaos";
  state.shopStart = Date.now();
  state.shopAds = [];
  state.simulatedWarning = true;
  state.securityReviewed = false;

  notify(
    "system",
    "模擬安全異常",
    "可疑網站出現大量廣告與假安全警告。"
  );

  shopTick();
}

function shopTick() {
  if (state.scene !== "shop" ||
      state.shopPhase !== "chaos") return;

  const elapsed = Date.now() - state.shopStart;

  const targetCount = Math.min(
    SHOP_CHAOS_LIMIT,
    3 + Math.floor(elapsed / 115)
  );

  while (state.shopAds.length < targetCount) {
    addAd();
  }

  if (elapsed >= 4500) {
    state.shopPhase = "transition";
    render();

    shopTimer = setTimeout(() => {
      if (state.scene === "shop") {
        navigate("question");
      }
    }, 4300);

    return;
  }

  render();
  shopTimer = setTimeout(shopTick, 115);
}

function renderAd(ad, index) {
  let visual = "";

  if (["visual", "flash", "floating"].includes(ad.type)) {
    visual = `
      <div class="ad-art">
        <span>${ad.emoji}</span>
      </div>

      ${ad.type === "visual"
        ? `<div class="ad-discount">${ad.tag}</div>`
        : ""}`;
  }

  if (ad.type === "countdown") {
    visual = `
      <div class="ad-countdown">
        ⏳ ${ad.tag}
      </div>`;
  }

  if (ad.type === "security") {
    visual = `
      <div class="ad-security-icon">
        ${ad.emoji}
      </div>`;
  }

  return `
    <div class="popup ${ad.type}"
      style="
        left:${ad.x}%;
        top:${ad.y}%;
        z-index:${index + 1};
      ">

      <strong>${ad.title}</strong>

      ${state.shopPhase === "normal" ? `
        <button class="popup-close"
          data-ad="${ad.id}"
          aria-label="關閉廣告">×</button>
      ` : ""}

      ${visual}

      <p>${ad.text}</p>

      <button class="popup-action"
        data-action="shopTrap"
        ${state.shopPhase !== "normal"
          ? "disabled"
          : ""}>
        ${ad.type === "security"
          ? "立即修復"
          : "查看詳情"}
      </button>
    </div>`;
}

function renderShop() {
  const safe = state.shopOutcome === "safe";

  layout(`
    <div class="eyebrow">
      階段三 / 可疑購物網站
    </div>

    <h2>神奇記憶貼片｜限時優惠</h2>

    <p>
      你正在瀏覽陌生購物網站。
      各種促銷與安全警告不斷出現。
      試著辨識哪些內容值得相信。
    </p>

    <div class="shop">
      <div class="shophead">
        <strong>超值 GO 購物站（虛構）</strong>
        <div class="shopsearch">
          🔍 搜尋商品、品牌與優惠
        </div>
      </div>

      <div class="banner">
        🔥 今日限定！最高 6 折
      </div>

      <div class="product">
        <div class="product-pic">🧠</div>
        <div>
          <strong>神奇記憶貼片</strong>
          <div class="price">NT$399</div>
          <small style="text-decoration:line-through">
            NT$999
          </small>
          <div style="font-size:12px;color:#ad7b21">
            ★★★★★ 4.9・模擬評價
          </div>
        </div>
      </div>

      <div class="shop-description">
        <strong>商品介紹</strong>
        <p>
          商家宣稱能提升記憶力與專注力，
          但沒有提供可靠研究證據。
        </p>
      </div>

      <div class="shop-buy">
        <button data-action="shopTrap">
          加入購物車
        </button>
        <button data-action="shopTrap">
          立即購買
        </button>
      </div>

      ${state.shopAds.map(
        (ad,i) => renderAd(ad,i)
      ).join("")}

      ${state.shopPhase === "transition" ? `
        <div class="shop-overlay">
          <div class="cinematic-message">
            <div class="eyebrow">
              ${safe
                ? "DIGITAL AWARENESS"
                : "INFORMATION OVERLOAD"}
            </div>

            <h2>
              ${safe
                ? `你沒有被廣告牽著走，
                   <span>而是守住了自己的判斷。</span>`
                : `當資訊不斷湧入，
                   <span>你還能分辨真假嗎？</span>`}
            </h2>

            <p>
              ${safe
                ? "面對大量廣告，你選擇保持謹慎。但真正的資訊識讀，還包括主動查證商品宣稱。"
                : "每一次點擊，都可能影響你的判斷。你能從這次經驗學到什麼？"}
            </p>

            <div class="cinematic-loading">
              <div></div>
            </div>

            <small>
              即將進入下一段旅程……
            </small>
          </div>
        </div>
      ` : ""}
    </div>

    <div class="shop-footer">
      <span>
        ${state.shopPhase === "normal"
          ? `已安全關閉 ${state.shopClosed} / ${SHOP_SAFE_LIMIT} 個廣告`
          : state.shopPhase === "chaos"
            ? "模擬廣告失控中……"
            : "正在進入反思階段……"}
      </span>

      ${state.shopPhase === "normal"
        ? btn("離開可疑網站", "leaveShop", "good")
        : ""}
    </div>

    <div class="notice">
      這些廣告、警告與動畫均為模擬，
      不會真的感染裝置。
    </div>
  `);
}

const infoOptions = [
  "100 則",
  "500 則",
  "1,000 則",
  "5,000 則以上"
];

function renderQuestion() {
  layout(`
    <div class="eyebrow">
      階段三 / 資訊過載
    </div>

    <h2>你每天接觸多少資訊？</h2>

    <p>
      社群貼文、廣告、新聞、影片與通知，
      每天不斷出現在生活中。
    </p>

    <div class="notice">
      這是直覺估計題，沒有標準答案。
    </div>

    <div class="actions">
      ${infoOptions.map((x,i) =>
        btn(x, `info-${i}`)
      ).join("")}
    </div>
  `);
}

function renderReflection() {
  const safe = state.shopOutcome === "safe";
  const left = state.shopOutcome === "left";

  const feedback = safe
    ? "你成功關閉 12 個廣告，沒有誤觸可疑內容。但仍應查證商品宣稱是否可信。"
    : left
      ? "你選擇離開可疑購物網站。當網站讓你感到不安全時，主動離開也是合理的選擇。"
      : "你誤觸了可疑廣告，隨後出現大量模擬彈窗。不要因恐懼或急迫感點擊未知修復按鈕。";

  layout(`
    <div class="eyebrow">
      階段三 / 資訊過載反思
    </div>

    <h2>
      你的估計：${infoOptions[state.infoAnswer]}
    </h2>

    <p>
      每個人接觸的資訊量不同，
      也取決於如何定義一則資訊。
    </p>

    <div class="notice">${feedback}</div>

    ${btn(
      "繼續階段三的判斷 →",
      "decision",
      "primary"
    )}
  `);
}

/* ===== 第四、六階段聊天 ===== */

function dialogueData() {
  return state.stage === 3
    ? groupDialogue
    : friendDialogue;
}

function enterChat(id) {
  const node = dialogueData()[id];
  if (!node) return;

  state.chatNode = id;

  if (
    state.stage === 3 &&
    ["independent","warn","verifiedLeave"].includes(id)
  ) {
    state.chatVerified = true;
  }

  if (
    state.stage === 5 &&
    ["verify","mutualFriend","protectAccount","warnFriends"]
      .includes(id)
  ) {
    state.chatVerified = true;
  }

  const messages = node.messages || [];
  state.chatMessages.push(...messages);

  const incoming = messages.filter(m =>
    m[0] !== "你" && m[0] !== "系統"
  );

  if (incoming.length) {
    const last = incoming[incoming.length - 1];

    notify(
      "chat",
      state.stage === 3
        ? "福氣分享交流會"
        : "好友・阿哲",
      `${last[0]}：${last[1]}`
    );
  }

  if (node.ending) {
    finishChat(node.ending);
  }
}

function chooseChat(i) {
  if (state.chatDone) return;

  const option = dialogueData()[state.chatNode].choices?.[i];
  if (!option) return;

  state.chatMessages.push(["你", option[0]]);
  enterChat(option[1]);
  render();
}

function finishChat(result) {
  if (state.chatDone) return;

  state.chatDone = true;

  const safe = result === "safe";
  const leave = result === "leave";

  const impact = state.stage === 3
    ? safe ? [16,12] : leave ? [12,10] : [-12,-8]
    : safe ? [18,14] : [-16,-12];

  state.judgment = clamp(
    state.judgment + impact[0]
  );
  state.trust = clamp(
    state.trust + impact[1]
  );

  if (state.chatVerified) state.checks++;

  state.history.push({
    stage: state.stage + 1,
    title: stage().title,
    choice: safe
      ? "謹慎處理可疑訊息"
      : leave
        ? "退出陌生群組"
        : "相信未經查證的資訊",
    checked: state.chatVerified,
    risky: result === "risky"
  });
}

function renderChat() {
  const node = dialogueData()[state.chatNode];

  layout(`
    <div class="eyebrow">${stage().topic}</div>
    <h2>${stage().title}</h2>
    <p>${stage().story}</p>

    ${state.chatDone ? `
      <div class="notice">
        ${stage().lesson}
      </div>

      ${btn(
        "進入下一階段 →",
        "next",
        "primary"
      )}
    ` : `
      <div class="post">
        <p>${node.prompt}</p>
      </div>

      ${node.choices.map((x,i) => `
        <button class="choice"
          data-chat-choice="${i}">
          ${"ABC"[i]}　${x[0]}
        </button>
      `).join("")}
    `}

    <div class="notice">
      📱 打開「聊聊」可以查看完整對話。
      新訊息會從手機頂部滑入，
      4 秒後自動收回。
    </div>
  `);
}

/* ===== 第五階段：語音電話 ===== */

function acceptCall() {
  if (state.callStatus !== "ringing") return;

  stopRing();
  state.callStatus = "active";

  render();
  speakCallNode();
}

function finishCall(result) {
  if (state.callDone) return;

  stopRing();
  stopCharacterSpeech();

  state.callDone = true;
  state.callStatus = "ended";

  if (state.callVerified) {
    state.checks++;
    state.judgment = clamp(state.judgment + 5);
  }

  const impact = {
    safe: [16,12],
    warning: [10,8],
    rejected: [8,6],
    hungup: [12,10]
  }[result] || [8,6];

  state.judgment = clamp(
    state.judgment + impact[0]
  );
  state.trust = clamp(
    state.trust + impact[1]
  );

  state.history.push({
    stage: 5,
    title: stage().title,
    choice: result === "rejected"
      ? "拒接陌生來電"
      : result === "hungup"
        ? "主動掛斷"
        : result === "safe"
          ? "拒絕提供驗證碼"
          : "及時察覺可疑要求",
    checked: state.callVerified,
    risky: false
  });

  navigate("callOutcome");
}

function chooseCall(i) {
  if (state.callDone) return;

  const node = callDialogue[state.callNode];
  const option = node.choices?.[i];
  if (!option) return;

  state.callHistory.push(
    [node.speaker, node.text],
    ["你", option[0]]
  );

  // 先播放主角的青少年聲音
  speakCharacter(option[0], "player");

  state.callNode = option[1];

  if (
    ["officialApp","officialWebsite","officialSupport"]
      .includes(option[1])
  ) {
    state.callVerified = true;
  }

  const next = callDialogue[state.callNode];

  if (next.ending) {
    state.callHistory.push([
      next.speaker,
      next.text
    ]);

    finishCall(next.ending);
    return;
  }

  render();

  // 主角說完後，詐騙者再回應
  // 以語音播放佇列維持對話順序
  if (speechSystem.enabled &&
      "speechSynthesis" in window) {

    stopCharacterSpeech();

    const playerLine = new SpeechSynthesisUtterance(
      option[0]
    );

    playerLine.lang = "zh-TW";
    playerLine.voice = chooseChineseVoice("player");
    playerLine.pitch = 1.35;
    playerLine.rate = 1.08;

    const responseLine = new SpeechSynthesisUtterance(
      next.text
    );

    responseLine.lang = "zh-TW";

    const role = next.speaker === "陌生來電者"
      ? "scammer"
      : "narrator";

    responseLine.voice = chooseChineseVoice(role);

    responseLine.pitch = role === "scammer" ? .72 : 1;
    responseLine.rate = role === "scammer" ? .88 : .95;

    playerLine.onstart = () => {
      speechSystem.speaking = true;
      updateVoiceIndicator();
    };

    responseLine.onend = () => {
      speechSystem.speaking = false;
      updateVoiceIndicator();
    };

    responseLine.onerror = () => {
      speechSystem.speaking = false;
      updateVoiceIndicator();
    };

    speechSynthesis.speak(playerLine);
    speechSynthesis.speak(responseLine);
  }
}

function renderCall() {
  if (state.callStatus === "ringing") {
    layout(`
      <h2>📞 你的手機突然響起……</h2>
      <p>${stage().story}</p>

      <div class="notice">
        你可以透過右側手機的綠色接聽鍵
        或紅色拒接鍵操作。
        兩顆按鈕會交錯上下浮動。
      </div>

      <div class="actions">
        ${btn("接聽電話", "acceptCall", "good")}
        ${btn("拒接電話", "rejectCall", "danger")}
      </div>
    `);
    return;
  }

  const node = callDialogue[state.callNode];

  layout(`
    <div class="eyebrow">
      階段五 / 通話進行中
    </div>

    <h2>陌生來電</h2>

    <div class="post">
      <small>${node.speaker}</small>
      <p>${node.text}</p>
    </div>

    <div class="notice">
      🎙️ 語音角色：
      詐騙客服使用低沉語音，
      主角使用較年輕的聲線。
    </div>

    <div class="actions">
      ${btn(
        speechSystem.enabled
          ? "🔊 關閉角色配音"
          : "🔇 開啟角色配音",
        "toggleSpeech"
      )}

      ${btn("🔁 重播目前台詞", "replaySpeech")}
    </div>

    <h3>你會如何回答？</h3>

    ${node.choices.map((x,i) => `
      <button class="choice"
        data-call-choice="${i}">
        ${"ABC"[i]}　${x[0]}
      </button>
    `).join("")}

    <div class="post">
      <strong>通話紀錄</strong>

      ${state.callHistory.map(x => `
        <p style="font-size:14px">
          ${escapeHTML(x[0])}：
          ${escapeHTML(x[1])}
        </p>
      `).join("")}
    </div>

    ${btn("📞 立即掛斷", "hangupCall", "danger")}
  `);
}

function renderCallOutcome() {
  layout(`
    <h2>通話已結束</h2>

    <div class="notice">
      ${stage().lesson}
    </div>

    <p>
      冒充客服、製造緊迫感、
      阻止查證與索取驗證碼，
      都是值得警惕的訊號。
    </p>

    ${btn(
      "進入第六階段 →",
      "next",
      "primary"
    )}
  `);
}

/* ===== 階段切換 ===== */

function nextStage() {
  if (state.stage === 5) {
    navigate("ending");
    return;
  }

  clearTimeout(shopTimer);
  stopRing();
  stopCharacterSpeech();

  state.stage++;
  state.checkedCurrent = false;
  state.selected = 0;

  prepareStage();

  navigate(
    stage().type === "chat"
      ? "chat"
      : stage().type === "call"
        ? "call"
        : "story"
  );
}

/* ===== 遊戲結局 ===== */

function getTitle() {
  const score =
    state.judgment * .55 +
    state.trust * .45;

  return score >= 78
    ? "數位公民守護者"
    : score >= 55
      ? "謹慎的資訊探索者"
      : "持續成長的資訊旅人";
}

function renderEnding() {
  layout(`
    <div class="eyebrow">
      SIX STAGES COMPLETED
    </div>

    <h2>🎉 六階段挑戰完成！</h2>

    <div class="notice">
      你的學習稱號：
      <strong>${getTitle()}</strong>
    </div>

    <p>
      恭喜完成六個媒體識讀情境。
      你可以產生自己的學習證書或數位護照。
    </p>

    <div class="post">
      <h3>📜 我的學習成果</h3>

      <label for="learnerName">
        學習者姓名
      </label>

      <input class="field"
        id="learnerName"
        maxlength="30"
        placeholder="請輸入姓名"
        value="${escapeHTML(state.learnerName)}">

      <label for="certStyle">
        成果樣式
      </label>

      <select class="field" id="certStyle">
        <option value="certificate"
          ${state.certStyle === "certificate"
            ? "selected"
            : ""}>
          數位公民學習證書
        </option>

        <option value="passport"
          ${state.certStyle === "passport"
            ? "selected"
            : ""}>
          資訊旅人數位護照
        </option>
      </select>

      ${btn(
        "預覽我的成果",
        "previewCert",
        "primary"
      )}

      <div id="previewArea"></div>

      <div class="actions">
        ${btn("🖼️ 下載 JPG", "downloadJPG", "primary")}
        ${btn("📄 下載 PDF", "downloadPDF", "good")}
      </div>

      <p id="certMessage" aria-live="polite">
        請輸入姓名並選擇下載格式。
      </p>
    </div>

    <div class="notice">
      此文件為遊戲學習成果紀錄，
      並非正式能力認證。
    </div>

    ${btn("查看我的六階段選擇", "history")}
    ${btn("重新開始", "start")}
  `);
}

function renderHistory() {
  layout(`
    <h2>我的資訊旅程</h2>

    ${state.history.map(x => `
      <div class="history-item">
        <h3>
          階段 ${x.stage}：${x.title}
        </h3>

        <p>${escapeHTML(x.choice)}</p>

        <small>
          ${x.checked
            ? "已記錄查證"
            : "未記錄獨立查證"}
        </small>
      </div>
    `).join("")}

    ${btn("返回結局", "ending")}
    ${btn("重新開始", "start", "primary")}
  `);
}

/* ===== JPG / PDF 證書 ===== */

function certificateCanvas(name, style) {
  const passport = style === "passport";
  const canvas = document.createElement("canvas");

  canvas.width = passport ? 1000 : 1600;
  canvas.height = passport ? 1450 : 1050;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;

  const font =
    '"Noto Sans TC","Microsoft JhengHei",sans-serif';

  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0, "#091a32");
  grad.addColorStop(.5, "#153b5a");
  grad.addColorStop(1, "#0c213b");

  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  ctx.strokeStyle = "rgba(100,210,240,.10)";
  ctx.lineWidth = 1;

  for (let x=0; x<w; x+=50) {
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,h);
    ctx.stroke();
  }

  for (let y=0; y<h; y+=50) {
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(w,y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#d5b773";
  ctx.lineWidth = 7;
  ctx.strokeRect(42,42,w-84,h-84);

  ctx.strokeStyle = "#6bd8e7";
  ctx.lineWidth = 2;
  ctx.strokeRect(61,61,w-122,h-122);

  function write(text,y,size,color="#ffffff",weight=500) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(text,cx,y,w-160);
  }

  function line(y) {
    ctx.strokeStyle = "#d5b773";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130,y);
    ctx.lineTo(w-130,y);
    ctx.stroke();
  }

  const date = new Date().toLocaleDateString("zh-TW",{
    year:"numeric",
    month:"long",
    day:"numeric"
  });

  const score = Math.round(
    state.judgment * .55 + state.trust * .45
  );

  if (!passport) {
    write("INFORMATION RIPPLE",155,35,"#83e8ef",700);
    write("資訊漣漪",265,92,"#ffffff",700);
    write("數位公民學習證書",360,48,"#e9c982",700);
    line(420);
    write("茲紀錄學習者",485,29,"#c9e2f1");
    write(name,565,68,"#ffffff",700);
    write("已完成六階段數位公民挑戰",660,32);
    write(
      `學習成果分數 ${score} ｜ 查證紀錄 ${state.checks} 次`,
      740,27,"#8ee2e6"
    );
    line(810);
    write(`完成日期：${date}`,865,27,"#e6d3a7");
    write(
      "本文件為互動遊戲學習成果紀錄，非正式認證",
      948,20,"#b4c5d6"
    );
  } else {
    write("INFORMATION RIPPLE",155,29,"#8be7ee",700);
    write("資訊旅人",255,77,"#ffffff",700);
    write("數位學習護照",345,48,"#e9c982",700);
    line(410);
    write("PASSPORT HOLDER",475,24,"#8ce1e9");
    write(name,550,58,"#ffffff",700);
    write("六階段媒體識讀旅程",655,30,"#e6d3a7");

    [
      "01 校園停課傳聞",
      "02 AI 影像迷局",
      "03 購物網站陷阱",
      "04 群組裡的真相",
      "05 客服來電危機",
      "06 熟悉的陌生人"
    ].forEach((x,i) => {
      write("✓  " + x,735+i*65,27);
    });

    line(1180);
    write(`學習成果分數：${score}`,1230,27,"#8ce1e9");
    write(`完成日期：${date}`,1290,24,"#e9c982");
    write(
      "遊戲學習紀錄・非正式認證",
      1380,19,"#b7cbdc"
    );
  }

  return canvas;
}

async function certificateAction(format) {
  const input = document.getElementById("learnerName");
  const select = document.getElementById("certStyle");
  const message = document.getElementById("certMessage");

  if (!input || !select) return;

  const name = input.value.trim();

  if (!name) {
    message.textContent = "請先輸入姓名。";
    input.focus();
    return;
  }

  state.learnerName = name;
  state.certStyle = select.value;

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = certificateCanvas(name, select.value);
  const jpg = canvas.toDataURL("image/jpeg", .95);

  if (format === "preview") {
    const area = document.getElementById("previewArea");

    area.innerHTML = `
      <img class="cert-preview" alt="學習成果預覽">
    `;

    area.querySelector("img").src = jpg;

    message.textContent =
      "預覽已更新，可以下載 JPG 或 PDF。";
    return;
  }

  const filename = select.value === "passport"
    ? "資訊漣漪_數位護照"
    : "資訊漣漪_學習證書";

  if (format === "jpg") {
    const a = document.createElement("a");
    a.href = jpg;
    a.download = filename + ".jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  if (!window.jspdf?.jsPDF) {
    message.textContent =
      "PDF 函式庫未載入，請檢查網路連線。";
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: select.value === "passport"
      ? "portrait"
      : "landscape",
    unit: "mm",
    format: "a4"
  });

  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  const ratio = Math.min(
    pw / canvas.width,
    ph / canvas.height
  );

  const iw = canvas.width * ratio;
  const ih = canvas.height * ratio;

  pdf.addImage(
    jpg,
    "JPEG",
    (pw-iw)/2,
    (ph-ih)/2,
    iw,
    ih
  );

  pdf.save(filename + ".pdf");
}

/* ===== 畫面渲染 ===== */

function render() {
  switch (state.scene) {
    case "home": renderHome(); break;
    case "story": renderStory(); break;
    case "decision": renderDecision(); break;
    case "outcome": renderOutcome(); break;
    case "shop": renderShop(); break;
    case "question": renderQuestion(); break;
    case "reflection": renderReflection(); break;
    case "chat": renderChat(); break;
    case "call": renderCall(); break;
    case "callOutcome": renderCallOutcome(); break;
    case "ending": renderEnding(); break;
    case "history": renderHistory(); break;
  }
}

/* ===== 按鈕事件 ===== */

app.addEventListener("click", async e => {
  const ad = e.target.closest("[data-ad]");
  const chat = e.target.closest("[data-chat-choice]");
  const call = e.target.closest("[data-call-choice]");
  const note = e.target.closest("[data-notification]");
  const article = e.target.closest("[data-article]");
  const element = e.target.closest("[data-action]");

  if (!ad && !chat && !call &&
      !note && !article && !element) return;

  audio.enabled = true;
  playSound("click");

  if (ad) {
    closeAd(Number(ad.dataset.ad));
    return;
  }

  if (chat) {
    chooseChat(Number(chat.dataset.chatChoice));
    return;
  }

  if (call) {
    chooseCall(Number(call.dataset.callChoice));
    return;
  }

  if (note) {
    const id = note.dataset.notification;

    if (activeBanner?.id === id) {
      dismissActiveBanner();
    }

    openNotification(id);
    return;
  }

  if (article) {
    phone.articleStage = Number(article.dataset.article);
    phone.app = "article";
    phone.shade = false;
    render();
    return;
  }

  const action = element.dataset.action;

  if (action === "start") {
    resetGame();
    audio.enabled = true;
    prepareStage();
    navigate("story");
  }
  else if (action === "decision") {
    navigate("decision");
  }
  else if (action === "requestEvidence") {
    requestEvidence();
  }
  else if (action === "finishEvidence") {
    finishEvidence();
  }
  else if (action === "reviewSecurity") {
    reviewSecurity();
  }
  else if (action === "next") {
    nextStage();
  }
  else if (action === "startShop") {
    startShop();
  }
  else if (action === "leaveShop") {
    clearTimeout(shopTimer);
    state.shopOutcome = "left";
    navigate("question");
  }
  else if (action === "shopTrap") {
    triggerChaos();
  }
  else if (action === "acceptCall") {
    acceptCall();
  }
  else if (action === "rejectCall") {
    finishCall("rejected");
  }
  else if (action === "hangupCall") {
    finishCall("hungup");
  }
  else if (action === "toggleSpeech") {
    speechSystem.enabled = !speechSystem.enabled;

    if (!speechSystem.enabled) {
      stopCharacterSpeech();
    }

    render();
  }
  else if (action === "replaySpeech") {
    speakCallNode();
  }
  else if (action === "history") {
    navigate("history");
  }
  else if (action === "ending") {
    navigate("ending");
  }
  else if (action.startsWith("choose-")) {
    choose(Number(action.split("-")[1]));
  }
  else if (action.startsWith("info-")) {
    state.infoAnswer = Number(action.split("-")[1]);
    navigate("reflection");
  }
  else if (action === "openPhone") {
    phone.open = true;
    render();
  }
  else if (action === "closePhone") {
    phone.open = false;
    phone.shade = false;
    render();
  }
  else if (action === "toggleShade") {
    phone.shade = !phone.shade;
    render();
  }
  else if (action === "closeShade") {
    phone.shade = false;
    render();
  }
  else if (action === "clearRead") {
    phone.notifications =
      phone.notifications.filter(n => !n.read);
    render();
  }
  else if (action === "app-home") {
    phone.app = "home";
    phone.shade = false;
    render();
  }
  else if (action.startsWith("app-")) {
    phone.app = action.slice(4);
    phone.shade = false;
    render();
  }
  else if (action === "openShopFromPhone") {
    if (state.stage === 2 &&
        state.scene === "story") {
      startShop();
    } else {
      phone.app = "browser";
      render();
    }
  }
  else if (action === "previewCert") {
    await certificateAction("preview");
  }
  else if (action === "downloadJPG") {
    await certificateAction("jpg");
  }
  else if (action === "downloadPDF") {
    await certificateAction("pdf");
  }
});

/* ===== 通知中心滑動 ===== */

app.addEventListener("pointerdown", e => {
  const top = e.target.closest("#swipeArea");
  const shade = e.target.closest(".shade");

  if (top || shade) {
    swipeStart = {
      x: e.clientX,
      y: e.clientY,
      fromShade: !!shade
    };
  }
});

app.addEventListener("pointerup", e => {
  if (!swipeStart) return;

  const dy = e.clientY - swipeStart.y;
  const dx = e.clientX - swipeStart.x;
  const fromShade = swipeStart.fromShade;

  swipeStart = null;

  if (Math.abs(dy) < 35 ||
      Math.abs(dy) < Math.abs(dx)) return;

  if (dy > 35 && !fromShade) {
    phone.shade = true;
  } else if (dy < -35 && fromShade) {
    phone.shade = false;
  }

  render();
});

app.addEventListener("pointercancel", () => {
  swipeStart = null;
});

/* ===== 動態科技背景 ===== */

(function initializeTechBackground() {
  const canvas = document.getElementById("tech-background");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let particles = [];
  let animationId = null;

  const mouse = { x: -1000, y: -1000 };

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const config = {
    particleCount: 85,
    connectionDistance: 145,
    mouseDistance: 180,
    particleSpeed: .35,
    gridSize: 65
  };

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = Math.random() * 1.8 + .7;
      this.vx = (Math.random()-.5) * config.particleSpeed * 2;
      this.vy = (Math.random()-.5) * config.particleSpeed * 2;
      this.alpha = Math.random() * .45 + .35;
      this.phase = Math.random() * Math.PI * 2;
    }

    update(time) {
      this.x += this.vx;
      this.y += this.vy;
      this.x += Math.sin(time*.0005+this.phase)*.08;

      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.hypot(dx,dy);

      if (distance > 0 &&
          distance < config.mouseDistance) {
        const force = (
          config.mouseDistance-distance
        ) / config.mouseDistance;

        this.x += dx/distance*force*.65;
        this.y += dy/distance*force*.65;
      }

      if (this.x < -10) this.x = width+10;
      if (this.x > width+10) this.x = -10;
      if (this.y < -10) this.y = height+10;
      if (this.y > height+10) this.y = -10;
    }

    draw(time) {
      const glow = (
        Math.sin(time*.002+this.phase)+1
      )/2;

      ctx.beginPath();
      ctx.arc(
        this.x,
        this.y,
        this.radius,
        0,
        Math.PI*2
      );

      ctx.fillStyle =
        `rgba(110,225,255,${this.alpha+glow*.18})`;

      ctx.shadowBlur = 12;
      ctx.shadowColor = "#43d8ff";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);

    canvas.style.width = width+"px";
    canvas.style.height = height+"px";

    ctx.setTransform(dpr,0,0,dpr,0,0);

    particles = Array.from({
      length: width < 650
        ? 35
        : config.particleCount
    }, () => new Particle());
  }

  function drawGrid(time) {
    const grid = config.gridSize;
    const offsetX = time*.006%grid;
    const offsetY = time*.003%grid;

    ctx.lineWidth = .6;
    ctx.strokeStyle = "rgba(77,165,225,.075)";

    for (let x=offsetX; x<width; x+=grid) {
      ctx.beginPath();
      ctx.moveTo(x,0);
      ctx.lineTo(x,height);
      ctx.stroke();
    }

    for (let y=offsetY; y<height; y+=grid) {
      ctx.beginPath();
      ctx.moveTo(0,y);
      ctx.lineTo(width,y);
      ctx.stroke();
    }
  }

  function drawConnections() {
    for (let i=0; i<particles.length; i++) {
      for (let j=i+1; j<particles.length; j++) {
        const a = particles[i];
        const b = particles[j];

        const distance = Math.hypot(
          a.x-b.x,
          a.y-b.y
        );

        if (distance < config.connectionDistance) {
          const opacity = (
            1-distance/config.connectionDistance
          )*.24;

          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.strokeStyle =
            `rgba(82,202,255,${opacity})`;
          ctx.lineWidth = .8;
          ctx.stroke();
        }
      }
    }
  }

  function drawMouseGlow() {
    if (mouse.x < 0 || mouse.y < 0) return;

    const gradient = ctx.createRadialGradient(
      mouse.x,mouse.y,0,
      mouse.x,mouse.y,180
    );

    gradient.addColorStop(
      0,
      "rgba(65,195,255,.13)"
    );

    gradient.addColorStop(
      1,
      "rgba(65,195,255,0)"
    );

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
      mouse.x,
      mouse.y,
      180,
      0,
      Math.PI*2
    );
    ctx.fill();
  }

  function drawFrame(time) {
    ctx.clearRect(0,0,width,height);

    drawGrid(time);
    drawMouseGlow();

    for (const p of particles) {
      p.update(time);
    }

    drawConnections();

    for (const p of particles) {
      p.draw(time);
    }

    animationId = requestAnimationFrame(drawFrame);
  }

  function drawStaticFrame() {
    ctx.clearRect(0,0,width,height);
    drawGrid(0);
    drawConnections();

    for (const p of particles) {
      p.draw(0);
    }
  }

  function updateMotionPreference() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (reduceMotion.matches) {
      drawStaticFrame();
    } else {
      animationId = requestAnimationFrame(drawFrame);
    }
  }

  window.addEventListener(
    "mousemove",
    e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true }
  );

  window.addEventListener("mouseout", e => {
    if (!e.relatedTarget) {
      mouse.x = -1000;
      mouse.y = -1000;
    }
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    updateMotionPreference();
  });

  reduceMotion.addEventListener(
    "change",
    updateMotionPreference
  );

  resizeCanvas();
  updateMotionPreference();
})();

/* ===== 啟動遊戲 ===== */

resetGame();
render();
