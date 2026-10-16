import DreamApp from "./dream-app";
import {requireChatGPTUser} from "./chatgpt-auth";
export const dynamic="force-dynamic";
async function AuthenticatedWorkspace(){await requireChatGPTUser("/");return <DreamApp/>;}
export default function Home(){return <AuthenticatedWorkspace/>;}
