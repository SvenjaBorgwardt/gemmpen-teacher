# GemmPen Teacher

*Deutsche Version: [README.de.md](README.de.md)*

GemmPen Teacher helps you give students written feedback on their handwritten work. You photograph or scan the work. The app reads it, marks it against your own criteria, and writes a first draft of the feedback. You check everything and have the final say. At the end you print one feedback sheet per student.

Everything runs on your own computer. Nothing is sent to the internet. There is no account and no fee.

> This is an early version, shared for testing and feedback. Always check the results yourself and do not rely on it for final grades yet.

## What you need

- A computer (Mac or Windows) that you can keep the app installed on. A computer from the last few years works best. You need about 10 GB of free space for the one-time download.
- Around 15 minutes for the setup, plus that one-time download.
- Internet for the first setup only. After that, the app works offline.

You do not need any programming knowledge.

## Start in 3 steps

1. **Install Node.js.** Open [nodejs.org](https://nodejs.org), download the version marked "LTS", and install it like any other program.
2. **Install Ollama.** Open [ollama.com](https://ollama.com) and download it. Ollama is a free program that reads the handwriting and marks the work, right on your computer. Install it like any other program.
3. **Start GemmPen Teacher.** Open the app folder, go into the `install` folder, and double-click the file for your system:
   - Mac: `start-mac.command`
   - Windows: `start-windows.bat`

The start window does the rest on its own. It starts Ollama, downloads what it needs the first time, and then opens the app in your browser. The first start can take 10 to 20 minutes because of that download. Just leave the window open. Every start after that is much faster.

If a message appears, it always tells you what to do next. Nothing fails silently.

Full walkthrough with pictures: [Getting started](docs/en/GETTING-STARTED.md).

## How it works, in short

1. Set up a subject once: your task, what you expect, and your marking criteria.
2. Print the template and have your class write on it.
3. Photograph or scan the work and upload it.
4. Check the recognised text. Anything the app is unsure about is highlighted for you.
5. Let it mark the work, then review and adjust. Every point is yours to change.
6. Download a feedback sheet for each student.

It is built for text-based subjects, for example English, German, or Business. It is not made for maths, formulas, or multiple choice.

## Your data stays with you

All student data stays in one folder called `data` on your computer. Nothing is uploaded anywhere. Because of that, keeping it safe and deleting it when you no longer need it is your responsibility. The privacy guide explains this in plain steps: [Privacy and your responsibility](docs/en/PRIVACY.md).

## Guides

- [Getting started](docs/en/GETTING-STARTED.md) - from first start to finished feedback sheet
- [Set up my subject](docs/en/SET-UP-MY-SUBJECT.md) - the six-step setup helper
- [Privacy and your responsibility](docs/en/PRIVACY.md) - where your data lives and how to protect it
- [FAQ](docs/en/FAQ.md) - short answers to common questions
- [Disclaimer and terms of use](docs/en/DISCLAIMER.md) - what the app does and who is responsible for what

## Feedback and questions

Found a problem or have a question? Open an issue on GitHub. Because this is an early version, your feedback directly shapes what gets fixed next.

## Legal

**Who is responsible?** GemmPen Teacher runs entirely on your computer and sends nothing to the internet. Under the GDPR, the controller for the student data being processed is you as the teacher using it, or your school, not the developer of the app. The developer never sees any data and is neither the controller nor a processor. Details and your duties are in the [privacy guide](docs/en/PRIVACY.md).

**Please review it yourself.** The app makes suggestions using an AI model. These can be wrong and do not replace your own professional assessment. Always review recognised text, scores, and feedback yourself. Use is at your own responsibility. The full [disclaimer](docs/en/DISCLAIMER.md) explains this in more detail.

**Not legal advice.** These documents are prepared to the best of our knowledge but do not replace legal or data protection review in an individual case. Before using it for real at your school, check with your school's data protection officer.

## License

GemmPen Teacher is provided under the MIT License, see [LICENSE](LICENSE). The software is provided "as is", without warranty.
