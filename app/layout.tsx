import type { Metadata } from "next";
import "./globals.css";
import "./modern-game.css";
import "./mobile-rpg.css";
import "./quest-hub.css";
import "./adventure.css";
import "./field-game.css";
import "./opening.css";
export const metadata: Metadata = { title:"reverie 夢嶼 · DREAM ORBIT",description:"將生活中的學習與行動化為角色經驗，修練技能、收集裝備，進化成自己的傳說職業。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {return <html lang="zh-Hant"><body>{children}</body></html>;}


