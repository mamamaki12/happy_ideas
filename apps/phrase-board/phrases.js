// 指さし会話帳のフレーズ（ja / en / zh / ko）
export const LANGS = { ja: ['日本語', 'ja-JP'], en: ['English', 'en-US'], zh: ['中文', 'zh-CN'], ko: ['한국어', 'ko-KR'] };
export const PHRASES = {
  '基本': [
    { ja: 'こんにちは', en: 'Hello', zh: '你好', ko: '안녕하세요' },
    { ja: 'ありがとうございます', en: 'Thank you very much', zh: '非常感谢', ko: '감사합니다' },
    { ja: 'すみません', en: 'Excuse me', zh: '不好意思', ko: '실례합니다' },
    { ja: '日本語が話せません', en: "I don't speak Japanese", zh: '我不会说日语', ko: '일본어를 못해요' },
    { ja: 'もう一度お願いします', en: 'Could you say that again?', zh: '请再说一遍', ko: '다시 한번 말씀해 주세요' },
  ],
  '道案内': [
    { ja: '駅はどこですか？', en: 'Where is the station?', zh: '车站在哪里？', ko: '역은 어디예요?' },
    { ja: 'トイレはどこですか？', en: 'Where is the restroom?', zh: '洗手间在哪里？', ko: '화장실은 어디예요?' },
    { ja: 'ゴミ箱はどこですか？', en: 'Where can I throw this away?', zh: '垃圾桶在哪里？', ko: '쓰레기통은 어디예요?' },
    { ja: 'ここに行きたいです', en: 'I want to go here', zh: '我想去这里', ko: '여기에 가고 싶어요' },
    { ja: '歩いて何分ですか？', en: 'How many minutes on foot?', zh: '走路要几分钟？', ko: '걸어서 몇 분이에요?' },
  ],
  '食事': [
    { ja: 'おすすめは何ですか？', en: 'What do you recommend?', zh: '有什么推荐的？', ko: '추천 메뉴가 뭐예요?' },
    { ja: '〇人です', en: 'Table for ___, please', zh: '___位', ko: '___명이에요' },
    { ja: 'アレルギーがあります', en: 'I have a food allergy', zh: '我有食物过敏', ko: '음식 알레르기가 있어요' },
    { ja: '豚肉は食べられません', en: "I can't eat pork", zh: '我不能吃猪肉', ko: '돼지고기를 못 먹어요' },
    { ja: 'お会計をお願いします', en: 'Check, please', zh: '请结账', ko: '계산해 주세요' },
  ],
  '買い物': [
    { ja: 'いくらですか？', en: 'How much is this?', zh: '多少钱？', ko: '얼마예요?' },
    { ja: 'カードは使えますか？', en: 'Can I pay by card?', zh: '可以刷卡吗？', ko: '카드 돼요?' },
    { ja: '免税できますか？', en: 'Is this tax-free?', zh: '可以免税吗？', ko: '면세 되나요?' },
    { ja: '袋は要りません', en: "I don't need a bag", zh: '不需要袋子', ko: '봉투는 필요 없어요' },
  ],
  '困ったとき': [
    { ja: '助けてください', en: 'Please help me', zh: '请帮帮我', ko: '도와주세요' },
    { ja: '具合が悪いです', en: "I don't feel well", zh: '我身体不舒服', ko: '몸이 안 좋아요' },
    { ja: '救急車を呼んでください', en: 'Please call an ambulance', zh: '请叫救护车', ko: '구급차를 불러 주세요' },
    { ja: '財布をなくしました', en: 'I lost my wallet', zh: '我的钱包丢了', ko: '지갑을 잃어버렸어요' },
    { ja: '交番はどこですか？', en: 'Where is the police box?', zh: '派出所在哪里？', ko: '파출소는 어디예요?' },
  ],
};
