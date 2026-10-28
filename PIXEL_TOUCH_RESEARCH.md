# 觸控與地圖角色調整

2026-10-28。使用者回報 ChatGPT 或其他 App 內建網頁視窗無法觸控，並要求地圖採早期 RPG 像素簡略人物，任務、角色與對話保留完整 CG。這是可操作性與呈現方式的調整，沒有增加新的帳號、資料庫或重置存檔。

## 實際取得的參考

| 官方來源 | 讀到的內容 | 採用方式 |
| --- | --- | --- |
| [RPG Maker MZ：Asset Standards](https://rpgmakerofficial.com/product/MZ_help-en/01_11_01.html) | 地圖行走人物分四方向、三種姿勢；人物／臉圖有不同素材規格。 | 本作用原創 32×48 SVG 像素圖，四方向各三姿勢，依移動距離以 0→1→2→1 播放；不套用該引擎特有的 6px 位移。 |
| [Nintendo：OCTOPATH TRAVELER II](https://www.nintendo.com/us/store/products/octopath-traveler-ii-switch/) | 官方描述 HD-2D 是 retro pixel art 與 3DCG 的融合。 | 參考「簡化人物仍可與細緻場景並存」的視覺分工；本作目前是 2D 背景與 SVG，沒有宣稱已做成 HD-2D 或 3D 場景，也未挪用其素材。 |
| [MDN：Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | 指標捕捉、pointercancel、多個指標各自的 pointerId。 | 捕捉僅為選用，失敗時用 document 追蹤；不同手指獨立處理。 |
| [MDN：Touch events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) | identifier／changedTouches、touchcancel，preventDefault 可能阻止相容滑鼠事件。 | 原生 TouchEvent 監聽、取消復原、按鈕的原生觸控啟動；第二指不依賴 click。觸控後抑制相容點擊，避免一次碰觸觸發兩次。 |
| [MDN：touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) | 瀏覽器手勢接管可導致 pointercancel，touch-action 應預先宣告；TouchEvent 另需 preventDefault。 | 只在地圖、方向鍵、搖桿與戰鬥操作區禁止瀏覽器拖動，對話與一般頁面仍可捲動。 |
| [MDN：Crisp pixel art](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look) | 避免平滑插值及非整數像素縮放；裝置像素比會影響呈現。 | SVG crispEdges、固定 1×／2× 尺寸、城鎮座標吸附像素。沒有把原 CG 降解析度偽裝成行走圖。 |
| [Godot：2D movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html) | 方向向量和速度分開，正規化方向避免斜走較快。 | 保留現有物理模型與碰撞；動畫以實際走過距離驅動，撞牆／停下不持續踏步。 |
| [Phaser：Input](https://docs.phaser.io/phaser/concepts/input) | 滑鼠／觸控統一輸入與畫面座標轉換。 | 城鎮及戰鬥各自以 viewport 邊界換算座標；沒有為此更換整套引擎。 |

來源 HTML／文字暫存在忽略的 `.sites-runtime/pixel-touch-research/`。先前瑪奇職業／生活修練與手機配置研究仍見 RPG_REFERENCES.md、ENGAGEMENT_RESEARCH.md 與 PLAY_EXPERIENCE_RESEARCH.md。

## 可重現的舊版問題與修正

- 舊地面僅有 React onPointerDown；實際送入 click 而無 PointerEvent，角色不移動。現以原生觸控 tap 與 click 備援共用座標轉換，滑動不誤當點地面。
- 備援方向鍵被 opacity:0／pointer-events:none 隱藏。手機現在預設可見十字鍵，也能切換搖桿，偏好獨立存於 dreamlist:control-mode:v1。
- 搖桿依賴 setPointerCapture。現在捕捉失敗仍可追蹤手指；其他手指放開不清除移動；取消、背景化及明確暫停均釋放控制。
- 舊版 window.blur 無條件清除路徑／暫停戰鬥。內嵌視窗可能在頁面仍可見時轉移焦點；現在可見 blur 只清鍵盤，document.hidden／設定／明確暫停仍會保存並停下。不能僅憑此推論特定 ChatGPT 版本的內部實作。
- 城鎮及試煉不再顯示整張 CG 漂移。七職業、六 NPC、六類敵人的地圖圖像由獨立像素 primitives 畫出；角色腳底固定，移動時只變換肢體幀。職業武器、衣色與進階金邊保留辨識。NPC 對話改用完整 CG 圖集，其他角色／任務畫面保留原 CG。
- 聲音的已同意播放恢復同時接受 pointerdown、touchstart、click、keydown；首次開啟仍須自願按下聲音按鈕。

## 保存與測試

沿用 dreamlist:browser-preview:v1。試煉僅加選用 travelled／lastMoveTick 動畫欄位，舊戰況缺少欄位仍可接續。物理、XP、AP、收據、裝備、錢包及故事獎勵規則不變。

新增 tests/pixel-touch.test.mjs：13 種人物×4 方向×3 姿勢的像素範圍及腳底、六類敵人、捕捉拋錯、不同手指放開、空 touchcancel、相容 click 去重、點地面／拖曳辨識。npm run test:field 一併執行。

選用 tests/mobile-play.browser.mjs：以真實瀏覽器在全頁 iframe 驗證畫面移動、click-only、原生觸控事件路徑、引擎 touchscreen tap、搖桿切換、雙指戰鬥、CG 對話、存檔接續和 320／390／428／768px。原生事件相容情境採注入事件，不能當作所有實體觸控硬體已驗證。另有 Chromium CDP 真實觸控搖桿與完整生活行動→試煉→首次故事獎勵回歸。測試只用獨立瀏覽器／模型資料。

執行範例（Playwright／Chromium 為雲端工具快取，不加入 app runtime）：

```sh
PLAYWRIGHT_MODULE=/workspace/.cache/dreamlist-browser/node_modules/playwright/index.mjs \
CHROMIUM_MODULE=/workspace/.cache/dreamlist-browser/node_modules/@sparticuz/chromium/build/index.js \
node --experimental-strip-types tests/mobile-play.browser.mjs
```

WebKit 可設 BROWSER_ENGINE=webkit、WEBKIT_RUNTIME_DIR 指向下載的 minibrowser-wpe，WEBKIT_DEPS_DIR 指向經 Debian 簽章索引下載並解開的系統函式庫。程式使用這些路徑的正常動態連結載入，不關閉 TLS／套件簽章驗證。

沒有取得實體 iPhone／Android 或 ChatGPT 原生 App 的遠端控制能力，不能聲稱已做那些真機驗收。嵌入頁框測試可覆蓋相容路徑，仍需使用者在實際內建視窗試玩確認。

本輪已通過 54 項模型／保存／觸控單元檢查、TypeScript、改動模組 ESLint、Next Vercel 與 vinext Sites 正式建置。Chromium 153 與 WebKit 27.2 的嵌入頁框流程已於開發 server 通過；正式建置及原 Vercel 網址另行驗證，不能以本機結果代替部署成功。輸出保存在忽略的 outputs/pixel-touch／field-game。瀏覽器測試以位移結果等待，不把嵌入頁框的可變繪圖頻率當作固定毫秒的保證。
