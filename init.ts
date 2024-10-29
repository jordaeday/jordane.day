import express from "express";
import * as fs from "fs";
import { engine } from "express-handlebars";
import { renderCards, renderPage } from "./views/partials/project-parser";
import { marked } from "marked";
import { calc_bk } from "./bouba-kiki/bouba-kiki";
import csvParser from "csv-parser";
import fetch from "node-fetch";


const app = express();
const port = 3000;

let webringData: any = null;

let visitCounter = 0;

//Sets our app to use the handlebars engine
app.set("view engine", "handlebars");

//Sets handlebars configurations (we will go through them later on)
app.engine(
  "handlebars",
  engine({
    layoutsDir: __dirname + "/views/layouts",
    helpers: {
      mdToHTML(arg) {
        return marked.parse(arg);
      }
    }
  })
);
app.use(express.static("public"));

// Function to read and parse the badges CSV file
const parseBadgesCSV = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
};

// Function to fetch the webring data
const fetchWebringData = async (id: string) => {
  try {
    const response = await fetch(`https://umaring.mkr.cx/${id}`);
    const data = await response.json();
    webringData = data;
  } catch (err) {
    console.error(err);
  }
};

// Fetch the webring data
fetchWebringData("jordan");

// Set interval to fetch the webring data every hour
setInterval(() => {
  fetchWebringData("jordan");
}, 1000 * 60 * 5);

app.get("/", (req, res) => {
  res.render("partials/home", { layout: "index", pathname: req.path, visitCounter: visitCounter++ });
});

app.get("/projects", async (req, res) => {
  let projects = await renderCards("./projects/");
  //console.log(projects);
  res.render("partials/projects", {
    layout: "index", 
    pathname: req.path,
    projects: projects.sort((a, b) => {
      return parseInt(b.number) - parseInt(a.number);
    }),
  });
});

app.get("/contact", (req, res) => {
  res.render("partials/contact", { layout: "index", pathname: req.path });
});

app.get("/public/resume.pdf", (req, res) => {
  res.sendFile(__dirname + "/public/resume.pdf");
});

app.get("/friends", async (req, res) => {
  try {
    const badges = await parseBadgesCSV("./public/badges/badges.csv");
    //console.log(badges);
    res.render("partials/friends", { 
      layout: "index", 
      pathname: req.path,
      badges: badges,
      webring: webringData
    });
  } catch (err) {
    res.status(500).render("partials/500", { layout : "index", pathname: req.path });
  }
});

app.get("/projects/:project", (req, res) => {
  let page = "./projects/" + req.params.project + ".md";
  //console.log(page);
  try {
    res.render("partials/project-page", { 
      layout: "index",
      pathname: req.path,
      page: renderPage(page), 
    });
  } catch (err) {
    res.status(404).render("partials/404", { layout : "index", pathname: req.path });
  }

});

app.get("/projects/websites/website1", (req, res) => {
  res.sendFile(__dirname + "/public/websites/website1.html");
});

app.get("/projects/websites/website2", (req, res) => {
  res.sendFile(__dirname + "/public/websites/website2.html");
});

app.get("/projects/websites/website3", (req, res) => {
  res.sendFile(__dirname + "/public/websites/website3.html");
});

app.get("/projects/on-off/play", (req, res) => {
  res.render("partials/on-off/index", { layout: "index", pathname: req.path });
});

app.get("/projects/gradient-slide/play", (req, res) => {
  res.render("partials/gradient-slide/index", { layout: "index", pathname: req.path });
});

app.get("/projects/bouba-kiki/get", async (req, res) => {
  //get query params
  let text = req.query["text"];

  if(text) {
    let value = await calc_bk(text as string)
    res.json(value)
  }
});

app.use((req, res, next) => {
  res.status(404).render("partials/404", { layout: "index", pathname: req.path });
});

app.listen(port, () => console.log(`App listening to port ${port}`));
