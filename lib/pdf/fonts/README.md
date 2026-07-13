# Bundled brand fonts for the feedback PDF

These TrueType files let the feedback PDF (`lib/pdf/feedback-pdf.ts`,
`lib/pdf/class-overview-pdf.ts`) use the same typefaces as the app
(Cormorant Garamond for headings, DM Sans for body) instead of the built-in
Times/Helvetica. They are bundled so the PDF renders identically offline, with
no network call at export time.

## Files

- `CormorantGaramond-SemiBold.ttf` - headings and the score number (weight 600)
- `CormorantGaramond-SemiBoldItalic.ttf` - the pull quote and score label
- `DMSans-Regular.ttf` - body text (weight 400)
- `DMSans-SemiBold.ttf` - labels and emphasis (weight 600)
- `DMSans-Italic.ttf` - quote blocks

## Provenance

Derived from the upstream variable fonts at github.com/google/fonts
(`ofl/cormorantgaramond`, `ofl/dmsans`). Each static weight was pinned from the
variable font with `fonttools varLib.instancer` and then subset to the WinAnsi
(CP1252) character range with `fonttools subset` - that is the only range the
PDF's text sanitizer (`lib/pdf/text-sanitize.ts`) can emit, so nothing visible
is dropped and the files stay small.

## License

Both families are licensed under the SIL Open Font License 1.1. The full
license text ships alongside the fonts:

- `OFL-CormorantGaramond.txt` - Copyright The Cormorant Project Authors
- `OFL-DMSans.txt` - Copyright The DM Sans Project Authors

The OFL permits bundling and redistribution with software. See the license
files for the reserved font names and conditions.
