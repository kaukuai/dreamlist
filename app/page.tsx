import DreamApp from "./dream-app";
import {requireChatGPTUser} from "./chatgpt-auth";
import {browserPreview} from "@/lib/app-mode";
export const dynamic="force-dynamic";
async function AuthenticatedWorkspace(){await requireChatGPTUser("/");return <DreamApp/>;}
export default function Home(){return browserPreview ? <DreamApp/> : <AuthenticatedWorkspace/>;}
