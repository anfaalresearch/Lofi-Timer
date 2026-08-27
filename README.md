# Focus — Study Timer

A calm, privacy-first Pomodoro timer for focused study sessions. Create subjects, set a task, track completed focus time, and review your progress without creating an account.

## Features

- Custom focus and break durations, including quick presets
- Subject-based focus tracking and a daily ranking
- Daily and weekly goals, streaks, trends, and session history
- Optional browser notifications and completion sound
- Full-screen focus mode, light/dark themes, and keyboard shortcuts
- CSV export for completed sessions
- Persistent data stored locally in the browser

## Run locally

This is a plain HTML, CSS, and JavaScript project—no installation or build step is required.

1. Clone or download the repository.
2. Open `index.html` in a modern browser, or use VS Code's **Live Server** extension for auto-refresh while developing.

## How to use

1. Add a subject.
2. Optionally set the task you want to work on.
3. Start a focus session and take a break when it completes.
4. Check the Subjects, Stats, and History sections to review progress.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Start or pause the timer |
| `R` | Reset the current timer |
| `Esc` | Exit focus mode |

## Project structure

```text
index.html             App structure and dialogs
style.css              Responsive styles and themes
script.js              Timer, persistence, statistics, and interactions
manifest.webmanifest   Progressive web app metadata
```

## Privacy

Focus stores subjects, tasks, settings, and session history in your browser's local storage. Nothing is sent to a server.

## Deploy with GitHub Pages

After pushing this repository to GitHub:

1. Open **Settings** → **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder.
4. Save. GitHub will provide a public project URL once deployment finishes.

## Built with

- HTML
- CSS
- Vanilla JavaScript
