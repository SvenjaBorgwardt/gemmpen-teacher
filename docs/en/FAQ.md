# Frequently Asked Questions

## What happens to student data?

Everything stays on your own computer. Photos, scans, transcripts, marking, and feedback texts sit in a folder called `data` right next to the app. There is no cloud storage, no account, and no server anywhere that anything gets sent to. See `PRIVACY.md` for more detail.

## Can I trust the result?

The marking helper gives you a suggestion, not a final decision. Every point value and every piece of reasoning is visible and editable before you release it. For each piece of reasoning you can see the exact quotes from the student's own text that it is based on. Nothing goes out to the class until you click "Release this piece of work" yourself. For a new subject or task type, it is worth running the calibration step in the setup wizard (step 5): it shows you in advance how close the marking lands to your own judgement.

## What do I do about poor handwriting recognition?

Uncertain words get highlighted in yellow as they are read. On the "Review" page you see the scanned image and the recognised text side by side. Click a highlighted spot and correct it in the text box. Only once nothing is left highlighted can you confirm the piece of work. As long as something is unclear, the program deliberately blocks confirmation, so nothing misread slips into the marking unchecked.

## Will this work for my subject?

The marking scheme is fully configurable, not built in. In the setup wizard you define the subject, the task, the expected content, and the criteria yourself. Sample configurations are included for English (comment writing), German (discussion essay), and Business Studies (case analysis), which you can use as a starting point. The one requirement is a subject with free-text answers: this version does not support maths problems, formulas, or pure multiple choice.

## Does this cost anything?

No. The app runs entirely on your own computer. There are no ongoing costs and no fee per piece of work or per class.

## Do I need an internet connection?

Only for the one-time setup (downloading Ollama and the marking helper the first time you start it). After that, the actual work, uploading, reviewing, marking, and exporting, all runs without an internet connection.

## How long does marking take?

Reading handwriting and marking both run on your own computer, so the time depends on how fast your computer is. For a typical class size (under 40 pieces of work), expect a few minutes for the whole batch, possibly longer depending on your computer. While a batch is running, the page shows a progress message and stays usable.

## What is the correction file for the next round of marking?

When you change points or text while marking, the program remembers every real change as a correction pair (the original suggestion and your correction). On the export page you can download this collection as a file. It stays on your computer and is never uploaded automatically. This file is meant to help make the marking helper more accurate in a later training round. This version does not include its own training feature inside the app; the file is the starting point for that.

## Do I have to use the printed template?

Yes, for reliable automatic recognition. The included templates (`public/templates`) carry four corner markers that let the program straighten a crooked photo and crop the writing area. Without a template, or if the markers are not recognised on a photo, the image is still kept, but recognition may be less accurate. A note about this appears right in the gallery when you upload.

## Phone photo or scanner, which is better?

Both work. A scan is usually straighter and more evenly lit, which makes recognition easier. A phone photo is faster if no scanner is nearby. If you photograph the page: keep it straight on, use good light, and make sure all four corner markers are visible.

## Can I use several classes or subjects at the same time?

Yes. Each subject configuration stands on its own and stays saved. The "Subjects" page shows all your configurations, and you can switch between them, duplicate one, or use one as a starting point for a new class.

## What if a piece of work has several pages?

While uploading, you can assign several pages to the same student code, including an "apply to this page and all following pages" option in one click. All pages of one piece of work then appear together as a single piece of work when reviewing and marking.

## What if Ollama is not running?

The app shows a clear message such as "The marking helper is not reachable. Is the Ollama program running?" instead of crashing. The start scripts also try to open Ollama automatically when you launch the app. On the "Settings" page you can test the connection again at any time.

## What if I do not have a good idea for the criteria yet?

Write down what a good piece of work should cover (the expected content), then click "Generate scheme suggestion". The marking helper proposes criteria with points and descriptions. You can adjust this suggestion completely, adding or removing criteria as you like.

## Does the feedback give away the answer?

That is deliberately not the goal. Feedback texts are built to name a strength, show specific observations with a quote from the student's own text, and suggest a next step, without spelling out the correct answer directly. Certain words are automatically filtered out before anything is shown. Even so, it is worth a quick read before releasing feedback, especially at first, until you get a feel for the tone.

## Can I change the wording of the feedback myself?

Yes. Every card in the marking view is a text field: points, reasoning, and feedback text can all be edited directly before you release the work. Every real change is also saved as a correction (see above).

## What if a student is missing, or a page is assigned to the wrong person?

While uploading, you can delete or reassign any page as long as it has not been confirmed yet. On the review page, you can pick up a different code suggested from the header if the automatic reading of the header does not match your current assignment.

## Do I have to open every piece of work one by one?

For reviewing and adjusting marking, yes, because handwriting recognition is never perfect and a teacher carries the final responsibility for every grade. Starting recognition and starting marking themselves, however, run for the whole batch at once.

## What if I want to use the app on a different computer?

Copy the whole project folder, including the `data` folder, to the other computer, and install Ollama and the required models there again (see the start script). This version does not automatically keep two computers in sync.

## Is this the same as the GemmPen web app from the hackathon?

No. GemmPen (the site at gemmpen.vercel.app) was the hackathon submission, built with prepared sample data. GemmPen Teacher is the separate, downloadable version meant for real use in your own classroom, with your own subject, your own marking scheme, and real student work.
