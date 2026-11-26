# 關於這個專案

## 為什麼做

我個女好鍾意寶可夢。與其買多一件玩具，我想同佢一齊做一樣屬於我哋嘅嘢：一個可以一齊睇、一齊讀、一齊玩嘅圖鑑。

所以每張卡都有英文名同香港譯名並排，仲可以用語音讀出來。佢可以看圖認字，我可以陪佢讀英文；「這是誰？」猜謎就係我哋嘅複習時間。

這個專案想示範一件事：**用 AI 幫手，可以將「陪小朋友」變成「同小朋友一齊做一樣嘢」。** 整個過程由找資料、寫程式、測試到部署，都是一個家長在對話裡一步步完成的。

## 作者

- 網站：<https://www.tonytsui.io>
- 部落格：<https://www.wingleung.me>

## 非牟利與開源

- 本專案**不牟利**，沒有任何廣告、追蹤或付費功能。
- 程式碼以 **MIT** 授權開源，你可以自由下載、修改、再分享。
- 譯名資料來自神奇寶貝百科，依 **CC BY-NC-SA 3.0** 授權使用。
- 寶可夢及相關名稱、圖像為 Nintendo／Creatures Inc.／GAME FREAK inc.／The Pokémon Company 的商標與著作權所有。本專案只作個人、非商業的親子與學習用途。

## 資料來源

| 來源 | 用途 | 授權／備註 |
| --- | --- | --- |
| [PokéAPI](https://pokeapi.co) | 名稱、圖鑑描述、屬性、身高體重、叫聲 | 免費開放 API；資料源自寶可夢系列遊戲 |
| [PokeAPI/sprites](https://github.com/PokeAPI/sprites) | 像素圖、官方插畫 | 圖像版權屬 The Pokémon Company |
| [PokeAPI/cries](https://github.com/PokeAPI/cries) | 寶可夢叫聲 | 同上 |
| [神奇寶貝百科](https://wiki.52poke.com) | 香港譯名 | CC BY-NC-SA 3.0 |
| [jsDelivr](https://www.jsdelivr.com) | 圖片 CDN 加速 | 免費 CDN |
| [The Pokémon Company](https://www.pokemon.com) | 寶可夢名稱與圖像版權持有人 | 商標與著作權所有 |

技術參考：

- [MDN Web Docs](https://developer.mozilla.org/) — `<dialog>`、Web Speech API、CSS Grid
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) — 自動化測試與截圖

## 給其他家長

完整做法、提示詞與踩過的坑都寫在 [MAKING-OF.md](MAKING-OF.md)。歡迎直接拿去改成你小朋友喜歡的卡通、動物或恐龍圖鑑。
