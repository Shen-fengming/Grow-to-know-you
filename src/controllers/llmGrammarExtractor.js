import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { loadFile,processJson,processChatGPTResponse } from "./fileManipulator.js";
import debug from "debug";

dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;
const llmUrl = "https://api.openai.com/v1/chat/completions";
const systemPromptPath = "data/prompts/llmGrammarExtrator.txt";
const userPromptPath = "";

//test
const exampleGroupedSubtitlePath = "tests/data/groupedSubtitle.txt";

const llmGrammarExtratorDebug = debug('llmGrammarExtratorDebug');

async function llmWordGrammarDetection(groupedSubtitle) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
    };
    llmGrammarExtratorDebug("headers: ", headers);

    const systemPrompt = loadFile(systemPromptPath);
    llmGrammarExtratorDebug("systemPrompt: ", systemPrompt);

    const userPrompt = `${groupedSubtitle}`;
    llmGrammarExtratorDebug("userPrompt: ", userPrompt);

    const data = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 2000,
        temperature: 0,
    };
    try {
        const answer = await axios.post(llmUrl, data, { headers });
        llmGrammarExtratorDebug("LLM answer: ",answer);

        const responseContent = answer.data.choices[0].message.content;
        llmGrammarExtratorDebug("Example response content:", responseContent);

        return responseContent;

    } catch (error) {
        console.error(
            `Error calling ${data.model} API with url: ${llmUrl}`,
            error.response ? error.response.data : error.message
        );
        throw error;
    }
}

async function main(){
    try {
        const exampleGroupedSubtitle = loadFile(exampleGroupedSubtitlePath);
        llmGrammarExtratorDebug("Example grouped subtitle: \n", exampleGroupedSubtitle);

        const responseContent = await llmWordGrammarDetection(exampleGroupedSubtitle);

        const responseInJson = processJson(processChatGPTResponse(responseContent));
        llmGrammarExtratorDebug("Example result: \n", responseInJson);

        
    } catch (error) {
        console.error("Error testing llmGrammarExtractor.js: ", error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}