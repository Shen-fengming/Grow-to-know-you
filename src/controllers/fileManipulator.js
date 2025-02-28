import fs from "fs";

function loadFile(filePath){
    try{
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent;
    }
    catch(error){
        console.error('Error loading file:',error);
        return null;
    }
}

function processJson(fileContent){
    try {
        const jsonData = JSON.parse(fileContent);
        return jsonData;
    } catch (error) {
        console.error('Error processing JSON: ',error);
    }
}

function processChatGPTResponse(fileContent){
    try{
        const cleanResponse = (fileContent.match(/```([\s\S]*?)```/)) ? fileContent.match(/```([\s\S]*?)```/)[1].trim().replace(/^json\n/, '') : null;
        return cleanResponse;
    } catch (error) {
        console.error('Error processing ChatGpt response: ',error);
    }
}

export {loadFile, processJson, processChatGPTResponse};