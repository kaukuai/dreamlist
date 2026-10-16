import type { Metadata } from "next";
import "./globals.css";
import "./modern-game.css";
export const metadata: Metadata = { title:"reverie 夢嶼 · DREAM ORBIT",description:"把夢想拆成小目標，收集星露，讓你的奇幻小島日漸茁壯。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {return <html lang="zh-Hant"><body>{children}</body></html>;}


