---
name: canvas-obsidian-plugin
title: canvas lms obsidian plugin
number: 08
subtitle: a way to add canvas LMS tasks to obsidian
date: 08/20/2024 - ongoing
link: https://github.com/jordaeday/canvas-task-importer
---
Obsidian is a popular markdown note-taking app that I use frequently. I decided
to try my hand at making a plugin for it. It is a fairly simple plugin that
makes calls to the Canvas LMS API (a learning management system that a lot
of schools, including my own, use). It then adds any assignments you have
to the active document.

I got this plugin approved to be a community plugin (accessible for download
from within the Obsidian app, instead of requiring a GitHub download).

I learned a lot about reading API documentation and open source software
management with this project.

I plan on improving it later (after midterm season!) so that it automatically
updates to specific files instead of having to run a command to add the tasks
to the active document. I also want to make it such that there is a setting
to only add certain types of assignments (ie quizzes vs assignments) and the
option to only add ones that are not completed yet (or add completed ones,
but have them automatically marked as completed). Another thing I hope to add
is efficiency. Currently, it takes a while to get all the tasks, and optimization
can definitely be improved upon.