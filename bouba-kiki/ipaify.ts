import { parse } from 'node-html-parser';

export async function get_list(input : string) {
    let user_string = input;
    let body = "orthography=" + user_string + "&baseline=&aspiration=on&approximant_devoicing=on&initial_devoicing=on&affrication=on&glottal=on&glottal_t=on&flapping=on&dark_l=on&nasalization=on&vowel_devoicing=on&syllabic_consonants=on"

    let response = await fetch("https://ling.meluhha.com/process", {
        method: "POST",
        body: body,
        headers: {"Content-Type" : "application/x-www-form-urlencoded"}
    });

    const asJSON = await response.json();
    //console.log(asJSON);
    
    let HTMLdata = asJSON["orthography"];
    //console.log(HTMLdata); // gives html

    let wordsArr = parse(HTMLdata).innerText.split(" ");
    //console.log(wordsArr); // gives string of word in ipa
    
    wordsArr = wordsArr.map((word) => one_spelling(word));
    
    //console.log(wordsArr);

    return wordsArr;
}

function one_spelling(word : string) {
    //goal: reduce words with multiple IPA spellings to one spelling
    //example: "hello" sent in formal "həˈloʊ1,2hɛˈloʊ1,2"

    //split on comma
    let spellings = word.split(",");
    let firstSpelling = spellings[0];
    //now in format "həˈloʊ1", need to remove all numbers
    let noNumbers = firstSpelling.replace(/[0-9]/g, '');
    //now in format "həˈloʊ"

    return noNumbers;
}

//test:
//console.log(await get_list("hello there friend"));