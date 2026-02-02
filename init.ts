import express from "express";
import * as fs from "fs";
import { engine } from "express-handlebars";
import { renderCards, renderPage } from "./views/partials/project-parser";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js/lib/core';
import x86asm from 'highlight.js/lib/languages/x86asm';
import python from 'highlight.js/lib/languages/python';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('x86asm', x86asm as any);
hljs.registerLanguage('python', python as any);
hljs.registerLanguage('plaintext', plaintext as any);

import { calc_bk } from "./bouba-kiki/bouba-kiki";
import csvParser from "csv-parser";
import fetch from "node-fetch";

const app = express();
const port = 3000;

let webringData: any = null;

// Add JSON body parsing for API routes
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 attachments

let visitCounter = 0;

const marked = new Marked(
  markedHighlight({
	emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

// ============================================
// Moon Server Utilities
// ============================================

// Convert path to ID (e.g., "folder/doc.md" -> "folder-doc")
const pathToId = (path: string): string => {
  return path
    .replace(/\.md$/i, '') // Remove .md extension
    .replace(/\//g, '-')    // Replace slashes with dashes
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dashes
    .replace(/-+/g, '-')    // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
};

// API Key middleware
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.MOON_API_KEY;
  
  if (!expectedKey) {
    return res.status(500).json({ error: 'Server configuration error: API key not set' });
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  
  next();
};

// File storage functions
const COMPENDIUM_DATA_DIR = './compendium/data';
const COMPENDIUM_ATTACHMENTS_DIR = './compendium/attachments';

const savePublishedData = async (id: string, data: any): Promise<void> => {
  const filePath = `${COMPENDIUM_DATA_DIR}/${id}.json`;
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  
  // Extract attachments if present
  if (data.attachments && Object.keys(data.attachments).length > 0) {
    const attachmentDir = `${COMPENDIUM_ATTACHMENTS_DIR}/${id}`;
    await fs.promises.mkdir(attachmentDir, { recursive: true });
    
    for (const [filename, base64Data] of Object.entries(data.attachments)) {
      const buffer = Buffer.from(base64Data as string, 'base64');
      await fs.promises.writeFile(`${attachmentDir}/${filename}`, buffer);
    }
  }
};

const loadPublishedData = async (id: string): Promise<any | null> => {
  try {
    const filePath = `${COMPENDIUM_DATA_DIR}/${id}.json`;
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
};

const deletePublishedData = async (id: string): Promise<void> => {
  const filePath = `${COMPENDIUM_DATA_DIR}/${id}.json`;
  const attachmentDir = `${COMPENDIUM_ATTACHMENTS_DIR}/${id}`;
  
  // Delete JSON file
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    // Ignore if file doesn't exist
  }
  
  // Delete attachments directory
  try {
    await fs.promises.rm(attachmentDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore if directory doesn't exist
  }
};

//Sets our app to use the handlebars engine
app.set("view engine", "handlebars");

//Sets handlebars configurations (we will go through them later on)
app.engine(
  "handlebars",
  engine({
    layoutsDir: __dirname + "/views/layouts",
    helpers: {
      mdToHTML(arg: string) {
        return marked.parse(arg);
      }
    }
  })
);
app.use(express.static("public"));

// ============================================
// Subdomain Routing Middleware
// ============================================

// Create a router for compendium subdomain
const compendiumRouter = express.Router();

// Middleware to check if hostname is compendium subdomain
const isCompendiumSubdomain = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const hostname = req.hostname || req.get('host')?.split(':')[0] || '';
  
  if (!hostname.includes('compendium')) {
    return res.status(404).render("partials/404", { layout: "index", pathname: req.path });
  }
  
  // Found compendium subdomain, proceed
  next();
};

// Serve attachments on compendium subdomain
compendiumRouter.use('/attachments', express.static('compendium/attachments'));

// Compendium page routing
compendiumRouter.get("*", async (req, res) => {
  try {
    // Remove leading slash and .md extension if present
    let requestPath = req.path.slice(1);
    if (!requestPath || requestPath === '') {
      requestPath = 'index';
    }
    
    // Convert path to ID
    const id = pathToId(requestPath);
    
    // Load the published data
    const data = await loadPublishedData(id);
    
    // Data not found
    if (!data) {
      return res.status(404).render("partials/404", { 
        layout: "index", 
        pathname: req.path 
      });
    }
    
    // Render using compendium-page template
    res.render("partials/compendium-page", { 
      layout: "index",
      pathname: req.path,
      page: {
        title: data.name,
        body: data.content,
        metadata: data.metadata
      }
    });
  } catch (err) {
    res.status(500).render("partials/500", { 
      layout: "index", 
      pathname: req.path 
    });
  }
});

// Apply compendium router with subdomain check
app.use(isCompendiumSubdomain, compendiumRouter);

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
  res.render("partials/home", { 
    layout: "index", 
    pathname: req.path, 
    visitCounter: visitCounter++,
    webring: webringData
  });
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

app.get("/blog", async (req, res) => {
  let posts = await renderCards("./blog/");
  res.render("partials/blog", {
    layout: "index", 
    pathname: req.path,
    posts: posts.sort((a, b) => {
      return parseInt(b.number) - parseInt(a.number);
    }),
  });
});

app.get("/contact", (req, res) => {
  res.render("partials/contact", { layout: "index", pathname: req.path });
});

app.get("/public/:file", (req, res) => {
  const file = req.params.file;
  res.sendFile(__dirname + "/public/" + file);
});

app.get("/friends", async (req, res) => {
  try {
    const badges = await parseBadgesCSV("./public/badges/badges.csv");
    //console.log(badges);
    res.render("partials/friends", { 
      layout: "index", 
      pathname: req.path,
      badges: badges,
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

app.get("/blog/:post", (req, res) => {
  let page = "./blog/" + req.params.post + ".md";
  //console.log(page);
  try {
    res.render("partials/blog-post", { 
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

// ============================================
// Moon Server API Endpoints
// ============================================

// GET /api/moon/detail/:id - Get published data by ID
app.get("/api/moon/detail/:id", checkApiKey, async (req, res) => {
  try {
    const id = req.params.id;
    const data = await loadPublishedData(id);
    
    if (!data) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error getting detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/moon/publish - Publish new data
app.post("/api/moon/publish", checkApiKey, async (req, res) => {
  try {
    const { name, path, metadata, content, attachments } = req.body;
    
    // Validate required fields
    if (!name || !path || !metadata || content === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, path, metadata, content' 
      });
    }
    
    // Generate ID from path
    const id = pathToId(path);
    
    // Check if ID already exists
    const existing = await loadPublishedData(id);
    if (existing) {
      return res.status(409).json({ 
        error: 'Item already exists. Use POST /api/moon/publish/:id to update.' 
      });
    }
    
    // Save data
    const publishData = { name, path, metadata, content, attachments: attachments || {} };
    await savePublishedData(id, publishData);
    
    res.json({ id, success: true });
  } catch (err) {
    console.error('Error publishing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/moon/publish/:id - Republish/update existing data
app.post("/api/moon/publish/:id", checkApiKey, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, path, metadata, content, attachments } = req.body;
    
    // Validate required fields
    if (!name || !path || !metadata || content === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, path, metadata, content' 
      });
    }
    
    // Save/update data
    const publishData = { name, path, metadata, content, attachments: attachments || {} };
    await savePublishedData(id, publishData);
    
    res.json({ id, success: true });
  } catch (err) {
    console.error('Error republishing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/moon/unpublish/:id - Remove published item
app.post("/api/moon/unpublish/:id", checkApiKey, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if item exists
    const existing = await loadPublishedData(id);
    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Delete data
    await deletePublishedData(id);
    
    // Return with null id per spec
    res.json({ id: null, success: true });
  } catch (err) {
    console.error('Error unpublishing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((req, res, next) => {
  res.status(404).render("partials/404", { layout: "index", pathname: req.path });
});

app.listen(port, () => console.log(`App listening to port ${port}`));
