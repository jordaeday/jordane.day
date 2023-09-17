---
name: bouba-kiki
title: Bouba-Kiki Analyzer
number: 03
subtitle: a hackathon project to analyze text input based on a linguistic principal
date: 03/16/23
link: https://github.com/jordaeday/bouba-kiki-analyzer
todo: style input, button, output
---
<b>What is the bouba/kiki effect?</b>

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

<b>Try it out!</b>

<input type="text" id="input" placeholder="Input text here">
<button onclick="textinput()">Enter</button>
<br> <br>
<div id="output">
    <table>
        <tr>
            <td id = "r-1c1">
            </td>
        </tr>
        <tr>
            <td id = "r0c1" colspan="2">
            </td>
        </tr>
        <tr>
            <td id = "r1c1">
            </td>
            <td id = "r1c2">
            </td>
        </tr>
        <tr>
            <td id = "r2c1">
            </td>
            <td id = "r2c2">
            </td>
        </tr>
    </table>
</div>
<br>
<b>My methodology</b>

After looking at 16 different studies, I noted with phonetic
sounds from the International Phonetic Alphabet (IPA) that were
said to be either round or spiky.

I then used the <a href="https://ling.meluhha.com/ipaify/"><b>IPA-ify tool</b></a> 
from Kevin Ryan to translate the user input into a series of IPA
symbols. When the program came across an IPA symbol that was marked
as round or spiky, it assigned a point in favor of either Bouba or Kiki.
For each word, I divided the Bouba/Kiki value by the number of
symbols I had marked as Bouba/Kiki in order to account for the fact
that there are more Kiki sounds than Bouba sounds in the studies I
looked at, while still giving all words in the input equal weight.

Finally, I calculated the percentage Bouba or Kiki a word is by taking
the word's value (after dividing by the symbol list size) and dividing
it by the total point value of the word.

<b>Potential uses</b>

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
    tr, td {
        white-space: pre;
    }
    #input {
        width: max(auto, fit-content);
        font-size: 35px;
        border: none;
        border-radius: 0px;
        padding-left: 5px;
        border-bottom: solid;
        color: white;
        background: transparent;
        /* background: linear-gradient(transparent 65%, white); */
    }
    #input::placeholder {
        color: white;
    }
    button {
        font-size: 35px;
        font-family: 'Rubik', Courier, monospace;
        border: 3px solid white;
        border-radius: 15px;
        color: white;
        background: transparent;
    }
    table {
        font-size: 35px;
        border-radius: 15px;
        padding-left: 15px;
        width: 100%;
        max-width: 100%;
        background-color: transparent;
        border: 3px solid white;
        color: white;
    }
</style>
<script>
    function textinput () {
        document.getElementById('output').style.display='block';

        input = document.getElementById("input").value;
        //console.log(input);

        fetch(`/projects/bouba-kiki/get?text=${input}`).then((json) => json.json()).then((data)=>{

            
            showAns = "The input is ";
            percentB = (Number(data.percent_bouba)*100).toFixed(1) + "%";
            percentBString = "Percent Bouba:\t".bold()
            percentK = (Number(data.percent_kiki)*100).toFixed(1) + "%";
            percentKString = "Percent Kiki:\t\t".bold()
            boubaSounds = data.sentence_bouba_value.toFixed(0)
            intBString = "# of Bouba sounds:\t".bold()
            kikiSounds = data.sentence_kiki_value.toFixed(0)
            intKString = "# of Kiki sounds:\t\t".bold()
            if(percentB > percentK)
                showAns += "more Bouba!";
            else if (percentB < percentK)
                showAns += "more Kiki!";
            else
                showAns += "equally Bouba and Kiki!"
            ipaArray = data.ipa_array;
            ipaArrayString = "Input as IPA:\t".bold()

            document.getElementById("r-1c1").innerHTML = showAns.bold()
            document.getElementById("r0c1").innerHTML = ipaArrayString + ipaArray;
            document.getElementById("r1c1").innerHTML = percentBString + percentB
            document.getElementById("r1c2").innerHTML = intBString + boubaSounds
            document.getElementById("r2c1").innerHTML = percentKString + percentK
            document.getElementById("r2c2").innerHTML = intKString + kikiSounds
        })
    }
</script>