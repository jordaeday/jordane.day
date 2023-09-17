import express from "express";
import * as fs from "fs";
import { engine } from "express-handlebars";
import { renderCards, renderPage } from "./views/partials/project-parser";
import { marked } from "marked";
import { calc_bk } from "./bouba-kiki/bouba-kiki";


const app = express();
const port = 3000;

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

app.get("/", (req, res) => {
  res.render("home", { layout: false });
});

app.get("/about", (req, res) => {
  res.render("partials/about", { layout: "index" });
});

app.get("/projects", async (req, res) => {
  let projects = await renderCards("./projects/");
  //console.log(projects);
  res.render("partials/projects", {
    layout: "index",
    projects: projects.sort((a, b) => {
      return parseInt(b.number) - parseInt(a.number);
    }),
  });
});

app.get("/resume", (req, res) => {
  res.render("partials/resume", { layout: "index" });
});

app.get("/projects/:project", (req, res) => {
  let page = "./projects/" + req.params.project + ".md";
  console.log(page);
  res.render("partials/project-page", { 
    layout: "index",
    page: renderPage(page), 
  });
});

app.get("/projects/websites/website1", (req, res) => {
  res.sendFile(__dirname + "/public/websites/website1.html");
});

app.get("/projects/websites/website2", (req, res) => {
  res.sendFile(__dirname + "/public/websites/website2.html");
});

app.get("/projects/on-off/play", (req, res) => {
  res.render("partials/on-off/index", { layout: "index" });
});

app.get("/projects/gradient-slide/play", (req, res) => {
  res.render("partials/gradient-slide/index", { layout: "index" });
});

app.get("/projects/bouba-kiki/get", async (req, res) => {
  //get query params
  let text = req.query["text"];

  if(text) {
    let value = await calc_bk(text as string)
    res.json(value)
  }
  
  //res.render("partials/gradient-slide/index", { layout: "index" });
});

app.listen(port, () => console.log(`App listening to port ${port}`));
