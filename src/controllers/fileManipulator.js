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

export {loadFile, processJson};