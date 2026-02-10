import express from "express";
import * as fs from "fs";
import path from "path";
import { engine } from "express-handlebars";
import { renderCards, renderPage } from "./views/partials/project-parser";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js/lib/core';
import x86asm from 'highlight.js/lib/languages/x86asm';
import python from 'highlight.js/lib/languages/python';
import plaintext from 'highlight.js/lib/languages/plaintext';
import crypto from "crypto";

hljs.registerLanguage('x86asm', x86asm as any);
hljs.registerLanguage('python', python as any);
hljs.registerLanguage('plaintext', plaintext as any);

import { calc_bk } from "./bouba-kiki/bouba-kiki";
import csvParser from "csv-parser";
import fetch from "node-fetch";
import { MoonItem } from "./compendium/moon-src/types";
import { publishItem, getItem, unpublishItem, getItemByPath } from "./compendium/moon-src/storage";
import { publicPathToLogicalPath } from "./compendium/moon-src/resolvers";

const app = express();
const port = 3000;

let webringData: any = null;

// Add JSON body parsing for API routes
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 attachments

let visitCounter = 0;

// // Log all incoming requests [debug]
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
//   //console.log(req.headers);
//   next();
// });

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

/**
 *  MOON SERVER UTILITIES
 */
// API Key authentication middleware
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['api-key'];
  const apiSecret = req.headers['api-secret'];
  const expectedKey = process.env.MOON_API_KEY;
  const expectedSecret = process.env.MOON_API_SECRET;
  
  if (!expectedKey || !expectedSecret) {
    return res.status(500).json({ error: 'Server configuration error: API credentials not set' });
  }

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ error: 'Unauthorized: API key and secret required' });
  }
  
  const keyBuf = Buffer.from(Array.isArray(apiKey) ? apiKey[0] : (apiKey ?? ""));
  const secretBuf = Buffer.from(Array.isArray(apiSecret) ? apiSecret[0] : (apiSecret ?? ""));
  const expectedKeyBuf = Buffer.from(expectedKey);
  const expectedSecretBuf = Buffer.from(expectedSecret);

  if (keyBuf.length !== expectedKeyBuf.length ||
        secretBuf.length !== expectedSecretBuf.length) {
    return false;
  }

  const keyMatch = crypto.timingSafeEqual(keyBuf, expectedKeyBuf);
  const secretMatch = crypto.timingSafeEqual(secretBuf, expectedSecretBuf);

  if (!keyMatch || !secretMatch) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key or secret' });
  }
  
  next();
};

/**
 *  TEMPLATING ENGINE SETUP
 */

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

/**
 *  SUBDOMAIN ROUTING (COMPENDIUM)
 */

// Create a router for compendium subdomain
const compendiumRouter = express.Router();

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

    const logicalPath = publicPathToLogicalPath(requestPath);
        
    // Load the published data
    const data = await getItemByPath(logicalPath);
    
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

// Apply compendium router only for compendium subdomain - MUST be before main routes
const compendiumMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const hostname = req.hostname || req.get('host')?.split(':')[0] || '';
  
  if (!hostname.includes('compendium')) {
    return next();
  }
  
  // If it's compendium subdomain, use the compendium router
  compendiumRouter(req, res, next);
};

app.use(compendiumMiddleware);

/**
 *  MAIN DOMAIN ROUTING
 */

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

/**
 *  MOON SERVER API ROUTES
 */

// GET /api/moon/detail/:id - Get published data by ID
app.get("/api/moon/detail/:id", checkApiKey, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = getItem(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(item);
  } catch (err) {
    console.error('Error getting detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/moon/publish - Publish new data
app.post("/api/moon/publish", checkApiKey, async (req, res) => {
  try {
    const body:MoonItem = req.body;

    const idParam = req.params.id;
    const id = idParam ? Number(idParam) : undefined;
    
    // Validate required fields
    if (!body.name || !body.path || body.content === undefined) {
      return res.status(400).json({
        error: "Missing required fields: name, path, content",
      });
    }
    
    // Generate ID from path
    const newId = publishItem(id, body);
    
    res.json({ id: newId });
  } catch (err) {
    console.error('Error publishing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/moon/publish/:id - Republish/update existing data
app.post("/api/moon/publish/:id", checkApiKey, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, path, metadata, content, attachments } = req.body;
    
    // Validate required fields
    if (!name || !path || !metadata || content === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, path, metadata, content' 
      });
    }
    
    // Save/update data
    const publishData = { name, path, metadata, content, attachments: attachments || {} };
    await unpublishItem(id); // Unpublish existing data first (if exists)
    await publishItem(id, publishData);
    
    res.json({ id, success: true });
  } catch (err) {
    console.error('Error republishing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/moon/unpublish/:id - Remove published item
app.post("/api/moon/unpublish/:id", checkApiKey, async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Check if item exists
    const existing = await getItem(id);
    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Delete data
    await unpublishItem(id);
    
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

/**
 *  START SERVER
 */
app.listen(port, () => console.log(`App listening to port ${port}`));
