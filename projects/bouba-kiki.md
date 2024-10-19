---
name: bouba-kiki
title: bouba-kiki analyzer
number: 03
subtitle: a hackathon project to analyze text input based on a linguistic principal
date: 03/16/23
link: https://github.com/jordaeday/bouba-kiki-analyzer
todo: style input, button, output
---
# what is the bouba/kiki effect?

The bouba/kiki effect is the idea that round shapes are
associated with words like bouba that feel "rounder", and 
spiky shapes are associated with "spiky" words like kiki.

Linguists have tried to learn the science behind why we
associate certain sounds with spikiness/roundness, as well
as which sounds we associate with each. After examining 16
studies that looked at a cumulative total of over 60,000
words, both made-up and real, I've taken their findings
and created this program that will determine how kiki (spiky)
or bouba (round) your input is.

## try it out!

<input type="text" id="input" placeholder="Input text here">
<button onclick="textinput()">enter</button>
<br> <br>
<div id="output">
    the input is <span id = "inputResult"> </span>! <br>
    input as IPA: <span id = "inputIPA"> </span> <br>
    percent bouba: <span id = "percentBouba"> </span>; number of bouba sounds: <span id = "numberBouba"> </span> <br>
    percent kiki: <span id = "percentKiki"> </span>; number of kiki sounds: <span id = "numberKiki"> </span>
</div>
<br>

# my methodology

After looking at 16 different studies, I noted with phonetic
sounds from the International Phonetic Alphabet (IPA) that were
said to be either round or spiky.

I then used the <a href="https://ling.meluhha.com/ipaify/">IPA-ify tool</a> 
from Kevin Ryan to translate the user input into a series of IPA
symbols. When the program came across an IPA symbol that was marked
as round or spiky, it assigned a point in favor of either bouba or kiki.
For each word, I divided the bouba/kiki value by the number of
symbols I had marked as bouba/kiki in order to account for the fact
that there are more kiki sounds than bouba sounds in the studies I
looked at, while still giving all words in the input equal weight.

Finally, I calculated the percentage bouba or kiki a word is by taking
the word's value (after dividing by the symbol list size) and dividing
it by the total point value of the word.

# potential uses

I imagine this tool could be useful for further research into this effect
as well as similar effects mapping how we associate sounds with emotion,
light, etc.

Additionally, this tool could be especially useful in terms of marketing:
if a company wants to send a email and make sure it evokes a certain
emotion or wants to make consumers associate their words with their
product, this tool could help them identify the best way to do so.


<style>
    #output {
        display: none;
    }
    #see_more {
        display: none;
    }
    #input {
        width: max(auto, fit-content);
        border: none;
        border-radius: 0px;
        padding-left: 5px;
        border-bottom: solid;
        color: var(--text);
        background: transparent;
        font: inherit;
        /* background: linear-gradient(transparent 65%, white); */
    }
    #input::placeholder {
        color: var(--text);
        font: inherit;
    }
    button {
        border: 2px solid var(--text);
        border-radius: 15px;
        color: var(--text);
        background: transparent;
        font: inherit;
    }
</style>
<script>
    function textinput () {
        document.getElementById('output').style.display='block';

        input = document.getElementById("input").value;
        //console.log(input);

        fetch(`/projects/bouba-kiki/get?text=${input}`).then((json) => json.json()).then((data)=>{

            
            let showAns;
            percentB = (Number(data.percent_bouba)*100).toFixed(1) + "%";
            percentK = (Number(data.percent_kiki)*100).toFixed(1) + "%";
            boubaSounds = data.sentence_bouba_value.toFixed(0)
            kikiSounds = data.sentence_kiki_value.toFixed(0)
            if(percentB > percentK)
                showAns = "more bouba!";
            else if (percentB < percentK)
                showAns = "more kiki!";
            else
                showAns = "equally bouba and kiki!"
            ipaArray = data.ipa_array;

            document.getElementById("inputResult").innerHTML = showAns.bold()
            document.getElementById("inputIPA").innerHTML = ipaArray;
            document.getElementById("percentBouba").innerHTML = percentB
            document.getElementById("numberBouba").innerHTML = boubaSounds
            document.getElementById("percentKiki").innerHTML = percentK
            document.getElementById("numberKiki").innerHTML = kikiSounds
        })
    }
</script>