# Privacy and your responsibility

## Everything stays on your computer

GemmPen Teacher runs entirely locally. There is no cloud storage, no user account, and no server on the internet that photos, texts, marking, or feedback get sent to. Reading handwriting and producing the marking also happen directly on your own computer, through the Ollama program installed there. Nothing leaves the device.

This applies to the whole process:

- Photos and scans of student work
- The recognised, teacher-reviewed texts
- Marking, reasoning, and quotes
- Feedback texts and the generated PDFs
- Your corrections (saved as a file, for the next round)

All of it lives in a folder called `data`, right next to the app on your computer.

## Who is the controller (GDPR)

Under the General Data Protection Regulation (Art. 4(7) GDPR), the "controller" is whoever decides the purpose and means of the processing. For the student data processed with GemmPen Teacher, that is **you as the teacher using it, or your school or school authority**. You decide which work you scan, why you assess it, and how long you keep the data.

The developer of the app is **not** the controller and **not** a processor. The reason is simple: the app runs entirely on your computer. There is no developer server, no transfer of data to the developer, and no remote access. The developer never sees any student data at any point. Where no data flows, there is no processing on someone else's behalf.

What this means for you: the data protection duties rest with you or your school. In particular:

- the legal basis for the processing,
- information, access, and deletion towards students and parents,
- keeping the record of processing activities,
- and the question of whether processing on the device you use (especially a private one) is permitted at all.

**Recommendation:** Before you first use it with real data, clear the use with your school's data protection officer. Processing student data on private devices is regulated differently from region to region; in North Rhine-Westphalia, for example, through the regulation on permitted student and parent data (VO-DV I) and the school data protection rules.

## Where the data actually lives

- `data/config`: your subject configurations (task description, expected content, criteria).
- `data/submissions`: the uploaded images, recognised texts, marking, and feedback drafts, organised by batch and by piece of work.
- `data/dpo`: your corrections, saved as a file, if you made any.

These folders are not automatically shared with any code repository or version control system. They stay only on the computer where you created them.

## Your data, your responsibility

Because everything lives only on your computer and nothing goes to a cloud, no one else has access to it. That is good for privacy. It also means that protecting this data, and deleting it in time, is entirely up to you. There is no company in the background doing it for you.

The files in the `data` folder are ordinary files on your hard drive. Anyone who uses your computer can open them. So here are the key points that keep you on the safe side.

### How to protect the data

- **Secure your computer.** Turn on disk encryption (it is called FileVault on a Mac, and BitLocker on Windows). Use a screen lock with a password. That keeps the data protected if the computer is ever lost or stolen.
- **Only you on the device.** Use GemmPen Teacher on a computer that other people cannot freely access. A separate, password-protected user account is already enough.
- **Codes instead of names.** Use a code on the sheets instead of the full name. More on this in the next section.
- **Do not put it in a cloud folder.** Do not place the app folder or the `data` folder inside a folder that syncs to the internet automatically, for example OneDrive, iCloud Drive, Dropbox, or Google Drive. Otherwise the student data would be copied to the cloud after all. (If someone changes the data location in the advanced settings, the same applies: do not point it at a cloud or sync folder.)
- **Make your own backup.** There is no automatic backup. If you want a copy, make it yourself, for example on an encrypted external drive.
- **Delete when you are done.** Follow your school's rules on how long data may be kept, and delete it when you no longer need it. How to do that is described below.

## Use codes instead of names

In the header of the printed template, write a code rather than the student's full name (for example initials, or a student number that only you can match to a person). Feedback PDFs, the class overview, and the correction file all show only this code, never the full name automatically.

**Before photographing**: if the full name is also written somewhere else on the page (for example because a student writes it out of habit), cover it up before photographing or scanning, or cross it out cleanly so it does not end up in the picture. The simplest approach is to tell the class up front: only the code goes in the boxes provided for it, no name anywhere in the body of the text.

Keep the list of which code belongs to which person separate from the work, and only with you.

## Deletion

If you want to delete all the data for a class, a batch, or the whole project, deleting the matching folder inside `data` is enough:

- Delete a single batch: delete that batch's subfolder inside `data/submissions`.
- Delete everything: delete the whole `data` folder.

There is no hidden copy anywhere else, no cloud recycle bin, and no automatic backup to any online service. Once it is deleted, it is gone. If you care about keeping a backup, make your own copy somewhere of your choosing (for example an external drive) before you delete anything.

## What does happen outside your computer

Only the one-time setup needs an internet connection: downloading Ollama and the marking helper itself, as described in [GETTING-STARTED.md](GETTING-STARTED.md). These downloads fetch a general-purpose program and a general-purpose marking helper, not any student data. Once that is done, the actual work with real student submissions runs completely without an internet connection.
