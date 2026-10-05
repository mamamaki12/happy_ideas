// 100個のアプリアイデア（唯一のデータ元）。
// ギャラリー（/index.html）と ideas/IDEAS.md（scripts/gen-ideas-md.mjs で生成）の両方がこれを読む。
// slug は apps/<slug>/ に試作がある場合のディレクトリ名。built: true で試作済み。
// need: どの調査結果（docs/market-research.md）に基づくニーズか

export const CATEGORIES = {
  life: '苦労キャンセル・生活',
  health: '健康・ウェルネス',
  oshi: '推し活・エンタメ',
  social: 'つながり・コミュニケーション',
  safety: '防災・安全',
  learn: '学習・仕事',
  travel: '旅行・おでかけ',
  family: 'ペット・子育て・家族',
  money: 'お金・節約',
};

export const IDEAS = [
  // ── 苦労キャンセル・生活 ──
  { id: 1, slug: 'fridge-keeper', cat: 'life', name: '冷蔵庫番', summary: 'バーコードか手入力で食品を登録し、賞味期限が近いものを通知する。', need: '食品ロス・物価高', apis: ['camera', 'barcode', 'notification', 'storage'] },
  { id: 2, slug: 'price-memo', cat: 'life', name: '値段おぼえ帳', summary: '買った商品の値段を店ごとに記録し、前回より高いか安いかがすぐ分かる。', need: '物価高・Product Hunt「Psst」', apis: ['storage'] },
  { id: 3, slug: 'receipt-snap', cat: 'money', name: 'レシート撮るだけ家計簿', summary: 'レシートを撮影して金額だけ入力。写真付きで月ごとに集計する。', need: '苦労キャンセル・家計管理', apis: ['camera', 'storage'] },
  { id: 4, slug: 'sub-audit', cat: 'money', name: 'サブスク棚卸し', summary: '契約中のサブスクを並べて年額に換算し、更新日前に通知する。', need: 'サブスク疲れ（42%が未使用に課金）', apis: ['notification', 'storage'] },
  { id: 5, slug: 'parking-pin', cat: 'life', name: '駐車位置ピン', summary: '停めた場所を位置情報と写真で保存し、方角と距離で戻り方を示す。', need: '苦労キャンセル', apis: ['geolocation', 'orientation', 'camera'] },
  { id: 6, slug: 'trash-day', cat: 'life', name: 'ゴミの日リマインダー', summary: '地域の収集ルール（第2・第4水曜など）を登録し、前夜に通知する。', need: '単身世帯・苦労キャンセル', apis: ['notification', 'storage'] },
  { id: 7, slug: 'level-ruler', cat: 'life', name: '水平器＆定規', summary: 'スマホの傾きセンサーで水平を測り、画面を定規として使う。', need: 'DIY・引越し', apis: ['orientation'] },
  { id: 8, slug: 'split-bill', cat: 'money', name: '割り勘メーカー', summary: '傾斜つきの割り勘を計算し、結果をそのままLINE等へ共有する。', need: '飲み会・旅行', apis: ['share'] },
  { id: 9, slug: 'qr-reader', cat: 'life', name: 'QR・バーコード読み取り', summary: 'カメラでQRやバーコードを読み、履歴に残す。危険なURLは開く前に警告する。', need: 'キャッシュレス・インバウンド', apis: ['camera', 'barcode', 'clipboard'] },
  { id: 10, slug: 'leave-check', cat: 'life', name: '出かける前チェック', summary: '鍵・ガス・窓などを、指差し確認の感覚でタップして記録する。', need: '不安の軽減・苦労キャンセル', apis: ['storage', 'vibration'] },
  { id: 11, slug: 'med-reminder', cat: 'health', name: 'お薬リマインダー', summary: '服薬時刻に通知し、飲んだら1タップで記録。飲み忘れが一目で分かる。', need: '高齢化・ヘルスケア', apis: ['notification', 'storage'] },
  { id: 12, slug: 'voice-todo', cat: 'life', name: '声でToDo', summary: '話すだけでToDoを追加。手がふさがっている家事中に便利。', need: '苦労キャンセル', apis: ['speech-recognition', 'storage'] },
  { id: 13, slug: 'belongings', cat: 'life', name: '持ち物台帳', summary: '家電や持ち物を写真・購入日・保証期限つきで記録。保険や引越しに使える。', need: '苦労キャンセル', apis: ['camera', 'indexeddb'] },
  { id: 14, slug: 'meal-photo', cat: 'health', name: '食事写真ログ', summary: '食事を撮るだけ。カレンダーで食生活を振り返る。', need: 'ヘルスケア・20代女性', apis: ['camera', 'indexeddb'] },
  { id: 15, slug: 'laundry-timer', cat: 'life', name: '洗濯タイマー', summary: '洗濯・乾燥の終了時刻に通知。部屋干しの乾きやすさも気温・湿度から表示。', need: '共働き・苦労キャンセル', apis: ['notification', 'geolocation', 'fetch'] },

  // ── 健康・ウェルネス ──
  { id: 16, slug: 'heat-guard', cat: 'health', name: '熱中症ガード', summary: '現在地の気温・湿度から暑さ指数（WBGT）を推定し、外出計画と水分補給を促す。', need: '酷暑・事前計画へのシフト', apis: ['geolocation', 'fetch', 'notification'] },
  { id: 17, slug: 'water-log', cat: 'health', name: '水分補給ログ', summary: 'コップをタップして記録。一定時間飲んでいないと通知する。', need: '酷暑・ヘルスケア', apis: ['notification', 'storage'] },
  { id: 18, slug: 'neck-angle', cat: 'health', name: 'スマホ首チェッカー', summary: 'スマホを持つ角度から首への負担を推定し、うつむき過ぎを知らせる。', need: 'スクリーンタイム増加', apis: ['orientation', 'vibration'] },
  { id: 19, slug: 'breathing', cat: 'health', name: '呼吸ガイド', summary: '4-7-8呼吸などを、アニメーションと振動でガイドする。', need: 'メンタルヘルス', apis: ['vibration', 'wake-lock'] },
  { id: 20, slug: 'noise-meter', cat: 'health', name: '騒音メーター', summary: 'マイクで周囲の音量を測る。寝室や勉強部屋の環境チェックに。', need: '睡眠・集中', apis: ['microphone', 'web-audio'] },
  { id: 21, slug: 'walk-tracker', cat: 'health', name: 'おさんぽ記録', summary: '歩いたルートを位置情報で記録し、距離と時間を表示する。データは端末から出ない。', need: '歩数ポイント・健康', apis: ['geolocation', 'wake-lock', 'storage'] },
  { id: 22, slug: 'eye-break', cat: 'health', name: '20-20-20 目の休憩', summary: '20分ごとに「20フィート先を20秒見る」休憩を通知する。', need: 'スクリーンタイム増加', apis: ['notification'] },
  { id: 23, slug: 'mood-diary', cat: 'health', name: 'ひとこと気分日記', summary: '1日1タップで気分を記録し、曜日別の傾向を見る。', need: 'メンタルヘルス', apis: ['storage'] },
  { id: 24, slug: 'focus-timer', cat: 'learn', name: '集中タイマー', summary: '画面を消さないポモドーロタイマー。離脱回数も数える。', need: 'タイパ・集中', apis: ['wake-lock', 'notification', 'visibility'] },
  { id: 25, slug: 'stretch-coach', cat: 'health', name: '声かけストレッチ', summary: '音声で「次は首を回します」と案内するので、画面を見ずに体を動かせる。', need: 'リモートワーク', apis: ['speech-synthesis', 'wake-lock'] },
  { id: 26, slug: 'pulse-cam', cat: 'health', name: '指先カメラ心拍計', summary: '指先をカメラに当て、明るさの変化から心拍数を推定する（医療用ではない）。', need: 'ヘルスケア（技術検証）', apis: ['camera', 'torch'] },
  { id: 27, slug: 'sleep-sound', cat: 'health', name: '寝言・いびきレコーダー', summary: '夜間に一定以上の音がしたときだけ録音し、朝に聞き返す。', need: '睡眠', apis: ['microphone', 'media-recorder', 'wake-lock'] },
  { id: 28, slug: 'cycle-memo', cat: 'health', name: '体調サイクルメモ', summary: '体調やサイクルを端末内だけに記録する。データは外部に送らない。', need: '女性の健康・プライバシー', apis: ['storage'] },
  { id: 29, slug: 'pickup-counter', cat: 'health', name: 'スマホ見た回数カウンター', summary: 'このページに戻った回数と用件の有無を記録し、「なんとなく見た」回数を可視化する。', need: 'デジタルデトックス・Product Hunt「Fewer」', apis: ['visibility', 'storage'] },
  { id: 30, slug: 'phone-down', cat: 'health', name: 'スマホ伏せチャレンジ', summary: 'スマホを伏せている間だけ時間が貯まる。持ち上げると失敗になる。', need: 'デジタルデトックス', apis: ['orientation', 'wake-lock'] },

  // ── 推し活・エンタメ ──
  { id: 31, slug: 'oshi-log', cat: 'oshi', name: '推し活ノート', summary: '推しごとの支出・イベント・参戦記録をまとめ、年間の推し活費を集計する。', need: '推し活市場4兆円', apis: ['storage', 'share'] },
  { id: 32, slug: 'oshi-countdown', cat: 'oshi', name: '推しカウントダウン', summary: 'ライブや発売日まであと何日かを大きく表示し、前日に通知する。', need: '推し活', apis: ['notification', 'storage'] },
  { id: 33, slug: 'oshi-camera', cat: 'oshi', name: '推しと撮れるカメラ', summary: 'アクスタやぬいの写真にフレームと日付を重ねて撮影・保存する。', need: '92.9%が「推しを写真に残したい」', apis: ['camera', 'canvas', 'share'] },
  { id: 34, slug: 'seichi-map', cat: 'oshi', name: '聖地巡礼メモ', summary: '聖地の座標を登録し、近づくと知らせる。訪問済みスタンプも貯まる。', need: '推し活・アフター万博', apis: ['geolocation', 'storage'] },
  { id: 35, slug: 'penlight', cat: 'oshi', name: 'ペンライト', summary: '画面全体を推し色に光らせる。マイクで音に合わせて明滅もできる。', need: '推し活', apis: ['wake-lock', 'microphone', 'fullscreen'] },
  { id: 36, slug: 'cheer-board', cat: 'oshi', name: '応援ボード', summary: '大きな文字を流して表示する電光掲示板。うちわの代わりにも使える。', need: '推し活', apis: ['fullscreen', 'wake-lock'] },
  { id: 37, slug: 'setlist', cat: 'oshi', name: 'セトリ予想', summary: 'セットリストを予想し、ライブ後に答え合わせをして的中率を出す。', need: '推し活', apis: ['storage', 'share'] },
  { id: 38, slug: 'gacha-calc', cat: 'oshi', name: 'ガチャ確率計算', summary: '「あと何回で何%出るか」を計算し、予算の上限を決められる。', need: 'ゲーム課金・節約', apis: [] },
  { id: 39, slug: 'shelf', cat: 'oshi', name: 'わたしの棚', summary: '読んだ本・観た作品・聴いた曲を棚に並べ、画像カードで共有する。', need: 'Z世代アプリ「Shelf」', apis: ['canvas', 'share', 'storage'] },
  { id: 40, slug: 'pitch-meter', cat: 'oshi', name: '音程チェッカー', summary: '歌声の音程をリアルタイムで表示する。カラオケ練習に。', need: 'エンタメ', apis: ['microphone', 'web-audio'] },
  { id: 41, slug: 'rhythm-tap', cat: 'oshi', name: 'リズムタップ', summary: '一定テンポでタップして、リズム感（ずれ）を測る。', need: 'エンタメ・暇つぶし', apis: ['web-audio', 'vibration'] },
  { id: 42, slug: 'drama-log', cat: 'oshi', name: 'ショートドラマ視聴メモ', summary: '観ているショートドラマの話数と課金額を記録する。', need: 'ショートドラマ市場の急伸', apis: ['storage'] },

  // ── つながり ──
  { id: 43, slug: 'moment-cam', cat: 'social', name: 'いまの瞬間カメラ', summary: 'ランダムな時刻に通知が来て、前後カメラで"いま"を撮る。端末内だけのBeReal。', need: 'Z世代・BeReal', apis: ['camera', 'notification', 'canvas'] },
  { id: 44, slug: 'midpoint', cat: 'social', name: '待ち合わせ中間地点', summary: '複数人の位置から中間地点を計算し、地図リンクを共有する。', need: '位置情報共有（NauNau等）', apis: ['geolocation', 'share'] },
  { id: 45, slug: 'here-link', cat: 'social', name: 'いまここリンク', summary: '現在地を地図リンクにして共有する。精度も一緒に伝える。', need: '位置情報共有・見守り', apis: ['geolocation', 'share', 'clipboard'] },
  { id: 46, slug: 'decider', cat: 'social', name: 'きめるルーレット', summary: 'ランチや順番を公平に決めるルーレット。振ると回る。', need: '迷う時間の削減（タイパ）', apis: ['motion', 'vibration'] },
  { id: 47, slug: 'icebreaker', cat: 'social', name: 'お題カード', summary: '初対面や家族の会話のきっかけになるお題を引く。', need: '孤独・つながり', apis: [] },
  { id: 48, slug: null, cat: 'social', name: '共有フォトウォール', summary: 'イベント参加者がQRから写真を投稿する共有アルバム（サーバーが必要）。', need: 'プライベート写真共有（Yope）', apis: ['camera', 'server'] },
  { id: 49, slug: 'thanks-card', cat: 'social', name: 'ありがとうカード', summary: 'ひとことメッセージを画像カードにして送る。', need: 'つながり', apis: ['canvas', 'share'] },
  { id: 50, slug: null, cat: 'social', name: 'P2Pトランシーバー', summary: 'WebRTCで近くの人と音声通話する（シグナリングサーバーが必要）。', need: 'イベント・防災', apis: ['webrtc', 'microphone', 'server'] },
  { id: 51, slug: 'checkin', cat: 'family', name: '毎日げんきボタン', summary: '1日1回ボタンを押すだけで、家族に「元気です」を送る。押し忘れも見える。', need: '高齢単身94万世帯・見守り', apis: ['share', 'notification', 'storage'] },
  { id: 52, slug: 'voice-letter', cat: 'social', name: '声の手紙', summary: '声を録音してファイルで送る。文字が苦手な祖父母にも。', need: '高齢化・つながり', apis: ['microphone', 'media-recorder', 'share'] },
  { id: 53, slug: 'birthday', cat: 'social', name: '誕生日ノート', summary: '誕生日と贈ったものを記録し、1週間前に通知する。', need: 'つながり', apis: ['notification', 'storage'] },
  { id: 54, slug: 'wishlist', cat: 'social', name: 'ほしいものリスト交換', summary: 'ほしいものリストをURLで交換し、重複したプレゼントを防ぐ。', need: 'ギフト', apis: ['share'] },
  { id: 55, slug: 'sky-color', cat: 'social', name: 'きょうの空の色', summary: '空を撮ると平均色を抽出し、色見本カレンダーになる。', need: 'ムード消費・デトックス', apis: ['camera', 'canvas', 'storage'] },

  // ── 防災・安全 ──
  { id: 56, slug: 'bousai-stock', cat: 'safety', name: '防災備蓄チェック', summary: '家族の人数から必要な備蓄量を計算し、期限切れが近いものを知らせる。', need: '防災アプリのインストール率48%', apis: ['storage', 'notification'] },
  { id: 57, slug: 'evac-compass', cat: 'safety', name: '避難場所コンパス', summary: '登録した避難場所の方角と距離を、圏外でもコンパスで示す。', need: '防災・高齢者にも使える操作', apis: ['geolocation', 'orientation'] },
  { id: 58, slug: 'sos-light', cat: 'safety', name: 'SOSライト＆ブザー', summary: '画面フラッシュ・ライト・ブザーでSOS信号を出す。', need: '防災・夜道', apis: ['torch', 'web-audio', 'wake-lock'] },
  { id: 59, slug: 'emergency-card', cat: 'safety', name: '緊急連絡カード', summary: '血液型・持病・連絡先を1画面にまとめる。オフラインでも見られる。', need: '防災・高齢者', apis: ['storage', 'service-worker'] },
  { id: 60, slug: 'quake-meter', cat: 'safety', name: '揺れ計', summary: '加速度センサーで揺れの大きさを記録・表示する。', need: '防災', apis: ['motion'] },
  { id: 61, slug: 'fake-call', cat: 'safety', name: '夜道おまもり', summary: '偽の着信画面と、現在地をすぐ共有できるボタン。', need: '安全', apis: ['vibration', 'geolocation', 'share'] },
  { id: 62, slug: 'power-outage', cat: 'safety', name: '停電モード', summary: 'バッテリー残量から節電の目安を出し、暗い画面で必要な情報だけ表示する。', need: '防災', apis: ['battery'] },
  { id: 63, slug: 'family-plan', cat: 'safety', name: '家族の集合プラン', summary: '災害時の集合場所と連絡手段を家族で決め、共有カードにする。', need: '防災', apis: ['share', 'canvas'] },
  { id: 64, slug: null, cat: 'safety', name: 'ヒヤリハット地図', summary: '通学路の危険箇所を写真と位置で記録し、地域で共有する。', need: '子育て・地域', apis: ['camera', 'geolocation', 'server'] },
  { id: 65, slug: 'rain-timeline', cat: 'safety', name: '大雨タイムライン', summary: '雨量予報から「いつ何をするか」の避難タイムラインを作る。', need: '防災・事前計画', apis: ['fetch', 'notification'] },

  // ── 学習・仕事 ──
  { id: 66, slug: 'flashcards', cat: 'learn', name: '暗記カード（間隔反復）', summary: '忘れる直前に出題する暗記カード。CSVで読み込める。', need: '学習・スキマ時間', apis: ['storage', 'file'] },
  { id: 67, slug: 'shadowing', cat: 'learn', name: 'シャドーイング練習', summary: 'お手本を読み上げ、自分の声を録音して聞き比べる。', need: '語学のAI会話・シャドーイング', apis: ['speech-synthesis', 'media-recorder'] },
  { id: 68, slug: 'pronounce', cat: 'learn', name: '発音チェック', summary: '話した英文を音声認識し、お手本との一致度を表示する。', need: '語学・Duolingoの会話練習への不満', apis: ['speech-recognition'] },
  { id: 69, slug: 'kanji-pad', cat: 'learn', name: 'なぞり書き練習帳', summary: '指で文字をなぞって練習する。書き順を再生して確認できる。', need: '子育て・学習', apis: ['canvas', 'pointer'] },
  { id: 70, slug: 'meeting-timer', cat: 'learn', name: '発言時間タイマー', summary: '会議で誰が何分話したかを、タップで計測する。', need: '仕事・タイパ', apis: ['wake-lock'] },
  { id: 71, slug: 'speech-pace', cat: 'learn', name: '話すスピード計', summary: '音声認識で1分あたりの文字数と「えー」等のフィラーを数える。', need: 'プレゼン・面接', apis: ['speech-recognition'] },
  { id: 72, slug: 'doc-scan', cat: 'learn', name: 'かんたん書類スキャン', summary: '撮影した書類を白黒化・コントラスト補正して画像で保存する。', need: '苦労キャンセル', apis: ['camera', 'canvas'] },
  { id: 73, slug: 'white-noise', cat: 'learn', name: '環境音ジェネレーター', summary: 'ホワイト／ピンク／ブラウンノイズや雨音を音声ファイルなしで合成する。', need: '集中・睡眠', apis: ['web-audio'] },
  { id: 74, slug: 'typing', cat: 'learn', name: 'ローマ字タイピング', summary: '日本語の文をローマ字で打つタイピング練習。打鍵速度を記録する。', need: '学習', apis: ['keyboard'] },
  { id: 75, slug: 'habit', cat: 'learn', name: '習慣トラッカー', summary: '習慣ごとに連続日数を表示する。「完璧でなくていい」週○回の目標にも対応。', need: '習慣化・AIの習慣設計', apis: ['storage'] },
  { id: 76, slug: 'micro-learn', cat: 'learn', name: '1分まなび', summary: 'SNSを開く代わりに1分で読めるミニ知識カードを出す。', need: 'Product Hunt「NerdSip」・デトックス', apis: ['storage'] },
  { id: 77, slug: 'local-summary', cat: 'learn', name: 'ブラウザ内AI要約', summary: 'WebGPUやPrompt APIを使い、端末内で文章を要約する（データを外部に送らない）。', need: '端末内AI・プライバシー', apis: ['webgpu', 'prompt-api'] },

  // ── 旅行・おでかけ ──
  { id: 78, slug: 'phrase-board', cat: 'travel', name: '指さし会話帳', summary: 'よく使うフレーズを日英中韓で表示し、読み上げる。', need: 'インバウンド4,268万人・翻訳がヒット予測1位', apis: ['speech-synthesis'] },
  { id: 79, slug: 'currency', cat: 'travel', name: '旅の通貨換算', summary: 'レートを手入力して、値札を見ながら素早く換算する。オフラインで使える。', need: '旅行の伸び+16%', apis: ['storage'] },
  { id: 80, slug: null, cat: 'travel', name: 'ゴミ箱・トイレマップ', summary: 'ゴミ箱やトイレの場所をみんなで登録する（サーバーが必要）。', need: 'インバウンドの困りごと', apis: ['geolocation', 'server'] },
  { id: 81, slug: 'stamp-rally', cat: 'travel', name: '位置情報スタンプラリー', summary: '決めた地点に近づくとスタンプが押せる。イベントや商店街向け。', need: 'リアルとつなぐ・地域', apis: ['geolocation', 'vibration'] },
  { id: 82, slug: 'trip-journal', cat: 'travel', name: '旅の一行日記', summary: '写真・位置・ひとことで旅を記録し、時系列で振り返る。', need: '旅行', apis: ['camera', 'geolocation', 'indexeddb'] },
  { id: 83, slug: 'packing', cat: 'travel', name: '持ち物リスト自動作成', summary: '日数・季節・目的から持ち物リストを作る。', need: '苦労キャンセル', apis: ['storage'] },
  { id: 84, slug: 'sauna-log', cat: 'travel', name: 'サ活記録', summary: 'サウナ・水風呂・休憩の時間をタイマーで計り、セットを記録する。', need: 'ソロ活', apis: ['wake-lock', 'vibration', 'storage'] },
  { id: 85, slug: 'sun-times', cat: 'travel', name: 'マジックアワー計算', summary: '現在地の日の出・日の入りとゴールデンアワーを計算する（オフライン）。', need: '写真・旅行', apis: ['geolocation'] },
  { id: 86, slug: 'altimeter', cat: 'travel', name: '高度・速度計', summary: 'GPSの高度・速度・方位を表示する。登山やドライブに。', need: 'アウトドア', apis: ['geolocation'] },
  { id: 87, slug: 'solo-spots', cat: 'travel', name: 'ソロ活スポット帳', summary: '「ひとりで行けた」お店や場所を記録し、ひとり向け度を評価する。', need: 'ソロ活（Z世代の4割超）', apis: ['geolocation', 'storage'] },
  { id: 88, slug: 'noise-map', cat: 'travel', name: '騒音マップ', summary: '歩きながら音量を測り、静かな場所を地図に残す。', need: '集中・カフェ探し', apis: ['microphone', 'geolocation'] },

  // ── ペット・子育て・家族 ──
  { id: 89, slug: 'pet-log', cat: 'family', name: 'ペット健康手帳', summary: '体重・ごはん・通院・ワクチンを記録し、体重をグラフで見る。', need: 'ペットケア市場（CAGR約10%）', apis: ['storage', 'canvas'] },
  { id: 90, slug: 'pet-walk', cat: 'family', name: 'ペット散歩記録', summary: '散歩ルートと、排泄などの出来事を記録する。', need: 'ペット・GPS', apis: ['geolocation'] },
  { id: 91, slug: 'baby-log', cat: 'family', name: '片手で育児記録', summary: '授乳・おむつ・睡眠を、大きなボタンで片手のまま記録する。', need: '共働き・子育て', apis: ['storage', 'vibration'] },
  { id: 92, slug: 'chore-points', cat: 'family', name: 'おてつだいポイント', summary: '子どものお手伝いをポイント化し、ごほうびと交換する。', need: '子育て', apis: ['storage'] },
  { id: 93, slug: 'growth-chart', cat: 'family', name: '成長きろく', summary: '身長・体重を記録し、成長をグラフで見る。', need: '子育て', apis: ['storage', 'canvas'] },
  { id: 94, slug: 'bedtime-story', cat: 'family', name: 'おやすみ読み聞かせ', summary: '登場人物を選ぶと短いお話を組み立てて、ゆっくり読み上げる。', need: '子育て・苦労キャンセル', apis: ['speech-synthesis'] },
  { id: 95, slug: 'family-schedule', cat: 'family', name: '家族の予定QR共有', summary: '予定をQR/URLにして家族へ送る。アプリを入れなくても見られる。', need: '共有アプリ未利用62%（必要性を感じない）', apis: ['share'] },
  { id: 96, slug: 'care-log', cat: 'family', name: '介護ノート', summary: '体温・食事・排泄・服薬を記録し、ケアマネ向けの要約を作る。', need: '高齢化', apis: ['storage', 'share'] },

  // ── お金・節約 ──
  { id: 97, slug: 'gaman-bank', cat: 'money', name: 'がまん貯金箱', summary: '買わなかったコーヒーの金額を貯金箱に入れて、「ながら節約」を可視化する。', need: '「ながら節約」', apis: ['storage', 'vibration'] },
  { id: 98, slug: 'unit-price', cat: 'money', name: '単価くらべ電卓', summary: '「398円で3個」と「598円で5個」のどちらが得かを一瞬で比べる。', need: '物価高・値上げ1.5万品目', apis: [] },
  { id: 99, slug: 'point-expiry', cat: 'money', name: 'ポイント期限帳', summary: '各社のポイント残高と失効日を管理し、失効前に通知する。', need: 'ポイ活', apis: ['notification', 'storage'] },
  { id: 100, slug: 'trip-budget', cat: 'money', name: '旅行の予算トラッカー', summary: '旅行中の支出を1日の予算と比べて、使いすぎを防ぐ。', need: '旅行・節約', apis: ['storage'] },
];
