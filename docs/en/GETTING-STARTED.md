# Getting Started with GemmPen Teacher

This guide walks you through the whole journey: from your first launch to the first finished feedback sheet for a student. You do not need any technical background. Give yourself some time for the first launch, mainly because of a one-time download.

## What you need before you start

- A computer (Mac or Windows) where you can keep the program installed.
- An internet connection for the one-time setup. After that, GemmPen Teacher works without internet.
- About 10 to 20 minutes of patience the very first time you start it, because a larger piece of software downloads once.
- Ollama. This is the program that reads handwriting and creates the marking in the background. You only install it once, see step 1.

## Step 1: Install Ollama

Download Ollama from [ollama.com](https://ollama.com) and install it like any other program. You only do this once. GemmPen Teacher needs Ollama to read handwriting and mark student work.

[SCREENSHOT: Ollama download page in the browser]

## Step 2: Start GemmPen Teacher

Open the GemmPen Teacher folder. Inside it there is a folder called `install`. Double click the file for your system:

- Mac: `start-mac.command`
- Windows: `start-windows.bat`

[SCREENSHOT: install folder showing both start files]

A window opens and checks things in order:

1. Whether Node.js is present. If not, you get a link to install it.
2. Whether Ollama is present. If not, you get a link to ollama.com.
3. Whether Ollama is currently running. If not, the script starts it for you.
4. Whether the required marking helper is already downloaded. If not, the download starts now. The very first time, this can take 10 to 20 minutes. Just leave the window open while it works.
5. Whether all the app's building blocks are installed. This takes a little longer the first time.
6. Then the app starts and opens automatically in your browser at `localhost:3000`.

[SCREENSHOT: start window during the download]

If anything gets stuck, the message always tells you what to do next. Nothing fails silently. The second time you start it, everything is much faster, because the download and setup are already done.

## Step 3: Check your settings

Click "Settings" in the navigation. This shows you whether the marking helper is reachable.

[SCREENSHOT: settings page with a green connection status]

- A green message saying the helper is reachable means you are ready to go.
- If it says the helper is not reachable, check that Ollama is running and click "Test connection".
- Below that you will see two names: one "For reading handwriting" and one "For assessing". These come pre-filled. Only change them if you know exactly which helper is installed on your computer.

## Step 4: Set up a subject

Click "Set up". A wizard walks you through six steps: subject and framework, task description, expected content and marking scheme, grading system and feedback style, optional sample answers, and finally a summary.

[SCREENSHOT: setup wizard, step 1 of 6]

For a full walkthrough, see `SET-UP-MY-SUBJECT.md`. At the end you save the configuration. It then appears under "Subjects".

## Step 5: Print the template

Click "Subjects", or open the folder `public/templates`. It contains two ready-to-print templates (one with lines, one with a grid) and a scanning guide for the class.

Print the template you want for every student. In the print dialog, make sure the scaling is set to **100 percent** and **"Fit to page" is switched off**. Otherwise the corner markers will be off and later recognition will be less accurate.

[SCREENSHOT: printed template showing the four corner markers]

## Step 6: Have students write, then collect the work

Students write on the printed template. They fill in the header: task code and student code (not their name, see `PRIVACY.md`). Then:

- **Phone photo**: photograph the whole page straight on, in good light. All four corner markers need to be visible.
- **Scanner**: scan with the printer's scan function, 300 dpi, saved as a PDF. Several pages in one batch are fine, even from different students.

The scanning guide (`scan-anleitung.pdf`) explains both routes again in plain language, in case you want to hand it to the class.

## Step 7: Upload

Click "Upload". Give the batch a name (for example "Class 11A - 2026-05-12"). Drag the photos or the scanned PDF into the box, or choose the files.

[SCREENSHOT: upload page with drop zone]

Each recognised page then shows up in a gallery with a cropped view of the header. A label tells you whether the template was recognised. If it was not, recognition may be less accurate, but the image is still kept. Assign each page to a student code (you can also apply one code to a page and all the following pages in one click, handy for multi-page work). Then move on to review.

## Step 8: Check the transcripts

Click "Check text". Choose the batch and click "Start recognition". This reads the text of every piece of work. With a lot of work, this can take a few minutes.

[SCREENSHOT: review overview with a status per piece of work]

Then open each piece of work on its own. On the left you see the scanned image, on the right the recognised text, line by line. Uncertain spots are highlighted in yellow. Click one and correct the text in the box below it. Only once no uncertain spot is left can you confirm the work.

[SCREENSHOT: review detail view with a highlighted uncertain spot]

## Step 9: Assess

Click "Assess". First choose the subject configuration for this batch and click "Use". Then click "Start assessment". This produces, for every confirmed piece of work, points, reasoning with quotes, and a feedback draft.

[SCREENSHOT: assess overview with a grade per piece of work]

Open a piece of work. You see each criterion as a card: points, reasoning with quotes from the text, and below that the feedback draft (a strength, observations, a next step, and optionally a practice suggestion). Everything can be edited. The overall grade at the top updates immediately when you change a point value.

[SCREENSHOT: assess detail view with criterion cards]

Click "Save changes" to store your edits, and "Release this paper" once you are happy with it. Only released work can be exported.

## Step 10: Save the feedback PDF

Click "Save feedback". Choose the batch. Under "Download feedback sheets" you can download the PDF for a single piece of work, or all of them at once. Each feedback PDF has three pages: grade and strength, observations with quotes, and a next step plus a practice suggestion.

[SCREENSHOT: export page with a download list]

You can also download a class overview as a PDF (a table with student codes, points per area, and grade), and, if you made any corrections while marking, a correction file for the next round of marking (see `FAQ.md`).

That completes the full journey once. For your next batch, steps 6 to 10 are all you need. Your subject stays saved.
