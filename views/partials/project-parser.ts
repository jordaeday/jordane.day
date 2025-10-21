import * as fs from 'fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

type Metadata = {
    name : string
    title : string
    number : string
    subtitle : string
    body : string
    date? : string
    link? : string
}

function init(filepath : string) {
    let filetext = fs.readFileSync(filepath, 'utf-8');

    let meta_start = 3;
    let meta_end = filetext.indexOf("---", meta_start);
    let meta_text = filetext.substring(meta_start, meta_end);

    let name_start = meta_text.indexOf("name: ") + 6;
    let name_end = meta_text.indexOf("\n", name_start);
    let name = meta_text.substring(name_start, name_end);

    let title_start = meta_text.indexOf("title: ") + 7;
    let title_end = meta_text.indexOf("\n", title_start);
    let title = meta_text.substring(title_start, title_end);

    let number_start = meta_text.indexOf("number: ") + 8;
    let number_end = meta_text.indexOf("\n", number_start);
    let number = meta_text.substring(number_start, number_end);

    let subtitle_start = meta_text.indexOf("subtitle: ") + 10;
    let subtitle_end = meta_text.indexOf("\n", subtitle_start);
    let subtitle = meta_text.substring(subtitle_start, subtitle_end);

    let date_start = meta_text.indexOf("date: ") + 6;
    let date_end = meta_text.indexOf("\n", date_start);
    let date = meta_text.substring(date_start, date_end);

    let link = "";
    if (meta_text.indexOf("link: ") !== -1) {
        let link_start = meta_text.indexOf("link: ") + 6;
        let link_end = meta_text.indexOf("\n", link_start);
        link = meta_text.substring(link_start, link_end);
    }

    let body_start = meta_end + 3;
    let body = filetext.substring(body_start);

    let metadata : Metadata = {
        name: name,
        title: title,
        number: number,
        subtitle: subtitle,
        date: date,
        link: link === "" ? undefined : link,
        body: body,
    };


    return metadata;
}

async function renderCards(dirpath : string) {

    let filePaths : string[];
    let metaArray : Metadata[] = [];

    // Server-side code shouldn't attempt to call highlightAll() (DOM API).
    // Syntax highlighting is performed during Markdown rendering (see init.ts).

    const fileNames = await readdir( dirpath ); // returns a JS array of just short/local file-names, not paths.
    filePaths = fileNames.map( fn => join( dirpath, fn ) );

    for (let i = 0; i < filePaths.length; i++) {
        let metadata = init(filePaths[i]);
        metaArray.push(metadata);
    }

    return metaArray;
}

function renderPage(filepath : string) {
    let metadata = init(filepath);
    return metadata;
}   

export { renderCards, renderPage };