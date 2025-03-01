import { uniqBy } from "lodash-es";
import { loadFile, processJson, objectToJson, saveJSONToFile } from "./fileManipulator.js";
import debug from "debug";
const deduplicationDebug = debug('deduplicationDebug');

function deduplicateJsonOutcome(combinedResult){
    //const combinedResult = processJson(loadFile(filePath));

    deduplicationDebug("Number of word before deduplication: ", combinedResult.word.length);
    deduplicationDebug("Number of grammar before deduplication: ", combinedResult.grammar.length);

    combinedResult.word = uniqBy(combinedResult.word, item => `${item.baseForm}-${item.meaning}`);
    combinedResult.grammar = uniqBy(combinedResult.grammar, item => `${item.fuzzyMatch}-${item.meaning}`);

    deduplicationDebug("Number of word after deduplication: ", combinedResult.word.length);
    deduplicationDebug("Number of grammar before deduplication: ", combinedResult.grammar.length);

    return combinedResult;
}

function main(){
    try {
        const jsonFilePath = "tests/data/rawAss.json";
        const combinedResult = processJson(loadFile(jsonFilePath));

        const deduplicatedResult = deduplicateJsonOutcome(combinedResult);

        const newJsonFilePath = jsonFilePath.replace(/\.json$/, "Deduplicated.json");
        deduplicationDebug("jsonFilePath: ", newJsonFilePath);
        const jsonData = objectToJson(deduplicatedResult);

        saveJSONToFile(newJsonFilePath,jsonData);
    } catch (error) {
        console.error("Error testing jsonOutcomeManipulator.js: ", error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
