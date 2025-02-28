import debug from "debug";
import { loadFile,processJson} from "./fileManipulator.js";

const subtitleExtractorDebug = debug("subtitleExtractorDebug");
const filePath = "tests/data/rawAss.ass";
const validStyles = ["TextJP"];

function extractDialogueAndTimeFromAss(filePath, validStyles){
    const assContent = loadFile(filePath);
    const assLines = assContent.split("\n");
    subtitleExtractorDebug("Example assLines: ", assLines);

    let subtitles = [];
    let times = [];

    for(let assLine of assLines){
        assLine = assLine.trim();

        if(assLine.startsWith("Dialogue:")){
            const assLineParted = assLine.split(",", 9);
            subtitleExtractorDebug("Example assLineParted: ", assLineParted);

            if(assLineParted.length === 9){
                const assLineStyle = assLineParted[3].trim();
                const assLineText = assLine.split(",").slice(9).join(",").trim();

                subtitleExtractorDebug("Example assLineStyle: ", assLineStyle);
                subtitleExtractorDebug("Example assLineText: ", assLineText);

                if(validStyles.includes(assLineStyle)){
                    let cleanAssLineText = assLineText.replace(/\{.*?\}/g, "").replace(/\\N/g, " ");
                    subtitleExtractorDebug("Example cleanAssLineText: ", cleanAssLineText);

                    let cleanAssLineTime = assLine.split(",").slice(1,3);
                    subtitleExtractorDebug("Example cleanAssLineTime: ", cleanAssLineTime);

                    subtitles.push(cleanAssLineText);
                    times.push(cleanAssLineTime);
                }
            }
        }
    }
    
    let dialogueAndTime = {
        subtitles: subtitles,
        time: times
    };

    return dialogueAndTime;
}

function groupSubtitles(dialogueAndTime, maxWords){
    let groupedSubtitles = [];
    let groupedIndex = [];
    let buffer = "";

    for(let i=0; i < dialogueAndTime.subtitles.length; i++){
        let cleanAssLineText = dialogueAndTime.subtitles[i];

        if(cleanAssLineText.length > maxWords){
            if(buffer.length > 0){
                groupedSubtitle.push({text:buffer.trim(),index:groupedIndex});

                buffer = "";
                groupedIndex = [];
            }
            groupedIndex.push(i);
            groupedSubtitles.push({text:cleanAssLineText,index:groupedIndex});

            groupedIndex = [];
        }
        else{
            if(buffer.length + cleanAssLineText.length < maxWords){
                buffer = buffer ? buffer + "\n" + cleanAssLineText : cleanAssLineText;
                groupedIndex.push(i);
            }
            else{
                groupedSubtitles.push({text:buffer,index:groupedIndex})

                buffer = cleanAssLineText;
                groupedIndex = [];
                groupedIndex.push(i);
            }
        }
    }

    if(buffer.length > 0){
        groupedSubtitles.push({text:buffer,index:groupedIndex})
    }

    return groupedSubtitles;
}

function main(){
    try {
        const dialogueAndTime = extractDialogueAndTimeFromAss(filePath, validStyles);
        subtitleExtractorDebug("Example DialogueAndTime: ", dialogueAndTime);

        const groupedSubtitles = groupSubtitles(dialogueAndTime, 50);
        subtitleExtractorDebug("Example grouped subtitles: ", groupedSubtitles);
    } catch (error) {
        console.error("Error testing subtitleExtractor.js: ", error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {extractDialogueAndTimeFromAss, groupSubtitles};