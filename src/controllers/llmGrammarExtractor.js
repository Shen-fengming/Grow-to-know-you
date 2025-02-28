import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import debug from "debug";
import cliProgress from "cli-progress";
import { loadFile, processJson, objectToJson, saveJSONToFile} from "./fileManipulator.js";
import {extractDialogueAndTimeFromAss, groupSubtitles} from "./subtitleExtractor.js";

dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;
const llmUrl = "https://api.openai.com/v1/chat/completions";
const grammarPromptPath = "data/prompts/llmGrammarExtrator.txt";
const wordPromptPath = "data/prompts/llmWordExtrator.txt";
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

async function llmWordGrammarDetection(groupedSubtitle,detectionType) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
    };
    llmGrammarExtratorDebug("headers: ", headers);

    let systemPrompt;
    if(detectionType === "grammar"){
        systemPrompt = loadFile(grammarPromptPath);
    }
    else{
        systemPrompt = loadFile(wordPromptPath);
    }
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
    const grammarPoints = [];

    const progressBar = new cliProgress.SingleBar({
        format: 'Detecting grammars from [{bar}] {percentage}% | {value}/{total} items',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.legacy);

    progressBar.start(groupedSubtitles.length, 0);

    for(let i = 0; i < groupedSubtitles.length; i++){
        const cleanAssLineText = groupedSubtitles[i].text;
        const groupedIndex = groupedSubtitles[i].index;

        const responseInJson = await llmWordGrammarDetection(cleanAssLineText,"grammar");
        const responseContent = processJson(processChatGPTResponse(responseInJson));
        //groupedDebug(`responseContent of ${i} :`, responseContent);


        if(responseInJson){
            if(responseContent.grammarPoints && Array.isArray(responseContent.grammarPoints)){
                for(let grammar of responseContent.grammarPoints){
                    const targetText = grammar.exampleInText.trim();
                    const targetIndex = groupedIndex.find(subIndex => dialogueAndTime.subtitles[subIndex].trim().includes(targetText));
                    const targetTime = dialogueAndTime.time[targetIndex];

                    grammarPoints.push({
                        ...grammar,
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
    groupedDebug("Grammar points: ", grammarPoints);
    return grammarPoints;
}

async function groupedSubtitlesWordDetection(groupedSubtitles, dialogueAndTime){
    const words = [];

    const progressBar = new cliProgress.SingleBar({
        format: 'Detecting words from [{bar}] {percentage}% | {value}/{total} groups',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.legacy);

    progressBar.start(groupedSubtitles.length, 0);

    for(let i = 0; i < groupedSubtitles.length; i++){
        const cleanAssLineText = groupedSubtitles[i].text;
        const groupedIndex = groupedSubtitles[i].index;

        const responseInJson = await llmWordGrammarDetection(cleanAssLineText,"word");
        const responseContent = processJson(processChatGPTResponse(responseInJson));
        //groupedDebug(`responseContent of ${i} :`, responseContent);


        if(responseInJson){
            if(responseContent.words && Array.isArray(responseContent.words)){
                for(let word of responseContent.words){
                    const targetText = word.exampleInText.trim();
                    const targetIndex = groupedIndex.find(subIndex => dialogueAndTime.subtitles[subIndex].trim().includes(targetText));
                    const targetTime = dialogueAndTime.time[targetIndex];

                    words.push({
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
    groupedDebug("Detected words: ", words);
    return words;
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
        //console.log(groupedSubtitles)

        const detectedGrammar = await groupedSubtitlesGrammarDetection(groupedSubtitles, dialogueAndTime);
        const detectedWord = await groupedSubtitlesWordDetection(groupedSubtitles, dialogueAndTime);

        const combinedResult = {
            grammar: detectedGrammar,
            word: detectedWord
        };
        groupedDebug("combinedResult: ", combinedResult);

        const jsonFilePath = assFilePath.replace(/\.ass$/, ".json");
        groupedDebug("jsonFilePath: ", jsonFilePath);
        const jsonData = objectToJson(combinedResult);
        groupedDebug("Final jsonData: ", jsonData);

        //saveJSONToFile(jsonFilePath,jsonData);

        //

    } catch (error) {
        console.error("Error testing grammar detection from a ass file.")
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    //main();
    tryGroupedSubtitlesGrammarDetection();
}