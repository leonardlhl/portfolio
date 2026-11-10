# Leonard Lo | Architecture Portfolio

Static publication of the rotating project tree, CV and selected architecture projects.

The production site is intentionally not indexed by search engines. It is public to anyone with the link; robots directives are not access control.

## Editing

On the authoring computer, edit `outputs/tree-draft/projects.json` for projects and `outputs/tree-draft/cv.html` / `cv-experience.js` for CV content. Then run `node scripts/build-site.mjs` from the portfolio workspace and publish the generated folder. Keep the generated `assets`, `vendor` and `fonts` directories with the HTML files.

`editor.html` provides a local JSON editor. It exports a file; it does not directly save to GitHub. Numeric page entries use `assets/pages/page-NN.jpg`.

Third-party licences are included beside their fonts and Three.js.
