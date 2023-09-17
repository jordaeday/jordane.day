import { get_list } from "./ipaify";

const bouba_list = ["ɑ", "oʊ", "u", "b", "m", "d", "n", "l"];
const kiki_list = ["i", "ɪ", "ɝ", "p", "f", "t", "s", "z", "ʃ", "k"];

type BoubaKiki = {
    sentence_bouba_value : number;
    sentence_kiki_value : number;
    percent_bouba : number;
    percent_kiki : number;
    ipa_array : string[];
}

/*
    methodology:
    - count number of bouba sounds
    - count number of kiki sounds
    - calculate percent bouba/kiki

    conbine whole array into one string?
*/

export async function calc_bk(input: string) {

    console.log("input: " + input);

    let words_array = await get_list(input);

    let all_words = words_array.join(" ");

    //console.log("words: " + words_array);

    let ipa_array : string[] = [];

    let bouba_count = 0;
    let kiki_count = 0;

    //calculate bouba/kiki value for the input
    for (let i = 0; i < all_words.length; i++) {

        if(all_words.charAt(i) == " ") {
            continue;
        }

        if(bouba_list.includes(all_words.charAt(i))) {
            bouba_count++;
        } else if(kiki_list.includes(all_words.charAt(i))) {
            kiki_count++;
        }
    }

    //calc percantages
    let percent_bouba = bouba_count / all_words.length;
    let percent_kiki = kiki_count / all_words.length;

    let bk : BoubaKiki = {
        sentence_bouba_value : bouba_count,
        sentence_kiki_value : kiki_count,
        percent_bouba : percent_bouba,
        percent_kiki : percent_kiki,
        ipa_array : words_array,
    };

    //return    word_bouba_value, word_kiki_value, 
    //          sentence_bouba_value, sentence_kiki_value, 
    //          percent_bouba, percent_kiki, 
    //          ipa_array
    //console.log("return object: " + bk);
    return bk;
}

//console.log(await calc_bk("hello there friend"));

