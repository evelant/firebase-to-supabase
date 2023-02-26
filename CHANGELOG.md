### 1.0.0

@evelant

-   Added CHANGELOG.md file
-   Switch from npm to pnpm
-   Add tsconfig.json and formalized build step with tsc
-   Build into `dist` folder instead of next to source files
-   Move source files to `src` folder
-   Update dependencies to latest versions
-   Write all exported data into `exported/{auth,firestore,storage}` folder by default
-   Require only one instance of credentials for all scripts saved in `credentials` folder
-   Add scripts to package.json for easier invocation
    -   `pnpm build` to clean and build with tsc
    -   `pnpm firestore-collections` to list collections
    -   `pnpm firestore-export` to export a single collection (previously firestore2json.js)
    -   `pnpm firestore-export-all` to export all collections with default options
    -   `pnpm firestore-import` to import a collection (previously json2supabase.js)
    -   `pnpm auth-export` to export firebase auth (previously firestoreusers2json.js)
    -   `pnpm auth-import` to import firebase auth (previously import_users.js)
-   Fix all TypeScript errors and added types where they were missing so scripts can build with tsc
-   Add prettier and `.prettierrc` for consistent formatting
-   Abstracted repeated code fragments into functions in `utils/utils.ts`
-   Add `fb_uid` column to `auth.users` on auth import set to the firebase user id

### Bug fixes

-   Fixed bug with firestore export creating invalid JSON when export has more than one batch
-  Fixed bug with firestore export stopping after a single batch
-   Fixed bug with auth export not sanitizing data causing imports containing `'` (single quote) to fail
- Fixed bug when using firestore_id as primary key in firestore import
