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

function objectToJson(object){
    try {
        const jsonString = JSON.stringify(object);
        return jsonString;
    } catch (error) {
        console.error("Error turing object to json: ", object);
    }
}

function saveJSONToFile(filePath, jsonData) {
    if (!jsonData) {
        console.error("Cannot save JSON file: JSON data is empty");
        return;
    }

    try {
        fs.writeFileSync(filePath, jsonData, 'utf8');
        console.log("JSON file saved to: ", filePath);
    } catch (error) {
        console.error("Writing JSON file failed: ", error);
    }
}

export {loadFile, processJson, objectToJson, saveJSONToFile};