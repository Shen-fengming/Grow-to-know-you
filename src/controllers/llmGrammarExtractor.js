import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { loadFile,processJson } from "./fileManipulator";
import debug from "debug";

dotenv.config();
const APIKey = process.env.OPENAI_API_KEY;
const llmUrl = "https://api.openai.com/v1/chat/completions";
const systemPromptPath = "";

const llmGrammarExtratorDebug = debug('llmGrammarExtratorDebug');

async function llmWordGrammarDetection(groupedSubtitle) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
    };

    llmGrammarExtratorDebug("headers: ", headers);

    systemPrompt = loadFile(systemPromptPath);
}

