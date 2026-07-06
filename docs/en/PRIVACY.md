# Privacy

## Everything stays on your computer

GemmPen Teacher runs entirely locally. There is no cloud storage, no user account, and no server on the internet that photos, texts, marking, or feedback get sent to. Reading handwriting and producing the marking also happen directly on your own computer, through the Ollama program installed there. Nothing leaves the device.

This applies to the whole process:

- Photos and scans of student work
- The recognised, teacher-reviewed texts
- Marking, reasoning, and quotes
- Feedback texts and the generated PDFs
- Your corrections (the correction file for the next round of marking)

All of it lives in a folder called `data`, right next to the app on your computer.

## Where the data actually lives

- `data/config`: your subject configurations (task description, expected content, criteria).
- `data/submissions`: the uploaded images, recognised texts, marking, and feedback drafts, organised by batch and by piece of work.
- `data/dpo`: your corrections, saved as a file, if you made any.

These folders are not automatically shared with any code repository or version control system. They stay only on the computer where you created them.

## Use codes instead of names

In the header of the printed template, write a code rather than the student's full name (for example initials, or a student number that only you can match to a person). Feedback PDFs, the class overview, and the correction file all show only this code, never the full name automatically.

**Before photographing**: if the full name is also written somewhere else on the page (for example because a student writes it out of habit), cover it up before photographing or scanning, or cross it out cleanly so it does not end up in the picture. The simplest approach is to tell the class up front: only the code goes in the boxes provided for it, no name anywhere in the body of the text.

## Deletion

If you want to delete all the data for a class, a batch, or the whole project, deleting the matching folder inside `data` is enough:

- Delete a single batch: delete that batch's subfolder inside `data/submissions`.
- Delete everything: delete the whole `data` folder.

There is no hidden copy anywhere else, no cloud recycle bin, and no automatic backup to any online service. Once it is deleted, it is gone. If you care about keeping a backup, make your own copy somewhere of your choosing (for example an external drive) before you delete anything.

## What does happen outside your computer

Only the one-time setup needs an internet connection: downloading Ollama and the marking helper itself, as described in `GETTING-STARTED.md`. These downloads fetch a general-purpose program and a general-purpose marking helper, not any student data. Once that is done, the actual work with real student submissions runs completely without an internet connection.
