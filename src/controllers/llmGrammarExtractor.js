import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import debug from "debug";
import cliProgress from "cli-progress";
import { loadFile,processJson} from "./fileManipulator.js";
import {extractDialogueAndTimeFromAss, groupSubtitles} from "./subtitleExtractor.js";

dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;
const llmUrl = "https://api.openai.com/v1/chat/completions";
const systemPromptPath = "data/prompts/llmGrammarExtrator.txt";
const userPromptPath = "";
const assFilePath = "tests/data/shortAss.ass";
const validStyles = ["TextJP"];


//test
const exampleGroupedSubtitlePath = "tests/data/groupedSubtitle.txt";

const llmGrammarExtratorDebug = debug('llmGrammarExtratorDebug');
const groupedDebug = debug('groupedDebug');

function processChatGPTResponse(fileContent){
    try{
        const cleanResponse = (fileContent.match(/```([\s\S]*?)```/)) ? fileContent.match(/```([\s\S]*?)```/)[1].trim().replace(/^json\n/, '') : null;
        return cleanResponse;
    } catch (error) {
        console.error('Error processing ChatGpt response: ',error);
    }
}

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

async function groupedSubtitlesGrammarDetection(groupedSubtitles, dialogueAndTime){
    const detectedGrammar = {
        grammarPoints: [],
        words: []
    };

    const progressBar = new cliProgress.SingleBar({
        format: 'Processing [{bar}] {percentage}% | {value}/{total} items',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.legacy);

    progressBar.start(groupedSubtitles.length, 0);

    for(let i = 0; i < groupedSubtitles.length; i++){
        const cleanAssLineText = groupedSubtitles[i].text;
        const groupedIndex = groupedSubtitles[i].index;

        const responseInJson = await llmWordGrammarDetection(cleanAssLineText);
        const responseContent = processJson(processChatGPTResponse(responseInJson));
        //groupedDebug(`responseContent of ${i} :`, responseContent);


        if(responseInJson){
            if(responseContent.grammar_points && Array.isArray(responseContent.grammar_points)){
                for(let grammar of responseContent.grammar_points){
                    const targetText = grammar.example_in_text.trim();
                    const targetIndex = groupedIndex.find(subIndex => dialogueAndTime.subtitles[subIndex].trim().includes(targetText));
                    const targetTime = dialogueAndTime.time[targetIndex];

                    detectedGrammar.grammarPoints.push({
                        ...grammar,
                        index: targetIndex,
                        starttime: targetTime.at(0),
                        endtime: targetTime.at(1)
                    });
                }
            }
            if(responseContent.words && Array.isArray(responseContent.words)){
                for(let word of responseContent.words){
                    const targetText = word.example_in_text.trim();
                    const targetIndex = groupedIndex.find(subIndex => dialogueAndTime.subtitles[subIndex].trim().includes(targetText));
                    const targetTime = dialogueAndTime.time[targetIndex];

                    detectedGrammar.words.push({
                        ...word,
                        index: targetIndex,
                        starttime: targetTime.at(0),
                        endtime: targetTime.at(1)
                    });
                }
            }
        }
        progressBar.update(i+1);
    }
    progressBar.stop();
    groupedDebug("Detected grammar: ", detectedGrammar);
    return detectedGrammar;
}

async function main(){
    try {
        const exampleGroupedSubtitle = loadFile(exampleGroupedSubtitlePath);
        llmGrammarExtratorDebug("Example grouped subtitle: \n", exampleGroupedSubtitle);

        const responseInJson = await llmWordGrammarDetection(exampleGroupedSubtitle);

        const responseContent = processJson(processChatGPTResponse(responseInJson));
        llmGrammarExtratorDebug("Example json of chat llm grammar extractor: \n", responseContent);

    } catch (error) {
        console.error("Error testing llmGrammarExtractor.js: ", error);
    }
}

async function tryGroupedSubtitlesGrammarDetection(){
    try {
        const dialogueAndTime = extractDialogueAndTimeFromAss(assFilePath, validStyles);
        const groupedSubtitles = groupSubtitles(dialogueAndTime, 50);

        const detectedGrammar = groupedSubtitlesGrammarDetection(groupedSubtitles, dialogueAndTime);
        //

    } catch (error) {
        console.error("Error testing grammar detection from a ass file.")
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    //main();
    tryGroupedSubtitlesGrammarDetection();
}